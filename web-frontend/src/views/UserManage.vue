<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>👥 用户管理</h1>
        <div class="flex gap-8">
          <button class="btn btn-primary" @click="showAddUser = true">＋ 添加用户</button>
          <button class="btn" @click="$router.push('/admin')">← 返回系统管理</button>
        </div>
      </div>

      <div class="card">
        <table class="table">
          <thead><tr><th style="min-width:80px;">姓名</th><th style="min-width:70px;">用户名</th><th style="white-space:nowrap;">角色</th><th>单位</th><th style="white-space:nowrap;width:60px;">状态</th><th style="white-space:nowrap;width:60px;">操作</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.displayName }}</td>
              <td style="font-size:12px;">{{ u.username }}</td>
              <td><span class="badge badge-active" style="white-space:nowrap;">{{ roleName(u.role) }}</span></td>
              <td style="font-size:12px;color:var(--text-light);">{{ u.unit || '-' }}</td>
              <td style="white-space:nowrap;"><span :class="['badge', u.status === 'active' ? 'badge-active' : 'badge-closed']">{{ u.status === 'active' ? '正常' : '已停用' }}</span></td>
              <td style="white-space:nowrap;"><button class="btn btn-sm" @click="editUser(u)">编辑</button></td>
            </tr>
          </tbody>
        </table>
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
              <option value="reviewer">编辑员</option>
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

      <!-- Edit User Modal -->
      <div v-if="showEditUser" class="modal-overlay" @click.self="showEditUser = false">
        <div class="modal">
          <h2>编辑用户</h2>
          <div class="form-group">
            <label class="form-label">姓名</label>
            <input class="form-input" v-model="editForm.displayName" />
          </div>
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input class="form-input" :value="editForm.username" disabled style="color:#999;" />
          </div>
          <div class="form-group">
            <label class="form-label">角色</label>
            <select class="form-select" v-model="editForm.role">
              <option value="reporter">信息员</option>
              <option value="reviewer">编辑员</option>
              <option value="commander">指挥官</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">手机号</label>
            <input class="form-input" v-model="editForm.phone" placeholder="可选" />
          </div>
          <div class="form-group">
            <label class="form-label">单位</label>
            <input class="form-input" v-model="editForm.unit" placeholder="可选" />
          </div>
          <div class="form-group">
            <label class="form-label">账户状态</label>
            <div style="display:flex;gap:12px;margin-top:4px;">
              <label style="display:flex;align-items:center;gap:4px;">
                <input type="radio" v-model="editForm.status" value="active" />
                <span>正常</span>
              </label>
              <label style="display:flex;align-items:center;gap:4px;">
                <input type="radio" v-model="editForm.status" value="disabled" />
                <span style="color:var(--danger);">停用</span>
              </label>
            </div>
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;margin-top:16px;">
            <button class="btn" @click="showEditUser = false">取消</button>
            <button class="btn btn-primary" @click="saveUser">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userAPI, authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const users = ref([])
const showAddUser = ref(false)
const showEditUser = ref(false)
const editForm = ref({ id: '', displayName: '', username: '', role: 'reporter', phone: '', unit: '', status: 'active' })
const newUser = ref({ displayName: '', username: '', password: '', role: 'reporter', phone: '' })

function roleName(r) {
  return { admin: '管理员', reporter: '信息员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

async function loadData() {
  try {
    const r = await userAPI.list()
    users.value = r.data || []
  } catch (e) {
    console.error(e)
  }
}

async function addUser() {
  try {
    await authAPI.adminCreate({
      username: newUser.value.username,
      password: newUser.value.password,
      displayName: newUser.value.displayName,
      role: newUser.value.role,
      phone: newUser.value.phone
    })
    showAddUser.value = false
    newUser.value = { displayName: '', username: '', password: '', role: 'reporter', phone: '' }
    loadData()
  } catch (e) {
    alert(e.response?.data?.error || '添加用户失败')
  }
}

function editUser(u) {
  editForm.value = {
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    role: u.role,
    phone: u.phone || '',
    unit: u.unit || '',
    status: u.status
  }
  showEditUser.value = true
}

async function saveUser() {
  await userAPI.update(editForm.value.id, {
    displayName: editForm.value.displayName,
    role: editForm.value.role,
    phone: editForm.value.phone,
    unit: editForm.value.unit,
    status: editForm.value.status
  })
  showEditUser.value = false
  loadData()
}

onMounted(loadData)
</script>