<template>
  <b-card v-show="!loading">
    <template v-if="options.length==0">
      <b-row>
        <b-col class="text-center CreateReportPage">
          <div class="">
            <h2>Нет открытых дней</h2>
            <p class="mt-2">Вы еще ни разу не использовали нашу программу. <br>Откройте день во вкладке <router-link to="/scanning-page">Сканирование</router-link></p>
          </div>
        </b-col>
      </b-row>
    </template>
    <template v-else>
    <b-row>
    <b-col class="text-center CreateReportPage">
      <div class="">
        <h2>Создание отчёта</h2>
        <div class="CreateReportSelectDiv mt-3">
          <div class="CreateReportSelectText">Выберите месяц: </div>
          <b-form-select id="month" v-model="selected" :options="options" size="sm" class="mt-1 CreateReportSelect"></b-form-select>
        </div>
        <b-button class="mt-4" @click="save" :disabled="!canCreateReport">Создать отчёт</b-button>
        <p class="mt-2" v-if="!canCreateReport">Есть не закрытые дни. Закрой их, чтобы создать отчёт за месяц.</p>
      </div>
    </b-col>
    </b-row>
    <div class="calendar-container">
      <div class="calendar"><span class="day-name">Пн</span><span class="day-name">Вт</span><span class="day-name">Ср</span><span class="day-name">Чт</span><span class="day-name">Пт</span><span class="day-name">Сб</span><span class="day-name">Вс</span>
        <div v-for="(day,key) in monthComputed"
             :class="{day:true,'day--disabled':day.type=='disable','opened':day.type=='started','closed':day.type=='ended'}">
          <template v-if="day.type=='ended'">
            <span>{{day.day}}</span>
            <div>
              <span>{{day.students}} уч.</span>
              <span>П {{day.price.notFree |formatDecimalCurrency}} руб</span>
              <span>Б {{day.price.free |formatDecimalCurrency}} руб</span>
              <button class="btn btn-success btn-sm" @click="editDay(key)">Изменить</button>
            </div>
          </template>
          <template v-else-if="day.type=='started'">
            <span>{{day.day}}</span>
            <div>
              <span>День <br>не закрыт</span>
              <span>{{day.students}} уч.</span>
              <button @click='closeDay(key)' class="btn btn-danger btn-sm">Закр. день</button>
            </div>
          </template>
          <template v-else>
            <span>{{day.day}}</span>
          </template>
        </div>
      </div>
    </div>
    <CloseDayReportModel @opened="beforeOpenModal" @closed="afterCloseModal"></CloseDayReportModel>
    </template>
  </b-card>
</template>

