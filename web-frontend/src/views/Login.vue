<template>
  <div class="login-page">
    <div class="login-card">
      <h1>🚨 应急快报</h1>
      <p class="subtitle">编辑审阅后台</p>
      <div v-if="error" style="color:var(--danger);font-size:13px;margin-bottom:12px;text-align:center">{{ error }}</div>
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '@/utils/api'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function login() {
  if (!username.value || !password.value) { error.value = '请输入用户名和密码'; return }
  loading.value = true; error.value = ''
  try {
    const res = await authAPI.login(username.value, password.value)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    router.push('/events')
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败'
  } finally { loading.value = false }
}
</script>
