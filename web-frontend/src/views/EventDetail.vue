<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div v-if="!event" class="loading">加载中...</div>
      <template v-else>
        <div class="top-bar">
          <div>
            <a href="/events" style="font-size:12px;color:var(--text-light);">← 返回事件列表</a>
            <h1 style="margin-top:4px;">{{ event.title }}</h1>
            <div class="flex gap-8" style="margin-top:4px;">
              <span class="badge badge-active">{{ event.status === 'active' ? '进行中' : '已关闭' }}</span>
              <span style="font-size:12px;color:var(--text-light);">📍 {{ event.location }}</span>
              <span style="font-size:12px;color:var(--text-light);">🕐 {{ event.created_at }}</span>
            </div>
          </div>
          <div class="flex gap-8">
            <button class="btn" @click="viewReports">📄 快报列表</button>
            <button v-if="event.status === 'active'" class="btn btn-primary" @click="manualGenerate" :disabled="generating">
              {{ generating ? '生成中...' : '⏱ 手动生成快报' }}
            </button>
            <button v-if="event.status === 'active'" class="btn btn-danger" @click="closeEvent">关闭事件</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <!-- 素材区 -->
          <div class="card">
            <div class="card-title">
              <span>📸 现场素材（{{ materials.length }}条）</span>
              <span class="flex gap-8">
                <button :class="['btn btn-sm', { 'btn-primary': mFilter === 'all' }]" @click="mFilter='all'">全部</button>
                <button :class="['btn btn-sm', { 'btn-primary': mFilter === 'text' }]" @click="mFilter='text'">文字</button>
                <button :class="['btn btn-sm', { 'btn-primary': mFilter === 'photo' }]" @click="mFilter='photo'">照片</button>
                <button :class="['btn btn-sm', { 'btn-primary': mFilter === 'voice' }]" @click="mFilter='voice'">语音</button>
              </span>
            </div>
            <div v-if="filteredMaterials.length === 0" class="empty">暂无素材</div>
            <div v-for="m in filteredMaterials" :key="m.id" class="material-item">
              <div :class="['material-icon', { 'bg-blue': m.type === 'text', 'bg-orange': m.type === 'photo', 'bg-green': m.type === 'voice' }]"
                   :style="{ background: m.type === 'text' ? '#e8f4fd' : m.type === 'photo' ? '#fef7e8' : '#f6ffed' }">
                {{ m.type === 'text' ? '✏️' : m.type === 'photo' ? '📷' : '🎤' }}
              </div>
              <div class="material-content">
                <div class="preview">{{ m.content || m.voice_text || '(文件)' }}</div>
                <div class="meta">{{ m.user_name }} · {{ formatTime(m.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- 当前快报区 -->
          <div>
            <div class="card">
              <div class="card-title">
                <span>📋 最新快报</span>
                <button v-if="latestReport" class="btn btn-sm" @click="$router.push(`/events/${event.id}/review/${latestReport.id}`)">审阅 →</button>
              </div>
              <div v-if="!latestReport" class="empty">尚未生成快报，点击"手动生成"按钮</div>
              <template v-else>
                <div class="version-bar">
                  <span class="v current">v{{ latestReport.version }}</span>
                  <span class="arrow">·</span>
                  <span class="v">{{ formatTime(latestReport.created_at) }}</span>
                  <span class="arrow">·</span>
                  <span :class="['badge', latestReport.status === 'final' ? 'badge-final' : 'badge-draft']">
                    {{ latestReport.status === 'final' ? '已定稿' : '待审阅' }}
                  </span>
                </div>
                <div v-if="latestReport.diff_notes" class="diff-banner">💡 {{ latestReport.diff_notes }}</div>
                <div v-for="sec in parsedContent" :key="sec.key" class="report-section">
                  <div class="report-section-header">
                    <span class="section-tag" :style="{ background: tagColor(sec.key), color: '#fff' }">{{ sec.title }}</span>
                  </div>
                  <div class="section-content">
                    <div v-for="(item, i) in sec.items" :key="i" style="margin-bottom:4px;">• {{ item }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { eventAPI, materialAPI, reportAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute()
const router = useRouter()
const event = ref(null)
const materials = ref([])
const latestReport = ref(null)
const generating = ref(false)
const mFilter = ref('all')

const filteredMaterials = computed(() => {
  if (mFilter.value === 'all') return materials.value
  return materials.value.filter(m => m.type === mFilter.value)
})

const parsedContent = computed(() => {
  if (!latestReport.value?.content) return []
  try {
    return JSON.parse(latestReport.value.content)
  } catch { return [] }
})

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function tagColor(key) {
  const colors = {
    event_overview: '#1890ff',
    casualties: '#ff4d4f',
    response_progress: '#52c41a',
    coordination: '#fa8c16',
    site_conditions: '#722ed1'
  }
  return colors[key] || '#999'
}

async function loadData() {
  const [evt, mats, rep] = await Promise.all([
    eventAPI.get(route.params.id),
    materialAPI.listByEvent(route.params.id),
    reportAPI.getLatest(route.params.id)
  ])
  event.value = evt.data
  materials.value = mats.data
  latestReport.value = rep.data
}

async function manualGenerate() {
  generating.value = true
  try {
    await reportAPI.generate(route.params.id)
    await loadData()
  } finally { generating.value = false }
}

function viewReports() {
  router.push(`/events/${route.params.id}/reports`)
}

async function closeEvent() {
  if (!confirm('确认关闭事件？')) return
  await eventAPI.close(route.params.id)
  loadData()
}

onMounted(loadData)
</script>
