import {rpc} from './desktop-runtime.mjs';
const labels={
 en:['AI connection','Codex CLI','Uses the Codex CLI installed and signed in on this computer. AI requests use your Codex account and internet connection. Game progress and portraits are saved on this computer.','Executable path (blank: detect automatically)','Model (blank: Codex default)','Save settings','Check connection','Cancel AI request','Close','Create a backup','Open data folder','Installed / signed in','Install Codex CLI and run “codex login” in your terminal.','Settings saved.','Backup saved.','No backup created.'],
 ko:['AI 연결 설정','Codex CLI','이 PC에 설치하고 로그인한 Codex CLI를 사용해요. AI 요청은 내 Codex 계정 사용량과 인터넷을 이용하며, 게임과 이미지는 PC에 저장돼요.','실행 파일 경로 (비우면 자동 탐색)','모델 (비우면 Codex 기본값)','설정 저장','연결 확인','AI 요청 취소','닫기','백업 만들기','데이터 폴더 열기','설치 / 로그인 완료','터미널에서 Codex CLI를 설치하고 “codex login”으로 로그인해 주세요.','설정을 저장했어요.','백업을 저장했어요.','백업하지 않았어요.'],
 ja:['AI 接続設定','Codex CLI','この PC にインストールしてログインした Codex CLI を使用します。AI はご自身のアカウントの利用枠とインターネットを使います。ゲームと画像はこの PC に保存されます。','実行ファイルのパス（空欄：自動検出）','モデル（空欄：Codex の既定）','設定を保存','接続を確認','AI リクエストを中止','閉じる','バックアップを作成','データフォルダを開く','インストール・ログイン済み','Codex CLI をインストールし、ターミナルで codex login を実行してください。','設定を保存しました。','バックアップしました。','バックアップを中止しました。'],
 'zh-Hans':['AI 连接设置','Codex CLI','使用此电脑上已安装并登录的 Codex CLI。AI 使用你的账户额度和网络，游戏和图片保存在此电脑。','可执行文件路径（留空自动检测）','模型（留空使用 Codex 默认值）','保存设置','检查连接','取消 AI 请求','关闭','创建备份','打开数据文件夹','已安装并登录','请安装 Codex CLI，并在终端运行 codex login。','设置已保存。','备份已保存。','未创建备份。'],
 'zh-Hant':['AI 連線設定','Codex CLI','使用此電腦上已安裝並登入的 Codex CLI。AI 使用你的帳戶額度和網路，遊戲和圖片儲存在此電腦。','執行檔路徑（留空自動偵測）','模型（留空使用 Codex 預設值）','儲存設定','檢查連線','取消 AI 請求','關閉','建立備份','開啟資料夾','已安裝並登入','請安裝 Codex CLI，並在終端執行 codex login。','設定已儲存。','備份已儲存。','未建立備份。']
};
const providerCopy={
 en:['AI provider','Claude Code draws vector illustrations locally from SVG. Uses your Claude subscription; no Codex, external image service or API key is needed. The visual style differs from Codex image generation.'],
 ko:['사용할 AI','Claude Code가 직접 그린 SVG를 이 PC에서 이미지로 저장해요. Claude 구독만 사용하며 Codex·별도 이미지 서비스·API 키는 필요 없어요. 그림은 벡터 일러스트풍으로, Codex 이미지 생성과 스타일이 달라요.'],
 ja:['使用する AI','Claude Code が描いた SVG をこの PC で画像に変換します。Claude の利用枠のみを使い、Codex・外部画像サービス・API キーは不要です。画像はベクターイラスト風になります。'],
 'zh-Hans':['选择 AI','Claude Code 绘制 SVG，并在本机转为图片。仅使用 Claude 订阅，无需 Codex、外部图片服务或 API 密钥。生成的是矢量插画风格，与 Codex 图片生成不同。'],
 'zh-Hant':['選擇 AI','Claude Code 繪製 SVG，並在本機轉為圖片。僅使用 Claude 訂閱，無需 Codex、外部圖片服務或 API 金鑰。生成的是向量插畫風格，與 Codex 圖片生成不同。']
};
const billingCopy={
 en:'Uses your Claude plan limits. To stay within the subscription, turn off paid usage credits / extra usage in your Claude account. NoteBuddy does not change your account billing settings.',
 ko:'Claude 구독의 이용 한도를 사용해요. 구독료 외 지출을 막으려면 Claude 계정의 유료 추가 사용량(Usage credits / Extra usage)을 꺼 주세요. 노트버디는 계정의 결제 설정을 바꾸지 않아요.',
 ja:'Claude プランの利用枠を使います。追加料金を避けるには Claude アカウントの Usage credits / Extra usage を無効にしてください。請求設定は変更しません。',
 'zh-Hans':'使用 Claude 订阅额度。要避免额外费用，请在 Claude 账户中关闭 Usage credits / Extra usage。本应用不会更改账户计费设置。',
 'zh-Hant':'使用 Claude 訂閱額度。要避免額外費用，請在 Claude 帳戶中關閉 Usage credits / Extra usage。本應用不會變更帳戶計費設定。'
};
for(const locale of Object.keys(providerCopy))providerCopy[locale][1]+=' '+billingCopy[locale];
const lang=()=>{const values=labels[document.documentElement.lang]||labels.en;return document.querySelector('#desktop-provider')?.value==='claude'?values.map(v=>v.replaceAll('Codex CLI','Claude Code').replaceAll('Codex','Claude Code').replaceAll('codex login','claude auth login')):values;};
const button=document.createElement('button');button.id='desktop-settings';button.type='button';button.className='quiet';
const dialog=document.createElement('dialog');dialog.id='desktop-dialog';dialog.innerHTML=`<h2></h2><p class="desktop-explain"></p><form><label><span id="desktop-provider-label"></span><select id="desktop-provider"><option value="codex">Codex CLI</option><option value="claude">Claude Code</option></select></label><p id="desktop-image-mode"></p><label><span id="desktop-path-label"></span><input id="desktop-cli" maxlength="2000" autocomplete="off"></label><label><span id="desktop-model-label"></span><input id="desktop-model" maxlength="100" autocomplete="off"></label><div class="dialog-actions"><button type="submit" class="primary"></button><button type="button" id="desktop-check"></button></div></form><p id="desktop-result" role="status"></p><pre id="desktop-error"></pre><div class="dialog-actions"><button type="button" id="desktop-cancel"></button><button type="button" id="desktop-backup"></button><button type="button" id="desktop-folder"></button><button type="button" id="desktop-close" class="quiet"></button></div>`;
document.body.append(dialog);
(document.querySelector('.header-controls')||document.querySelector('header')||document.body).prepend(button);
const $=id=>dialog.querySelector(id),say=text=>$('#desktop-result').textContent=text;
let profiles={codex:{path:'',model:''},claude:{path:'',model:''}};
function translate(){const l=lang(),p=providerCopy[document.documentElement.lang]||providerCopy.en;button.textContent=l[0];dialog.querySelector('h2').textContent=l[1];dialog.querySelector('.desktop-explain').textContent=l[2];$('#desktop-provider-label').textContent=p[0];$('#desktop-image-mode').textContent=p[1];$('#desktop-image-mode').hidden=$('#desktop-provider').value!=='claude';$('#desktop-path-label').textContent=l[3];$('#desktop-model-label').textContent=l[4];dialog.querySelector('[type=submit]').textContent=l[5];$('#desktop-check').textContent=l[6];$('#desktop-cancel').textContent=l[7];$('#desktop-close').textContent=l[8];$('#desktop-backup').textContent=l[9];$('#desktop-folder').textContent=l[10];}
$('#desktop-provider').onchange=()=>{const profile=profiles[$('#desktop-provider').value];$('#desktop-cli').value=profile.path;$('#desktop-model').value=profile.model;say('');$('#desktop-error').textContent='';translate();};
new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});translate();
async function info(check=false){try{say('…');const result=await rpc('desktop.info',{check,...(check?{provider:$('#desktop-provider').value}:{})});profiles=result.profiles||profiles;$('#desktop-provider').value=result.settings.provider||'codex';$('#desktop-cli').value=result.settings.path;$('#desktop-model').value=result.settings.model;translate();$('#desktop-error').textContent=result.lastError||result.error||'';say(check?(result.compatible&&result.loggedIn?`${lang()[11]} · ${result.version}`:lang()[12]):'');$('#desktop-cancel').disabled=!result.busy;}catch(e){say(e.message);}}
button.onclick=()=>{translate();dialog.showModal();info();};
$('#desktop-close').onclick=()=>dialog.close();
$('#desktop-check').onclick=()=>info(true);
dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();try{const provider=$('#desktop-provider').value,path=$('#desktop-cli').value.trim(),model=$('#desktop-model').value.trim();await rpc('desktop.configure',{provider,path,model});profiles[provider]={path,model};document.body.dataset.aiProvider=provider;window.dispatchEvent(new Event('desktop-provider-changed'));say(lang()[13]);}catch(e){say(e.message);}};
$('#desktop-cancel').onclick=async()=>{await rpc('desktop.cancel');await info();};
$('#desktop-backup').onclick=async()=>{try{const value=await window.pywebview.api.backup();say(value?`${lang()[14]} ${value}`:lang()[15]);}catch(e){say(e.message);}};
$('#desktop-folder').onclick=async()=>{try{await window.pywebview.api.open_data_folder();}catch(e){say(e.message);}};
// Keep connection/cancellation reachable while the game's normal controls lock.
new MutationObserver(()=>{if(button.disabled)button.disabled=false;for(const e of dialog.querySelectorAll('button,input,select'))if(e.disabled&&e.id!=='desktop-cancel')e.disabled=false;}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['disabled']});
