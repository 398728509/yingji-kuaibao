<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>📄 快报列表</h1>
        <div class="flex gap-8">
          <button class="btn btn-primary" @click="manualGenerate" :disabled="generating">
            {{ generating ? '生成中...' : '⏱ 手动生成' }}
          </button>
          <button class="btn" @click="$router.push(`/events/${$route.params.id}`)">← 返回事件</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>共 {{ reports.length }} 期快报</span>
          <span style="font-size:12px;color:var(--text-light);">最新快报每10分钟自动生成</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>版本</th>
              <th>生成时间</th>
              <th>状态</th>
              <th>差异说明</th>
              <th>审阅人</th>
              <th>定稿时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="reports.length === 0"><td colspan="7" class="empty">暂无快报</td></tr>
            <tr v-for="r in reports" :key="r.id">
              <td><strong>第{{ r.version }}版</strong></td>
              <td style="font-size:12px;">{{ r.created_at }}</td>
              <td>
                <span :class="['badge', r.status === 'final' ? 'badge-final' : 'badge-draft']">
                  {{ r.status === 'final' ? '已定稿' : '待审阅' }}
                </span>
              </td>
              <td style="font-size:12px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                {{ r.diff_notes || '-' }}
              </td>
              <td style="font-size:12px;">{{ r.reviewed_by || '-' }}</td>
              <td style="font-size:12px;">{{ r.reviewed_at || '-' }}</td>
              <td>
                <button class="btn btn-sm" @click="$router.push(`/events/${$route.params.id}/review/${r.id}`)">
                  {{ r.status === 'final' ? '查看' : '审阅' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { reportAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute()
const reports = ref([])
const generating = ref(false)

async function loadReports() {
  const res = await reportAPI.listByEvent(route.params.id)
  reports.value = res.data
}

async function manualGenerate() {
  generating.value = true
  try {
    await reportAPI.generate(route.params.id)
    await loadReports()
  } finally { generating.value = false }
}

onMounted(loadReports)
</script>
