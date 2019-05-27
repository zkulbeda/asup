<template>
  <b-container id="app">
    <b-row>
      <b-col cols="3" class="col-lg-2">
        <div id="appMenu">
          <b-nav vertical class="text-right">
            <b-nav-item to="/ScanningPage" :active="true">Сканировать</b-nav-item>
            <b-nav-item to="/students">Ученики</b-nav-item>
            <b-nav-item to="/create-report" >Отчет</b-nav-item>
            <b-nav-item to="/settings">Настройки</b-nav-item>
          </b-nav>
        </div>
      </b-col>
      <b-col>
         <router-view v-if="$store.state.Students.initialized && $store.state.ThisDay.initialized"></router-view>
      </b-col>
    </b-row>
  </b-container>
</template>


<script>
  import "vue-material-design-icons/styles.css"
  import {ipcRenderer} from 'electron';
  export default {
    name: 'qr-lunch',
    methods:{
    },
    beforeCreate() {
        window.t = this;
      this.$wait(Promise.all([this.$store.dispatch('Students/init'),this.$store.dispatch('ThisDay/init')]));
    },
    filters:{
    }
  }
</script>

<style>
  /*#nprogress{*/
  /*  pointer-events: unset;*/
  /*  cursor: wait;*/
  /*  position: absolute;*/
  /*  left: 0;*/
  /*  right:0;*/
  /*  height: 100%;*/
  /*  width: 100%;*/
  /*}*/
  #appMenu{
    margin-top: 25px
  }
  #app{
    padding-top: 50px;
  }
  #app.waiting>*{
    pointer-events: none;
  }
  #app.waiting{
    cursor: wait;
  }
  html, body, #app{
    height: 100%;
  }
  #currentPage{
    padding: 15px;
  }
  .custom-control-label{
    cursor: pointer;
  }
  /* CSS */
</style>
