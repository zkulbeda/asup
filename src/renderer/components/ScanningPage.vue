<template>
    <b-card>
        <b-container style="position: relative;">
            <b-row v-if="$store.state.ThisDay.hasNoClosedDay">
                <b-col class="text-center ScanningPageDayStatus">
                    <h1>Предыдущий день не был закрыт</h1>
                    <p>Чтобы открыть текущий день, необходимо закрыть предыдущий.<br>День который нужно закрыть: <b>{{dayInWords}}</b>
                        <br>Вы обязаны закрыть этот день.</p>
                    <div class="ScanningPageDayNotStarted_button">
                        <b-button variant="danger" @click="closeDay">Закрыть {{dayInWords}}</b-button>
                    </div>
                </b-col>
            </b-row>
            <template v-else>
                <template v-if="$store.state.ThisDay.started && !$store.state.ThisDay.ended">
                    <b-row>
                        <b-col>
                            <StudentScanCard :data="currentCard" :error="error"></StudentScanCard>
                        </b-col>
                    </b-row>
                    <b-row>
                        <b-col>
                            <div class="ScanningPageCameraWrapper" style="position: relative">
                                <div class="ScanningPageCameraError" v-if="!cameraFound">
                                    <h4>Камера не найдена</h4>
                                    <b-button class="btn-primary">Повторить поиск</b-button>
                                </div>
                                <Camera @detect="onDetect" @init="onInit" v-model="paused"></Camera>
                                <div class="ScanningPageCameraHelpWrapper d-flex"
                                     :class="[paused?'align-items-center':'align-items-end']">
                                    <div class="ScanningPageCameraHelp" :class="{paused: paused}">Нажмите пробел,
                                        <br v-if="paused"/>чтобы {{paused?'начать':'остановить'}} сканирование
                                    </div>
                                </div>
                                <div class="ScanningPageCameraHelpBG" :class="{paused: paused}"></div>
                            </div>
                        </b-col>
                        <b-col v-bar class="vb" style="max-height: 300px; padding-right: 0px;">
                            <div>
                                <div>
                                    <b-list-group class="ScanningPageList">
                                        <b-list-group-item v-for="(qr,i) in scannedList" href="#"
                                                           v-scrollInto="i===selected" :active="i===selected" :key="i"
                                                           @click="viewCard(i)">
                                            {{qr.name}}
                                            <!--              <span>{{qr.createdAt | formatTime}}</span>-->
                                        </b-list-group-item>
                                    </b-list-group>
                                </div>
                            </div>
                        </b-col>
                    </b-row>
                    <b-button variant="outline-danger" class="ScanningPageCloseDay" @click="closeDay">Завершить день
                    </b-button>
                </template>
                <b-row v-if="!$store.state.ThisDay.started && !$store.state.ThisDay.ended">
                    <b-col class="text-center ScanningPageDayStatus">
                        <h1>День еще не открыт</h1>
                        <p>Чтобы начать сканирование, необходимо открыть день.<br> При открытии этот день будет
                            отображаться в отчёте.</p>
                        <div class="ScanningPageDayNotStarted_button">
                            <b-button @click="openThisDay">Открыть</b-button>
                        </div>
                    </b-col>
                </b-row>
                <b-row v-if="$store.state.ThisDay.started && $store.state.ThisDay.ended">
                    <b-col class="text-center ScanningPageDayStatus">
                        <h1 class="mb-4">День закрыт</h1>
                        <p>Следующий день можно будет открыть завтра.</p>
                    </b-col>
                </b-row>
            </template>
            <CloseDayModel @opened="beforeOpenModal" @closed="afterCloseModal"></CloseDayModel>
        </b-container>
    </b-card>
</template>

