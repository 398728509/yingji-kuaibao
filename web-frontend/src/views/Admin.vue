<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>⚙️ 系统管理</h1>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <!-- 用户管理 -->
        <div class="card">
          <div class="card-title">
            <span>👥 用户管理（{{ users.length }}人）</span>
            <button class="btn btn-sm btn-primary" @click="showAddUser = true">＋ 添加用户</button>
          </div>
          <table class="table">
            <thead><tr><th>姓名</th><th>用户名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.displayName }}</td>
                <td style="font-size:12px;">{{ u.username }}</td>
                <td><span class="badge badge-active">{{ roleName(u.role) }}</span></td>
                <td><span :class="['badge', u.status === 'active' ? 'badge-active' : 'badge-closed']">{{ u.status }}</span></td>
                <td><button class="btn btn-sm btn-danger" @click="deleteUser(u.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 模板管理 -->
        <div class="card">
          <div class="card-title">
            <span>📄 快报模板</span>
          </div>
          <div v-for="t in templates" :key="t.id" style="padding:12px;background:#fafafa;border-radius:8px;margin-bottom:8px;">
            <div class="flex-between">
              <div>
                <strong>{{ t.name }}</strong>
                <span v-if="t.is_default" class="badge badge-final" style="margin-left:8px;">默认</span>
              </div>
              <button v-if="!t.is_default" class="btn btn-sm" @click="setDefault(t.id)">设为默认</button>
            </div>
            <div style="font-size:12px;color:var(--text-light);margin-top:4px;">
              板块：{{ t.config?.sections?.map(s => s.name).join('、') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Add User Modal -->
      <div v-if="showAddUser" class="modal-overlay" @click.self="showAddUser = false">
        <div class="modal">
          <h2>添加用户</h2>
          <div class="form-group">
            <label class="form-label">姓名</label>
            <input class="form-input" v-model="newUser.displayName" />
          </div>
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input class="form-input" v-model="newUser.username" />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input class="form-input" type="password" v-model="newUser.password" />
          </div>
          <div class="form-group">
            <label class="form-label">角色</label>
            <select class="form-select" v-model="newUser.role">
              <option value="reporter">信息员</option>
              <option value="reviewer">编辑审核员</option>
              <option value="commander">指挥官</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">手机号</label>
            <input class="form-input" v-model="newUser.phone" placeholder="可选" />
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;">
            <button class="btn" @click="showAddUser = false">取消</button>
            <button class="btn btn-primary" @click="addUser">添加</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userAPI, templateAPI, authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const users = ref([])
const templates = ref([])
const showAddUser = ref(false)
const newUser = ref({ displayName: '', username: '', password: '', role: 'reporter', phone: '' })

function roleName(r) {
  return { admin: '管理员', reporter: '信息员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

async function loadData() {
  const [u, t] = await Promise.all([userAPI.list(), templateAPI.list()])
  users.value = u.data
  templates.value = t.data
}

async function addUser() {
  await authAPI.login(newUser.value.username, newUser.value.password) // just register
  const res = await authAPI.register({
    username: newUser.value.username,
    password: newUser.value.password,
    displayName: newUser.value.displayName,
    role: newUser.value.role,
    phone: newUser.value.phone
  })
  showAddUser.value = false
  newUser.value = { displayName: '', username: '', password: '', role: 'reporter', phone: '' }
  loadData()
}

async function deleteUser(id) {
  if (!confirm('确认删除该用户？')) return
  await userAPI.delete(id)
  loadData()
}

async function setDefault(id) {
  await templateAPI.setDefault(id)
  loadData()
}

onMounted(loadData)
</script>
