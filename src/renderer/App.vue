<template>
  <b-container id="app">
    <b-row>
      <b-col cols="3" class="col-lg-2">
        <div id="appMenu">
          <b-nav vertical class="text-right">
            <b-nav-item to="/ScanningPage" :active="true">Сканировать</b-nav-item>
            <b-nav-item to="/students">Ученики</b-nav-item>
            <b-nav-item to="/create-report" >Отчет</b-nav-item>
            <b-nav-item>Настройки</b-nav-item>
          </b-nav>
        </div>
      </b-col>
      <b-col>
        <div class="card" id="currentPage">
         <router-view></router-view>
        </div>
      </b-col>
    </b-row>
  </b-container>
</template>


<script>
  import {ipcRenderer} from 'electron'
  export default {
    name: 'qr-lunch',
    methods:{
    },
    beforeMount() {
        window.t = this;
     this.$store.dispatch('Students/init');
      this.$store.dispatch('ThisDay/init');
    }
  }
</script>

<style>
  #appMenu{
    margin-top: 25px
  }
  #app{
    padding-top: 50px;
  }
  html, body, #app{
    height: 100%;
  }
  #currentPage{
    padding: 15px;
  }
  /* CSS */
</style>
