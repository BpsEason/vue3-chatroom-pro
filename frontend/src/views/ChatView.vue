<template>
  <div class="chat-container bg-gray-50 flex flex-col h-screen overflow-hidden">
    <!-- 頂部狀態列 -->
    <header class="bg-white shadow-md p-4 flex items-center justify-between sticky top-0 z-10">
      <h1 class="text-xl font-bold text-gray-800 flex items-center">
        <svg class="w-6 h-6 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        Pro Chat Room
      </h1>
      <div class="flex items-center space-x-4">
        <span :class="['px-3 py-1 text-sm font-medium rounded-full', statusClass]">
          {{ status }}
        </span>
        <button @click="handleLogout" class="text-sm text-red-500 hover:text-red-700 transition duration-150">
          登出 ({{ authStore.nickname }})
        </button>
      </div>
    </header>

    <!-- 訊息區域 -->
    <div class="chat-messages p-4 space-y-4 overflow-y-auto flex-grow" ref="messageContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['flex', msg.sender === authStore.nickname ? 'justify-end' : 'justify-start']"
      >
        <!-- 系統/錯誤訊息 -->
        <div v-if="msg.isSystem || msg.isError" class="w-full text-center">
          <span :class="['text-xs px-3 py-1 rounded-lg italic', msg.isError ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500']">
            {{ msg.text }} ({{ msg.time }})
          </span>
        </div>

        <!-- 一般訊息 -->
        <div v-else :class="['flex max-w-xs md:max-w-md space-x-2', msg.sender === authStore.nickname ? 'flex-row-reverse space-x-reverse' : '']">
          <div class="flex flex-col">
            <!-- 暱稱和時間 -->
            <div :class="['text-xs mb-1', msg.sender === authStore.nickname ? 'text-right text-gray-600' : 'text-left text-blue-500 font-medium']">
              {{ msg.sender === authStore.nickname ? '你' : msg.sender }}
              <span class="text-gray-400 ml-2 text-xs">{{ msg.time }}</span>
            </div>
            <!-- 訊息內容 -->
            <div :class="['px-4 py-2 rounded-xl shadow-md break-words', msg.sender === authStore.nickname ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200']">
              {{ msg.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 輸入區域 -->
    <footer class="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10">
      <form @submit.prevent="handleSend" class="flex space-x-3">
        <input
          v-model="messageInput"
          type="text"
          placeholder="輸入訊息 (最多 2000 字)..."
          maxlength="2000"
          required
          :disabled="status !== ConnectionStatus.OPEN"
          class="flex-grow px-4 py-3 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-gray-100"
        />
        <button
          type="submit"
          :disabled="!messageInput.trim() || status !== ConnectionStatus.OPEN"
          class="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition duration-200 shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          發送
        </button>
      </form>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useWebSocket, ConnectionStatus } from '@/composables/useWebSocket'

const router = useRouter()
const authStore = useAuthStore()

// 確保用戶已登入，否則導回登入頁（雖然 router 守衛已處理，但這是雙重保險）
if (!authStore.nickname) {
    router.push('/login')
}

const { messages, status, sendMessage, disconnect } = useWebSocket()
const messageInput = ref('')
const messageContainer = ref<HTMLElement | null>(null)

// 計算連線狀態的樣式
const statusClass = computed(() => {
  switch (status.value) {
    case ConnectionStatus.OPEN:
      return 'bg-green-100 text-green-700'
    case ConnectionStatus.CLOSED:
      return 'bg-red-100 text-red-700'
    case ConnectionStatus.RECONNECTING:
    case ConnectionStatus.CONNECTING:
    case ConnectionStatus.AUTH_PENDING:
      return 'bg-yellow-100 text-yellow-700 animate-pulse'
    default:
      return 'bg-gray-100 text-gray-500'
  }
})

// 處理訊息發送
const handleSend = () => {
  const text = messageInput.value.trim()
  if (text && status.value === ConnectionStatus.OPEN) {
    if (sendMessage(text)) {
      messageInput.value = '' // 發送成功後清空輸入
    }
  }
}

// 處理登出
const handleLogout = () => {
    disconnect() // 斷開連線
    authStore.logout() // 清除暱稱 (會觸發 useWebSocket 的 watch)
    router.push('/login') // 導航到登入頁
}

// 自動滾動到底部
const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

// 監聽訊息列表變化，在 DOM 更新後滾動
watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 首次加載時滾動到底部 (處理持久化狀態下的歷史訊息)
onMounted(() => {
    scrollToBottom()
})
</script>

<style scoped>
/* 專門為聊天訊息區域定義高度，使其填滿剩餘空間並可滾動 */
.chat-messages {
    /* 確保其高度是流動的 */
    min-height: 0;
}
</style>
