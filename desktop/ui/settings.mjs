import {rpc} from './desktop-runtime.mjs';
const labels={
 en:['AI connection','Codex CLI','Uses the Codex CLI installed and signed in on this computer. AI requests use your Codex account and internet connection. Game progress and portraits are saved on this computer.','Executable path (blank: detect automatically)','Model (blank: Codex default)','Save settings','Check connection','Cancel AI request','Close','Create a backup','Open data folder','Installed / signed in','Install Codex CLI and run “codex login” in your terminal.','Settings saved.','Backup saved.','No backup created.'],
 ko:['AI 연결 설정','Codex CLI','이 PC에 설치하고 로그인한 Codex CLI를 사용해요. AI 요청은 내 Codex 계정 사용량과 인터넷을 이용하며, 게임과 이미지는 PC에 저장돼요.','실행 파일 경로 (비우면 자동 탐색)','모델 (비우면 Codex 기본값)','설정 저장','연결 확인','AI 요청 취소','닫기','백업 만들기','데이터 폴더 열기','설치 / 로그인 완료','터미널에서 Codex CLI를 설치하고 “codex login”으로 로그인해 주세요.','설정을 저장했어요.','백업을 저장했어요.','백업하지 않았어요.'],
 ja:['AI 接続設定','Codex CLI','この PC にインストールしてログインした Codex CLI を使用します。AI はご自身のアカウントの利用枠とインターネットを使います。ゲームと画像はこの PC に保存されます。','実行ファイルのパス（空欄：自動検出）','モデル（空欄：Codex の既定）','設定を保存','接続を確認','AI リクエストを中止','閉じる','バックアップを作成','データフォルダを開く','インストール・ログイン済み','Codex CLI をインストールし、ターミナルで codex login を実行してください。','設定を保存しました。','バックアップしました。','バックアップを中止しました。'],
 'zh-Hans':['AI 连接设置','Codex CLI','使用此电脑上已安装并登录的 Codex CLI。AI 使用你的账户额度和网络，游戏和图片保存在此电脑。','可执行文件路径（留空自动检测）','模型（留空使用 Codex 默认值）','保存设置','检查连接','取消 AI 请求','关闭','创建备份','打开数据文件夹','已安装并登录','请安装 Codex CLI，并在终端运行 codex login。','设置已保存。','备份已保存。','未创建备份。'],
 'zh-Hant':['AI 連線設定','Codex CLI','使用此電腦上已安裝並登入的 Codex CLI。AI 使用你的帳戶額度和網路，遊戲和圖片儲存在此電腦。','執行檔路徑（留空自動偵測）','模型（留空使用 Codex 預設值）','儲存設定','檢查連線','取消 AI 請求','關閉','建立備份','開啟資料夾','已安裝並登入','請安裝 Codex CLI，並在終端執行 codex login。','設定已儲存。','備份已儲存。','未建立備份。']
};
const lang=()=>labels[document.documentElement.lang]||labels.en;
const button=document.createElement('button');button.id='desktop-settings';button.type='button';button.className='quiet';
const dialog=document.createElement('dialog');dialog.id='desktop-dialog';dialog.innerHTML=`<h2></h2><p class="desktop-explain"></p><form><label><span></span><input id="desktop-cli" maxlength="2000" autocomplete="off"></label><label><span></span><input id="desktop-model" maxlength="100" autocomplete="off"></label><div class="dialog-actions"><button type="submit" class="primary"></button><button type="button" id="desktop-check"></button></div></form><p id="desktop-result" role="status"></p><pre id="desktop-error"></pre><div class="dialog-actions"><button type="button" id="desktop-cancel"></button><button type="button" id="desktop-backup"></button><button type="button" id="desktop-folder"></button><button type="button" id="desktop-close" class="quiet"></button></div>`;
document.body.append(dialog);
(document.querySelector('.header-controls')||document.querySelector('header')||document.body).prepend(button);
const $=id=>dialog.querySelector(id),say=text=>$('#desktop-result').textContent=text;
function translate(){const l=lang();button.textContent=l[0];dialog.querySelector('h2').textContent=l[1];dialog.querySelector('.desktop-explain').textContent=l[2];dialog.querySelectorAll('label span').forEach((e,i)=>e.textContent=l[3+i]);dialog.querySelector('[type=submit]').textContent=l[5];$('#desktop-check').textContent=l[6];$('#desktop-cancel').textContent=l[7];$('#desktop-close').textContent=l[8];$('#desktop-backup').textContent=l[9];$('#desktop-folder').textContent=l[10];}
new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});translate();
async function info(check=false){try{say('…');const result=await rpc('desktop.info',{check});$('#desktop-cli').value=result.settings.path;$('#desktop-model').value=result.settings.model;$('#desktop-error').textContent=result.lastError||result.error||'';say(check?(result.compatible&&result.loggedIn?`${lang()[11]} · ${result.version}`:lang()[12]):'');$('#desktop-cancel').disabled=!result.busy;}catch(e){say(e.message);}}
button.onclick=()=>{translate();dialog.showModal();info();};
$('#desktop-close').onclick=()=>dialog.close();
$('#desktop-check').onclick=()=>info(true);
dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();try{await rpc('desktop.configure',{path:$('#desktop-cli').value.trim(),model:$('#desktop-model').value.trim()});say(lang()[13]);}catch(e){say(e.message);}};
$('#desktop-cancel').onclick=async()=>{await rpc('desktop.cancel');await info();};
$('#desktop-backup').onclick=async()=>{try{const value=await window.pywebview.api.backup();say(value?`${lang()[14]} ${value}`:lang()[15]);}catch(e){say(e.message);}};
$('#desktop-folder').onclick=async()=>{try{await window.pywebview.api.open_data_folder();}catch(e){say(e.message);}};
// Keep connection/cancellation reachable while the game's normal controls lock.
new MutationObserver(()=>{if(button.disabled)button.disabled=false;for(const e of dialog.querySelectorAll('button,input'))if(e.disabled&&e.id!=='desktop-cancel')e.disabled=false;}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled']});