<script>
  import {ipcRenderer} from 'electron'
  import {DateTime} from 'luxon';
  import promiseIpc from 'electron-promise-ipc';
  import CloseDayReportModel from '@/components/CloseDayReportModel';
  import TheDay from "@/components/TheDay";
  let formatter = new Intl.NumberFormat('ru-BY',{minimumFractionDigits: 2});
  let formatDecimalCurrency = (n)=>{
    return formatter.format(n)
  };
  console.log(formatDecimalCurrency);
  export default {
    name: "CreateReport",
    components:{
      CloseDayReportModel
    },
    data(){
      return {
        loading: true,
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
        monthData: null,
        selected: 0,
      }
    },
    computed:{
      monthComputed(){
        if(!this.monthData) return [];
        let d = [];
        let time = DateTime.local().startOf('month');
        if(time.weekday!==1){
          for(let weekday = 1; weekday<time.weekday; weekday++){
            d.push({type: 'disable', day: time.minus({day: time.weekday-weekday}).day});
          }
        }
        let days = time.daysInMonth;
        for(let i = 1; i<=days; i++){
          if(this.monthData[i]){
            d.push(this.monthData[i]);
          }else{
            d.push({type:'empty', day: i});
          }
        }
        time = time.endOf('month');
        if(time.weekday!==7){
          for(let weekday = time.weekday+1; weekday<=7; weekday++){
            d.push({type: 'disable', day: time.plus({day: weekday-time.weekday}).day});
          }
        }
        return d;
      },
      options(){
        return this.names.map((e,i)=>({value: i, text: e})).filter((e,i)=>this.months[e.value]);
      },
      canCreateReport(){
        for(let day in this.monthData){
          if(this.monthData[day].type !== 'ended') return false;
        }
        return true;
      }
    },
    methods:{
      save(){
        this.$wait(promiseIpc.send('generateExcel', {month: this.selected+1}).then(console.log).catch(console.error));
      },
      editDay(k){
        let day = this.monthComputed[k];
        let date = DateTime.local().set({month: this.selected+1,day: day.day});
        this.$modal.show('closeDayReport',{dayToEdit:date,edit:true, price: day.price, callback: this.editPriceDay,callbackDelete: this.deleteDay, count: day.students})
      },
      async editPriceDay(d){
        console.log(d);
        let day = new TheDay(d.dayToEdit.month,d.dayToEdit.day); await day.load();
        console.log(await day.editPrice(d.free, d.notFree));
        this.monthData[d.dayToEdit.day].price = {free: d.free, notFree: d.notFree};
      },
      closeDay(k){
        let day = this.monthComputed[k];
        let date = DateTime.local().set({month: this.selected+1,day: day.day});
        this.$modal.show('closeDayReport',{dayToEdit:date, callback: this.closePriceDay,callbackDelete: this.deleteDay, count: day.students})
      },
      async closePriceDay(d){
        let day = new TheDay(d.dayToEdit.month,d.dayToEdit.day); await day.load();
        await day.endDay(d.free, d.notFree);
        this.monthData[d.dayToEdit.day].price = {free: d.free, notFree: d.notFree};
        this.monthData[d.dayToEdit.day].type = 'ended';
      },
      async deleteDay(d){
        let day = new TheDay(d.dayToEdit.month,d.dayToEdit.day); await day.load();
        await day.removeDay();
        this.$delete(this.monthData,d.dayToEdit.day);
      },
    },
    mounted() {
      console.log(promiseIpc);
      this.$wait(promiseIpc.send('getMonths').then((d)=>{
        console.log(d);
        this.months = d;
        let now = DateTime.local().month;
        console.log(d[now-1]);
        while(now>0 && !d[now-1]) now--;
        console.log(now);
        if(d[now-1]){
          this.selected = now-1;
          console.log(now);
          return this.selected;
        }
        throw null;
      }).then((m)=>{console.log(m); return promiseIpc.send('getMonthData',{month: m+1})})
        .then((d)=>{console.log(d);this.monthData = d;})
        .catch((e)=>{if(e!==null)throw e;}).then(()=>{this.loading = false;}));
      //ipcRenderer.send('getMonths');
    },
    watch:{
      selected(n,o){
        if(this.loading) return;
      this.$wait(promiseIpc.send('getMonthData',{month: n+1})
          .then((d)=>{this.monthData = d;}));
      }
    },
    filters:{
      formatDecimalCurrency(n){
        return formatDecimalCurrency(n);
      }
    }
  }
</script>

