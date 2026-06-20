import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/dashboard',
    name: 'ReporterDashboard',
    meta: { roles: ['reporter', 'reviewer', 'admin'] },
    component: () => import('@/views/ReporterDashboard.vue')
  },
  {
    path: '/command',
    name: 'CommanderDashboard',
    meta: { roles: ['commander', 'reviewer', 'admin'] },
    component: () => import('@/views/CommanderDashboard.vue')
  },
  {
    path: '/events',
    name: 'EventList',
    component: () => import('@/views/EventList.vue')
  },
  {
    path: '/events/:id',
    name: 'EventDetail',
    component: () => import('@/views/EventDetail.vue')
  },
  {
    path: '/events/:id/reports',
    name: 'ReportList',
    component: () => import('@/views/ReportList.vue')
  },
  {
    path: '/events/:id/review/:reportId',
    name: 'ReportReview',
    component: () => import('@/views/ReportReview.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue')
  },
  {
    path: '/admin/invites',
    name: 'InviteManage',
    component: () => import('@/views/InviteManage.vue')
  },
  {
    path: '/admin/users',
    name: 'UserManage',
    component: () => import('@/views/UserManage.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
