<template>
  <div class="app-sidebar">
    <div class="logo">
      🚨 应急快报
      <small>v0.1.0</small>
    </div>

    <div class="nav-item" :class="{ active: $route.path === '/dashboard' }" @click="$router.push('/dashboard')">
      📋 信息员工作台
    </div>
    <div class="nav-item" :class="{ active: $route.path === '/command' }" @click="$router.push('/command')">
      📊 指挥看板
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.1);margin:8px 16px;"></div>
    <div class="nav-item" :class="{ active: $route.path.startsWith('/events') }" @click="$router.push('/events')">
      🚨 事件管理
    </div>

    <div style="flex:1"></div>

    <div class="nav-item" @click="$router.push('/profile')"
         :class="{ active: $route.path === '/profile' }">
      👤 {{ user.displayName || '个人中心' }}
    </div>
    <div class="nav-item" style="border-top:1px solid rgba(255,255,255,0.1);" @click="logout">
      🚪 退出登录
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user') || '{}')

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>
