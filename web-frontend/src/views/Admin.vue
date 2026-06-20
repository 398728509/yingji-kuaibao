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
            <thead><tr><th>姓名</th><th>用户名</th><th>角色</th><th>单位</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.displayName }}</td>
                <td style="font-size:12px;">{{ u.username }}</td>
                <td><span class="badge badge-active">{{ roleName(u.role) }}</span></td>
                <td style="font-size:12px;color:var(--text-light);">{{ u.unit || '-' }}</td>
                <td><span :class="['badge', u.status === 'active' ? 'badge-active' : 'badge-closed']">{{ u.status === 'active' ? '正常' : '已停用' }}</span></td>
                <td><button class="btn btn-sm" @click="editUser(u)">编辑</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 模板管理 -->
        <div class="card">
          <div class="card-title">
            <span>📄 快报模板</span>
            <button class="btn btn-sm btn-primary" @click="addNewTemplate">＋ 新建模板</button>
          </div>
          <div v-for="t in templates" :key="t.id" style="padding:12px;background:#fafafa;border-radius:8px;margin-bottom:8px;">
            <div class="flex-between">
              <div>
                <strong>{{ t.name }}</strong>
                <span v-if="t.is_default" class="badge badge-final" style="margin-left:8px;">默认</span>
              </div>
              <div class="flex gap-8">
                <button class="btn btn-sm" @click="editTemplate(t)">编辑</button>
                <button v-if="!t.is_default" class="btn btn-sm" @click="setDefault(t.id)">设为默认</button>
                <button v-if="!t.is_default" class="btn btn-sm btn-danger" @click="deleteTemplate(t)">删除</button>
              </div>
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

      <!-- Template Edit Modal -->
      <div v-if="showTemplateEditor" class="modal-overlay" @click.self="showTemplateEditor = false">
        <div class="modal" style="max-width: 600px;">
          <h2>{{ templateForm.isNew ? '新建模板' : '编辑模板' }}</h2>
          <div class="form-group">
            <label class="form-label">模板名称</label>
            <input class="form-input" v-model="templateForm.name" placeholder="例如：标准快报模板" />
          </div>
          <div class="form-group">
            <label class="form-label">板块列表</label>
            <div v-for="(sec, idx) in templateForm.sections" :key="idx" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
              <input class="form-input" v-model="sec.name" placeholder="板块名称" style="flex:2;" />
              <input class="form-input" v-model="sec.key" placeholder="板块标识" style="flex:1;font-size:12px;" />
              <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:13px;">
                <input type="checkbox" v-model="sec.required" />
                必填
              </label>
              <button class="btn btn-sm btn-danger" @click="removeSection(idx)" :disabled="templateForm.sections.length <= 1">✕</button>
            </div>
            <button class="btn btn-sm" @click="addSection" style="margin-top:4px;">＋ 添加板块</button>
          </div>
          <div class="flex gap-8" style="justify-content:flex-end;margin-top:16px;">
            <button class="btn" @click="showTemplateEditor = false">取消</button>
            <button class="btn btn-primary" @click="saveTemplate">保存</button>
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
              <option value="reviewer">编辑审核员</option>
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
import { userAPI, templateAPI, authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const users = ref([])
const templates = ref([])
const showAddUser = ref(false)
const showEditUser = ref(false)
const editForm = ref({ id: '', displayName: '', username: '', role: 'reporter', phone: '', unit: '', status: 'active' })
const newUser = ref({ displayName: '', username: '', password: '', role: 'reporter', phone: '' })

// 模板编辑
const showTemplateEditor = ref(false)
const templateForm = ref({ id: null, name: '', sections: [], isNew: false })

function roleName(r) {
  return { admin: '管理员', reporter: '信息员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

async function loadData() {
  try {
    const [u, t] = await Promise.all([userAPI.list(), templateAPI.list()])
    users.value = u.data
    templates.value = t.data
  } catch (e) {
    console.error('加载数据失败:', e)
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

async function setDefault(id) {
  await templateAPI.setDefault(id)
  loadData()
}

function addNewTemplate() {
  templateForm.value = {
    id: null,
    name: '',
    sections: [
      { key: 'event_overview', name: '事件概况', required: true },
      { key: 'casualties', name: '伤亡情况', required: true },
      { key: 'response_progress', name: '处置进展', required: true },
      { key: 'coordination', name: '需协调事项', required: false },
      { key: 'site_conditions', name: '现场情况', required: true }
    ],
    isNew: true
  }
  showTemplateEditor.value = true
}

function editTemplate(t) {
  templateForm.value = {
    id: t.id,
    name: t.name,
    sections: (t.config?.sections || []).map(s => ({ ...s })),
    isNew: false
  }
  showTemplateEditor.value = true
}

async function saveTemplate() {
  if (!templateForm.value.name || templateForm.value.sections.length === 0) {
    alert('请填写模板名称并至少保留一个板块')
    return
  }
  const config = { sections: templateForm.value.sections }
  if (templateForm.value.isNew) {
    await templateAPI.create({ name: templateForm.value.name, config })
  } else {
    await templateAPI.update(templateForm.value.id, { name: templateForm.value.name, config })
  }
  showTemplateEditor.value = false
  loadData()
}

async function deleteTemplate(t) {
  if (!confirm(`确定删除模板「${t.name}」吗？`)) return
  await templateAPI.delete(t.id)
  loadData()
}

function addSection() {
  templateForm.value.sections.push({ key: '', name: '', required: false })
}

function removeSection(idx) {
  templateForm.value.sections.splice(idx, 1)
}

onMounted(loadData)
</script>
