<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { getWS, destroyWS } from '@/utils/websocket'
import { onUnmounted } from 'vue'

const ws = getWS()
onUnmounted(() => { destroyWS() })
</script>
