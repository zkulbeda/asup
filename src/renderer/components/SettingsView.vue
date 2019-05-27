<template>
  <b-card >
    <b-row>
      Выбрана камера: ываыпмвафпрыр
    </b-row>
  </b-card>
</template>

<script>
  import {ipcRenderer} from 'electron'
  import {DateTime} from 'luxon';
  import promiseIpc from 'electron-promise-ipc';
  export default {
    name: "SettingsView",
    data(){
      return {
      }
    },
    computed:{
    },
    methods:{
    },
    mounted() {

    }
  }
</script>

<style scoped>

</style>