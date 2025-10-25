import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import ChatView from '@/views/ChatView.vue'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    }
  ]
})

// 導航守衛：檢查認證狀態
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.nickname) {
    // 需要認證但用戶未登入
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.nickname) {
    // 已登入用戶嘗試訪問登入頁
    next({ name: 'chat' })
  } else {
    next()
  }
})

export default router
