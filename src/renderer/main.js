import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'
import nedb from 'nedb-promise';
import BootstrapVue from 'bootstrap-vue'
Vue.use(BootstrapVue);
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import path from 'path';
const { app, getGlobal } = require('electron').remote;
import luxon from 'luxon'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = true//false
Vue.config.devtools = true
Vue.config.silent = true
import VModal from 'vue-js-modal'
Vue.use(VModal)
//require('devtron').install()
/* eslint-disable no-new */

// Vue.prototype.$students = db;
console.log(getGlobal('config'));
Vue.prototype.$config = getGlobal('config');
// Vue.prototype.$dbDay = config;
let v = new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
});
v.$mount('#app')
