<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <div>
          <h1>📋 信息采集员工作台</h1>
          <p style="font-size:13px;color:var(--text-light);margin-top:4px;">你好，{{ user.displayName }} · {{ user.role === 'reporter' ? '信息采集员' : roleName(user.role) }}</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-primary" @click="showSubmit = true" v-if="activeEvents.length > 0">＋ 上报素材</button>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="dashboard-grid">
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
              <div class="preview">
              <template v-if="a.type === 'photo' && a.file_path">
                <img :src="a.file_path" class="material-thumb material-thumb-sm"
                     @click.stop="previewImg = a.file_path"
                     @error="onImgError($event)" />
              </template>
              <template v-else>{{ a.content || a.voice_text || (a.type === 'video' ? '[视频]' : '') }}</template>
            </div>
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
              <button :class="['btn btn-sm', submitData.type === 'video' ? 'btn-primary' : '']" @click="submitData.type = 'video'">🎬 视频</button>
            </div>
          </div>
          <div class="form-group" v-if="submitData.type === 'text'">
            <label class="form-label">内容 *</label>
            <textarea class="form-textarea" v-model="submitData.content" placeholder="请输入现场情况描述..." style="min-height:120px;"></textarea>
          </div>
          <div class="form-group" v-if="submitData.type === 'photo'">
            <label class="form-label">照片</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple @change="onPhotoSelect" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;" />
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">支持 JPG/PNG/WebP，最多9张，单张≤20MB</div>
            <div v-if="submitData.files?.length" style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
              <div v-for="(f, i) in submitData.files" :key="i" style="width:60px;height:60px;border-radius:6px;overflow:hidden;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-light);">📷 {{ f.name.substring(f.name.length-8) }}</div>
            </div>
          </div>
          <div class="form-group" v-if="submitData.type === 'video'">
            <label class="form-label">视频文件</label>
            <input type="file" accept="video/*" @change="onVoiceSelect" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;" />
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">支持 MP4/AVI/MOV，≤100MB</div>
            <div v-if="submitData.videoFile" style="margin-top:8px;padding:8px;background:#f6ffed;border-radius:8px;font-size:13px;">🎤 {{ submitData.videoFile.name }}</div>
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;">
            <button class="btn" @click="showSubmit = false">取消</button>
            <button class="btn btn-primary" @click="submitMaterial" :disabled="!submitData.eventId || (submitData.type === 'text' && !submitData.content) || submitting">
              {{ submitting ? '提交中...' : '提交' }}
            </button>
          </div>
          <div v-if="uploadProgress > 0 && uploadProgress < 100" style="margin-top:8px;">
            <div style="height:4px;background:#f0f0f0;border-radius:2px;overflow:hidden;">
              <div :style="{ width: uploadProgress + '%', height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }"></div>
            </div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">上传中 {{ uploadProgress }}%</div>
          </div>
          <div v-if="submitResult" style="margin-top:12px;padding:8px 12px;border-radius:8px;font-size:13px;"
               :style="{ background: submitResult.success ? '#f6ffed' : '#fff2f0', color: submitResult.success ? '#52c41a' : '#ff4d4f' }">
            {{ submitResult.msg }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览灯箱 -->
  <div v-if="previewImg" class="preview-overlay" @click="previewImg = null">
    <span class="preview-close">&times;</span>
    <img :src="previewImg" class="preview-image" @click.stop />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { eventAPI, materialAPI, reportAPI, uploadAPI } from '@/utils/api'
import { getWS } from '@/utils/websocket'
import Sidebar from '@/components/Sidebar.vue'

const user = JSON.parse(localStorage.getItem('user') || '{}')
const activeEvents = ref([])
const activities = ref([])
const latestReport = ref(null)
const selectedEventId = ref('')

const showSubmit = ref(false)
const submitting = ref(false)
const submitResult = ref(null)
const submitData = ref({ eventId: '', type: 'text', content: '', files: null, videoFile: null })
const uploadProgress = ref(0)
const previewImg = ref(null)

function onPhotoSelect(e) {
  submitData.value.files = Array.from(e.target.files || [])
}
function onVoiceSelect(e) {
  submitData.value.videoFile = e.target.files?.[0] || null
}

const parsedContent = computed(() => {
  if (!latestReport.value?.content) return []
  try { return JSON.parse(latestReport.value.content) } catch { return [] }
})

function onImgError(e) { e.target.style.display = 'none'; }

function roleName(r) {
  return { admin: '管理员', reporter: '信息采集员', reviewer: '编辑员', commander: '指挥官' }[r] || r
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
  uploadProgress.value = 0
  try {
    let filePath = null
    let fileSize = null

    // 上传文件（如果有）
    if (submitData.value.type === 'photo' && submitData.value.files?.length > 0) {
      const res = await uploadAPI.uploadPhotos(submitData.value.files, (p) => {
        uploadProgress.value = Math.round((p.progress || 0) * 100)
      })
      filePath = res.data[0]?.filePath
      fileSize = res.data[0]?.size
    } else if (submitData.value.type === 'video' && submitData.value.videoFile) {
      const res = await uploadAPI.upload(submitData.value.videoFile, (p) => {
        uploadProgress.value = Math.round((p.progress || 0) * 100)
      })
      filePath = res.data.filePath
      fileSize = res.data.size
    }

    await materialAPI.create({
      eventId: submitData.value.eventId,
      userId: user.id,
      type: submitData.value.type,
      content: submitData.value.content || '',
      filePath,
      fileSize
    })

    submitResult.value = { success: true, msg: '✅ 素材已提交，将纳入下一期快报' }
    submitData.value = { eventId: submitData.value.eventId, type: 'text', content: '', files: null, videoFile: null }
    loadActivity()
  } catch (e) {
    submitResult.value = { success: false, msg: '❌ 提交失败：' + (e.response?.data?.error || e.message || '网络错误') }
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
