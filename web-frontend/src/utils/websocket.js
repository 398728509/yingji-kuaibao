let ws = null
let reconnectTimer = null

export function useWebSocket() {
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    ws = new WebSocket(`${protocol}//${host}/ws`)

    ws.onopen = () => {
      console.log('📡 WebSocket 已连接')
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleMessage(data)
      } catch (e) { /* ignore */ }
    }

    ws.onclose = () => {
      console.log('📡 WebSocket 断开，5秒后重连')
      reconnectTimer = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function handleMessage(data) {
    // 全局事件总线方式：派发自定义事件
    window.dispatchEvent(new CustomEvent('ws-message', { detail: data }))
  }

  function subscribe(eventId) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', eventId }))
    }
  }

  function send(data) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  if (!ws) connect()

  return { subscribe, send }
}
