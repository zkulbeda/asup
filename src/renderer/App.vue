<template>
  <b-container id="app">
    <b-row>
      <b-col cols="3">
        <div>
          <b-nav vertical>
            <b-nav-item @click="save" :active="true">Active</b-nav-item>
            <b-nav-item>Link</b-nav-item>
            <b-nav-item>Another Link</b-nav-item>
            <b-nav-item disabled>Disabled</b-nav-item>
          </b-nav>
        </div>
      </b-col>
      <b-col>
        <router-view></router-view>
      </b-col>
    </b-row>
  </b-container>
</template>


<script>
  import {ipcRenderer} from 'electron'
  export default {
    name: 'qr-lunch',
    methods:{
      save(){
        ipcRenderer.send('generateExcel');
      }
    },
    mounted() {
     console.log(this)
    }
  }
</script>

<style>
  /* CSS */
</style>
