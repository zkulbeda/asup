<template>
  <b-card >
    <b-row>
      <b-button @click="selectCamera">Выбрать камеру</b-button>
      <b-button @click="openDevTools">Открыть инструменты разработчика</b-button>
      <b-button @click="openPath">Открыть папку с программой</b-button>
      <b-button @click="$wait(importStudents())">Импорт базы учеников</b-button>
      <b-button @click="$wait(exportStudents())">Экспорт базы учеников</b-button>
      <b-button @click="$wait(toKioskMode())">Режим киоска</b-button>
    </b-row>
  </b-card>
</template>

<script>
  let {getGlobal, shell, app,dialog} = require('electron').remote;
  import cameraDialog from './selectCamera';
  import path from 'path';
  import Nedb from 'nedb-promise';
  import fs from 'file-system';
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
      async importStudents(){
        let path = await dialog.showOpenDialog(getGlobal('mainWindow'),{
          title: 'Импорт базы данных учеников',
          filters:  [{ name: 'Файл JSON', extensions: ['json'] }],
          properties: ['openFile']
        });
        console.log(path);
        let db = new Nedb({
          autoload: true,
          filename: path[0]
        });
        console.log(db);
        let data = await db.find({});
        let count = 0, d = null;
        try {
          for (let k in data) {
            d = data[k];
            await this.$store.dispatch('Students/insertStudent', d);
            count++;
          }
        }catch (e) {
          console.log('error in', d);
          console.error(e);
          dialog.showMessageBox(getGlobal('mainWindow'),{
            title: 'Импорт выполнен частично',
            message: 'Импорт выполен частично. Произошла ошибка.',
            detail: 'Количество импортированных учеников: '+count
          });
        }
        dialog.showMessageBox(getGlobal('mainWindow'),{
          title: 'Импорт выполен успешно',
          message: 'Импорт выполен успешно',
          detail: 'Количество импортированных учеников: '+count
        });
      },
      async exportStudents(){
        let filepath = await dialog.showSaveDialog(getGlobal('mainWindow'),{
          title: 'Экспорт базы данных учеников',
          filters:  [{ name: 'Файл JSON', extensions: ['json'] }],
          properties: ['openFile']
        });
        fs.copyFileSync(path.join(app.getPath('userData'), 'students.json'), filepath);
      },
      async toKioskMode(){
        await promiseIpc.send('changeKioskMode',true);
      },
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