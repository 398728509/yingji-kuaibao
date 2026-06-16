<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <div>
          <h1>📋 信息员工作台</h1>
          <p style="font-size:13px;color:var(--text-light);margin-top:4px;">你好，{{ user.displayName }} · {{ user.role === 'reporter' ? '现场信息员' : roleName(user.role) }}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-primary" @click="showSubmit = true" v-if="activeEvents.length > 0">＋ 上报素材</button>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-bottom:20px;">
        <!-- 我的事件 -->
        <div class="card">
          <div class="card-title">
            <span>🚨 进行中事件</span>
          </div>
          <div v-if="activeEvents.length === 0" class="empty">暂无进行中的事件</div>
          <div v-for="e in activeEvents" :key="e.id"
               style="padding:12px;background:#fafafa;border-radius:8px;margin-bottom:8px;cursor:pointer;"
               @click="$router.push(`/events/${e.id}`)">
            <div class="flex-between">
              <strong>{{ e.title }}</strong>
              <span class="status-dot red"></span>
            </div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">📍 {{ e.location }}</div>
            <div style="font-size:11px;color:var(--text-light);margin-top:2px;">
              素材 {{ e.materialCount }} 条 · 快报 v{{ e.latestReport?.version || '-' }}
            </div>
          </div>
        </div>

        <!-- 最新动态 -->
        <div class="card">
          <div class="card-title">
            <span>📰 最新动态</span>
            <button class="btn btn-sm" @click="loadActivity">🔄 刷新</button>
          </div>
          <div v-if="activities.length === 0" class="empty">暂无动态</div>
          <div v-for="a in activities" :key="a.id" class="material-item">
            <div class="material-icon" :style="{ background: typeBg(a.type) }">
              {{ typeIcon(a.type) }}
            </div>
            <div class="material-content">
              <div class="preview">{{ a.content || a.voice_text || (a.type === 'photo' ? '[照片]' : '') || (a.type === 'voice' ? '[语音]' : '') }}</div>
              <div class="meta">
                {{ a.user_name }} · {{ formatTime(a.created_at) }}
                <span v-if="a.type === 'voice' && a.voice_text" style="color:var(--success);margin-left:4px;">✓ 已转文字</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快报摘要 -->
      <div class="card">
        <div class="card-title">
          <span>📄 最新快报概览</span>
          <div class="flex gap-8">
            <select class="form-input" style="width:200px;padding:4px 8px;font-size:12px;" v-model="selectedEventId" @change="loadLatestReport">
              <option v-for="e in activeEvents" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
          </div>
        </div>
        <div v-if="!latestReport" class="empty">该事件尚未生成快报</div>
        <template v-else>
          <div class="version-bar">
            <span class="v current">第{{ latestReport.version }}版</span>
            <span class="arrow">·</span>
            <span class="v">{{ latestReport.created_at }}</span>
            <span class="arrow">·</span>
            <span class="badge" :class="latestReport.status === 'final' ? 'badge-final' : 'badge-draft'">
              {{ latestReport.status === 'final' ? '已定稿' : '待审阅' }}
            </span>
            <span style="flex:1"></span>
            <button class="btn btn-sm" @click="$router.push(`/events/${selectedEventId}/review/${latestReport.id}`)">查看全文 →</button>
          </div>
          <div v-if="latestReport.diff_notes" class="diff-banner">💡 {{ latestReport.diff_notes }}</div>
          <div v-if="latestReport.content">
            <div v-for="sec in parsedContent" :key="sec.key" class="report-section" style="margin-bottom:8px;">
              <div class="report-section-header">
                <span class="section-tag" :style="{ background: secTagColor(sec.key), color: '#fff' }">{{ sec.title }}</span>
              </div>
              <div class="section-content" style="font-size:12px;padding:8px 12px;">
                <div v-for="(item, i) in sec.items.slice(0, 3)" :key="i">• {{ item }}</div>
                <div v-if="sec.items.length > 3" style="color:var(--text-light);margin-top:2px;">…还有 {{ sec.items.length - 3 }} 条</div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 上报素材弹窗 -->
      <div v-if="showSubmit" class="modal-overlay" @click.self="showSubmit = false">
        <div class="modal" style="min-width:500px;">
          <h2>📤 上报素材</h2>
          <div class="form-group">
            <label class="form-label">所属事件 *</label>
            <select class="form-select" v-model="submitData.eventId">
              <option value="">请选择事件</option>
              <option v-for="e in activeEvents" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">上报类型 *</label>
            <div class="flex gap-8">
              <button :class="['btn btn-sm', submitData.type === 'text' ? 'btn-primary' : '']" @click="submitData.type = 'text'">✏️ 文字</button>
              <button :class="['btn btn-sm', submitData.type === 'photo' ? 'btn-primary' : '']" @click="submitData.type = 'photo'">📷 照片</button>
              <button :class="['btn btn-sm', submitData.type === 'voice' ? 'btn-primary' : '']" @click="submitData.type = 'voice'">🎤 语音</button>
            </div>
          </div>
          <div class="form-group" v-if="submitData.type === 'text'">
            <label class="form-label">内容 *</label>
            <textarea class="form-textarea" v-model="submitData.content" placeholder="请输入现场情况描述..." style="min-height:120px;"></textarea>
          </div>
          <div class="form-group" v-if="submitData.type === 'photo'">
            <label class="form-label">照片</label>
            <div style="border:2px dashed var(--border);border-radius:8px;padding:30px;text-align:center;cursor:pointer;color:var(--text-light);">
              📷 点击上传照片（最多9张）
            </div>
          </div>
          <div class="form-group" v-if="submitData.type === 'voice'">
            <label class="form-label">录音</label>
            <div style="border:2px dashed var(--border);border-radius:8px;padding:30px;text-align:center;cursor:pointer;color:var(--text-light);">
              🎤 点击开始录音
            </div>
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;">
            <button class="btn" @click="showSubmit = false">取消</button>
            <button class="btn btn-primary" @click="submitMaterial" :disabled="!submitData.eventId || (submitData.type === 'text' && !submitData.content) || submitting">
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
          <div v-if="submitResult" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:13px;"
               :style="{ background: submitResult.success ? '#f6ffed' : '#fff2f0', color: submitResult.success ? '#52c41a' : '#ff4d4f' }">
            {{ submitResult.msg }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { eventAPI, materialAPI, reportAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const user = JSON.parse(localStorage.getItem('user') || '{}')
const activeEvents = ref([])
const activities = ref([])
const latestReport = ref(null)
const selectedEventId = ref('')

const showSubmit = ref(false)
const submitting = ref(false)
const submitResult = ref(null)
const submitData = ref({ eventId: '', type: 'text', content: '' })

const parsedContent = computed(() => {
  if (!latestReport.value?.content) return []
  try { return JSON.parse(latestReport.value.content) } catch { return [] }
})

function roleName(r) {
  return { admin: '管理员', reporter: '信息员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

function typeIcon(t) {
  return { text: '✏️', photo: '📷', voice: '🎤', video: '🎬' }[t] || '📄'
}

function typeBg(t) {
  return { text: '#e8f4fd', photo: '#fef7e8', voice: '#f6ffed', video: '#fff0f6' }[t] || '#f5f5f5'
}

function secTagColor(key) {
  const colors = { event_overview: '#1890ff', casualties: '#ff4d4f', response_progress: '#52c41a', coordination: '#fa8c16', site_conditions: '#722ed1' }
  return colors[key] || '#999'
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

async function loadActiveEvents() {
  const res = await eventAPI.list('active')
  activeEvents.value = res.data
  if (res.data.length > 0 && !selectedEventId.value) {
    selectedEventId.value = res.data[0].id
  }
}

async function loadActivity() {
  if (activeEvents.value.length === 0) return
  const mats = await materialAPI.listByEvent(activeEvents.value[0].id)
  activities.value = mats.data.slice(0, 20)
}

async function loadLatestReport() {
  if (!selectedEventId.value) { latestReport.value = null; return }
  const res = await reportAPI.getLatest(selectedEventId.value)
  latestReport.value = res.data
}

// WebSocket 实时更新
function handleWs(e) {
  const data = e.detail
  if (data.type === 'report_generated' || data.type === 'cycle_report') {
    if (data.eventId === selectedEventId.value) loadLatestReport()
    loadActivity()
  }
  if (data.type === 'material_created') {
    loadActivity()
  }
}

async function submitMaterial() {
  if (!submitData.value.eventId) return
  submitting.value = true
  submitResult.value = null
  try {
    await materialAPI.create({
      eventId: submitData.value.eventId,
      userId: user.id,
      type: submitData.value.type,
      content: submitData.value.content || ''
    })
    submitResult.value = { success: true, msg: '✅ 素材已提交，将纳入下一期快报' }
    submitData.value.content = ''
    loadActivity()
  } catch (e) {
    submitResult.value = { success: false, msg: '❌ 提交失败：' + (e.response?.data?.error || '网络错误') }
  } finally { submitting.value = false }
}

onMounted(() => {
  loadActiveEvents()
  setTimeout(() => { loadActivity(); loadLatestReport() }, 200)
  window.addEventListener('ws-message', handleWs)
})

onUnmounted(() => {
  window.removeEventListener('ws-message', handleWs)
})
</script>
