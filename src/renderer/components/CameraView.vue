<template>
    <video></video>
</template>

<script>
    import qr from 'instascan';

    let scanner = null;

    export default {
        name: "CameraView",
        mounted() {
            let t = this;
            scanner = new qr.Scanner({
                video: t.$el,
                captureImage: true,
                refractoryPeriod: 500
            });
            qr.Camera.getCameras().then(function (cameras) {
                if (cameras.length > 0) {
                    scanner.start(cameras[0]);
                } else {
                    console.error('No cameras found.');
                }
            }).catch(function (e) {
                console.error(e);
            });
            scanner.on('scan',(data, image)=>{
                console.log(data);
            })
        },
        beforeDestroy(){
            scanner.stop();
        },
        computed: {}
    }
</script>

<style scoped>

</style>