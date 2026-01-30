產品需求文件 (PRD)：MyVoice Clone MVP
1. 產品定義
名稱： MyVoice Clone MVP

目標： 建立一個極簡 Web 應用，讓使用者輸入文字後，調用 ElevenLabs API 使用指定的克隆聲音生成語音。

核心技術： Next.js (App Router), Tailwind CSS, ElevenLabs API.

2. 核心功能與邏輯 (Cursor 實作重點)
2.1 前端介面 (UI/UX)
佈局： 單頁式設計，使用 Tailwind CSS 確保響應式（RWD）。

文字輸入：

Textarea 支援最多 500 字，具備即時字數統計（例如：120/500）。

文字超過 500 字時，顯示紅色警告並禁用生成按鈕。

提供一個「清空」按鈕。

狀態回饋：

生成中： 按鈕顯示 Loading... 並進入 disabled 狀態。

錯誤處理： 若 API 報錯（如額度不足），以 Toast 或 alert 提示使用者。

音訊播放：

生成成功後，顯示 HTML5 播放器（<audio controls>）。

提供一個「下載 MP3」按鈕。

2.2 後端 API (/api/speak)
安全性： ELEVENLABS_API_KEY 必須儲存於 .env.local，嚴禁暴露於前端。

效能優化： 採用 Streaming (串流) 方式回傳音訊，以達成 3 秒內開始播放的目標。

API 配置：

Model: eleven_multilingual_v2 (支援繁體中文)。

Voice ID: 從環境變數 VOICE_ID 讀取。

Settings: stability: 0.5, similarity_boost: 0.75。

3. 使用者流程 (User Flow)
使用者輸入繁體中文或英文文字。

點擊「生成語音」按鈕。

前端呼叫 /api/speak，並傳送 text 參數。

後端調用 ElevenLabs API 並將音訊流 (Stream) 轉發至前端。

前端接收流並在播放器中自動播放，同時解鎖下載功能。

4. MVP 限制與規範 (防呆設計)
頻率限制： 為防止 API 額度被惡意消耗，同一 IP 每分鐘限制請求 5 次（可使用 lru-cache 簡單實作）。

緩存邏輯： 若輸入文字與上次相同，前端不重新觸發 API，直接播放現有音訊。

在地化： 所有介面文字、提示訊息均使用正體中文。

5. 技術環境配置 (.env.local)
請確保你的 Cursor 專案中有以下設定：

程式碼片段
ELEVENLABS_API_KEY=你的金鑰
VOICE_ID=你的克隆聲音ID