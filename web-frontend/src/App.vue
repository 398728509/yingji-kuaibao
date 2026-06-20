<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { getWS, destroyWS } from '@/utils/websocket'

onMounted(() => {
  // 只在有登录 token 时才建立 WebSocket 连接
  // 避免登录页也反复重连抛出 "无效 token" 错误
  if (localStorage.getItem('token')) {
    getWS()
  }
})
onUnmounted(() => { destroyWS() })
</script>
