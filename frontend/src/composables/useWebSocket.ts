import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

// 預設的 WebSocket 伺服器 URL (通過 Vite 環境變數注入)
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

// WebSocket 連線狀態
export enum ConnectionStatus {
  CONNECTING = '連接中...',
  OPEN = '已連線',
  CLOSED = '已斷線',
  RECONNECTING = '重連中...',
  AUTH_PENDING = '等待認證...'
}

/**
 * 封裝 Vue 3 的 WebSocket 連線邏輯，包含心跳、自動重連與認證握手。
 * @param authStore Pinia 認證 Store
 */
export function useWebSocket() {
  const router = useRouter()
  const authStore = useAuthStore()
  const socket = ref<WebSocket | null>(null)
  const messages = ref<any[]>([])
  const status = ref<ConnectionStatus>(ConnectionStatus.CLOSED)

  // 自動重連相關變數
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  const MAX_RECONNECT_ATTEMPTS = 10
  const HEARTBEAT_INTERVAL = 30000 // 30 秒心跳
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  // 指數退避延遲計算
  const getReconnectDelay = (attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000)
  }

  // 發送心跳 (PING)
  const startHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      if (socket.value?.readyState === WebSocket.OPEN) {
        socket.value.send(JSON.stringify({ type: 'PING' }))
      }
    }, HEARTBEAT_INTERVAL)
  }

  // 執行認證握手
  const performAuthHandshake = () => {
    if (socket.value?.readyState === WebSocket.OPEN && authStore.nickname) {
      console.log('--- 進行 HELLO 認證握手 ---')
      status.value = ConnectionStatus.AUTH_PENDING
      socket.value.send(JSON.stringify({
        type: 'HELLO',
        nickname: authStore.nickname,
        timestamp: Date.now()
      }))
    }
  }

  // 連線/重連邏輯
  const connect = () => {
    if (socket.value && (socket.value.readyState === WebSocket.OPEN || socket.value.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('達到最大重連次數，停止重連。')
      status.value = ConnectionStatus.CLOSED
      return
    }

    status.value = reconnectAttempts > 0 ? ConnectionStatus.RECONNECTING : ConnectionStatus.CONNECTING

    try {
      socket.value = new WebSocket(WS_URL)
      socket.value.onopen = () => {
        console.log('WebSocket 連線成功')
        reconnectAttempts = 0
        performAuthHandshake() // 連線成功後立即進行認證
        startHeartbeat()
      }

      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'PONG') {
            // 收到 PONG，忽略
            return
          }

          if (data.type === 'WELCOME') {
            // 收到 WELCOME (認證成功)
            status.value = ConnectionStatus.OPEN
            console.log('--- WELCOME 認證成功 ---')
            messages.value.push({
              text: `歡迎, ${data.nickname}! (連線 ID: ${data.id})`,
              sender: '系統',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: true
            })
            return
          }

          if (data.type === 'ERROR') {
            // 收到結構化錯誤
            console.error('WS 錯誤:', data.message)
            messages.value.push({
              text: `[錯誤] ${data.message}`,
              sender: '系統',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isError: true
            })

            if (data.code === 'AUTH_FAILED' || data.code === 'RATE_LIMIT') {
                // 認證失敗或速率限制錯誤，可能需要強制斷開或重新登入
                if (data.code === 'AUTH_FAILED') {
                    disconnect()
                    // 導向登入頁
                    router.push('/login')
                }
            }
            return
          }

          // 處理普通訊息
          if (data.text) {
             messages.value.push(data)
          }

        } catch (e) {
          console.error('處理訊息時發生錯誤:', e)
        }
      }

      socket.value.onclose = () => {
        console.log('WebSocket 連線關閉')
        status.value = ConnectionStatus.CLOSED
        if (heartbeatTimer) clearInterval(heartbeatTimer)

        if (authStore.nickname) {
            // 只有登入狀態才嘗試重連
            const delay = getReconnectDelay(reconnectAttempts++)
            console.log(\`將在 \${delay / 1000} 秒後嘗試重連...\`)
            reconnectTimer = setTimeout(connect, delay)
        }
      }

      socket.value.onerror = (error) => {
        console.error('WebSocket 錯誤:', error)
        socket.value?.close()
      }

    } catch (e) {
      console.error('建立 WebSocket 連線失敗:', e)
    }
  }

  // 訊息發送邏輯
  const sendMessage = (text: string) => {
    if (socket.value?.readyState === WebSocket.OPEN && authStore.nickname) {
      // 只需要發送 type: MESSAGE 和 text
      socket.value.send(JSON.stringify({ type: 'MESSAGE', text }))
      return true
    } else {
      console.warn('WebSocket 尚未連線或認證未通過，無法發送訊息。')
      return false
    }
  }

  // 斷開連線
  const disconnect = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    socket.value?.close()
    status.value = ConnectionStatus.CLOSED
    console.log('手動斷開連線並清除重連定時器')
  }

  // 監聽暱稱變化 (用於登入/登出後的連線控制)
  watch(() => authStore.nickname, (newNickname, oldNickname) => {
    if (newNickname && !oldNickname) {
        // 登入
        connect()
    } else if (!newNickname && oldNickname) {
        // 登出
        disconnect()
        // 確保返回登入頁
        if (router.currentRoute.value.meta.requiresAuth) {
             router.push('/login')
        }
    }
  }, { immediate: true })

  onUnmounted(() => {
    disconnect()
  })

  return {
    messages,
    status,
    sendMessage,
    disconnect
  }
}
