<template>
  <div class="app-sidebar">
    <div class="logo">
      🚨 应急快报
      <small>编辑审阅后台</small>
    </div>
    <div class="nav-item" :class="{ active: $route.path === '/events' }" @click="$router.push('/events')">
      📋 事件管理
    </div>
    <div class="nav-item" @click="$router.push('/admin')">
      ⚙️ 系统管理
    </div>
    <div style="flex:1"></div>
    <div class="nav-item" style="border-top:1px solid rgba(255,255,255,0.1);" @click="logout">
      🚪 退出登录
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>
