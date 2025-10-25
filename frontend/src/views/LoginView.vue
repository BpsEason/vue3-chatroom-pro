<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 p-4">
    <div class="w-full max-w-sm bg-white rounded-xl shadow-2xl p-8 border border-blue-200">
      <h1 class="text-3xl font-extrabold text-center text-blue-700 mb-6">
        Vue3 Pro Chat
      </h1>
      <p class="text-center text-gray-500 mb-8">
        請輸入您的暱稱以加入聊天室
      </p>

      <form @submit.prevent="handleLogin">
        <div class="mb-6">
          <label for="nickname" class="block text-sm font-medium text-gray-700 mb-2">暱稱</label>
          <input
            v-model="inputNickname"
            id="nickname"
            type="text"
            required
            placeholder="請輸入 2-15 個字元"
            maxlength="15"
            minlength="2"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-sm text-lg"
          />
          <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="!isNicknameValid"
          class="w-full bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          進入聊天室
        </button>
      </form>
      
      <p class="mt-8 text-center text-xs text-gray-400">
        Powered by Vue 3 & WebSocket Pro
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const inputNickname = ref('')
const error = ref('')

const isNicknameValid = computed(() => {
  const name = inputNickname.value.trim()
  return name.length >= 2 && name.length <= 15
})

const handleLogin = () => {
  error.value = ''
  if (isNicknameValid.value) {
    authStore.setNickname(inputNickname.value.trim())
    // 成功設定暱稱後，導航守衛會自動處理連線和路由
    router.push('/')
  } else {
    error.value = '暱稱長度必須在 2 到 15 個字元之間。'
  }
}

// 如果已經有暱稱但意外來到登入頁，直接導航到聊天頁
if (authStore.nickname) {
    router.push('/')
}
</script>