<script>
    import SystemInformation from './LandingPage/SystemInformation'
    //import CameraView from "./CameraView";
    import StudentScanCard from './StudentScanCard'
    import Mousetrap from 'mousetrap';
    import fs from 'fs';
    import {DateTime} from 'luxon'
    import CloseDayModel from "@/components/CloseDayModel";
    import Camera from './Camera';
    import moment from 'moment'

    let {app, dialog} = require('electron').remote;
    import {soundSuccess, soundError} from '@/components/sounds';

    export default {
        name: 'landing-page',
        components: {SystemInformation, StudentScanCard, CloseDayModel, Camera},
        data() {
            let id = this.$config.get('deviceID');
            return {
                scans: [],
                paused: true,
                lastStudent: null,
                deviceID: id,
                cameraFound: true,
                selected: null,
                error: null,
                MousetrapSpace: false
            }
        },
        computed: {
            dayInWords() {
                let m = moment();
                m.locale('ru');
                m.date(this.$store.state.ThisDay.day);
                m.month(this.$store.state.ThisDay.month - 1);
                return m.format('DD MMMM');
            },
            cameraInit() {
                return {
                    mandatory: {
                        sourceId: this.deviceID//'4e8822da8628ebb83f14681db3d674c3495216b9f50ef64054f73c0b9301855f', //'0070d35198c8d70b1bdabb12f7953c7fbc117bfc096424c20dac86476ed75bdb',
                    },
                };
            },
            camera() {
                return this.cameraFound ? this.cameraInit : false;
            },
            scannedList() {
                return this.$store.state.ThisDay.listOfRecords;
            },
            currentCard() {
                if (this.selected !== null)
                    return {
                        st: this.scannedList[this.selected],
                        rd: this.scannedList[this.selected]
                    };
                else return null;
            }
        },
        beforeDestroy() {
            this.MousetrapSpace = false;
        },
        beforeMount(){
            this.$store.dispatch("ThisDay/refreshSession");
        },
        mounted() {
            this.MousetrapSpace = true;
            window.addByCode = (code)=>{
                this.onDetect(Promise.resolve({content: code, imageData: ''}));
            }
        },
        methods: {
            viewCard(i) {
                this.selected = i;
                this.error = null;
            },
            toggle() {
                this.paused = !this.paused;
                return false;
            },
            async onDetect(promise) {
                try {
                    const all = await promise;
                    console.groupCollapsed('Код: ' + all.content)
                    //let img = imagedata_to_image(all.imageData);
                    // let img = await this.$store.dispatch('ThisDay/createImageUrl', {rd:{id: all.content, }, imagedata: all.imageData})
                    soundSuccess.play();
                    let {st, rd} = await this.$store.dispatch("Students/record", {id: all.content, img: all.imageData});
                    console.log(st);
                    console.log(rd);
                    this.selected = 0;
                    this.error = null;
                    // ...
                } catch (error) {
                    console.dir(error);
                    if (error.code === 4) {
                        let f = this.scannedList.findIndex((e) => error.data.record.id === e.id);
                        this.selected = f !== -1 ? f : null;
                    } else {
                        this.selected = null;
                    }
                    soundError.play(0.1);
                    this.error = error.message;
                } finally {
                    console.groupEnd();
                }
            },
            openThisDay() {
                this.$store.dispatch('ThisDay/startSession')
            },
            decode(data) {

            },
            beforeOpenModal() {
                this.MousetrapSpace = false;
                this.paused = true;
            },
            afterCloseModal() {
                this.MousetrapSpace = true;
            },
            closeDay() {
                // dialog.showMessageBox({
                //   type: 'warning',
                //   message: "Закрыть текущий день?",
                //   cancelId: 1,
                //   title: "Закрытие дня",
                //   buttons: ["Закрыть", "Отмена"],
                //   defaultId: 1,
                //   noLink: true,
                //   detail: "Вы не сможете открыть его снова."
                // }, (b)=>{
                //   if(b===0) this.$store.dispatch("ThisDay/closeSession");
                // });
                this.$modal.show('closeDay');
            },
            inc() {
                console.log('incc', this.$store);
                this.$store.dispatch('Counter/someAsyncTask');
            }
        },
        directives: {
            focus: {
                // определение директивы
                inserted: function (el, {value}) {
                    if (value == true) el.focus();
                },
                componentUpdated: function (el, {value}) {
                    if (value == true) el.focus();
                }
            },
            scrollInto: {
                inserted: function (el, {value}) {
                    if (value === true) el.scrollIntoView({behavior: 'smooth', inline: 'end'});
                },
                componentUpdated: function (el, {value}) {
                    if (value === true) el.scrollIntoView({behavior: 'smooth', inline: 'end'});
                }
            }
        },
        filters: {
            formatTime(time) {
                return moment(time).locale('ru').toLocaleString(DateTime.TIME_24_WITH_SECONDS);
            }
        },
        watch: {
            MousetrapSpace(n, o) {
                if (n) {
                    Mousetrap.bind('space', this.toggle);
                } else {
                    Mousetrap.unbind('space');
                }
            }
        }
    }
