# Vue 3 + WebSocket 即時聊天室專案教學指南

歡迎來到這個即時聊天室的教學專案！這個專案不僅是一個可運行的 MVP (Minimum Viable Product)，更是一個設計用來教學全端開發的範例。我們將從基礎開始，逐步解構專案的每個部分，讓您了解為什麼要這樣設計、如何實作，以及如何擴充。無論您是初學者還是資深開發者，都能從中學習到 Vue 3 前端、Node.js 後端、WebSocket 通訊、Docker 部署與安全最佳實務。

## 🌟 專案目標與學習價值

### 為什麼這個專案適合教學？
- **模組化設計**：專案分為前端、後端、Docker 與測試模組，每部分都可以獨立學習或修改。
- **實戰導向**：從零生成專案，讓您理解全端開發流程，包括認證、通訊、安全與部署。
- **漸進學習**：我們會逐步解釋每個檔案的功能、設計決策，以及常見坑點。
- **可擴充性**：專案骨架易於添加新功能，如多房間聊天、訊息儲存 (MongoDB) 或 JWT 進階認證。
- **安全意識**：融入 XSS 防護、速率限制、心跳機制等實務，讓您學習如何避免常見漏洞。

### 學習目標
通過這個專案，您將學到：
1. Vue 3 的 Composition API 與 Pinia 狀態管理。
2. WebSocket 的封裝、重連與心跳機制。
3. Node.js 後端的 WebSocket 伺服器實作與安全強化。
4. Docker 的開發/生產環境配置與多階段建置。
5. E2E 測試的撰寫與執行。

預估學習時間：初學者 4-6 小時，資深者 1-2 小時。

## 🛠️ 先決條件

在開始前，請確保您的環境準備好：
- **Node.js**：v20+ (推薦使用 nvm 管理版本)。
- **Docker & Docker Compose**：用於容器化部署 (教學中會詳細說明)。
- **瀏覽器**：Chrome 或 Firefox (支援 WebSocket)。
- **編輯器**：VS Code (推薦安裝 Vue、Tailwind、ESLint 擴充套件)。
- **知識基礎**：基本 JavaScript、HTML/CSS。無 Vue/Node 經驗也 OK，我們會逐步教學。

如果您是初學者，建議先閱讀 Vue 官方文件 (vuejs.org) 的 Composition API 部分。

## 📂 專案結構概覽

生成後的專案結構如下（教學重點標註）：

```
vue3-chatroom-pro/
├── frontend/                   # 前端 Vue 3 應用 (教學重點: Composition API & Pinia)
│   ├── src/
│   │   ├── composables/        # 自訂 hooks (e.g., useWebSocket.ts - 教學 WebSocket 封裝)
│   │   ├── views/              # 頁面組件 (LoginView.vue & ChatView.vue - 教學 UI 與路由)
│   │   ├── stores/             # Pinia stores (authStore.ts - 教學狀態管理)
│   │   ├── assets/             # 靜態資源
│   │   ├── router/             # 路由配置 (index.ts - 教學導航守衛)
│   │   ├── index.css           # Tailwind 全局樣式 (教學 CSS 配置)
│   │   ├── main.ts             # 應用程式入口 (教學 Pinia 與 Router 整合)
│   │   └── App.vue             # 根組件
│   ├── vite.config.ts          # Vite 配置 (教學環境變數注入)
│   ├── tsconfig.json           # TypeScript 配置 (教學 TS 類型安全)
│   ├── tailwind.config.js      # Tailwind 配置 (教學響應式 UI)
│   ├── Dockerfile              # 開發 Docker 配置
│   └── Dockerfile.prod         # 生產 Docker 配置 (教學多階段建置)
├── backend/                    # 後端 Node.js 伺服器 (教學重點: WebSocket 安全實作)
│   ├── index.js                # WebSocket 伺服器 (教學認證、清洗、限流)
│   ├── package.json            # 依賴與 scripts (教學 E2E 測試命令)
│   └── Dockerfile              # 後端 Docker 配置
├── tests/                      # 測試腳本 (教學重點: E2E 驗收)
│   └── e2e-chat.js             # E2E 測試 (教學雙向通訊驗證)
├── .dockerignore               # Docker 忽略檔案 (教學 build 優化)
├── docker-compose.yml          # 開發環境配置 (教學熱重載)
├── docker-compose.prod.yml     # 生產環境配置 (教學 Nginx 代理)
└── README.md                   # 本文件 (教學指南)
```

**教學提示**：每個檔案都有註釋，解釋為什麼這麼寫 (e.g., 為什麼用 ref 而非 reactive)。

## 🚀 啟動與執行教學流程

### 步驟 1: 生成專案 (已執行腳本)
腳本已生成所有檔案。現在 cd 進入專案根目錄：
```bash
cd vue3-chatroom-pro
```

### 步驟 2: 安裝依賴 (教學: 為什麼分開安裝？)
前端與後端依賴分開，避免衝突。教學重點：使用 `npm install` 安裝，了解 package.json 的 dependencies/devDependencies 差異 (e.g., typescript 是 devDep，只用於開發)。
```bash
cd frontend && npm install
cd ../backend && npm install
cd ..
```

**教學解釋**：`npm install` 會根據 package.json 安裝庫 (e.g., vue@3.4.21)。如果您看到錯誤，檢查 Node 版本或運行 `npm cache clean --force`。

### 步驟 3: 啟動開發模式 (Docker 教學)
使用 Docker Compose 啟動，學習容器化優勢 (隔離環境、可移植)。
```bash
docker-compose up --build
```

