<template>
    <div class="StudentInfoCard">
        <template v-if="hasStudent">
            <h2>{{data.st.name}}</h2>
            <div class="StudentInfoPrice">Питается <span :class="[data.st.pays?'nonfree':'free']">{{data.st.pays?'платно':'бесплатно'}}</span></div>
            <div class="StudentInfoClass">Учащийся {{data.st.group}} класса</div>
            <div class="StudentInfoTime">Записан в {{data.rd.time | formatTime}}
                <span class="StudentInfoTimeFromNow">{{data.rd.time | formatTimeFromNow}}</span>
            </div>
<!--            <img class="StudentInfoCardImg" :src="student.img" :alt="student.name+' '+student.group">-->
        </template>
        <div v-else>
            <h2>Ожидание сканирования...</h2>
            <p class="StudentInfoTime">Поместите карту питания в поле камеры</p>
        </div>
        <div v-if="error" class="StudentInfoError">{{error}}</div>
    </div>
</template>

<script>
    import {DateTime} from 'luxon'
    import moment from 'moment'
    export default {
        props: {
            data: {
                required: true
            },
            error: true
        },
        name: "StudentScanCard",
        computed: {
            hasStudent(){
                return this.data!==null;
            }
        },
        filters:{
            formatTime(time){
                return DateTime.fromSeconds(time).toLocaleString(DateTime.TIME_24_WITH_SECONDS);
            },
            formatTimeFromNow(time){
                return moment.unix(time).locale('ru').fromNow();
            }
        }
    }
</script>

<style scoped>
    .StudentInfoCard{
        height: 200px;
        position: relative;
        margin-top: 15px;
    }
    .StudentInfoCardImg{
        position: absolute;
        top: 0;
        right: 0;
        height: 90%;
    }
    .StudentInfoClass, .StudentInfoPrice, .StudentInfoTime{
        font-size: 18px;
    }
    .StudentInfoTimeFromNow{
        color: rgba(0,0,0,0.5);
    }
    .StudentInfoCard .nonfree{
        color: #dc3545;
        font-weight: bold;
    }
    .StudentInfoCard .free{
        color: #189e37;
        font-weight: normal;
    }
    .StudentInfoError{
        color: #dc3545;
        font-weight: bold;
        font-size: 30px;
    }
</style>