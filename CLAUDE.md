# japan-trip-2026.html 開發慣例

單一檔案的日本旅遊行程 PWA（vanilla JS + Firebase Realtime Database 同步）。景點頁面的資料都放在 `attractions` 物件裡，依 dayId（`d1`~`d6`，另外還有一個不對應任何行程日、純粹依城市分組的 `ueno`）分組，每組有 `region`、`city`、`overview`、`spots[]`。

## 新增／更新景點卡片時

- 每個 spot 都要有穩定、不隨陣列位置改變的 `id`（例如 `d5-s7`），不可用陣列 index 當 id。
- `icon` 依類型選：`i-pin`＝景點、`i-bowl`＝美食、`i-gift`＝伴手禮。
- `photo`：景點/美食照片，沒有照片先留空字串 `''`。**兩種來源擇一：**
  1. **使用者直接傳照片檔案給 Claude（最推薦、最穩定）**：把圖片存進 repo 的 `spot-photos/` 資料夾（檔名建議用 `<spotId>-關鍵字.jpg`，例如 `d4-s6-tateyama-eki.jpg`），`photo` 欄位直接填相對路徑（例如 `'spot-photos/d4-s6-tateyama-eki.jpg'`，不用 `https://` 開頭）。因為是跟著網站一起部署的靜態檔案，不會有外部網站擋圖、連結過期的問題，最可靠。
  2. **使用者提供網址**：`https://` 開頭的真實圖片網址。**絕對不要用 `https://encrypted-tbn0.gstatic.com/images?q=tbn:...` 這種 Google 圖片搜尋結果的縮圖連結。** 這種連結是 Google 的快取縮圖，很容易被 Google 擋掉外部網站/App 的嵌入請求（或連結本身會過期），實測在使用者手機上大量無法顯示（App 內只會退回顯示預設圖示，跟沒填照片視覺上一樣，等於白填）。正確做法：請使用者從 Google 圖片搜尋點進「造訪網站」到照片的原始來源網頁，直接在那個網頁上長按照片存取真正的圖片網址（該網站自己的圖床網址，例如 blog-static.kkday.com、static.gltjp.com、img.letsgojp.com、bubu-jp.com 等），或是直接請使用者提供官方旅遊網站/部落格文章網址，才穩定可用。
  - 遇到這種狀況，優先建議使用者用方法 1（直接傳照片檔案），從根本上避免外部連結失效的問題。
- `desc` 文字介紹的長度依類型而定：
  - `i-pin`（景點）：查詢網路資料後，寫成 **5～6 句**完整介紹（歷史、特色、規模、當季亮點等），語氣與既有景點卡一致。
  - `i-bowl` / `i-gift`（美食、伴手禮）：維持簡短 1～2 句（是什麼＋在哪裡/營業時間），不用寫成長篇介紹。
- 只要 `desc` 是查詢網路資料寫成的（也就是 `i-pin` 類型），一定要附上 `source` 欄位（來源網址），會自動顯示在卡片介紹下方的小字「資料來源」連結。純粹既有資料改寫的短句（多數美食/伴手禮）則不必附來源。
- 新增的城市如果目前 `attractions` 裡沒有對應的 dayId（例如上野、常滑這種行程中途經過、但不是某一天主要行程的地點），可以另外開一個不對應行程日的 key（如 `ueno`），只要 `city` 有加進 `ATTR_CITY_LIST` 陣列即可正常被城市篩選器抓到。

## 資料同步規則

`syncIsUserKey(key)` 判斷哪些 localStorage key 會同步到 Firebase：key 開頭是 `weather:` 或 `device:` 的都是「僅限本機裝置」，不會同步給全家人；其餘 key（包含景點的圖示/欄位覆寫、行前宣示內容等）都會同步。新增功能時如果資料應該要全家共用，key 就不要加 `device:` 前綴；反之如果是個人裝置設定（例如行前準備清單勾選狀態），要記得加上 `device:` 前綴。

## 測試流程

- 改完 JS 後先用 `node -e "new Function(fs.readFileSync('japan-trip-2026.html').toString().match(/<script>([\s\S]*?)<\/script>/)[1])"` 這類寫法驗證語法。
- 用 `python3 -m http.server --directory /home/user/zichi-website` 起本機伺服器，搭配 Playwright 驗證渲染結果（例如卡片的 `img src`、句數、資料來源連結是否正確）。
- 本機 sandbox 對外網路會擋掉大部分網域（含圖片來源網域），所以照片在本機測試時不會真的顯示出來、只能驗證 `src` 屬性是否正確，但在使用者實際裝置上會正常顯示。

## Firebase Realtime Database 安全規則

`database.rules.json` 只是備查用的參考檔案，**不會自動部署**（repo 裡沒有設定 Firebase CLI/GitHub Actions 的部署流程）。真正生效的規則要由使用者本人登入 Firebase Console 手動貼上並按「發布」：

https://console.firebase.google.com/project/japantrip2026-4f24d/database/japantrip2026-4f24d-default-rtdb/rules

**現況（2026/10 旅程結束後）：旅程已結束，規則已改為唯讀保留當紀念**（`".read": true, ".write": false`）。App 仍可正常開啟瀏覽（首頁、每日行程、景點美食等內容都看得到），但編輯/打勾/新增等任何寫入動作都不會再同步出去（localStorage 本機寫入仍會成功，但不會再同步給其他人，也不會持久保留，下次清快取就不見了）。因為是唯讀，Firebase 就不會再寄「安全性較低」的提醒信了。

如果以後想重新開放編輯（例如規劃下一趟旅行、想沿用這個 App），把 `database.rules.json` 的 `.write` 改回 `true`，一樣要照上面連結手動在 Firebase Console 貼上並發布才會生效。

歷史脈絡：這個專案的 Realtime Database 當初是用「測試模式」建立的，Firebase 預設會在 30 天後自動鎖死測試模式的規則，旅程進行中曾經因為快到期收到提醒信，改成永久開放（`.write: true`）過一段時間；開放期間 Firebase 又寄來「規則安全性較低」的提醒信（只要是完全開放讀寫，這封信會不定期一直寄，沒有明確停止日期），旅程結束後才改成現在的唯讀狀態。

## Git 流程

先在 `claude/family-japan-itinerary-app-dfskh4` commit + push，再 fast-forward merge 到 `main` 並 push，兩個分支都要更新完，網站（GitHub Pages）才會顯示最新內容。
