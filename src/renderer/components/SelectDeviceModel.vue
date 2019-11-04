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
          <hr style="margin-left: -20px; margin-right: -20px;">
          <div style="
                text-align: center;
                margin: 35px 0px;
            ">
              <span role="status" class="spinner-grow text-primary" style="width: 3rem; height: 3rem;"><span class="sr-only">Spinning</span></span>
              <div style="font-size: 20px">Ожидание сканирования</div>
          <div>Устройство появится автоматически</div>
          </div>
          <hr style="margin-left: -20px; margin-right: -20px;">
      </template>
      <div style="display: flex; justify-content: flex-end;">
        <b-button @click="end" type="submit" :variant="selected!==null?'primary':'danger'">{{selected!==null?'Продолжить':'Отмена'}}</b-button>
      </div>
    </div>
  </modal>
</template>

<script>
  import CloseIcon from 'icons/close';
  import promiseIpc from 'electron-promise-ipc';
  export default {
    components: {
      CloseIcon,
    },
    name: "SelectDeviceModel",
    data() {
      return {
        selected: null,
        modelName: 'SelectDeviceModel',
          callback: null,
          callbackCancel: null,
        devices: [
          {name: '', ip: 'dafbgvdfbdfb'},
          {name: '', ip: 'dfvbzxcvvb'},
          {name: '', ip: 'cbcvbvcbvcbvb'},
        ]
      }
    },
    computed: {
      isEmpty(){
        return this.devices.length==0;
      }
    },
    methods: {
      async end() {
          this.close();
          console.log(this.isEmpty);
        if(this.isEmpty || !!this.selected) this.callbackCancel();
        else this.callback({
            device: this.devices[this.selected]
        });

      },
      close() {
          this.callbackCancel();
        this.$modal.hide(this.modelName);
      },
      select(i){
        this.selected = i;
      },
      async inits(e){
          if(e.params == undefined){
              e.params = {};
          }
        this.callback=e.params.callback||(()=>{});
        this.callbackCancel=e.params.callbackCancel||(()=>{});
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
    },

      destroy(){
          promiseIpc.removeListener("connections_change", this.get_data_with_context);
      },
      watch: {
          devices(n){
              if(n[this.selected] === undefined){
                  this.selected = null;
              }
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