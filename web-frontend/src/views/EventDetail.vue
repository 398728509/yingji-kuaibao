<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main" style="overflow-y:auto;">
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
            <button v-if="event.status === 'active'" class="btn btn-primary" @click="manualGenerate" :disabled="generating">{{ generating ? '生成中...' : '⏱ 手动生成快报' }}</button>
            <button v-if="event.status === 'active'" class="btn btn-danger" @click="closeEvent">关闭事件</button>
          </div>
        </div>

        <div v-if="latestReport" class="card" style="margin-bottom:16px;">
          <div class="card-title" style="border-bottom:1px solid var(--border);padding-bottom:12px;">
            <div class="flex gap-8" style="align-items:center;">
              <span style="font-size:18px;">📋</span>
              <span style="font-weight:600;font-size:15px;">最新快报预览</span>
              <span class="v current" style="font-size:11px;padding:0 8px;height:20px;line-height:20px;">v{{ latestReport.version }}</span>
              <span style="font-size:12px;color:var(--text-light);">{{ formatTime(latestReport.created_at) }}</span>
              <span :class="['badge', latestReport.status === 'final' ? 'badge-final' : 'badge-draft']">{{ latestReport.status === 'final' ? '已定稿' : '待审阅' }}</span>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-sm btn-outline" @click="$router.push('/events/'+event.id+'/reports')">📄 全部快报</button>
              <button class="btn btn-sm btn-primary" @click="$router.push('/events/'+event.id+'/review/'+latestReport.id)">✏️ 审阅编辑</button>
            </div>
          </div>
          <div v-if="latestReport.diff_notes" style="background:#fff7e6;padding:8px 12px;margin:12px -16px 0;border-top:1px solid #ffd591;border-bottom:1px solid #ffd591;font-size:13px;color:#d46b08;">💡 {{ latestReport.diff_notes }}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div v-for="sec in parsedContent" :key="sec.key" class="preview-section">
              <div class="preview-section-header"><span class="section-tag" :style="{ background: tagColor(sec.key), color: '#fff' }">{{ sec.title }}</span></div>
              <div class="preview-section-body">
                <div v-for="(item, i) in sec.items" :key="i" class="preview-item">• {{ item }}</div>
                <div v-if="!sec.items || sec.items.length === 0" style="color:var(--text-light);font-size:12px;padding:8px;">（暂无内容）</div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card" style="margin-bottom:16px;text-align:center;padding:32px;">
          <div style="font-size:40px;margin-bottom:12px;">📋</div>
          <div style="font-size:16px;color:var(--text-light);margin-bottom:8px;">暂无快报</div>
          <div style="font-size:13px;color:var(--text-light);">点击上方"手动生成快报"按钮创建第一份快报</div>
        </div>

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
          <!-- 照片缩略图网格 -->
          <div class="materials-grid">
            <div v-for="m in photoMaterials" :key="m.id" class="material-photo-item">
              <img :src="m.file_path" class="material-thumb" @click="previewImg = m.file_path" @error="onImgError($event)" />
              <span class="meta">{{ m.user_name }}</span>
            </div>
          </div>
          <!-- 文字/语音素材列表 -->
          <div v-for="m in textMaterials" :key="m.id" class="material-item">
            <div :class="['material-icon']" :style="{ background: m.type === 'text' ? '#e8f4fd' : '#f6ffed' }">{{ m.type === 'text' ? '✏️' : '🎤' }}</div>
            <div class="material-content">
              <div class="preview">{{ m.content || m.voice_text || '(文件)' }}</div>
              <div class="meta">{{ m.user_name }} · {{ formatTime(m.created_at) }}</div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
  <!-- 图片预览灯箱 -->
  <div v-if="previewImg" class="preview-overlay" @click="previewImg=null">
    <span class="preview-close" @click="previewImg=null">&times;</span>
    <img :src="previewImg" class="preview-image" @click.stop />
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
const previewImg = ref(null)

const filteredMaterials = computed(() => {
  if (mFilter.value === 'all') return materials.value
  return materials.value.filter(m => m.type === mFilter.value)
})

const photoMaterials = computed(() => {
  const f = filteredMaterials.value
  return f.filter(m => m.type === 'photo' && m.file_path)
})

const textMaterials = computed(() => {
  const f = filteredMaterials.value
  return f.filter(m => m.type !== 'photo' || !m.file_path)
})

const parsedContent = computed(() => {
  if (!latestReport.value?.content) return []
  try { return JSON.parse(latestReport.value.content) } catch { return [] }
})

function onImgError(e) { e.target.style.display = 'none' }

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const pad = n => String(n).padStart(2,'0')
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())
}

function tagColor(key) {
  const colors = { event_overview: '#1890ff', casualties: '#ff4d4f', response_progress: '#52c41a', coordination: '#fa8c16', site_conditions: '#722ed1' }
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
  try { await reportAPI.generate(route.params.id); await loadData() } finally { generating.value = false }
}

function viewReports() { router.push('/events/'+route.params.id+'/reports') }

async function closeEvent() {
  if (!confirm('确认关闭事件？')) return
  await eventAPI.close(route.params.id)
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.materials-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.material-photo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.material-photo-item .meta {
  font-size: 10px;
  color: #999;
  white-space: nowrap;
}
.material-thumb {
  width: 100px;
  height: 75px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #f0f0f0;
  display: block;
}
.material-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.preview-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}
.preview-overlay .preview-image {
  max-width: min(800px, 85vw);
  max-height: min(600px, 80vh);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  cursor: default;
}
.preview-overlay .preview-close {
  position: fixed;
  top: 20px;
  right: 30px;
  font-size: 36px;
  color: #fff;
  cursor: pointer;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  transition: background 0.2s;
}
.preview-overlay .preview-close:hover {
  background: rgba(0,0,0,0.7);
}
</style>