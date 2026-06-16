<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <div class="top-bar">
        <h1>👤 个人中心</h1>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <!-- 用户信息 -->
        <div class="card">
          <div class="card-title">
            <span>基本信息</span>
          </div>
          <div style="display:grid;grid-template-columns:100px 1fr;gap:8px;font-size:14px;">
            <div style="color:var(--text-secondary);">姓名</div>
            <div><strong>{{ user.displayName }}</strong></div>
            <div style="color:var(--text-secondary);">用户名</div>
            <div>{{ user.username }}</div>
            <div style="color:var(--text-secondary);">角色</div>
            <div>
              <span class="badge badge-active">{{ roleName(user.role) }}</span>
            </div>
            <div style="color:var(--text-secondary);">手机号</div>
            <div>{{ user.phone || '未设置' }}</div>
          </div>
        </div>

        <!-- 修改密码 -->
        <div class="card">
          <div class="card-title">
            <span>修改密码</span>
          </div>
          <div v-if="pwSuccess" style="padding:8px 12px;background:#f6ffed;color:#52c41a;border-radius:8px;margin-bottom:12px;font-size:13px;">
            ✅ 密码修改成功
          </div>
          <div v-if="pwError" style="padding:8px 12px;background:#fff2f0;color:#ff4d4f;border-radius:8px;margin-bottom:12px;font-size:13px;">
            ❌ {{ pwError }}
          </div>
          <div class="form-group">
            <label class="form-label">当前密码</label>
            <input class="form-input" type="password" v-model="pwData.oldPassword" />
          </div>
          <div class="form-group">
            <label class="form-label">新密码</label>
            <input class="form-input" type="password" v-model="pwData.newPassword" placeholder="至少6位" />
          </div>
          <div class="form-group">
            <label class="form-label">确认新密码</label>
            <input class="form-input" type="password" v-model="pwData.confirmPassword" />
          </div>
          <button class="btn btn-primary" @click="changePassword" :disabled="changingPw">
            {{ changingPw ? '修改中...' : '修改密码' }}
          </button>
        </div>
      </div>

      <!-- 快捷导航 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;">
        <div class="card" style="cursor:pointer;text-align:center;padding:24px;" @click="$router.push('/dashboard')">
          <div style="font-size:32px;margin-bottom:8px;">📋</div>
          <div style="font-weight:500;">信息员工作台</div>
          <div style="font-size:12px;color:var(--text-light);">上报素材 · 查看动态</div>
        </div>
        <div class="card" style="cursor:pointer;text-align:center;padding:24px;" @click="$router.push('/command')">
          <div style="font-size:32px;margin-bottom:8px;">📊</div>
          <div style="font-weight:500;">指挥看板</div>
          <div style="font-size:12px;color:var(--text-light);">态势总览 · 快报速览</div>
        </div>
        <div class="card" style="cursor:pointer;text-align:center;padding:24px;" @click="$router.push('/events')">
          <div style="font-size:32px;margin-bottom:8px;">🚨</div>
          <div style="font-weight:500;">事件管理</div>
          <div style="font-size:12px;color:var(--text-light);">查看全部事件</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { authAPI } from '@/utils/api'
import Sidebar from '@/components/Sidebar.vue'

const user = JSON.parse(localStorage.getItem('user') || '{}')
const pwData = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwSuccess = ref(false)
const pwError = ref('')
const changingPw = ref(false)

function roleName(r) {
  return { admin: '管理员', reporter: '信息员', reviewer: '编辑员', commander: '指挥官' }[r] || r
}

async function changePassword() {
  pwSuccess.value = false
  pwError.value = ''
  if (!pwData.value.oldPassword) { pwError.value = '请输入当前密码'; return }
  if (!pwData.value.newPassword || pwData.value.newPassword.length < 6) { pwError.value = '新密码至少6位'; return }
  if (pwData.value.newPassword !== pwData.value.confirmPassword) { pwError.value = '两次密码输入不一致'; return }

  changingPw.value = true
  try {
    await authAPI.changePassword(pwData.value.oldPassword, pwData.value.newPassword)
    pwSuccess.value = true
    pwData.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) {
    pwError.value = e.response?.data?.error || '修改失败'
  } finally { changingPw.value = false }
}
</script>
