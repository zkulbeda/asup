<template>
  <b-container style="position: relative;">
    <template v-if="$store.state.ThisDay.started && !$store.state.ThisDay.ended">
      <b-row>
        <b-col>
          <StudentScanCard :data="currentCard" :error="error"></StudentScanCard>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <div class="ScanningPageCameraWrapper" style="position: relative">
            <div class="ScanningPageCameraError" v-if="!cameraFound">
              <h4>Камера не найдена</h4>
              <b-button class="btn-primary">Повторить поиск</b-button>
            </div>
            <QrcodeStream :camera="camera" @detect="onDetect" @init="onInit" :paused="paused"></QrcodeStream>
            <div class="ScanningPageCameraHelp" :class="{paused: paused}">Нажмите пробел, <br v-if="paused"/>чтобы {{paused?'возобновить':'остановить'}} сканирование</div>
            <div class="ScanningPageCameraHelpBG" :class="{paused: paused}"></div>
          </div>
        </b-col>
        <b-col>
          <b-list-group class="ScanningPageList">
            <b-list-group-item v-for="(qr,i) in scannedList" href="#" :active="i===selected" :key="i" @click="viewCard(i)">
              {{$store.state.Students.students[qr.id].name}}
              <span>{{qr.createdAt | formatTime}}</span>
            </b-list-group-item>
          </b-list-group>
        </b-col>
      </b-row>
      <b-button variant="outline-danger" class="ScanningPageCloseDay" @click="closeDay">Завершить день</b-button>
    </template>
    <b-row v-if="!$store.state.ThisDay.started && !$store.state.ThisDay.ended">
      <b-col class="text-center ScanningPageDayStatus">
        <h1>День еще не открыт</h1>
        <p>Чтобы начать сканирование, необходимо открыть день.<br> При открытии этот день будет отображаться в отчёте.</p>
        <div class="ScanningPageDayNotStarted_button">
          <b-button @click="openThisDay">Открыть</b-button>
        </div>
      </b-col>
    </b-row>
    <b-row v-if="$store.state.ThisDay.started && $store.state.ThisDay.ended">
      <b-col class="text-center ScanningPageDayStatus">
        <h1 class="mb-4">День закрыт</h1>
        <p>Следующий день можно будет открыть завтра.</p>
      </b-col>
    </b-row>
    <CloseDayModel></CloseDayModel>
  </b-container>
</template>

