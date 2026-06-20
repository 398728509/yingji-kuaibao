<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>🔑 邀请码管理</h1>
        <div class="flex gap-8">
          <button class="btn btn-primary" @click="generateInviteCodes">＋ 生成邀请码</button>
          <button class="btn" @click="$router.push('/admin')">← 返回系统管理</button>
        </div>
      </div>

      <div class="card">
        <table class="table" v-if="invites.length > 0">
          <thead><tr><th>邀请码</th><th>状态</th><th>有效期</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="ic in invites" :key="ic.id">
              <td style="font-family:monospace;font-size:12px;">{{ ic.code }}</td>
              <td><span :class="['badge', ic.is_active ? 'badge-active' : 'badge-closed']">{{ ic.is_active ? '有效' : '已使用/已作废' }}</span></td>
              <td style="font-size:12px;">{{ ic.expires_at || '永久' }}</td>
              <td><button class="btn btn-sm btn-danger" @click="deleteInviteCode(ic.id)" :disabled="!ic.is_active">作废</button></td>
            </tr>
          </tbody>
        </table>
        <div v-else style="text-align:center;padding:24px;color:var(--text-light);font-size:14px;">
          暂无邀请码
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const invites = ref([])

async function loadData() {
  try {
    const r = await authAPI.listInvites()
    invites.value = r.data || []
  } catch (e) {
    console.error(e)
  }
}

async function generateInviteCodes() {
  try {
    await authAPI.generateInvites()
    loadData()
  } catch (e) {
    alert(e.response?.data?.error || '生成邀请码失败')
  }
}

async function deleteInviteCode(id) {
  if (!confirm('确定作废此邀请码？')) return
  try {
    await authAPI.deleteInvite(id)
    loadData()
  } catch (e) {
    alert('操作失败')
  }
}

onMounted(loadData)
</script>