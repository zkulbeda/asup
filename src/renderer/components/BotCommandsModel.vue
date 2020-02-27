<template>
    <modal name="sendQuestions" :width="400" height="auto" :adaptive="true" @opened="$emit('opened')"
           @before-close="$emit('closed')">
        <div class="CloseDayModal">
            <CloseIcon class="CloseIcon" @click="close"></CloseIcon>
            <h3>Закрытие дня</h3>
            <p>Статус бота: {{bot_status}}</p>
            <b-button @click="send">Отправить</b-button>
            <template v-if="!isEmpty">
                <p>Отправка сообщений с вопросом ученикам</p>
                <hr style="margin-left: -20px; margin-right: -20px;">
                <b-form @submit="end" @submit.stop.prevent>
                    <b-form-group
                            id="input-group-1"
                            label="Меню для платников:"
                            label-for="input-1"
                    >
                        <b-form-input
                                id="input-1"
                                v-model="notfree"
                                type="text"
                                step="0.01" max="10" min="0"
                                placeholder='0.00'
                                required
                                :state="!validation.isTouched('notfree')?null:!validation.hasError('notfree')"

                        ></b-form-input>
                        <b-form-invalid-feedback :state="!validation.isTouched('notfree')?null:!validation.hasError('notfree')">
                            {{validation.firstError('notfree')}}
                        </b-form-invalid-feedback>
                    </b-form-group>
                    <b-form-group
                            id="input-group-2"
                            label="Меню для бесплатников:"
                            label-for="input-2"
                            description="Повторно сегодня день уже нельзя будет открыть."
                    >
                        <b-form-input
                                id="number"
                                v-model="free"
                                type="number"
                                step="0.01" max="10" min="0"
                                required
                                placeholder='0.00'
                                :state="!validation.isTouched('free')?null:!validation.hasError('free')"
                        ></b-form-input><dsfjjfl class=""2odfml></dsfjjfl>
                        <b-form-invalid-feedback :state="!validation.isTouched('free')?null:!validation.hasError('free')">
                            {{validation.firstError('free')}}
                        </b-form-invalid-feedback>
                    </b-form-group>
                    <div style="display: flex; justify-content: flex-end;">
                        <b-button @click="check" type="submit" variant="danger">Закрыть день</b-button>
                    </div>
                </b-form>
            </template>
            <template v-else>
                <p>В этот день никто не питался. <br>Этот день не будет отображаться в отчёте</p>
                <div style="display: flex; justify-content: flex-end;">
                    <b-button @click="end" type="submit" variant="danger">Закрыть день</b-button>
                </div>
            </template>
        </div>
    </modal>
</template>

<script>
    import Vue from "vue";
    import SimpleVueValidation from 'simple-vue-validator';
    import CloseIcon from 'icons/close';
    import {getGlobal} from "@/components/utils";
    import axios from "axios"

    // const bot_api = axios.create({
    //     url: getGlobal("bot_api").commands
    // });
    //
    // const db = getGlobal('firestore');

    Vue.use(SimpleVueValidation);
    import msgs from './validation.js';

    SimpleVueValidation.extendTemplates(msgs);
    const Validator = SimpleVueValidation.Validator;

    // async function*  sendingMessages(studets, menu){
    //     await bot_api.post({
    //         data: {
    //             query: "start_poll",
    //             menu
    //         }
    //     });
    //     for(let student of students){
    //         let student_ref = await db.collection("student").doc(student.studentID).get;
    //         let [first_name, last_name, patronymic] = student.name.split(" ");
    //         if(!student_ref.exists){
    //             await student.ref.ref.set({
    //                 answer: false,
    //                 answer_day_stamp: 0,
    //                 bot_type: null,
    //                 user_id: null,
    //                 eating_type: student.pays?"notfree":"free",
    //                 name: {
    //                     first_name, last_name, patronymic
    //                 },
    //                 invitation_code: student.invitation_code,
    //                 last_message_id: null,
    //                 last_sticker_message_id: null,
    //                 late_day_stamp: null,
    //                 message_send_day_stamp: null,
    //                 send_stickers: true,
    //                 send_messages: true,
    //             })
    //         }else {
    //             await student_ref.ref.update({
    //                 answer: false,
    //                 answer_day_stamp: true,
    //                 eating_type: student.pays?"notfree":"free",
    //                 name: {
    //                     first_name, last_name, patronymic
    //                 },
    //                 invitation_code: student.invitation_code,
    //             })
    //         }
    //         await bot_api.post({
    //             data: {
    //                 query: "sendQuestions",
    //                 student_id: student.studentID
    //             }
    //         })
    //         yield student;
    //     }
    // }

    export default {
        components: {
            CloseIcon
        },
        validators: {
            free(v) {
                return Validator.value(v).required().custom(() => {
                    // if (v > 10) return "Цена должна быть в пределах разумного"
                });
            },
            notfree(v) {
                return Validator.value(v).required().float().custom(() => {
                    // if (v > 10) return "Цена должна быть в пределах разумного"
                });
            }
        },
        name: "BotCommandsModel",
        data: ()=>({
            bot_status: null,

        }),

        async mounted(){
            // let settings_ref = await db.collection("system").doc("settings");
            // this.bot_status = settings_ref.data().is_poll_active;
        },

        methods: {
            async send(){
                // for await (let res of sendingMessages(this.$store.state.Students.students, {
                //     "free": "Тест для бесплатных",
                //     "notfree":"Тест для платных"
                // })){
                //     console.log(res);
                // }
            }
        },

        computed: {
            count() {
                return this.$store.state.ThisDay.listOfRecords.length;
            },
        }
    }
</script>

<style scoped>

</style>