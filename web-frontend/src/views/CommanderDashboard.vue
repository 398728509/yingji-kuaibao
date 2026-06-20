<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <div>
          <h1>📊 指挥看板</h1>
          <p style="font-size:13px;color:var(--text-light);margin-top:4px;">实时态势总览 · 最后更新 {{ lastRefresh }}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn" @click="refreshAll">🔄 刷新</button>
          <button class="btn btn-success" onclick="window.print()">🖨️ 打印简报</button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        <div class="card" style="padding:16px;text-align:center;cursor:pointer;" @click="activeCount > 0 && $router.push('/events')">
          <div style="font-size:28px;color:var(--danger);font-weight:700;">{{ activeCount }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">进行中事件</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;cursor:pointer;" @click="totalMaterials > 0 && $router.push('/events')">
          <div style="font-size:28px;color:var(--primary);font-weight:700;">{{ totalMaterials }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">全部素材</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;cursor:pointer;" @click="totalReports > 0 && $router.push('/events')">
          <div style="font-size:28px;color:var(--success);font-weight:700;">{{ totalReports }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">已出快报</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;cursor:pointer;" @click="pendingReview > 0 && $router.push('/events')">
          <div style="font-size:28px;color:var(--warning);font-weight:700;">{{ pendingReview }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">待定稿</div>
        </div>
      </div>

      <!-- 事件卡片列表 -->
      <div class="card">
        <div class="card-title">
          <span>🚨 全部事件</span>
          <div class="flex gap-8">
            <button :class="['btn btn-sm', evFilter === 'active' ? 'btn-primary' : '']" @click="evFilter = 'active'">进行中</button>
            <button :class="['btn btn-sm', evFilter === 'all' ? 'btn-primary' : '']" @click="evFilter = 'all'">全部</button>
          </div>
        </div>
        <div v-if="filteredEvents.length === 0" class="empty">暂无事件</div>
        <div v-for="e in filteredEvents" :key="e.id"
             style="border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden;">
          <div style="display:flex;align-items:center;padding:16px;cursor:pointer;"
               @click="$router.push(`/events/${e.id}`)">
            <span class="status-dot" :class="e.status === 'active' ? 'red' : 'green'" style="flex-shrink:0;"></span>
            <div style="flex:1;margin-left:12px;">
              <div style="font-weight:600;">{{ e.title }}</div>
              <div style="font-size:12px;color:var(--text-light);">
                📍 {{ e.location }} · {{ e.materialCount }}条素材 · {{ e.reportCount }}期快报
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-right:12px;">
              <div style="font-size:20px;font-weight:700;color:var(--text);">{{ e.latestReport?.version || 0 }}</div>
              <div style="font-size:10px;color:var(--text-light);">最新版</div>
            </div>
            <div style="font-size:12px;color:var(--text-light);text-align:right;flex-shrink:0;">
              <div v-if="e.latestReport" style="font-size:11px;">{{ formatTime(e.latestReport.created_at) }}</div>
              <span class="badge" :class="e.status === 'active' ? 'badge-active' : 'badge-closed'">
                {{ e.status === 'active' ? '进行中' : '已关闭' }}
              </span>
            </div>
          </div>

          <!-- 点击跳转事件详情页面 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { eventAPI, reportAPI, materialAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const events = ref([])
const evFilter = ref('active')
const eventReports = ref({})
const lastRefresh = ref('')

const filteredEvents = computed(() => {
  if (evFilter.value === 'all') return events.value
  return events.value.filter(e => e.status === evFilter.value)
})

const activeCount = computed(() => events.value.filter(e => e.status === 'active').length)
const totalMaterials = computed(() => events.value.reduce((s, e) => s + (e.materialCount || 0), 0))
const totalReports = computed(() => events.value.reduce((s, e) => s + (e.reportCount || 0), 0))
const pendingReview = computed(() => {
  // simplified - just shows events with reports
  return events.value.filter(e => (e.reportCount || 0) > 0).length
})

function formatTime(t) {
  if (!t) return ''
  return t.substring(11, 16)
}

async function refreshAll() {
  const [evtRes] = await Promise.all([eventAPI.list()])
  events.value = evtRes.data
  lastRefresh.value = new Date().toLocaleTimeString('zh-CN')

  // Preload reports for active events — 并行拉取
  const activeEvents = events.value.filter(e => e.status === 'active')
  if (activeEvents.length > 0) {
    const results = await Promise.allSettled(
      activeEvents.map(e => reportAPI.getLatest(e.id))
    )
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.data) {
        eventReports.value[activeEvents[i].id] = r.value.data
      }
    })
  }
}

// Auto-refresh every 30s
let timer = null

function handleWs(e) {
  const data = e.detail
  if (['report_generated', 'cycle_report', 'material_created'].includes(data.type)) {
    setTimeout(refreshAll, 1000)
  }
}

onMounted(() => {
  refreshAll()
  timer = setInterval(refreshAll, 30000)
  window.addEventListener('ws-message', handleWs)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('ws-message', handleWs)
})
</script>
