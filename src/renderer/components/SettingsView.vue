<template>
  <b-card >
    <b-row>
      <b-button @click="selectCamera">Выбрать камеру</b-button>
      <b-button @click="openDevTools">Открыть инструменты разработчика</b-button>
      <b-button @click="openPath">Открыть папку с программой</b-button>
    </b-row>
  </b-card>
</template>

<script>
  let {getGlobal, shell, app} = require('electron').remote;
  import cameraDialog from './selectCamera';
  import path from 'path';
  export default {
    name: "SettingsView",
    data(){
      return {
      }
    },
    computed:{
    },
    methods:{
      async selectCamera(){
        try{
          let id = await cameraDialog();
          this.$config.set('deviceID', id);
        }catch (e) {}
      },
      openDevTools(){
        getGlobal('mainWindow').openDevTools();
      },
      openPath(){
        shell.showItemInFolder(path.join(app.getPath('userData'),'config.json'));
      }
    },
    mounted() {

    }
  }
</script>

<style scoped>

</style>