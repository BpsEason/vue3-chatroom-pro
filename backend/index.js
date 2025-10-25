import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import path from 'path'

// 輔助函數：獲取當前目錄名
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const MESSAGE_MAX_LENGTH = 2000
const PAYLOAD_MAX_SIZE = 8 * 1024 // 8KB
const RATE_LIMIT_COUNT = 10      // 每秒最多發送 10 條
const HEARTBEAT_INTERVAL = 30000 // 30 秒心跳檢查
const PING_TIMEOUT = 10000       // 10 秒內未回應 PONG 則終止連線

// 紀錄每個連線的速率限制
const rateLimitMap = new Map()

// 訊息清洗 (基礎 XSS 防護)
const sanitizeText = (text) => {
    // ⚠️ 注意: 僅執行基本 HTML 轉義。生產環境建議使用 DOMPurify 或更強大的庫。
    if (typeof text !== 'string') return ''
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;')
               .trim().substring(0, MESSAGE_MAX_LENGTH)
}

// 結構化錯誤回傳
const sendError = (ws, message, code = 'GENERIC_ERROR') => {
    const errorMsg = JSON.stringify({
        type: 'ERROR',
        code: code,
        message: message,
        time: new Date().toLocaleTimeString()
    })
    if (ws.readyState === ws.OPEN) {
        ws.send(errorMsg)
    }
}

// 初始化 Express 和 HTTP 伺服器
const app = express()
app.use(express.json())
app.get('/', (req, res) => res.send({ status: 'Backend is running' }))

const server = createServer(app)
const wss = new WebSocketServer({ server })

// 將伺服器啟動邏輯獨立出來
const startServer = () => {
    server.listen(PORT, () => {
        console.log(\`✅ WebSocket/HTTP 伺服器運行於 http://localhost:\${PORT}\`)
    })
}

// ======================= WebSocket 連線處理 =======================

wss.on('connection', (ws, req) => {
    // 擴充 ws 物件，用於認證和心跳
    ws.isAlive = true
    ws.isAuthenticated = false
    ws.nickname = null
    ws.id = crypto.randomUUID()

    console.log(\`有新連線進入 (ID: \${ws.id})\`)

    // 重設心跳標記
    ws.on('pong', () => {
        ws.isAlive = true
    })

    // 接收訊息
    ws.on('message', (data, isBinary) => {
        const message = isBinary ? data : data.toString()

        // 1. Payload 大小限制
        if (message.length > PAYLOAD_MAX_SIZE) {
            return sendError(ws, '訊息過大，超過 8KB 限制。', 'PAYLOAD_TOO_LARGE')
        }

        try {
            const msg = JSON.parse(message)

            // 2. 心跳回應
            if (msg.type === 'PING') {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: 'PONG' }))
                }
                return
            }

            // 3. HELLO 認證握手
            if (msg.type === 'HELLO' && msg.nickname) {
                const sanitizedNickname = sanitizeText(msg.nickname).substring(0, 15)
                if (sanitizedNickname.length < 2) {
                     return sendError(ws, '暱稱無效或過短。', 'AUTH_FAILED')
                }

                ws.isAuthenticated = true
                ws.nickname = sanitizedNickname
                console.log(\`用戶 \${ws.nickname} (\${ws.id}) 認證成功\`)

                // 認證成功，回傳 WELCOME
                ws.send(JSON.stringify({
                    type: 'WELCOME',
                    nickname: ws.nickname,
                    id: ws.id,
                    time: new Date().toLocaleTimeString()
                }))
                // 向所有已連線用戶廣播新用戶加入訊息
                broadcast({
                    text: \`用戶 \${ws.nickname} 加入聊天室。\`,
                    sender: '系統',
                    isSystem: true
                }, null)

                return
            }

            // 4. 非認證用戶禁止發送一般訊息
            if (!ws.isAuthenticated) {
                return sendError(ws, '請先完成 HELLO 認證握手。', 'AUTH_REQUIRED')
            }

            // 5. 速率限制 (基於 IP 或連線 ID) - 這裡使用連線 ID
            const now = Date.now()
            const limit = rateLimitMap.get(ws.id) || { count: 0, lastCheck: now }

            if (now - limit.lastCheck > 1000) {
                limit.count = 0
                limit.lastCheck = now
            }

            if (limit.count >= RATE_LIMIT_COUNT) {
                rateLimitMap.set(ws.id, limit)
                return sendError(ws, \`發送頻率過高，每秒限 \${RATE_LIMIT_COUNT} 條訊息。\`, 'RATE_LIMIT')
            }

            limit.count++
            rateLimitMap.set(ws.id, limit)


            // 6. 處理一般訊息
            if (msg.type === 'MESSAGE' && msg.text) {
                const sanitizedText = sanitizeText(msg.text)
                
                if (sanitizedText.length === 0) return // 忽略空訊息

                const broadcastMsg = {
                    type: 'MESSAGE',
                    text: sanitizedText,
                    sender: ws.nickname, // 使用後端認證的暱稱
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
                
                broadcast(broadcastMsg, ws)
            }

        } catch (e) {
            console.error('無效的 JSON 或處理錯誤:', e.message)
            sendError(ws, '無效的訊息格式 (需為 JSON)。', 'INVALID_JSON')
        }
    })

    // 連線關閉
    ws.on('close', () => {
        console.log(\`連線關閉 (ID: \${ws.id})\`)
        rateLimitMap.delete(ws.id)
        
        if (ws.isAuthenticated) {
            broadcast({
                text: \`用戶 \${ws.nickname} 離開聊天室。\`,
                sender: '系統',
                isSystem: true
            }, null)
        }
    })
})

// 心跳檢查：定期終止不活躍連線
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log(\`終止不活躍連線 (ID: \${ws.id})\`)
            return ws.terminate()
        }
        ws.isAlive = false
        ws.ping()
    })
}, HEARTBEAT_INTERVAL)

wss.on('close', () => {
    clearInterval(interval)
})

/**
 * 廣播訊息給所有客戶端
 * @param {object} message - 要廣播的訊息物件
 * @param {WebSocket|null} senderWs - 發送者 (用於排除自己，null 則廣播給所有人)
 */
const broadcast = (message, senderWs) => {
    const data = JSON.stringify(message)
    wss.clients.forEach(c => {
        if (c.readyState === c.OPEN && c !== senderWs) {
            c.send(data)
        }
    })
}

// 啟動伺服器
startServer()
