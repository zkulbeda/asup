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
Vue.use(VModal);
import VueBar from 'vuebar';
Vue.use(VueBar);
//require('devtron').install()
/* eslint-disable no-new */

// Vue.prototype.$students = db;
console.log(getGlobal('config'));
Vue.prototype.$config = getGlobal('config');
Vue.filter('numWord',function(num,w1,w2,wMany){
  let f = (n, titles) =>{
    return titles[(n % 10 === 1 && n % 100 !== 11) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2]
  };
  return f(num,[w1,w2,wMany]);
});
import NProgress from 'nprogress';
import {} from 'nprogress/nprogress.css';
NProgress.configure({trickleSpeed: 100});
Vue.use({
  install(Vue){
    Vue.prototype.$wait = function(p, needWait = true, timeout=400){
      NProgress.start();
      let timer = null;
      let root = null;
      console.log(this);
      if(this===undefined) needWait = false;
      else root = this.$root.$el;

      if(needWait){
        timer = setTimeout(()=>{
          root.classList.add('waiting');
        },timeout);
      }
      let done = ()=>{
        if(timer !== null){
          clearTimeout(timer);
          root.classList.remove('waiting');
        }
        NProgress.done();
      };
      p.then(done).catch(function(){console.error(arguments); done();});
    };
  }
});
// Vue.prototype.$dbDay = config;
let v = new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
});
v.$mount('#app')