- **前端**：訪問 http://localhost:5173 (Vite Dev Server，支援熱重載 - 修改檔案立即更新)。
- **後端**：內部運行於 3000 端口 (教學: 用 curl http://localhost:3000 檢查狀態)。
- **教學提示**：觀察 Docker logs (docker-compose logs)，了解連線過程 (e.g., HELLO 握手)。

如果不使用 Docker，本地啟動：
```bash
cd backend && npm start &  # 背景運行後端
cd ../frontend && npm run dev
```

### 步驟 4: 生產模式部署 (進階教學)
學習生產優化 (壓縮、代理、安全)。
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
- **前端**：http://localhost:8080 (Nginx 服務靜態檔案，代理 WS 至 /ws)。
- **教學解釋**：生產模式使用多階段建置 (builder stage 建置 dist，final stage 只 COPY 靜態檔)，減少 image 大小 80%+。移除 volumes 防止運行時代碼修改。

### 步驟 5: 執行 E2E 測試 (驗收教學)
測試驗證專案正確性，學習自動化測試重要性。
```bash
cd backend
npm run test:e2e
```

- **預期輸出**：顯示 Alice/Bob 認證、訊息交換成功。
- **教學提示**：如果失敗，檢查 WS_URL 或後端 logs (e.g., 認證失敗代碼 AUTH_FAILED)。這是 CI/CD 的基礎。

## 📚 詳細教學模組

讓我們逐步拆解專案，每模組包含**目標**、**關鍵程式碼解釋**、**設計決策**與**擴充練習**。

### 模組 1: 前端基礎 (Vue 3 + Vite + TypeScript)
- **目標**：建立響應式 UI 與狀態管理。
- **關鍵檔案**：main.ts (app 入口)、authStore.ts (Pinia store)、router/index.ts (導航守衛)。
- **設計決策**：使用 Composition API 而非 Options API，因為更靈活 (ref/watch)。Pinia 選擇 persistedstate 持久化暱稱，避免重新登入。
- **擴充練習**：在 authStore.ts 添加密碼驗證，改用 JWT (JSON Web Token)。

### 模組 2: WebSocket 通訊 (useWebSocket.ts)
- **目標**：封裝即時通訊邏輯。
- **關鍵程式碼**：connect() (連線 + 重連)、performAuthHandshake() (HELLO 握手)、sendMessage() (僅傳 text)。
- **設計決策**：指數退避重連避免伺服器負載 (1s -> 2s -> ... 30s max)。心跳防止閒置斷連。使用 VITE_WS_URL 處理環境差異 (本地 ws://localhost:3000, Docker ws://backend:3000)。
- **擴充練習**：添加 offline 模式 (localStorage 儲存未發訊息，重連時發送)。

### 模組 3: UI 與使用者體驗 (LoginView.vue + ChatView.vue)
- **目標**：建構登入與聊天介面。
- **關鍵程式碼**：LoginView (暱稱驗證 + setNickname)、ChatView (messages ref + watch 滾動)。
- **設計決策**：Tailwind 確保響應式 (mobile-first)。狀態指示燈 (綠/紅) 提升 UX。輸入 disabled 當斷線，避免無效操作。
- **擴充練習**：添加 emoji picker 或檔案上傳 (File API + Base64)。

### 模組 4: 後端伺服器 (index.js)
- **目標**：處理認證與廣播。
- **關鍵程式碼**：wss.on('connection') (認證 + 訊息處理)、sanitizeText() (XSS 防護)、broadcast() (廣播函數)。
- **設計決策**：HELLO 握手防偽造 sender。速率限使用 Map (記憶體高效)。心跳間隔 30s，符合 AWS 等雲端閒置規則。
- **擴充練習**：整合 MongoDB 儲存訊息 (mongoose)，添加 find 查詢歷史。

### 模組 5: Docker 部署與測試 (docker-compose + e2e-chat.js)
- **目標**：學習容器化與驗收。
- **關鍵程式碼**：docker-compose.yml (volumes 熱重載)、e2e-chat.js (Promise 異步測試)。
- **設計決策**：開發模式 volumes 方便 debug，生產移除提升安全。E2E 使用 sleep 確保時序。
- **擴充練習**：添加 CI/CD (GitHub Actions) 自動運行 E2E。

## ⚠️ 常見問題與除錯 (Troubleshooting)

- **連線失敗**：檢查 VITE_WS_URL (Docker 內用 backend:3000，本地用 localhost:3000)。瀏覽器 console 看錯誤。
- **認證失敗**：確保登入後發 HELLO。後端 logs 檢查 code (e.g., AUTH_FAILED)。
- **訊息不顯示**：確認 sanitizeText 未過濾內容。測試 E2E 驗證廣播。
- **Docker 錯誤**：運行 `docker-compose down -v` 清 cache，重試 up --build。
- **TS 錯誤**：運行 `npm run build` 檢查類型。

如果問題持續，檢查專案 GitHub issue 或 Stack Overflow "Vue WebSocket reconnect"。

## 🔮 擴充建議 (進階教學)

1. **多房間聊天**：後端使用 Map<roomId, Set<ws>> 隔離廣播。
2. **訊息儲存**：整合 MongoDB (mongoose)，onmessage 時 save。
3. **進階安全**：添加 JWT (jsonwebtoken)，HELLO 驗證 token。
4. **通知**：整合 FCM (Firebase Cloud Messaging) 推播離線訊息。
5. **效能優化**：後端使用 Redis Pub/Sub 取代內存廣播。

歡迎 fork 專案並貢獻！如果您有問題，留言討論。
