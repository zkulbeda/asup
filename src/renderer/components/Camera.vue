<template>
  <div>
    <CameraViewOld @init="init" :camera="camera" @detect="onDetect" :paused="paused && cameraFound"></CameraViewOld>
  </div>
</template>

<script>
  let {app, dialog, shell} = require('electron').remote;
  import CameraViewOld from './CameraViewOld';
  import cameraDialog from './selectCamera';
  import Pizzicato from 'pizzicato';

  let soundSuccess = new Pizzicato.Sound({
    source: 'file',
    options: { path: require('@/assets/beep.wav'), attack: 0 }
  });
  export default {
    components: {CameraViewOld},
    model: {
      prop: 'paused',
      event: 'changeState'
    },
    name: "Camera",
    props: {
      paused: Boolean
    },
    data() {
      let id = this.$config.get('deviceID');
      console.log("config id", id);
      return {
        deviceID: id,
        cameraFound: true,
      }
    },
    computed: {
      cameraInit() {
        return {
          mandatory: {
            sourceId: this.deviceID//'4e8822da8628ebb83f14681db3d674c3495216b9f50ef64054f73c0b9301855f', //'0070d35198c8d70b1bdabb12f7953c7fbc117bfc096424c20dac86476ed75bdb',
          },
        };
      },
      camera() {
        return this.cameraInit;
      },
    },
    methods: {
      async selectCamera() {
        try {
          let id = await cameraDialog();
          id = id.label;
          this.$config.set('deviceID', id);
          this.deviceID = id;
          this.cameraFound = true;
          this.$emit('changeState', false);
        } catch (e) {
          this.$emit('changeState', true);
        }
      },
      onDetect(data) {
        soundSuccess.play();
        this.$emit('detect', data);
      },
      init(state) {
        if (state) {
          this.cameraFound = true;
        } else {
          this.$emit('changeState', true);
          this.cameraFound = false;
          this.selectCamera();
        }
      },
      async onInit(promise) {
        try {
          await promise
          this.$emit('onInit', true);
          this.cameraFound = true;
          // successfully initialized
        } catch (error) {
          console.error(error);
          console.log("ERRRRRORRR");
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
    watch: {
      paused(n) {
        if (n === false && this.cameraFound === false) {
          this.$emit('changeState', true);
          this.selectCamera();
        }

      }
    }
  }
</script>

<style scoped>

</style>