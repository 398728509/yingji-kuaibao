<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>⚙️ 系统管理</h1>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;gap:16px;">
        <!-- 左上：用户管理 -->
        <div class="card" style="grid-column:1;grid-row:1;">
          <div class="card-title">
            <span>👥 用户管理（{{ users.length }}人）</span>
            <button class="btn btn-sm btn-primary" @click="showAddUser = true">＋ 添加用户</button>
          </div>
          <table class="table">
            <thead><tr><th style="min-width:80px;">姓名</th><th style="min-width:70px;">用户名</th><th style="white-space:nowrap;">角色</th><th>单位</th><th style="white-space:nowrap;width:60px;">状态</th><th style="white-space:nowrap;width:60px;">操作</th></tr></thead>
            <tbody>
              <tr v-for="u in users.slice(0, 5)" :key="u.id">
                <td>{{ u.displayName }}</td>
                <td style="font-size:12px;">{{ u.username }}</td>
                <td><span class="badge badge-active" style="white-space:nowrap;">{{ roleName(u.role) }}</span></td>
                <td style="font-size:12px;color:var(--text-light);">{{ u.unit || '-' }}</td>
                <td style="white-space:nowrap;"><span :class="['badge', u.status === 'active' ? 'badge-active' : 'badge-closed']">{{ u.status === 'active' ? '正常' : '已停用' }}</span></td>
                <td style="white-space:nowrap;"><button class="btn btn-sm" @click="editUser(u)">编辑</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="users.length > 5" style="text-align:center;padding:8px;">
            <button class="btn btn-sm" @click="$router.push('/admin/users')">更多用户 → ({{ users.length }}人)</button>
          </div>
        </div>

        <!-- 右上：邀请码管理 -->
        <div class="card" style="grid-column:2;grid-row:1;">
          <div class="card-title">
            <span>🔑 邀请码管理（{{ invites.length }}个）</span>
            <button class="btn btn-sm btn-primary" @click="generateInviteCodes">＋ 生成邀请码</button>
          </div>
          <table class="table" v-if="invites.length > 0">
            <thead><tr><th>邀请码</th><th>状态</th><th>有效期</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="ic in invites.slice(0, 5)" :key="ic.id">
                <td style="font-family:monospace;font-size:12px;">{{ ic.code }}</td>
                <td style="white-space:nowrap;"><span :class="['badge',, ic.is_active ? 'badge-active' : 'badge-closed']">{{ ic.is_active ? '有效' : '已使用/已作废' }}</span></td>
                <td style="font-size:12px;">{{ ic.expires_at || '永久' }}</td>
                <td><button class="btn btn-sm btn-danger" @click="deleteInviteCode(ic.id)" :disabled="!ic.is_active">作废</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="invites.length > 5" style="text-align:center;padding:8px;">
            <button class="btn btn-sm" @click="$router.push('/admin/invites')">更多邀请码 → ({{ invites.length }}个)</button>
          </div>
          <div v-else style="text-align:center;padding:24px;color:var(--text-light);font-size:14px;">
            暂无邀请码
          </div>
        </div>

        <!-- 左下：快报模板 -->
        <div class="card" style="grid-column:1;grid-row:2;">
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

        <!-- 右下：待审核用户 -->
        <div class="card" style="grid-column:2;grid-row:2;">
          <div class="card-title" v-if="pendingUsers.length > 0">
            <span>⏳ 待审核用户（{{ pendingUsers.length }}人）</span>
          </div>
          <table class="table" v-if="pendingUsers.length > 0">
            <thead><tr><th>姓名</th><th>用户名</th><th>邀请码</th><th>注册时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="pu in pendingUsers" :key="pu.id">
                <td>{{ pu.displayName }}</td>
                <td style="font-size:12px;">{{ pu.username }}</td>
                <td style="font-family:monospace;font-size:12px;">{{ pu.invite_code || '-' }}</td>
                <td style="font-size:12px;">{{ pu.created_at || '-' }}</td>
                <td>
                  <button class="btn btn-sm btn-primary" style="background:#52c41a;" @click="reviewUser(pu.id, 'approve')">批准</button>
                  <button class="btn btn-sm btn-danger" @click="reviewUser(pu.id, 'reject')">拒绝</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else style="display:flex;align-items:center;justify-content:center;min-height:80px;color:var(--text-light);font-size:14px;">
            暂无待审核用户
          </div>
        </div>
      </div>

      <!-- API 管理 -->
      <div class="card" style="margin-top:16px;">
        <div class="card-title">
          <span>🔌 API 管理</span>
          <div class="flex gap-8">
            <button class="btn btn-sm" @click="showEndpoints = !showEndpoints">
              {{ showEndpoints ? '隐藏' : '查看' }} API 端点
            </button>
            <button class="btn btn-sm btn-primary" @click="showGenerateApiKey = true">＋ 生成密钥</button>
          </div>
        </div>

        <div v-if="showEndpoints" style="margin-bottom:12px;">
          <div style="font-size:13px;color:var(--text-light);margin-bottom:8px;">
            API 端点列表（共 {{ endpoints.length }} 个）
          </div>
          <table class="table" style="font-size:12px;">
            <thead><tr><th>方法</th><th>路径</th><th>说明</th><th>权限</th></tr></thead>
            <tbody>
              <tr v-for="ep in endpoints" :key="ep.path">
                <td style="white-space:nowrap;"><span :class="['badge',, ep.method === 'GET' ? 'badge-active' : ep.method === 'POST' ? 'badge-final' : 'badge-closed']">{{ ep.method }}</span></td>
                <td style="font-family:monospace;">{{ ep.path }}</td>
                <td>{{ ep.desc }}</td>
                <td style="font-size:11px;">{{ ep.auth }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="apiKeys.length > 0">
          <table class="table">
            <thead><tr><th>名称</th><th>密钥前缀</th><th>权限</th><th>创建者</th><th>最后使用</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="k in apiKeys" :key="k.id">
                <td>{{ k.name }}</td>
                <td style="font-family:monospace;font-size:12px;">{{ k.prefix }}</td>
                <td><span class="badge" :class="k.permission === 'write' ? 'badge-active' : k.permission === 'admin' ? 'badge-final' : ''">{{ k.permission }}</span></td>
                <td style="font-size:12px;">{{ k.created_by_name || '-' }}</td>
                <td style="font-size:12px;">{{ k.last_used_at || '从未使用' }}</td>
                <td style="white-space:nowrap;"><span :class="['badge',, k.status === 'active' ? 'badge-active' : 'badge-closed']">{{ k.status === 'active' ? '有效' : '已撤销' }}</span></td>
                <td>
                  <button v-if="k.status === 'active'" class="btn btn-sm btn-danger" @click="revokeApiKey(k.id)">撤销</button>
                  <span v-else style="color:var(--text-light);font-size:12px;">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else style="text-align:center;padding:16px;color:var(--text-light);font-size:14px;">
          暂无 API 密钥
        </div>
      </div>

      <!-- 生成密钥弹窗 -->
      <div v-if="showGenerateApiKey" class="modal-overlay" @click.self="showGenerateApiKey = false">
        <div class="modal" style="max-width:500px;">
          <h2>生成 API 密钥</h2>
          <div class="form-group">
            <label class="form-label">密钥名称</label>
            <input class="form-input" v-model="apiKeyForm.name" placeholder="例如：微信小程序、第三方集成" />
          </div>
          <div class="form-group">
            <label class="form-label">权限</label>
            <select class="form-select" v-model="apiKeyForm.permission">
              <option value="read">只读 (read)</option>
              <option value="write">读写 (write)</option>
              <option value="admin">管理 (admin)</option>
            </select>
          </div>
          <div v-if="newApiKeyResult" style="padding:12px;background:#fff3cd;border-radius:8px;margin-bottom:12px;word-break:break-all;">
            <div style="font-weight:600;margin-bottom:4px;">⚠️ 密钥创建成功，请立即保存！</div>
            <div style="font-family:monospace;font-size:13px;background:#fff;padding:8px;border-radius:4px;user-select:all;">{{ newApiKeyResult }}</div>
            <div style="font-size:12px;color:#856404;margin-top:4px;">密钥不会再次完整显示，丢失需重新生成。</div>
          </div>
          <div class="form-buttons">
            <button class="btn" @click="showGenerateApiKey = false" v-if="newApiKeyResult">关闭</button>
            <button class="btn" @click="showGenerateApiKey = false" v-else>取消</button>
            <button v-if="!newApiKeyResult" class="btn btn-primary" @click="generateApiKey" :disabled="!apiKeyForm.name.trim()">生成</button>
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
import { userAPI, templateAPI, authAPI, apiKeyAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const users = ref([])
const templates = ref([])
const invites = ref([])
const pendingUsers = ref([])
const apiKeys = ref([])
const endpoints = ref([])
const showEndpoints = ref(false)
const showGenerateApiKey = ref(false)
const apiKeyForm = ref({ name: '', permission: 'read' })
const newApiKeyResult = ref('')
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
    const [u, t, iv, pu] = await Promise.all([
      userAPI.list(), templateAPI.list(),
      authAPI.listInvites(), authAPI.listPendingUsers()
    ])
    users.value = u.data || []
    templates.value = t.data || []
    invites.value = iv.data || []
    pendingUsers.value = pu.data || []
    const [ak, ep] = await Promise.all([
      apiKeyAPI.list().then(r => r.data).catch(() => []),
      apiKeyAPI.listEndpoints().then(r => r.data).catch(() => [])
    ])
    apiKeys.value = ak
    endpoints.value = ep
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

async function generateInviteCodes() {
  const count = prompt('请输入生成数量（默认5个）：', '5')
  if (!count || isNaN(count) || parseInt(count) < 1) return
  const days = prompt('有效期天数（默认30天）：', '30')
  if (!days || isNaN(days)) return
  try {
    await authAPI.generateInvite({ count: parseInt(count), expiresInDays: parseInt(days) })
    loadData()
  } catch (e) {
    alert('生成失败')
  }
}

async function deleteInviteCode(id) {
  if (!confirm('确定作废该邀请码？')) return
  try {
    await authAPI.deleteInvite(id)
    loadData()
  } catch (e) {
    alert('操作失败')
  }
}

async function reviewUser(id, action) {
  try {
    await authAPI.reviewUser(id, action)
    loadData()
  } catch (e) {
    alert('操作失败')
  }
}

onMounted(loadData)

async function generateApiKey() {
  try {
    const res = await apiKeyAPI.create(apiKeyForm.value.name.trim(), apiKeyForm.value.permission)
    newApiKeyResult.value = res.data.apiKey
    apiKeyForm.value = { name: '', permission: 'read' }
    const ak = await apiKeyAPI.list().then(r => r.data).catch(() => [])
    apiKeys.value = ak
  } catch (e) {
    alert('生成密钥失败')
  }
}

async function revokeApiKey(id) {
  if (!confirm('确定撤销该 API 密钥？撤销后无法恢复。')) return
  try {
    await apiKeyAPI.revoke(id)
    const ak = await apiKeyAPI.list().then(r => r.data).catch(() => [])
    apiKeys.value = ak
  } catch (e) {
    alert('撤销失败')
  }
}
</script>
