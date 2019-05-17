import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/ScanningPage',
      name: 'scanning-page',
      component: require('@/components/ScanningPage').default
    },
    {
      path: '/students',
      name: 'students-view-page',
      component: require('@/components/StudentsPage').default
    },
    {
      path: '/create-report',
      name: 'report-view-page',
      component: require('@/components/CreateReport').default
    },
    {
      path: '/create-student',
      name: 'create-student-page',
      component: require('@/components/AddStudentView').default
    },
    {
      path: '/print-student-card',
      name: 'print-student-card-page',
      component: require('@/components/PrintCardView').default
    },
    {
      path: '*',
      redirect: '/ScanningPage'
    }
  ]
})