</script>

<style>
    .ScanningPageList {
        /*overflow-y: scroll;*/
        /*position: absolute;*/
        /*width: 97.5%;*/
        /*height: 100%;*/
    }

    .ScanningPageCameraError {
        position: absolute;
        z-index: 1;
        left: 0;
        top: 0;
        height: 100%;
        width: 100%;
        text-align: center;
        padding-top: 70px;
    }

    .videoView {
        margin-bottom: -6px;
    }

    .ScanningPageDayStatus {
        padding: 70px 0px;
    }

    .ScanningPageDayNotStarted_button {
        padding-top: 20px;
    }

    .ScanningPageCameraHelpWrapper {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
    }

    .ScanningPageCameraHelp {
        display: block;
        bottom: 0;
        left: 0;
        text-align: center;
        width: 100%;
        color: #fff;
        z-index: 1;
    }

    .ScanningPageCameraHelpBG {
        position: absolute;
        display: block;
        content: ' ';
        bottom: 0;
        left: 0;
        text-align: center;
        width: 100%;
        background: linear-gradient(rgba(255, 255, 255, 0), rgba(52, 58, 64, 0.82));
        height: 35px;
    }

    .ScanningPageCameraWrapper {
        /*height: 250px;*/
    }

    .ScanningPageCameraWrapper:hover .ScanningPageCameraHelp, .ScanningPageCameraWrapper:hover .ScanningPageCameraHelpBG {
        visibility: hidden;
    }

    .ScanningPageCameraHelp.paused {
        font-size: 22px;
    }

    .ScanningPageCameraHelpBG.paused {
        background: rgba(52, 58, 64, 0.82);
        height: 100%;
    }

    .ScanningPageCloseDay {
        position: absolute;
        right: 15px;
        top: 20px;
    }

    .vb > .vb-dragger {
        z-index: 5;
        width: 12px;
        right: 0;
    }

    .vb > .vb-dragger > .vb-dragger-styler {
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        -webkit-transform: rotate3d(0, 0, 0, 0);
        transform: rotate3d(0, 0, 0, 0);
        -webkit-transition: background-color 100ms ease-out,
        margin 100ms ease-out,
        height 100ms ease-out;
        transition: background-color 100ms ease-out,
        margin 100ms ease-out,
        height 100ms ease-out;
        background-color: rgba(48, 121, 244, .1);
        margin: 5px 5px 5px 0;
        border-radius: 20px;
        height: calc(100% - 10px);
        display: block;
    }

    .vb.vb-scrolling-phantom > .vb-dragger > .vb-dragger-styler {
        background-color: rgba(48, 121, 244, .3);
    }

    .vb > .vb-dragger:hover > .vb-dragger-styler {
        background-color: rgba(48, 121, 244, .5);
        margin: 0px;
        height: 100%;
    }

    .vb.vb-dragging > .vb-dragger > .vb-dragger-styler {
        background-color: rgba(48, 121, 244, .5);
        margin: 0px;
        height: 100%;
    }

    .vb.vb-dragging-phantom > .vb-dragger > .vb-dragger-styler {
        background-color: rgba(48, 121, 244, .5);
    }
</style>
