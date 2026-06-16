// 应急快报 - 服务层
// 封装 HTTP 请求和 WebSocket 连接

export class ApiClient {
  private baseUrl: string = 'http://10.0.0.1:3000/api';

  async request(method: string, path: string, body?: object): Promise<any> {
    const url = this.baseUrl + path;
    try {
      let fetchRequest: any = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) {
        fetchRequest.body = JSON.stringify(body);
      }
      const response = await fetch(url, fetchRequest);
      return JSON.parse(response.text);
    } catch (e) {
      console.error('API 请求失败：' + path + ' ' + JSON.stringify(e));
      return null;
    }
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: object) { return this.request('POST', path, body); }
  put(path: string, body?: object) { return this.request('PUT', path, body); }
  del(path: string) { return this.request('DELETE', path); }
}

export const api = new ApiClient();

// WebSocket 连接
let ws: WebSocket | null = null;
let wsCallbacks: Array<(data: any) => void> = [];

export function connectWebSocket(host: string = '10.0.0.1:3000') {
  if (ws) return;
  ws = new WebSocket(`ws://${host}/ws`);
  ws.onopen = () => console.log('📡 WebSocket 已连接');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      wsCallbacks.forEach(cb => cb(data));
    } catch (e) {}
  };
  ws.onclose = () => {
    console.log('📡 WebSocket 断开');
    ws = null;
    setTimeout(() => connectWebSocket(host), 5000);
  };
}

export function onWsMessage(callback: (data: any) => void) {
  wsCallbacks.push(callback);
}

export function subscribeEvent(eventId: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe', eventId }));
  }
}
