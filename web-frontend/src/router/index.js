import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/events'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
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
