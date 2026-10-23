const copy={
 saveQuotaError:['Local storage is full or this save is too large. Check available disk space.','디스크 공간이 부족하거나 저장할 데이터가 너무 커요. 남은 공간을 확인해 주세요.','空き容量が不足しているか、データが大きすぎます。','磁盘空间不足或存档过大。','磁碟空間不足或存檔過大。'],
 privacyStored:[
 'This computer stores your companion, recent chat (up to 64 messages / 40 KB), portraits, resized references, and stories in NoteBuddy’s private data folder. Language and theme stay in the app. Backups contain the same personal data. No Anna account or cloud save is used.',
 '친구·최근 대화(최대 64개 / 40KB)·초상화·크기를 조정한 참고 이미지·이야기를 이 PC의 노트버디 데이터 폴더에 저장해요. 언어와 테마도 앱에 보관해요. 백업에도 같은 개인 데이터가 포함돼요. Anna 계정이나 클라우드 저장은 사용하지 않아요.',
 '仲間、最近の会話（最大64件 / 40 KB）、画像、縮小した参考画像、物語はこの PC に保存されます。バックアップにも同じ個人データが含まれます。Anna アカウントやクラウド保存は使用しません。',
 '伙伴、最近对话（最多64条 / 40 KB）、图片、缩小后的参考图和故事保存在此电脑。备份包含相同个人数据。不使用 Anna 账户或云存档。',
 '夥伴、最近對話（最多64則 / 40 KB）、圖片、縮小後的參考圖和故事儲存在此電腦。備份包含相同個人資料。不使用 Anna 帳戶或雲端存檔。'],
 privacyAI:[
 'Explicit chat and enabled care reactions send game context and up to 12 recent messages through your signed-in Codex CLI. Drawing/photo creation sends the resized image for analysis, then a description for generation. AI needs internet and uses your Codex allowance. CLI/provider logs and generated-image copies follow their own retention rules. Removing game data does not remove those copies or your backups.',
 '대화와 켜 둔 돌봄 반응은 게임 상황·최근 최대 12개 메시지를 로그인된 Codex CLI로 보내요. 그림·사진 생성은 축소 이미지를 분석하고 특징으로 그림을 만들어요. AI는 인터넷과 내 Codex 사용량을 사용해요. CLI·제공자의 기록 및 생성 이미지 사본은 별도로 관리되며, 게임 데이터 삭제로 해당 사본이나 백업까지 지워지지는 않아요.',
 '会話、画像分析・生成、オンにしたケア反応はログイン済み Codex CLI を使用します。インターネットとご自身の利用枠が必要です。CLI・提供元のログや生成画像、バックアップはゲームデータ削除の対象外です。',
 '对话、图片分析和生成以及已开启的照料回应使用已登录的 Codex CLI，需要网络并消耗你的额度。删除游戏数据不会删除 CLI、服务提供商的记录、生成图片副本或备份。',
 '對話、圖片分析與生成及已開啟的照料回應使用已登入的 Codex CLI，需要網路並消耗你的額度。刪除遊戲資料不會刪除 CLI、服務提供商的記錄、生成圖片副本或備份。'],
 chatUsage:['Chat uses your Codex allowance. Recent chat and personality are saved on this computer.','대화는 내 Codex 사용량을 이용해요. 최근 대화와 성격은 PC에 저장해요.','会話は Codex の利用枠を使用し、この PC に保存されます。','对话使用 Codex 额度并保存在此电脑。','對話使用 Codex 額度並儲存在此電腦。'],
 genericError:['Could not complete the request. Open AI connection settings for CLI details. Saved progress is kept.','요청을 완료하지 못했어요. AI 연결 설정에서 상세 오류를 확인해 주세요. 저장한 진행은 유지돼요.','処理できませんでした。AI 接続設定で詳細を確認してください。','无法完成请求。请在 AI 连接设置中查看详情。','無法完成請求。請在 AI 連線設定中查看詳情。'],
 quotaError:['Check your Codex account usage before retrying.','내 Codex 계정 사용량을 확인한 뒤 다시 시도해 주세요.','Codex の利用枠を確認してください。','请检查 Codex 账户额度。','請檢查 Codex 帳戶額度。'],
 openAnna:['Could not connect to the local game service. Restart NoteBuddy. {error}','로컬 게임에 연결하지 못했어요. 노트버디를 다시 실행해 주세요. {error}','ローカルゲームに接続できません。再起動してください。 {error}','无法连接本地游戏。请重新启动。 {error}','無法連線本機遊戲。請重新啟動。 {error}'],
 storageError:['Could not access local storage. Check the data folder and disk space.','로컬 저장소에 접근하지 못했어요. 데이터 폴더와 디스크 공간을 확인해 주세요.','保存先と空き容量を確認してください。','请检查本地存储和磁盘空间。','請檢查本機儲存空間。'],
 permissionError:['Check Codex login and your local data folder permissions.','Codex 로그인과 데이터 폴더 권한을 확인해 주세요.','Codex のログインと保存先の権限を確認してください。','请检查 Codex 登录和文件夹权限。','請檢查 Codex 登入與資料夾權限。'],
 artVisionUnavailable:['This CLI/model cannot analyze images. Check AI settings, or meet a random companion.','현재 CLI·모델은 이미지를 분석하지 못해요. AI 설정을 확인하거나 랜덤 친구로 시작해 주세요.','AI 設定を確認するか、ランダムな仲間を選んでください。','请检查 AI 设置或选择随机伙伴。','請檢查 AI 設定或選擇隨機夥伴。']
};
export function desktopText(language,key){const value=copy[key];return value?.[Math.max(0,['en','ko','ja','zh-Hans','zh-Hant'].indexOf(language))];}
