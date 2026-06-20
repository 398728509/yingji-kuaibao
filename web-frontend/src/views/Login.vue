<template>
  <div class="login-page">
    <div class="login-card">
      <h1>🚨 应急快报</h1>
      <p class="subtitle">应急信息采集与指挥系统</p>
      <div v-if="error" style="color:var(--danger);font-size:13px;margin-bottom:12px;text-align:center">{{ error }}</div>

      <!-- 登录表单 -->
      <template v-if="!showRegister">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input class="form-input" v-model="username" placeholder="请输入用户名" @keyup.enter="login" />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input class="form-input" type="password" v-model="password" placeholder="请输入密码" @keyup.enter="login" />
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px;" @click="login" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <div style="margin-top:16px;text-align:center;">
          <a href="javascript:void(0)" style="color:var(--primary);font-size:13px;" @click="showRegister = true">
            没有账号？使用邀请码注册
          </a>
        </div>
      </template>

      <!-- 注册表单 -->
      <template v-else>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input class="form-input" v-model="regForm.displayName" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input class="form-input" v-model="regForm.username" placeholder="请输入用户名" @blur="checkUsername" />
          <span v-if="usernameCheck" style="font-size:12px;margin-top:2px;display:block;"
                :style="{color: usernameCheck.ok ? 'var(--success)' : 'var(--danger)'}">
            {{ usernameCheck.msg }}
          </span>
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input class="form-input" type="password" v-model="regForm.password" placeholder="至少6位密码" />
        </div>
        <div class="form-group">
          <label class="form-label">手机号</label>
          <input class="form-input" v-model="regForm.phone" placeholder="选填" />
        </div>
        <div class="form-group">
          <label class="form-label">邀请码</label>
          <input class="form-input" v-model="regForm.inviteCode" placeholder="请输入管理员提供的邀请码" />
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:10px;" @click="register" :disabled="regLoading">
          {{ regLoading ? '注册中...' : '注 册' }}
        </button>
        <div v-if="registerSuccess" style="margin-top:12px;padding:12px;background:var(--success-bg, #e6f7e6);border-radius:6px;text-align:center;color:var(--success);font-size:14px;">
          {{ registerSuccess }}
        </div>
        <div style="margin-top:16px;text-align:center;">
          <a href="javascript:void(0)" style="color:var(--primary);font-size:13px;" @click="backToLogin">
            已有账号？返回登录
          </a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '@/utils/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showRegister = ref(false)
const regLoading = ref(false)
const registerSuccess = ref('')
const usernameCheck = ref(null)

const regForm = reactive({
  displayName: '',
  username: '',
  password: '',
  phone: '',
  inviteCode: ''
})

async function login() {
  if (!username.value || !password.value) { error.value = '请输入用户名和密码'; return }
  loading.value = true; error.value = ''
  try {
    const res = await authAPI.login(username.value, password.value)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    const role = res.data.user.role
    if (role === 'commander') router.push('/command')
    else if (role === 'admin') router.push('/admin')
    else router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败'
  } finally { loading.value = false }
}

async function checkUsername() {
  if (!regForm.username) { usernameCheck.value = null; return }
  try {
    const res = await authAPI.checkUsername(regForm.username)
    usernameCheck.value = res.data.available
      ? { ok: true, msg: '用户名可用' }
      : { ok: false, msg: '用户名已被占用' }
  } catch { usernameCheck.value = null }
}

async function register() {
  const { displayName, username, password, phone, inviteCode } = regForm
  if (!displayName || !username || !password || !inviteCode) {
    error.value = '请填写所有必填项'
    return
  }
  if (password.length < 6) {
    error.value = '密码长度至少6位'
    return
  }
  regLoading.value = true
  error.value = ''
  registerSuccess.value = ''
  try {
    const res = await authAPI.register({ displayName, username, password, phone, inviteCode })
    registerSuccess.value = res.data.message || '注册成功！请等待管理员审核'
  } catch (e) {
    error.value = e.response?.data?.error || '注册失败'
  } finally { regLoading.value = false }
}

function backToLogin() {
  showRegister.value = false
  registerSuccess.value = ''
  error.value = ''
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}
.login-card {
  background: #f8f6f0;
  border-radius: 16px;
  padding: 40px 36px;
  width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.login-card h1 {
  text-align: center;
  margin: 0 0 4px;
  font-size: 24px;
}
.subtitle {
  text-align: center;
  color: #666;
  font-size: 13px;
  margin: 0 0 28px;
}
.form-group {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: var(--primary, #1a73e8);
  box-shadow: 0 0 0 2px rgba(26,115,232,0.15);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: #fff;
  transition: all .15s;
}
.btn-primary {
  background: var(--primary, #1a73e8);
  color: #fff;
  border-color: var(--primary, #1a73e8);
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
