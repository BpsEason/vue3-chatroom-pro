import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const nickname = ref<string | null>(null)

  function setNickname(name: string) {
    nickname.value = name
  }

  function logout() {
    nickname.value = null
  }

  return { nickname, setNickname, logout }
}, {
  // 使用 pinia-plugin-persistedstate 進行持久化儲存
  persist: true
})
