/**
 * WebSocket 客户端
 * 支持：自动断线重连、自定义事件通知
 */

const WS_RECONNECT_DELAY = 3000 // 重连间隔 (ms)
const WS_MAX_RETRIES = 10       // 最大重连次数

function createWebSocket() {
  let ws = null
  let retries = 0
  let reconnectTimer = null
  let destroyed = false

  function connect() {
    if (destroyed) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws`

    try {
      ws = new WebSocket(url)
    } catch (e) {
      console.warn('[WS] 创建连接失败:', e)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log('[WS] 已连接')
      retries = 0
      dispatchEvent('ws-connected', {})
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // 用 CustomEvent 在 window 上广播
        const customEvent = new CustomEvent('ws-message', { detail: data })
        window.dispatchEvent(customEvent)
      } catch (e) {
        console.warn('[WS] 解析消息失败:', e)
      }
    }

    ws.onclose = (e) => {
      console.log(`[WS] 断开(code=${e.code})`)
      dispatchEvent('ws-disconnected', { code: e.code })
      if (!destroyed) scheduleReconnect()
    }

    ws.onerror = (e) => {
      console.warn('[WS] 错误')
      ws?.close()
    }
  }

  function scheduleReconnect() {
    if (destroyed) return
    if (retries >= WS_MAX_RETRIES) {
      console.warn('[WS] 已达最大重连次数，停止重连')
      dispatchEvent('ws-max-retries', { retries })
      return
    }
    retries++
    const delay = WS_RECONNECT_DELAY * Math.min(retries, 5) // 指数退避，上限5倍
    console.log(`[WS] ${delay}ms 后重连 (${retries}/${WS_MAX_RETRIES})`)
    reconnectTimer = setTimeout(connect, delay)
  }

  function dispatchEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }

  function send(data) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data))
      return true
    }
    return false
  }

  function destroy() {
    destroyed = true
    clearTimeout(reconnectTimer)
    if (ws) {
      ws.onclose = null
      ws.onerror = null
      ws.close()
      ws = null
    }
  }

  // 立即启动连接
  connect()

  return { send, destroy, getState: () => ws?.readyState }
}

// 单例
let instance = null

export function getWS() {
  if (!instance) instance = createWebSocket()
  return instance
}

export function destroyWS() {
  if (instance) { instance.destroy(); instance = null }
}
