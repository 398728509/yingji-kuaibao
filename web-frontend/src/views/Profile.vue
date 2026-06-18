<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main" style="overflow-y:auto;">
      <div class="top-bar">
        <h1>👤 个人中心</h1>
      </div>

      <!-- 信息展示卡片 -->
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title">
          <span>基本信息</span>
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;font-size:14px;padding:8px 0;">
          <div style="color:var(--text-secondary);">单位</div>
          <div>{{ user.unit || '未设置' }}</div>
          <div style="color:var(--text-secondary);">姓名</div>
          <div><strong>{{ user.displayName }}</strong></div>
          <div style="color:var(--text-secondary);">用户名</div>
          <div>{{ user.username }}</div>
          <div style="color:var(--text-secondary);">角色</div>
          <div><span class="badge badge-active">{{ roleName(user.role) }}</span></div>
          <div style="color:var(--text-secondary);">手机号</div>
          <div>{{ user.phone || '未设置' }}</div>
        </div>
      </div>

      <!-- 操作卡片 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="card action-card" @click="openProfileEdit()">
          <div style="font-size:36px;margin-bottom:8px;">✏️</div>
          <div style="font-weight:600;font-size:15px;">修改个人信息</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:4px;">姓名 · 单位 · 手机号</div>
        </div>
        <div class="card action-card" @click="openPwEdit()">
          <div style="font-size:36px;margin-bottom:8px;">🔑</div>
          <div style="font-weight:600;font-size:15px;">修改密码</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:4px;">更换登录密码</div>
        </div>
      </div>

      <!-- 修改个人信息弹窗 -->
      <div v-if="showProfileEdit" class="modal-overlay" @click.self="showProfileEdit=false">
        <div class="modal-box">
          <div class="modal-header">
            <span>✏️ 修改个人信息</span>
            <span class="modal-close" @click="showProfileEdit=false">&times;</span>
          </div>
          <div class="modal-body">
            <div v-if="profileSuccess" class="msg-success">✅ 信息修改成功</div>
            <div v-if="profileError" class="msg-error">❌ {{ profileError }}</div>
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input class="form-input" v-model="profileForm.displayName" />
            </div>
            <div class="form-group">
              <label class="form-label">单位</label>
              <input class="form-input" v-model="profileForm.unit" placeholder="请输入单位名称" />
            </div>
            <div class="form-group">
              <label class="form-label">手机号</label>
              <input class="form-input" v-model="profileForm.phone" placeholder="请输入手机号" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="showProfileEdit=false">取消</button>
            <button class="btn btn-primary" @click="saveProfile" :disabled="savingProfile">
              {{ savingProfile ? '保存中...' : '保存修改' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 修改密码弹窗 -->
      <div v-if="showPwEdit" class="modal-overlay" @click.self="showPwEdit=false">
        <div class="modal-box">
          <div class="modal-header">
            <span>🔑 修改密码</span>
            <span class="modal-close" @click="showPwEdit=false">&times;</span>
          </div>
          <div class="modal-body">
            <div v-if="pwSuccess" class="msg-success">✅ 密码修改成功</div>
            <div v-if="pwError" class="msg-error">❌ {{ pwError }}</div>
            <div class="form-group">
              <label class="form-label">当前密码</label>
              <input class="form-input" type="password" v-model="pwForm.oldPassword" />
            </div>
            <div class="form-group">
              <label class="form-label">新密码</label>
              <input class="form-input" type="password" v-model="pwForm.newPassword" placeholder="至少6位" />
            </div>
            <div class="form-group">
              <label class="form-label">确认新密码</label>
              <input class="form-input" type="password" v-model="pwForm.confirmPassword" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" @click="showPwEdit=false">取消</button>
            <button class="btn btn-primary" @click="changePassword" :disabled="changingPw">
              {{ changingPw ? '修改中...' : '确认修改' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const showProfileEdit = ref(false)
const showPwEdit = ref(false)
const savingProfile = ref(false)
const profileSuccess = ref(false)
const profileError = ref('')
const changingPw = ref(false)
const pwSuccess = ref(false)
const pwError = ref('')

const profileForm = ref({ displayName: '', unit: '', phone: '' })
const pwForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

function roleName(r) {
  return { admin: '管理员', reporter: '信息采集员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

function openProfileEdit() {
  profileForm.value = {
    displayName: user.value.displayName || '',
    unit: user.value.unit || '',
    phone: user.value.phone || ''
  }
  profileSuccess.value = false
  profileError.value = ''
  showProfileEdit.value = true
}

function openPwEdit() {
  pwForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  pwSuccess.value = false
  pwError.value = ''
  showPwEdit.value = true
}

async function saveProfile() {
  profileSuccess.value = false
  profileError.value = ''
  if (!profileForm.value.displayName) { profileError.value = '姓名不能为空'; return }
  savingProfile.value = true
  try {
    const res = await authAPI.updateProfile(profileForm.value)
    user.value = res.data.user
    localStorage.setItem('user', JSON.stringify(res.data.user))
    profileSuccess.value = true
    setTimeout(() => showProfileEdit.value = false, 800)
  } catch (e) {
    profileError.value = e.response?.data?.error || '保存失败'
  } finally { savingProfile.value = false }
}

async function changePassword() {
  pwSuccess.value = false
  pwError.value = ''
  if (!pwForm.value.oldPassword) { pwError.value = '请输入当前密码'; return }
  if (!pwForm.value.newPassword || pwForm.value.newPassword.length < 6) { pwError.value = '新密码至少6位'; return }
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) { pwError.value = '两次密码输入不一致'; return }
  changingPw.value = true
  try {
    await authAPI.changePassword(pwForm.value.oldPassword, pwForm.value.newPassword)
    pwSuccess.value = true
    pwForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => showPwEdit.value = false, 800)
  } catch (e) {
    pwError.value = e.response?.data?.error || '修改失败'
  } finally { changingPw.value = false }
}

async function loadUser() {
  try {
    const res = await authAPI.me()
    user.value = res.data
    localStorage.setItem('user', JSON.stringify(res.data))
  } catch {}
}

onMounted(loadUser)
</script>

<style scoped>
.action-card {
  cursor: pointer;
  text-align: center;
  padding: 24px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.action-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  width: 440px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border, #f0f0f0);
  font-weight: 600;
  font-size: 16px;
}
.modal-close {
  cursor: pointer;
  font-size: 22px;
  color: #999;
  line-height: 1;
}
.modal-close:hover { color: #333; }
.modal-body {
  padding: 20px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border, #f0f0f0);
}
.msg-success {
  padding: 8px 12px;
  background: #f6ffed;
  color: #52c41a;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}
.msg-error {
  padding: 8px 12px;
  background: #fff2f0;
  color: #ff4d4f;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}
</style>
