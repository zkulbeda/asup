<template>
    <modal :name="modelName"
           :width="400"
           height="auto"
           :adaptive="true"
           @before-open="inits"
           @opened="$emit('opened')"
           @before-close="$emit('closed')">
        <div class="CloseDayModal">
<!--            <CloseIcon class="CloseIcon" @click="close"></CloseIcon>-->
            <h3>Привязка карты</h3>
            <Camera @detect="onDetect" v-if="false"></Camera>
            <hr style="margin-left: -20px; margin-right: -20px;">
            <div style="text-align: center;margin: 35px 0px;">
            <template v-if="status == 'success'">
<!--                <span role="status" class="spinner-grow text-primary" style="width: 3rem; height: 3rem;"><span class="sr-only">Spinning</span></span>-->
                <div style="font-size: 20px">Выполнено успешно</div>
                <div>Карта привязана к ученику</div>
            </template>
            <template v-else v-if="status='error'">
<!--                    <span role="status" class="spinner-grow text-primary" style="width: 3rem; height: 3rem;"><span class="sr-only">Spinning</span></span>-->
                    <div style="font-size: 20px">Произошла ошибка</div>
                    <div>Упс... Что-то пошло не так</div>
            </template>
                <template v-else>
                    <span role="status" class="spinner-grow text-primary" style="width: 3rem; height: 3rem;"><span class="sr-only">Spinning</span></span>
                    <div style="font-size: 20px">Ожидание карты</div>
                    <div>Приложите карту к сканеру</div>
                </template>
            </div>
            <hr style="margin-left: -20px; margin-right: -20px;">
            <div style="display: flex; justify-content: flex-end;">
                <b-button @click="end" type="submit" :variant="selected!==null?'primary':'danger'">{{selected!==null?'Продолжить':'Отмена'}}</b-button>
            </div>
        </div>
    </modal>
</template>

<script>
    import CloseIcon from 'icons/close';
    import promiseIpc from 'electron-promise-ipc';
    import Camera from './Camera';
    import TheStudent from "@/components/TheStudent";
    export default {
        components: {
            CloseIcon,Camera
        },
        name: "LinkCardCard",
        data() {
            return {
                selected: null,
                modelName: 'LinkCardModel',
                callback: null,
                callbackCancel: null,
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
                if(this.isEmpty) this.callbackCancel();
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
                if(e.params.connection === undefined || e.params.student === undefined){
                    console.error('Не указано соединение или ученик');
                    return;
                }
                this.callback=e.params.callback||(()=>{});
                this.callbackCancel=e.params.callbackCancel||(()=>{});
                this.connection=e.params.connection;
                this.student = null;
                let user = await TheStudent.loadFromID(e.params.student);
                this.student = user;
                this.status = null;
                this.promise = promiseIpc.send('RFIDRecordCard', {student_id: user.studentID, connection: c})
                    .then(()=>{
                        this.status = "success"
                    }, ()=>{
                        this.status = "error"
                    });
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