<style>
  html, body {
    width: 100%;
    height: 100%;
  }
  body {
    background: #f5f7fa;
    padding: 40px 0;
    box-sizing: border-box;
    font-family: Montserrat, "sans-serif";
    color: #51565d;
  }
  .calendar {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(7, minmax(100px, 1fr));
    grid-template-rows: 50px;
    grid-auto-rows: 130px;
    overflow: auto;
  }
  .calendar-container {
    margin: 0 -1.25rem;
    overflow: hidden;
    /*box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);*/
    /*border-radius: 10px;*/
    background: #fff;
    /*max-width: 1200px;*/
  }
  .calendar-header {
    text-align: center;
    padding: 20px 0;
    background: linear-gradient(to bottom, #fafbfd 0%, rgba(255, 255, 255, 0) 100%);
    border-bottom: 1px solid rgba(166, 168, 179, 0.12);
  }
  .calendar-header h1 {
    margin: 0;
    font-size: 18px;
  }
  .calendar-header p {
    margin: 5px 0 0 0;
    font-size: 13px;
    font-weight: 600;
    color: rgba(81, 86, 93, .4);
  }
  .calendar-header button {
    background: 0;
    border: 0;
    padding: 0;
    color: rgba(81, 86, 93, .7);
    cursor: pointer;
    outline: 0;
  }
  .day {
    border-bottom: 1px solid rgba(166, 168, 179, 0.12);
    border-right: 1px solid rgba(166, 168, 179, 0.12);
    text-align: right;
    padding: 14px;
    letter-spacing: 1px;
    font-size: 12px;
    box-sizing: border-box;
    color: #98a0a6;
    position: relative;
    z-index: 1;
  }
  .day:nth-of-type(7n + 7) {
    border-right: 0;
  }
  .day:nth-of-type(n + 1):nth-of-type(-n + 7) {
    grid-row: 2;
  }
  .day:nth-of-type(n + 8):nth-of-type(-n + 14) {
    grid-row: 3;
  }
  .day:nth-of-type(n + 15):nth-of-type(-n + 21) {
    grid-row: 4;
  }
  .day:nth-of-type(n + 22):nth-of-type(-n + 28) {
    grid-row: 5;
  }
  .day:nth-of-type(n + 29):nth-of-type(-n + 35) {
    grid-row: 6;
  }
  .day:nth-of-type(7n + 1) {
    grid-column: 1;
  }
  .day:nth-of-type(7n + 2) {
    grid-column: 2;
  }
  .day:nth-of-type(7n + 3) {
    grid-column: 3;
  }
  .day:nth-of-type(7n + 4) {
    grid-column: 4;
  }
  .day:nth-of-type(7n + 5) {
    grid-column: 5;
  }
  .day:nth-of-type(7n + 6) {
    grid-column: 6;
  }
  .day:nth-of-type(7n + 7) {
    grid-column: 7;
  }
  .day-name {
    font-size: 12px;
    text-transform: uppercase;
    color: #99a1a7;
    text-align: center;
    border-bottom: 1px solid rgba(166, 168, 179, 0.12);
    line-height: 50px;
    font-weight: 500;
  }
  .day--disabled {
    color: rgba(152, 160, 166, 0.6);
    background-color: #fff;
    background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f9f9fa' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E");
    cursor: not-allowed;
  }
  .task {
    border-left-width: 3px;
    padding: 8px 12px;
    margin: 10px;
    border-left-style: solid;
    font-size: 14px;
    position: relative;
  }
  .task--warning {
    border-left-color: #fdb44d;
    grid-column: 4 / span 3;
    grid-row: 3;
    background: #fef0db;
    align-self: center;
    color: #fc9b10;
    margin-top: -5px;
  }
  .task--danger {
    border-left-color: #fa607e;
    grid-column: 2 / span 3;
    grid-row: 3;
    margin-top: 15px;
    background: rgba(253, 197, 208, 0.7);
    align-self: end;
    color: #f8254e;
  }
  .task--info {
    border-left-color: #4786ff;
    grid-column: 6 / span 2;
    grid-row: 5;
    margin-top: 15px;
    background: rgba(218, 231, 255, 0.7);
    align-self: end;
    color: #0a5eff;
  }
  .task--primary {
    background: #4786ff;
    border: 0;
    border-radius: 4px;
    grid-column: 3 / span 3;
    grid-row: 4;
    align-self: end;
    color: #fff;
    box-shadow: 0 10px 14px rgba(71, 134, 255, 0.4);
  }
  .task__detail {
    position: absolute;
    left: 0;
    top: calc(100% + 10px);
    background: #fff;
    border: 1px solid rgba(166, 168, 179, 0.2);
    color: #000;
    padding: 20px;
    box-sizing: border-box;
    border-radius: 4px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
    z-index: 2;
  }
  .task__detail:after, .task__detail:before {
    bottom: 100%;
    left: 30%;
    border: solid transparent;
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
  }
  .task__detail:before {
    border-bottom-color: rgba(166, 168, 179, 0.2);
    border-width: 8px;
    margin-left: -8px;
  }
  .task__detail:after {
    border-bottom-color: #fff;
    border-width: 6px;
    margin-left: -6px;
  }
  .task__detail h2 {
    font-size: 15px;
    margin: 0;
    color: #51565d;
  }
  .task__detail p {
    margin-top: 4px;
    font-size: 12px;
    margin-bottom: 0;
    font-weight: 500;
    color: rgba(81, 86, 93, .7);
  }

  .day span{
    display: block;
    text-align: center;

  }
  .day>span:first-child{
    text-align: right;
    position: absolute;
    top: 14px;
    right: 14px;
  }
  .day.closed{
    background-color: #dff0d8;
    color: #3c763d;
  }
  .day>div{
    height: 100%;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
  }
  .day.closed>div>span:first-child{
    text-align: left;
  }
  .day.opened{
    background-color: rgba(253, 197, 208, 0.7);
    color: #f8254e;
  }
  .day span.action:hover {
    text-decoration: underline;
    cursor: pointer;
  }



  .CreateReportPage {
    padding: 50px 0px;
    display: flex;
    justify-content: center;
  }
  .CreateReportSelectDiv{
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .CreateReportSelect{
    width: 120px!important;
  }
  .CreateReportSelectText{
    margin-right: 15px;
    width: 150px;
  }
</style>