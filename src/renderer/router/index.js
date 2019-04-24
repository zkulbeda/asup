import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'scanning-page',
      component: require('@/components/ScanningPage').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
