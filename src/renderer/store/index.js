import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'

import { createPersistedState, createSharedMutations } from 'vuex-electron'

import modules from './modules'

Vue.use(Vuex)

export default new Vuex.Store({
  modules,
  plugins: [
    //createPersistedState(),
    //createSharedMutations()
    createLogger({
      collapsed: true
    })
  ],
  strict: process.env.NODE_ENV !== 'production'
})
