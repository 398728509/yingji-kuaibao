<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { useWebSocket } from '@/utils/websocket'
useWebSocket()
</script>
