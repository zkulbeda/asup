<template>
    <b-card>
        <b-row>
            <b-col class="BoxHeader">
                <h2>Статус опроса: <span class="text-success">активен</span></h2>
                <b-button class="BoxHeader__button" variant="outline-primary">Обновить</b-button>
            </b-col>
        </b-row>
        <b-row>
            <b-col>
                <b-card class="BotCard">
                    <div><h4>Бот</h4></div>
                    <div class="BotButtons">
                        <div class="BotButtons__wrap">
                            <b-button class="BotButtons__btn" variant="outline-secondary" @click="send_questions">Остановить опрос</b-button>
                        </div>
                        <div class="BotButtons__wrap">
                            <b-button class="BotButtons__btn" variant="outline-secondary">Отправить сообщение</b-button>
                        </div>
                        <div class="BotButtons__wrap">
                            <b-button class="BotButtons__btn" variant="outline-secondary">Стереть результаты</b-button>
                        </div>
                    </div>
                </b-card>
            </b-col>
            <b-col>
                <b-card class="BotCard">
                    <div class="BotCard__header">
                        <h4 class="BotCard__title">Результаты</h4>
                    </div>
                    <div class="BotResultsList">
                        <div class="BotResultsList__item">
                            <div class="BotResultsList__name">Платно</div>
                            <div class="BotResultsList__value">5 человек</div>
                        </div>
                        <div class="BotResultsList__item">
                            <div class="BotResultsList__name">Бесплатно</div>
                            <div class="BotResultsList__value">9 человек</div>
                        </div>
                    </div>
                </b-card>
                <b-card class="BotCard">
                    <div class="BotCard__header">
                        <h4 class="BotCard__title">Результаты</h4>
                    </div>
                    <div class="BotResultsList">
                        <div class="BotResultsList__empty_wrapper">
                            <h5 class="BotResultsList__empty_wrapper_header">Нет данных</h5>
                            <p class="BotResultsList__empty_wrapper_reason">Опрос еще не начат</p>
                        </div>
                    </div>
                </b-card>
            </b-col>
        </b-row>
    </b-card>
</template>

<script>
    import BotCommandsModel from "@/components/BotCommandsModel";
    export default {
        components: {
            BotCommandsModel
        },
        name: "BotCommands",
        data: () => ({
            status: true,
            menu: {
                free: "",
                paid: ""
            },
            count: 0,
        }),
        methods: {
            send_questions(){
                this.$modal.show("sendQuestions");
            }
        }
    }
</script>

<style scoped>
    .BotCard__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .BotCard {
        margin-top: 10px;
    }

    .BotButtons {
        display: flex;
        flex-direction: column;
    }

    .BotButtons__wrap {
        display: flex;
        margin: 5px 0px;
    }

    .BotButtons__btn {
        width: 100%;
    }

    .BotResultsList {
        display: flex;
        flex-direction: column;
    }

    .BotResultsList__item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
    }

    .BotResultsList__item:not(:last-child) {
        border-bottom: #e9ecef solid 1px;
    }

    .BotResultsList__item:last-child {
        padding-bottom: 0;
    }

    .BotResultsList__value {
        color: #007bff;
        background-color: rgba(0, 123, 255, 0.02);
        border: rgba(0, 123, 255, 0.2) solid 1px;
        padding: 0px 10px;
        border-radius: 30px;
    }

    .BotResultsList__empty_wrapper{
        padding: 30px 0 10px;
        text-align: center;
    }

    .BoxHeader{
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .BoxHeader__button{

    }
</style>