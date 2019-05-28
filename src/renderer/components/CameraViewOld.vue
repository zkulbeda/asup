<template>
    <video class="videoView"></video>
</template>

<script>
    import qr from 'instascan';
    const { dialog } = require('electron').remote;
    import findIndex from 'lodash/findIndex';

    let scanner = null;
    let last = null;

    export default {
        name: "CameraView",
        props:{
            camera: true,
            paused: true
        },
        async mounted() {
            scanner = new qr.Scanner({
                video: this.$el,
                captureImage: true,
                refractoryPeriod: 500
            });
            if(!this.paused) {
                this.start();
            }
            scanner.on('scan',(data, imageData)=>{
                if(data!==last){
                    last = data;
                    this.$emit('detect', {content: data, imageData});
                }
            })
        },
        methods:{
            async getCamera(c){
                let cameras = await qr.Camera.getCameras();
                let i = findIndex(cameras, (e)=>e.id===c.mandatory.sourceId);
                if(i==-1){
                    return null;
                }
                return cameras[i];
            },
            async start(c){
                c = c||this.camera;
                let cam = await this.getCamera(c);
                console.log(cam, !!cam);
                if(cam)
                    scanner.start(cam);
                this.$emit('init', !!cam);
            }
        },
        watch:{
            async paused(e){
                if(!e)
                    this.start();
                else scanner.stop();
            },
            async camera(c){
                scanner.stop();
                if(!this.paused)
                    this.start(c);
            }
        },
        beforeDestroy(){
            scanner.stop();
            scanner = null;
        },
        computed: {}
    }
</script>

<style scoped>
    .videoView{
        width: 100%;
    }
</style>