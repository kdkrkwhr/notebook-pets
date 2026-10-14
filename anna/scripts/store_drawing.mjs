// A reproducible original doodle, entered through the app's normal pointer controls.
export async function drawStoreReference(page){
  const box=await page.locator('#art-canvas').boundingBox();
  const stroke=async(color,points)=>{
    await page.locator('#art-color').fill(color);
    await page.mouse.move(box.x+points[0][0]*box.width,box.y+points[0][1]*box.height);
    await page.mouse.down();
    for(const [x,y] of points.slice(1))await page.mouse.move(box.x+x*box.width,box.y+y*box.height,{steps:2});
    await page.mouse.up();
  };
  const oval=(x,y,w,h)=>Array.from({length:65},(_,i)=>[x+w*Math.cos(i*Math.PI/32),y+h*Math.sin(i*Math.PI/32)]);
  // Round sprout friend, leaf crown, tiny arms/feet, warm cheeks.
  await stroke('#558267',oval(.5,.56,.23,.23));
  await stroke('#558267',[[.5,.33],[.5,.24],[.48,.19]]);
  await stroke('#78ad66',[[.49,.25],[.38,.23],[.33,.15],[.43,.15],[.48,.2],[.49,.25]]);
  await stroke('#78ad66',[[.5,.27],[.55,.17],[.65,.14],[.62,.23],[.56,.27],[.5,.27]]);
  await stroke('#558267',[[.28,.52],[.22,.48],[.2,.51],[.22,.56],[.27,.59]]);
  await stroke('#558267',[[.72,.52],[.78,.48],[.8,.51],[.78,.56],[.73,.59]]);
  await stroke('#558267',[[.4,.77],[.36,.83],[.43,.84],[.46,.79]]);
  await stroke('#558267',[[.6,.77],[.64,.83],[.57,.84],[.54,.79]]);
  await stroke('#394c40',[[.42,.5],[.42,.54]]);
  await stroke('#394c40',[[.58,.5],[.58,.54]]);
  await stroke('#e7958d',[[.34,.59],[.39,.59]]);
  await stroke('#e7958d',[[.61,.59],[.66,.59]]);
  await stroke('#394c40',[[.46,.61],[.48,.64],[.52,.64],[.54,.61]]);
}
