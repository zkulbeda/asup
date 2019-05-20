<template>
    <b-card v-show="!loading">
        <b-row>
            <b-col class="text-center CreateReportPage">
                <div class="">
                    <h2>Создание отчёта</h2>
                    <b-button class="mt-4" @click="save">Создать</b-button>
                </div>
            </b-col>
        </b-row>
    </b-card>
</template>

<script>
    import {ipcRenderer, remote} from 'electron'
    import {DateTime} from 'luxon';
    import jsPDF from 'jspdf';
    import qr from 'qrcode';
    import promiseIpc from 'electron-promise-ipc';
    let {BrowserWindow, getGlobal} = remote;

    export default {
        name: "CreateReport",
        data() {
            return {
                loading: false,
                months: [],
                names: [
                    'Январь',
                    'Февраль',
                    'Март',
                    'Апрель',
                    'Май',
                    'Июнь',
                    'Июль',
                    'Август',
                    'Сентябрь',
                    'Октябрь',
                    'Ноябрь',
                    'Декабрь',
                ],
                selected: 0,
            }
        },
        computed: {
            options() {
                return this.names.map((e, i) => ({value: i, text: e})).filter((e, i) => this.months[e.value]);
            }
        },
        methods: {
            save() {
                var doc = new jsPDF();
                doc.text('Hello world! sdf ddf g gg rr jj v', 2, 5, {maxWidth: 44});
                qr.toDataURL('I am a pony!', {
                    margin: 1,
                    width: 49
                }).then((url) => {
                    doc.rect(0,0,50,90);
                    doc.addImage(url, 'PNG', 0, 20, 49,49);
                    // doc.save('a4.pdf');
                    let st = doc.output('datauristring');
                    // let u = URL.createObjectURL(st);
                    // console.log(u);
                    let w = new BrowserWindow({
                        parent: getGlobal('mainWindow'),
                        modal: true,
                        webPreferences:{
                            plugins: true,
                        }
                    });
                    w.loadURL(st);
                });
            }
        },
        mounted() {
            console.log(promiseIpc);
        }
    }
</script>

<style scoped>
    .CreateReportPage {
        padding: 50px 0px;
        display: flex;
        justify-content: center;
    }

    .CreateReportSelectDiv {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .CreateReportSelect {
        width: 120px;
    }

    .CreateReportSelectText {
        margin-right: 15px;
    }
</style>