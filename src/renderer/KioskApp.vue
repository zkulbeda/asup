<template>
  <div id="kioskapp">
    <div id="messagebox">
      <div id="hello-message" if="!error && !info">
        <h1 id="hello-message__title">Сканируй свой QR-код</h1>
        <h4 id="hello-message__descr">Помести QR-код в поле зрения камеры</h4>
      </div>
      <div v-if="info" id="successs-message">
        <h1>Приятного аппетита,<br><span id="successs-message__student-name">{{info.student.name}}</span></h1>
        <p>Тебя записали в журнал питания</p>
      </div>
      <div v-if="error" id="error-message">
        <h1 id="error-message__title">Ошибка: этот талон был уже использован</h1>
        <p id="error-message__descr">Возможно кто-то другой использует твою карту.<br>Сообщи об этом классному руководителю.</p>
      </div>
    </div>
    <div class="ScanningPageCameraWrapper" style="position: relative">
      <div class="ScanningPageCameraError" v-if="!cameraFound">
        <h4>Камера не найдена</h4>
        <b-button class="btn-primary">Повторить поиск</b-button>
      </div>
      <Camera @detect="onDetect" @init="onInit" v-model="paused"></Camera>
      <div class="ScanningPageCameraHelpWrapper" :class="[paused?'align-items-center':'align-items-end']">
        <div class="ScanningPageCameraHelp" :class="{paused: paused}">Нажмите пробел,
          <br v-if="paused"/>чтобы {{paused?'начать':'остановить'}} сканирование</div>
      </div>
      <div class="ScanningPageCameraHelpBG" :class="{paused: paused}"></div>
    </div>
  </div>
</template>

<script>
  import Camera from '@/components/Camera';
  import cameraDialog from '@/components/selectCamera';
  import Mousetrap from'mousetrap';
  import Pizzicato from 'pizzicato';
  import promiseIpc from 'electron-promise-ipc';
  let {app, dialog,getGlobal} = require('electron').remote;
  let soundSuccess = new Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/beep.wav') }
  });
  console.log(soundSuccess);
  let soundError = new Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/failure.wav') }
  });
  export default {
    name: "KioskApp",
    components: {Camera},
    data() {
      let id = this.$config.get('deviceID');
      return {
        scans: [],
        info: null,
        timeoutID: null,
        paused: true,
        lastStudent: null,
        deviceID: id,
        cameraFound: true,
        selected: null,
        error: null,
        Mousetrap: false,
        dontClear: false,

      }
    },
    computed: {
      cameraInit(){
        return {
          mandatory: {
            sourceId: this.deviceID//'4e8822da8628ebb83f14681db3d674c3495216b9f50ef64054f73c0b9301855f', //'0070d35198c8d70b1bdabb12f7953c7fbc117bfc096424c20dac86476ed75bdb',
          },
        };
      },
    },
    methods:{
      clearAll(){
        this.error = this.info = null;
      },
      startClearTimeout(timeout = 3000){
        if(this.dontClear){
          return;
        }
        if(this.timeoutID){
          clearTimeout(this.timeoutID);console.log('restart');
        }
        console.log('start');
        this.timeoutID = setTimeout(()=>{
          this.clearAll();console.log('clear');
          this.timeoutID = null;
        },timeout);
      },
      async onDetect(promise) {
        try {
          const all = promise;
          console.log(all)
          //let img = imagedata_to_image(all.imageData);
          // let img = await this.$store.dispatch('ThisDay/createImageUrl', {rd:{id: all.content, }, imagedata: all.imageData})
          console.time('scanned');
          let {st, rd} = await this.$store.dispatch("Students/record", {id: all.content, img: all.imageData});
          console.log(st);
          this.clearAll();
          this.startClearTimeout();
          this.info = {
            student: st,
            record: rd
          };
          console.timeEnd('scanned');
          // ...
        } catch (error) {
          if (error.message === "Ученик уже записан") {
            this.clearAll();
            this.startClearTimeout(9000);
            soundError.play(0.1);
            this.error = true;
          }
          console.log(error);
        }
      },
      toggle() {
        this.paused = !this.paused;
        return false;
      },
      async selectCamera(){
        try{
          let id = await cameraDialog();
          this.$config.set('deviceID', id);
          this.deviceID = id;
          location.reload();
        }catch (e) {}
      },
    },
    beforeDestroy(){
      this.Mousetrap = false;
    },
    mounted(){
      this.$wait(Promise.all([this.$store.dispatch('Students/init'),this.$store.dispatch('ThisDay/init')])
        .then(()=>{if(!this.$store.state.ThisDay.started) return this.$store.dispatch('ThisDay/startSession')})
        .then(()=>{
        this.Mousetrap = true;
        this.paused = false;
      }));
    },
    watch:{
      Mousetrap(n,o){
        if(n){
          Mousetrap.bind('space', this.toggle);
          Mousetrap.bind('ctrl+shift+c', this.selectCamera);
          Mousetrap.bind('d e v enter', function(){
            getGlobal('mainWindow').webContents.openDevTools();
          });
          Mousetrap.bind('e x i t esc',()=>{
            this.$wait(promiseIpc.send('changeKioskMode', false));
          });
        }else{
          Mousetrap.unbind('space');
          Mousetrap.unbind('ctrl+shift+c');
          Mousetrap.unbind('d e v enter');
        }
      }
    }
  }
</script>

<style scoped>
  #kioskapp{
    margin: 50px 20px 10px;
  }
  #messagebox{
    text-align: center;
    height: 200px;
  }
  #error-message__title{
    color: #D32F2F;
  }
  #successs-message__student-name{
    color: #388E3C;
  }
  #hello-message__descr{
    font-weight: normal;
  }
  .ScanningPageCameraHelpWrapper{
    position: absolute;
    display: flex;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
  }
  .ScanningPageCameraHelp {
    display: none;
    bottom: 0;
    left: 0;
    text-align: center;
    width: 100%;
    color: #fff;
    z-index: 1;
  }

  .ScanningPageCameraHelpBG{
    display: none;
    position: absolute;
    content: ' ';
    bottom: 0;
    left: 0;
    text-align: center;
    width: 100%;
    background: linear-gradient(rgba(255, 255, 255, 0), rgba(52, 58, 64, 0.82));
    height: 35px;
  }
  .ScanningPageCameraWrapper{
    /*height: 250px;*/
    max-width: 600px;
    margin: 40px auto;
  }
  .ScanningPageCameraWrapper:hover .ScanningPageCameraHelp, .ScanningPageCameraWrapper:hover .ScanningPageCameraHelpBG{
    visibility: hidden;
  }
  .ScanningPageCameraHelp.paused{
    display: block;
    font-size: 22px;
  }
  .ScanningPageCameraHelpBG.paused{
    background: rgba(52, 58, 64, 0.82);
    height: 100%;
    display: block;
  }
</style>