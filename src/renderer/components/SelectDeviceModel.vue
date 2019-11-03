<template>
  <modal :name="modelName"
         :width="400"
         height="auto"
         :adaptive="true"
         @before-open="inits"
         @opened="$emit('opened')"
         @before-close="$emit('closed')">
    <div class="CloseDayModal">
      <CloseIcon class="CloseIcon" @click="close"></CloseIcon>
      <h3>Выбор устройсва</h3>
      <template v-if="!isEmpty">
        <b-list-group flush style="margin: 20px -20px;">
          <b-list-group-item v-for="(e, index) in devices" :key="e" href="#" :active="selected == index" @click="select(index)">{{e.ip}}</b-list-group-item>
        </b-list-group>
      </template>
      <template v-else>
        <p>В этот день никто не питался. <br>Этот день не будет отображаться в отчёте</p>
      </template>
      <div style="display: flex; justify-content: flex-end;">
        <b-button @click="end" type="submit" :variant="selected!==null?'success':'danger'">{{selected!==null?'Продолжить':'Закрыть день'}}</b-button>
      </div>
    </div>
  </modal>
</template>

<script>
  import Vue from 'vue';
  import SimpleVueValidation from 'simple-vue-validator';
  import CloseIcon from 'icons/close';
  import {DateTime} from 'luxon'
  import promiseIpc from 'electron-promise-ipc';

  Vue.use(SimpleVueValidation);
  // import msgs from './validation.js';

  // SimpleVueValidation.extendTemplates(msgs);
  // const Validator = SimpleVueValidation.Validator;
  export default {
    components: {
      CloseIcon,
    },
    name: "SelectDeviceModel",
    data() {
      return {
        free: null,
        notfree: null,
        dayToEdit: null,
        edit: false,
        selected: null,
        modelName: 'SelectDevice',
        devices: [
          {name: '', ip: 'dafbgvdfbdfb'},
          {name: '', ip: 'dfvbzxcvvb'},
          {name: '', ip: 'cbcvbvcbvcbvb'},
        ]
      }
    },
    computed: {
      isEmpty(){
        return !!this.selected;
      }
    },
    methods: {
      clearState() {
        this.free = null;
        this.notfree = null;
        this.validation.reset();
      },
      check() {
        this.free = this.free || '';
        this.notfree = this.notfree || '';
      },
      async end() {
        if(!this.isEmpty) {
          let res = await this.$validate();
          if (res === false) {
            this.check();
            return;
          }
        }
        this.$wait(this.callback({
          free: this.numFree,
          notFree: this.numNotFree,
          dayToEdit: this.dayToEdit
        }).then(()=>{this.clearState();this.close();}));

      },
      async deleteDay(){
        this.$wait(this.callbackDelete({
          dayToEdit: this.dayToEdit
        }).then(()=>{this.clearState();this.close();}));
      },
      close() {
        this.$modal.hide(this.modelName);
      },
      select(i){
        this.selected = i;
      },
      async inits(e){
        // console.log(e);
        // this.dayToEdit=e.params.dayToEdit;
        // this.edit=e.params.edit||false;
        // if(this.edit){
        //   this.free=e.params.price.free||0;
        //   console.log(e.params.price);
        //   this.notfree=e.params.price.notFree||0;
        // }else{this.clearState()}
        // this.count=e.params.count||0;
        // this.callback=e.params.callback||(()=>Promise.reject());
        // this.callbackDelete=e.params.callbackDelete||(()=>Promise.reject());
        this.selected = null;
        await this.get_data();
        this.get_data_with_context = this.get_data.bind(this);
        promiseIpc.on("connections_change", this.get_data_with_context);
      },
      async get_data(){
        let d = await promiseIpc.send("getRFIDConnections");
        let connections = [];
        for(let e of d){
          connections.push({name: '', ip: e});
        }
        this.devices = connections;
      },
      destroy(){
        promiseIpc.removeListener("connections_change", this.get_data_with_context);
      }
    }
  }
</script>

<style scoped>
  .v--modal-overlay {
    background-color: rgba(0, 0, 0, 0.7);
  }

  .CloseDayModal {
    padding: 20px;
  }

  .CloseIcon {
    position: absolute;
    top: 20px;
    right: 20px;
    color: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
</style>