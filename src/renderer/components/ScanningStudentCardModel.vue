<template>
  <modal name="scanning-student-card" :width="400" height="auto" :adaptive="true">
    <Camera @detect="onDetect"></Camera>

  </modal>
</template>

<script>
  import Camera from './Camera';
  export default {
    name: "ScanningStudentCardModel",
    components: {Camera},
    data(){
      return {
        count: 0,
        error: false
      }
    },
    props:{
      detect: Function,
    },
    methods:{
      async onDetect(p){
          let r = await p;
          let f = await this.detect(r.content);
      }
    }
  }
</script>

<style scoped>

</style>