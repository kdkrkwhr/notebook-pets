import {ART,ErasedError} from './data.mjs';
import {imageKey,errorText} from './model.mjs';
import {ArtworkError,checkArtwork,artworkErrorKey,birthPrompt,sourceKey,sourcePath} from './birth-art.mjs';

// No automatic paid retry. A generation failure never calls the game start tool.
export function createBirthFlow(h){
  let intent=null,owner=null,output=null,phase='',preparing=false;
  const message=(key,values={})=>{phase=key;h.message(key,values);render();};
  const guard=async()=>{const current=await h.assertActive();if(current.pet_id!==owner||current.stage!==1)throw new ArtworkError('artPartnerChanged');return current;};
  const source=()=>h.art()?.[sourceKey(h.view()||{})];
  async function checked(selection){
    if(!selection)throw new ArtworkError('artMissing');
    if(!selection.features){message('artChecking');try{selection.features=await checkArtwork(h.anna(),selection.blob);}catch(error){throw new ArtworkError(artworkErrorKey(error));}}
    return selection;
  }
  async function setSource(snapshot,entry){
    await guard();
    await h.save(old=>({...old,[sourceKey(snapshot)]:entry}));
  }
  function render(){
    const view=h.view();const record=source();
    const active=preparing||!!(intent&&!owner)||!!(view?.status&&view.stage===1&&((owner===view.pet_id&&(intent||output))||record&&!['done','abandoned'].includes(record.phase)));
    h.panel(active,!!output);
    if(active&&!phase)message(record?.phase==='rejected'?'artRejected':record?.phase==='generating'?'artUncertain':'artResume');
  }
  async function run(){
    if(h.locked())return;h.controls(true);
    let snapshot,record,step='source';
    try{
      snapshot=await h.assertActive();owner??=snapshot.pet_id;
      await guard();
      record=(await h.anna().storage.get({key:ART})).value?.[sourceKey(snapshot)];
      if(!intent&&!record&&!h.editor.get())throw new ArtworkError('artMissing');
      if(output){step='save';}
      else{
        const selected=h.editor.get();
        if(selected&&selected!==intent)intent=await checked(selected);
        if(intent){
          await checked(intent);await guard();
          const path=intent.path??=`portraits/${owner}/source-${crypto.randomUUID()}.png`;
          record={path,phase:'uploading',features:intent.features,at:Date.now()};
          await setSource(snapshot,record);
          message('artUploading');await h.upload(path,intent.blob);await guard();
          record={...record,phase:'ready'};await setSource(snapshot,record);intent=null;h.editor.clear();
        }
        if(!record||!sourcePath(snapshot,record.path)||!['ready','failed','generating'].includes(record.phase))throw new ArtworkError(record?.phase==='rejected'?'artRejected':'artSelectAgain');
        if(typeof record.features!=='string'||!record.features||record.features.length>600)throw new ArtworkError('artSelectAgain');
        await guard();
        const path=`portraits/${owner}/${crypto.randomUUID()}.png`;
        // Reserve before requesting an image, so reopening never silently repeats a paid call.
        await setSource(snapshot,{...record,phase:'generating'});
        step='generate';message('artGenerating');
        const generated=await h.anna().image.generate({prompt:birthPrompt(snapshot,record.features),n:1,size:'1024x1024',quality:'low',resolution:'1K',output_format:'png'},{timeoutMs:240000});
        const url=generated.images?.[0]?.url;if(!url)throw Error('Missing image');
        await guard();output={owner,key:imageKey(snapshot,1),path,url,source:record};step='save';
      }
      message('artSaving');await guard();
      const pending=output;
      if(!pending.blob){const response=await fetch(pending.url);if(!response.ok)throw Error('Portrait download');pending.blob=await response.blob();}
      await guard();
      if(!pending.uploaded){await h.upload(pending.path,pending.blob);pending.uploaded=true;}
      await guard();
      await h.save(old=>({...old,[pending.key]:{path:pending.path,at:Date.now()},[sourceKey(snapshot)]:{...pending.source,phase:'done'}}));
      await h.reload();output=null;intent=null;h.editor.clear();message('artSaved');render();
    }catch(error){
      if(error instanceof ErasedError){clear();message('removedHeading');}
      else if(h.isPartnerChanged(error)||error instanceof ArtworkError&&error.key==='artPartnerChanged'){clear();message('artPartnerChanged');}
      else if(error instanceof ArtworkError){message(error.key);}
      else if(step==='save'){message('artSaveFailed');}
      else{
        const rejected=step==='generate'&&artworkErrorKey(error)==='artRejected';
        if(step==='generate'&&record){try{await setSource(snapshot,{...record,phase:rejected?'rejected':'failed'});}catch{/* Keep the generating marker if the result of that write is unknown. */}}
        message(rejected?'artRejected':step==='generate'?'artGenerationFailed':'artSourceFailed',{error:errorText(error,h.language())});
      }
    }finally{h.controls(false);render();}
  }
  async function prepare(){
    try{preparing=true;render();intent=await checked(h.editor.get());return true;}
    catch(error){message(error instanceof ArtworkError?error.key:artworkErrorKey(error));return false;}
    finally{preparing=false;render();}
  }
  async function started(view){if(intent&&view?.ok&&view.stage===1){owner=view.pet_id;await run();}}
  async function fallback(){
    if(h.locked())return;h.controls(true);
    try{
      const snapshot=await h.assertActive();owner??=snapshot.pet_id;await guard();
      const record=(await h.anna().storage.get({key:ART})).value?.[sourceKey(snapshot)];
      if(record)await setSource(snapshot,{...record,phase:'abandoned'});
      intent=null;output=null;h.editor.clear();message('artDefaultChosen');await h.reload();
    }catch(error){message('artSourceFailed',{error:errorText(error,h.language())});}
    finally{h.controls(false);render();}
  }
  function clear(){intent=null;owner=null;output=null;phase='';h.editor.clear();h.panel(false,false);h.clearMessage();}
  function selected(){if(h.view()?.stage===1&&!output){owner=h.view().pet_id;intent=h.editor.get();phase='';render();}}
  return {prepare,started,run,render,clear,fallback,selected,hasOutput:()=>!!output};
}