<script>
  import SystemInformation from './LandingPage/SystemInformation'
  //import CameraView from "./CameraView";
  import QrcodeStream from './VueScan/components/QrcodeStream';
  import StudentScanCard from './StudentScanCard'
  import Mousetrap from'mousetrap';
  import fs from 'fs';
  import {DateTime} from 'luxon'
  import CloseDayModel from "@/components/CloseDayModel";
  let {app, dialog} = require('electron').remote;

  export default {
    name: 'landing-page',
    components: {SystemInformation, QrcodeStream, StudentScanCard,CloseDayModel},
    data() {
      let id = this.$config.get('deviceID');
      return {
        scans: [],
        paused: true,
        lastStudent: null,
        deviceID: id,
        cameraFound: true,
        selected: null,
        error: null
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
      camera() {
        return this.cameraFound ? this.cameraInit : false;
      },
      scannedList(){
        return this.$store.state.ThisDay.listOfRecords;
      },
      currentCard(){
        if(this.selected!==null)
          return {st: this.$store.state.Students.students[this.scannedList[this.selected].id], rd: this.scannedList[this.selected]};
        else return null;
      }
    },
    beforeDestroy(){
      Mousetrap.unbind('space');
    },
    mounted(){
    },
    methods: {
      selectCamera(){
        navigator.mediaDevices.enumerateDevices()
          .then((devices)=>{
            console.log(devices);
            let d = devices.filter((e)=>e.kind ==='videoinput');
            dialog.showMessageBox({
              type: "question",
              title:"Подключено несколько камер",
              detail: "Выберите камеру:",
              buttons: d.map((d)=>d.label),
              cancelId: -1,
            }, (res)=>{
              if(res==-1) {
                this.paused = true;
                return 0;
              }
              this.$config.set('deviceID',d[res].deviceId);
              this.deviceID = d[res].deviceId;
              this.paused = false;
            });
          });
      },
      viewCard(i){
          this.selected = i;
          this.error = null;
      },
      toggle() {
        this.paused = !this.paused;
      },
      async onDetect(promise) {
        try {
          const all = await promise;
          //let img = imagedata_to_image(all.imageData);
          // let img = await this.$store.dispatch('ThisDay/createImageUrl', {rd:{id: all.content, }, imagedata: all.imageData})
          let {st, rd} = await this.$store.dispatch("Students/record", {id: all.content, img: all.imageData});
          console.log(st);
          this.selected = 0;
          // ...
        } catch (error) {
          if (error.message === "Ученик уже записан") {
            let f = this.scannedList.findIndex((e)=>error.data.record._id===e._id);
            this.selected = f!==-1?f:null;
            this.error = error.message;
          }
          console.log(error);
        }
      },
      async onInit(promise) {
        Mousetrap.bind('space', ()=>{this.toggle(); return false;});
        try {
          await promise
          // successfully initialized
        } catch (error) {
          console.error(error)
          if (error.name === 'NotFoundError') {

          } else if (error.name === 'NotReadableError') {
            // maybe camera is already in use
          } else if (error.name === 'OverconstrainedError') {
            this.paused = true;
            this.selectCamera();
            // passed constraints don't match any camera.
            // Did you requested the front camera although there is none?
          } else {

          }
          console.log(error);
        } finally {
          //if(!this.paused) this.cameraFound = false;
          // hide loading indicator
        }
      },
      openThisDay() {
        this.$store.dispatch('ThisDay/startSession')
      },
      decode(data) {

      },
      closeDay(){
        // dialog.showMessageBox({
        //   type: 'warning',
        //   message: "Закрыть текущий день?",
        //   cancelId: 1,
        //   title: "Закрытие дня",
        //   buttons: ["Закрыть", "Отмена"],
        //   defaultId: 1,
        //   noLink: true,
        //   detail: "Вы не сможете открыть его снова."
        // }, (b)=>{
        //   if(b===0) this.$store.dispatch("ThisDay/closeSession");
        // });
        this.$modal.show('closeDay');
      },
      inc() {
        console.log('incc', this.$store);
        this.$store.dispatch('Counter/someAsyncTask');
      }
    },
    directives: {
      focus: {
        // определение директивы
        inserted: function (el, {value}) {
          if(value == true) el.focus();
        },
        componentUpdated: function (el, {value}) {
          if(value == true) el.focus();
        }
      }
    },
    filters:{
      formatTime(time){
        return DateTime.fromJSDate(time).toLocaleString(DateTime.TIME_24_WITH_SECONDS);
      }
    }
  }
</script>

<style>
  .ScanningPageList{
    overflow-y: scroll;
    position: absolute;
    width: 97.5%;
    height: 100%;
  }
  .ScanningPageCameraError {
    position: absolute;
    z-index: 1;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    text-align: center;
    padding-top: 70px;
  }

  .ScanningPageDayStatus {
    padding: 70px 0px;
  }

  .ScanningPageDayNotStarted_button {
    padding-top: 20px;
  }

  .ScanningPageCameraHelp {
    position: absolute;
    display: block;
    bottom: 0;
    left: 0;
    text-align: center;
    width: 100%;
    color: #fff;
    z-index: 1;
  }

  .ScanningPageCameraHelpBG{
    position: absolute;
    display: block;
    content: ' ';
    bottom: 0;
    left: 0;
    text-align: center;
    width: 100%;
    background: linear-gradient(rgba(255, 255, 255, 0), rgba(52, 58, 64, 0.82));
    height: 35px;
  }
  .ScanningPageCameraWrapper{
    min-height: 250px;
  }
  .ScanningPageCameraWrapper:hover .ScanningPageCameraHelp, .ScanningPageCameraWrapper:hover .ScanningPageCameraHelpBG{
    visibility: hidden;
  }
  .ScanningPageCameraHelp.paused{
    font-size: 22px;
    height: 62%;

  }
  .ScanningPageCameraHelpBG.paused{
    background: rgba(52, 58, 64, 0.82);
    height: 100%;
  }
  .ScanningPageCloseDay{
    position: absolute;
    right: 15px;
    top: 20px;
  }

  @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Source Sans Pro', sans-serif;
  }

  #wrapper {
    background: radial-gradient(
        ellipse at top left,
        rgba(255, 255, 255, 1) 40%,
        rgba(229, 229, 229, .9) 100%
    );
    height: 100vh;
    padding: 60px 80px;
    width: 100vw;
  }

  #logo {
    height: auto;
    margin-bottom: 20px;
    width: 420px;
  }

  main {
    display: flex;
    justify-content: space-between;
  }

  main > div {
    flex-basis: 50%;
  }

  .left-side {
    display: flex;
    flex-direction: column;
  }

  .welcome {
    color: #555;
    font-size: 23px;
    margin-bottom: 10px;
  }

  .title {
    color: #2c3e50;
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 6px;
  }

  .title.alt {
    font-size: 18px;
    margin-bottom: 10px;
  }

  .doc p {
    color: black;
    margin-bottom: 10px;
  }

  .doc button {
    font-size: .8em;
    cursor: pointer;
    outline: none;
    padding: 0.75em 2em;
    border-radius: 2em;
    display: inline-block;
    color: #fff;
    background-color: #4fc08d;
    transition: all 0.15s ease;
    box-sizing: border-box;
    border: 1px solid #4fc08d;
  }

  .doc button.alt {
    color: #42b983;
    background-color: transparent;
  }
</style>
