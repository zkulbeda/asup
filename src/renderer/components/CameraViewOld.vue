<template>
    <video class="videoView"></video>
</template>

<script>
    // import qr from './instascan/index.js';

    import {BrowserQRCodeReader, NotFoundException, ChecksumException, FormatException} from '@zxing/library';
    import Camera from "./instascan/src/camera";
    const { dialog } = require('electron').remote;
    import findIndex from 'lodash/findIndex';

    let scanner = null;
    let last = null;
    let zx = null;

    export default {
        name: "CameraView",
        props:{
            camera: true,
            paused: true
        },
        beforeMount(){
            zx = new BrowserQRCodeReader();
        },
        async mounted() {
            // scanner = new qr.Scanner({
            //     video: this.$el,
            //     captureImage: true,
            //     refractoryPeriod: 5000,
            //     mirror: false,
            //     scanPeriod: 1
            // });
            if(!this.paused) {
                this.start();
            }
            // scanner.on('scan',(data, imageData)=>{
            //     if(data!==last){
            //         last = data;
            //         this.$emit('detect', {content: data, imageData});
            //     }
            // })
        },
        methods:{
            async getCamera(c){
                let cameras = await zx.listVideoInputDevices();
                console.log(cameras, c);
                let i = findIndex(cameras, (e)=>e.label===c.mandatory.sourceId);
                if(i==-1){
                    return null;
                }
                return cameras[i];
            },
            async start(c){
                c = c||this.camera;
                let cam = await this.getCamera(c);
                console.log(cam, !!cam);
                if(!cam) {
                    return this.$emit('init', !!cam);
                };
                console.log(await zx.listVideoInputDevices());
                if(cam)
                    await zx.decodeFromInputVideoDeviceContinuously(cam.deviceId, this.$el, (result, err) => {
                        if (result) {
                            if(result.text!==last){
                                last = result.text;
                                this.$emit('detect', {content: result.text});
                            }
                            // properly decoded qr code
                            console.log('Found QR code!', result)
                        }

                        if (err) {
                            // As long as this error belongs into one of the following categories
                            // the code reader is going to continue as excepted. Any other error
                            // will stop the decoding loop.
                            //
                            // Excepted Exceptions:
                            //
                            //  - NotFoundException
                            //  - ChecksumException
                            //  - FormatException

                            if (err instanceof NotFoundException) {
                                return;
                            }
                            if (err instanceof ChecksumException) {
                                console.log('A code was found, but it\'s read value was not valid.');
                                return;
                            }

                            if (err instanceof FormatException) {
                                console.log('A code was found, but it was in a invalid format.');
                                return;
                            }
                        }
                    })
                this.$emit('init', !!cam);
                    // scanner.start(cam);
            }
        },
        watch:{
            async paused(e){
                if(!e)
                    this.start();
                else zx.reset();
            },
            async camera(c){
                if(!this.paused) {
                    zx.reset();
                    this.start(c);
                }
            }
        },
        beforeDestroy(){
            if(zx) zx.reset();
            zx = null;
        },
        computed: {}
    }
</script>

<style scoped>
    .videoView{
        width: 100%;
    }
</style>