import { WebSocket } from 'ws'

const WS_URL = 'ws://localhost:3000'
const USER1_NICK = 'Alice_Test'
const USER2_NICK = 'Bob_Test'
const TEST_MESSAGE = 'Hello from the E2E test suite!'
const TIMEOUT = 5000 // 5 秒超時

let ws1, ws2

function log(message) {
    console.log(`[E2E] ${message}`)
}

// 基礎延遲函數
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 建立連線並執行 HELLO 認證
 * @param {string} nickname 
 * @returns {WebSocket}
 */
function createAndAuthenticate(nickname) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL)

        const timeout = setTimeout(() => {
            log(\`\${nickname}: 連線/認證超時\`)
            ws.terminate()
            reject(new Error(\`\${nickname} 連線/認證超時\"))
        }, TIMEOUT)

        ws.on('open', () => {
            log(\`\${nickname}: 連線成功，準備認證...\`)
            // 執行 HELLO 握手
            ws.send(JSON.stringify({
                type: 'HELLO',
                nickname: nickname,
                timestamp: Date.now()
            }))
        })

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString())
                if (msg.type === 'WELCOME') {
                    clearTimeout(timeout)
                    log(\`\${nickname}: 認證成功 (ID: \${msg.id})\`)
                    resolve(ws)
                } else if (msg.type === 'ERROR') {
                    clearTimeout(timeout)
                    log(\`\${nickname}: 認證失敗: \${msg.message}\`)
                    reject(new Error(\`認證失敗: \${msg.message}\`))
                }
            } catch {}
        })

        ws.on('error', (err) => {
            clearTimeout(timeout)
            log(\`\${nickname}: 連線錯誤: \${err.message}\`)
            reject(err)
        })
    })
}

/**
 * 測試訊息發送與接收
 * @param {WebSocket} sender - 發送者 ws
 * @param {WebSocket} receiver - 接收者 ws
 * @param {string} expectedSender - 預期訊息的發送者名稱
 */
function testMessageExchange(sender, receiver, expectedSender) {
    return new Promise((resolve, reject) => {
        const messageToSend = \`[From \${expectedSender}] - \${TEST_MESSAGE}\`
        
        const timeout = setTimeout(() => {
            reject(new Error(\`訊息接收超時: \${expectedSender} 發送的訊息未收到。\`))
        }, TIMEOUT)

        receiver.once('message', (data) => {
            try {
                const msg = JSON.parse(data.toString())
                
                // 忽略系統訊息 (WELCOME, 加入/離開)
                if (msg.sender === '系統') return

                if (msg.type === 'MESSAGE' && msg.sender === expectedSender && msg.text === messageToSend) {
                    clearTimeout(timeout)
                    log(\`✅ 訊息交換成功: \${expectedSender} -> \${msg.text}\`)
                    resolve()
                } else if (msg.type === 'MESSAGE') {
                    // 接收到非預期的訊息，等待下一個
                    log(\`ℹ️ 收到非預期訊息 (類型: \${msg.type}, 內容: \${msg.text})\`)
                }
            } catch (e) {
                // 忽略非 JSON 錯誤
            }
        })

        // 發送訊息 (類型必須為 MESSAGE)
        sender.send(JSON.stringify({ type: 'MESSAGE', text: messageToSend }))
    })
}

async function runTests() {
    log('--- E2E 測試啟動：WebSocket 雙向通訊驗證 ---')
    
    try {
        // 1. 建立並認證連線 1 (Alice)
        ws1 = await createAndAuthenticate(USER1_NICK)
        
        // 2. 建立並認證連線 2 (Bob)
        ws2 = await createAndAuthenticate(USER2_NICK)

        await sleep(500) // 等待系統廣播訊息完成

        // 3. Alice 發送給 Bob
        await testMessageExchange(ws1, ws2, USER1_NICK)

        // 4. Bob 發送給 Alice
        await testMessageExchange(ws2, ws1, USER2_NICK)

        log('--- ✅ E2E 測試全部通過！ ---')
        process.exit(0)

    } catch (error) {
        log(\`--- ❌ E2E 測試失敗: \${error.message} ---\`)
        process.exit(1)
    } finally {
        // 確保關閉所有連線
        if (ws1) ws1.close()
        if (ws2) ws2.close()
    }
}

// 給予後端啟動時間
sleep(1000).then(runTests)
