<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div v-if="!report" class="loading">加载中...</div>
      <template v-else>
        <div class="top-bar">
          <div>
            <a :href="`/events/${event?.id}`" style="font-size:12px;color:var(--text-light);">← 返回事件</a>
            <h1 style="margin-top:4px;">快报编辑</h1>
            <div class="flex gap-8" style="margin-top:4px;">
              <span class="badge" :class="report.status === 'final' ? 'badge-final' : 'badge-draft'">
                {{ report.status === 'final' ? '已定稿' : '待审阅' }}
              </span>
              <span style="font-size:12px;color:var(--text-light);">第 {{ report.version }} 版</span>
              <span style="font-size:12px;color:var(--text-light);">生成于 {{ report.created_at }}</span>
            </div>
          </div>
          <div class="flex gap-8">
            <button class="btn" @click="toggleDiff">{{ showDiff ? '隐藏差异' : '显示差异对比' }}</button>
            <button class="btn" @click="exportWord">📁 导出 Word</button>
            <button class="btn" @click="exportHtml">📄 导出 HTML</button>
            <button v-if="report.status !== 'final'" class="btn btn-success" @click="finalizeReport">✓ 定稿</button>
          </div>
        </div>

        <div v-if="report.diff_notes" class="diff-banner">💡 {{ report.diff_notes }}</div>

        <div v-if="showDiff && prevReport" style="margin-bottom:16px;">
          <div class="card">
            <div class="card-title">📊 与上版对比</div>
            <div style="font-size:13px;line-height:1.8;margin-bottom:12px;">
              <div><strong>本版 (v{{ report.version }})</strong> <span style="color:var(--text-light);margin-left:8px;">{{ report.created_at }}</span></div>
              <div style="height:1px;background:var(--border);margin:8px 0;"></div>
              <div><strong>上版 (v{{ prevReport.version }})</strong> <span style="color:var(--text-light);margin-left:8px;">{{ prevReport.created_at }}</span></div>
            </div>

            <!-- 差异详情 -->
            <div v-if="diffDetail.length > 0">
              <div v-for="sec in diffDetail" :key="sec.key" style="margin-bottom:12px;padding:10px;background:#f9f9f9;border-radius:6px;border:1px solid var(--border);">
                <div style="font-weight:600;font-size:14px;margin-bottom:6px;">{{ sec.title }}</div>

                <!-- 新增条目（绿底） -->
                <div v-for="(item, i) in sec.added" :key="'a-'+i"
                     style="padding:4px 8px;margin:2px 0;background:#e6ffed;border-left:3px solid #2da44e;border-radius:3px;font-size:13px;">
                  <span style="color:#2da44e;font-weight:700;margin-right:4px;">++</span> {{ item }}
                </div>

                <!-- 移除条目（红底） -->
                <div v-for="(item, i) in sec.removed" :key="'r-'+i"
                     style="padding:4px 8px;margin:2px 0;background:#ffeef0;border-left:3px solid #d73a49;border-radius:3px;font-size:13px;text-decoration:line-through;color:#666;">
                  <span style="color:#d73a49;font-weight:700;margin-right:4px;">--</span> {{ item }}
                </div>

                <!-- 无变化 -->
                <div v-if="sec.added.length === 0 && sec.removed.length === 0"
                     style="font-size:12px;color:#999;padding:4px 0;">无变化</div>
              </div>
            </div>
            <div v-else style="font-size:12px;color:#999;">加载差异数据中...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span>快报内容</span>
            <div style="font-size:12px;color:var(--text-light);">
              素材总量：{{ materials.length }}条
            </div>
          </div>

          <div v-if="parsedContent.length === 0" class="empty">暂无可编辑的内容</div>
          <div v-for="(sec, idx) in parsedContent" :key="sec.key" class="report-section">
            <div class="report-section-header">
              <span class="section-tag" :style="{ background: tagColor(sec.key), color: '#fff' }">{{ sec.title }}</span>
              <div style="font-size:11px;color:var(--text-light);">{{ sec.items.length }}条信息</div>
            </div>
            <div class="section-content">
              <div v-if="editingSection === idx">
                <textarea class="form-textarea" v-model="editText" style="min-height:120px;font-size:13px;"></textarea>
                <div class="flex gap-8 mt-16">
                  <button class="btn btn-sm btn-primary" @click="saveSection(idx)">保存</button>
                  <button class="btn btn-sm" @click="editingSection = null">取消</button>
                </div>
              </div>
              <template v-else>
                <div v-for="(item, i) in sec.items" :key="i" style="margin-bottom:4px;">• {{ item }}</div>
                <div class="source" v-if="sec.sources?.length">
                  来源：{{ getMaterialNames(sec.sources) }}
                </div>
                <button class="btn btn-sm mt-16" @click="startEdit(idx, sec)">✏️ 编辑此板块</button>
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
import { useRoute } from 'vue-router'
import { reportAPI, eventAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute()
const report = ref(null)
const event = ref(null)
const prevReport = ref(null)
const materials = ref([])
const editingSection = ref(null)
const editText = ref('')
const showDiff = ref(false)

const parsedContent = computed(() => {
  if (!report.value?.content) return []
  try { return JSON.parse(report.value.content) }
  catch { return [] }
})

function tagColor(key) {
  const colors = {
    event_overview: '#1890ff', casualties: '#ff4d4f',
    response_progress: '#52c41a', coordination: '#fa8c16',
    site_conditions: '#722ed1'
  }
  return colors[key] || '#999'
}

function getMaterialNames(sourceIds) {
  if (!sourceIds?.length) return ''
  return sourceIds.map(id => {
    const m = materials.value.find(mm => mm.id === id)
    return m ? `${m.user_name}(${m.type})` : ''
  }).filter(Boolean).join('、')
}

function startEdit(idx, sec) {
  editingSection.value = idx
  editText.value = sec.items.join('\n')
}

function saveSection(idx) {
  const content = JSON.parse(report.value.content)
  content[idx].items = editText.value.split('\n').filter(Boolean)
  report.value.content = JSON.stringify(content)
  editingSection.value = null
}

async function loadData() {
  try {
    const [repRes, evtRes] = await Promise.all([
      reportAPI.get(route.params.reportId),
      eventAPI.get(route.params.id)
    ])
    report.value = repRes.data
    event.value = evtRes.data
    materials.value = report.value.materials || []

    // 并行拉取上版对比（不阻塞主流程）
    if (report.value.version > 1) {
      reportAPI.listByEvent(route.params.id).then(res => {
        const prev = res.data.find(r => r.version === report.value.version - 1)
        if (prev) prevReport.value = prev
      }).catch(() => {})
    }
  } catch (e) {
    console.error('加载失败:', e)
  }
}

const diffDetail = computed(() => {
  if (!report.value?.diff_detail) return []
  try { return JSON.parse(report.value.diff_detail) }
  catch { return [] }
})

function toggleDiff() { showDiff.value = !showDiff.value }

async function finalizeReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  await reportAPI.finalize(route.params.reportId, user.id || 'admin')
  report.value.status = 'final'
}

async function exportWord() {
  try {
    const token = localStorage.getItem('token')
    const baseUrl = window.location.origin
    const url = `${baseUrl}/api/reports/${route.params.reportId}/export/word`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `应急快报_v${report.value.version}.docx`
    a.click()
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    alert('导出 Word 失败: ' + e.message)
  }
}

function exportHtml() {
  const token = localStorage.getItem('token')
  const url = `${window.location.origin}/api/reports/${route.params.reportId}/export/html`
  window.open(url, '_blank')
}

onMounted(loadData)
</script>
