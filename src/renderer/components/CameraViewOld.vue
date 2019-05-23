<template>
    <video class="videoView"></video>
</template>

<script>
    import qr from 'instascan';
    const { dialog } = require('electron').remote;

    let scanner = null;
    let last = null;

    export default {
        name: "CameraView",
        mounted() {
            console.log(this.$db);
            let t = this;
            scanner = new qr.Scanner({
                video: t.$el,
                captureImage: true,
                refractoryPeriod: 500
            });
            qr.Camera.getCameras().then(function (cameras) {
                if (cameras.length > 0) {
                    scanner.start(cameras[1]);
                    return ;
                    if(cameras.length >1)
                        dialog.showMessageBox({
                            type: "question",
                            title:"Подключено несколько камер",
                            detail: "Выберите камеру:",
                            buttons: cameras.map((d)=>d.name),
                            cancelId: -1,
                        }, (res)=>{
                            if(res==-1) return;
                            console.log(res)
                            scanner.start(cameras[res]);
                        });
                    else scanner.start(cameras[0]);
                } else {
                    console.error('No cameras found.');
                }
            }).catch(function (e) {
                this.$emit('error',e);
            });
            scanner.on('scan',(data, image)=>{
                // if(data!==last){
                //     last = data;
                    this.$emit('decode', data, image);
                // }
            })
        },
        beforeDestroy(){
            scanner.stop();
        },
        computed: {}
    }
</script>

<style scoped>
    .videoView{
        width: 100%;
    }
</style>