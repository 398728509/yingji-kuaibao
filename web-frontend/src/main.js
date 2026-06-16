import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import { getWS } from './utils/websocket'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// 启动 WebSocket 连接
if (localStorage.getItem('token')) {
  getWS()
}
