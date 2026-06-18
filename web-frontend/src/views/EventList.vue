<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>🚨 事件管理</h1>
        <button class="btn btn-primary" @click="showCreate = true">＋ 新建事件</button>
      </div>

      <div class="card">
        <div class="card-title">
          <span>进行中的事件</span>
          <div class="flex gap-8">
            <button :class="['btn btn-sm', { 'btn-primary': filter === 'active' }]" @click="filter = 'active'">进行中</button>
            <button :class="['btn btn-sm', { 'btn-primary': filter === 'all' }]" @click="filter = 'all'">全部</button>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>事件名称</th>
              <th>地点</th>
              <th>状态</th>
              <th>素材</th>
              <th>快报刊数</th>
              <th>最新快报</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="events.length === 0"><td colspan="8" class="empty">暂无事件</td></tr>
            <tr v-for="e in filteredEvents" :key="e.id">
              <td data-label="事件名称"><strong>{{ e.title }}</strong></td>
              <td data-label="地点" class="text-secondary">{{ e.location }}</td>
              <td data-label="状态">
                <span :class="['badge', e.status === 'active' ? 'badge-active' : 'badge-closed']">
                  {{ e.status === 'active' ? '进行中' : e.status === 'closed' ? '已关闭' : '已归档' }}
                </span>
              </td>
              <td data-label="素材">{{ e.materialCount }}</td>
              <td data-label="快报">{{ e.reportCount }}</td>
              <td data-label="最新快报">
                <span v-if="e.latestReport" style="font-size:12px;color:var(--text-light);">
                  v{{ e.latestReport.version }} · {{ formatTime(e.latestReport.created_at) }}
                </span>
                <span v-else style="color:#999;font-size:12px;">未生成</span>
              </td>
              <td data-label="创建时间" class="text-secondary" style="font-size:12px;">{{ formatTime(e.created_at) }}</td>
              <td>
                <button class="btn btn-sm" @click="$router.push(`/events/${e.id}`)">查看</button>
                <button v-if="e.status === 'active'" class="btn btn-sm" style="margin-left:4px;" @click="closeEvent(e.id)">关闭</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal">
          <h2>新建事件</h2>
          <div class="form-group">
            <label class="form-label">事件标题 *</label>
            <input class="form-input" v-model="newEvent.title" placeholder="如：6.16 某市地震" />
          </div>
          <div class="form-group">
            <label class="form-label">地点 *</label>
            <input class="form-input" v-model="newEvent.location" placeholder="如：某市辖区" />
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea class="form-textarea" v-model="newEvent.description" placeholder="事件简要描述"></textarea>
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;">
            <button class="btn" @click="showCreate = false">取消</button>
            <button class="btn btn-primary" @click="createEvent" :disabled="!newEvent.title || !newEvent.location">创建</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { eventAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const events = ref([])
const filter = ref('active')
const showCreate = ref(false)
const newEvent = ref({ title: '', location: '', description: '' })

const filteredEvents = computed(() => {
  if (filter.value === 'all') return events.value
  return events.value.filter(e => e.status === filter.value)
})

async function loadEvents() {
  const res = await eventAPI.list()
  events.value = res.data
}

function formatTime(t) {
  if (!t) return ''
  return t.substring(11, 16)
}

async function createEvent() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  await eventAPI.create({
    title: newEvent.value.title,
    location: newEvent.value.location,
    description: newEvent.value.description,
    createdBy: user.id || 'admin'
  })
  showCreate.value = false
  newEvent.value = { title: '', location: '', description: '' }
  loadEvents()
}

async function closeEvent(id) {
  if (!confirm('确认关闭该事件？')) return
  await eventAPI.close(id)
  loadEvents()
}

onMounted(loadEvents)
</script>
