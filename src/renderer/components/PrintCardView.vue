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
    import promiseIpc from 'electron-promise-ipc';

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