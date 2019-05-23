<template>
  <div>
    <QrcodeStream v-if="cameraFound" :camera="camera" @detect="onDetect" @init="onInit" :paused="paused && cameraFound"></QrcodeStream>
  </div>
</template>

<script>
  let {app, dialog} = require('electron').remote;
  import QrcodeStream from './VueScan/components/QrcodeStream';
  export default {
    components:{QrcodeStream},
    model: {
      prop: 'paused',
      event: 'changeState'
    },
    name: "Camera",
    props:{
      paused: Boolean
    },
    data(){
      let id = this.$config.get('deviceID');
      return {
        deviceID: id,
        cameraFound: true,
      }
    },
    computed:{
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
    },
    methods:{
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
                this.$emit('changeState',true);
                return 0;
              }
              this.$config.set('deviceID',d[res].deviceId);
              this.deviceID = d[res].deviceId;
              this.cameraFound = true;
              this.$emit('changeState',false);
            });
          });
      },
      onDetect(promise) {
        this.$emit('detect', promise);
      },
      async onInit(promise) {
        try {
          await promise
          this.$emit('onInit', true);
          this.cameraFound = true;
          // successfully initialized
        } catch (error) {
          console.error(error)
          if (error.name === 'NotFoundError') {

          } else if (error.name === 'NotReadableError') {
            // maybe camera is already in use
          } else if (error.name === 'OverconstrainedError') {
            this.$emit('changeState', true);
            this.cameraFound = false;
            this.selectCamera();
            // passed constraints don't match any camera.
            // Did you requested the front camera although there is none?
          } else {

          }
          this.$emit('onInit', false);
          console.log(error);
        } finally {

        }
      },
    },
    watch:{
      paused(n){
        if(n===false && this.cameraFound===false){
          this.$emit('changeState', true);
          this.selectCamera();
        }

      }
    }
  }
</script>

<style scoped>

</style>