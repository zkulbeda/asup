<template>
  <b-card ref="main">
    <h4 class="mb-4">Список учеников<router-link to="/create-student" class="btn btn-outline-primary btn-sm" style="
    float: right;
">Добавить ученика</router-link>
    </h4>
    <b-form-group>
      <b-form-input ref="input" v-model="query" placeholder="Поиск..."></b-form-input>
    </b-form-group>
    <b-table
        ref="table"
        :busy.sync="isBusy"
        :items="founded"
        :per-page="perPage"
        :current-page="currentPage"
        :no-provider-paging="true"
        :no-provider-sorting="true"
        :fields="fields"
        :class="{'table-select-mode': selectMode}"
        @row-clicked="rowClick"
        show-empty
        :sort-by.sync="sortBy"
        :sort-desc.sync="sortDesc"
    >
      <template slot="empty" slot-scope="scope">
        <p class="text-center">Ученики не найдены. Проверьте ваш запрос.</p>
      </template>
      <template slot="checkbox" slot-scope="data" class="table-checkbox">
        <b-form-checkbox v-model="selected" :value="data.item._id" :key="data.item._id"></b-form-checkbox>
      </template>
    </b-table>
    <div class="d-flex  justify-content-between align-items-center">
      <div>
      <div v-if="selectMode" class="d-flex justify-content-start align-items-baseline">
        <b-dropdown split @click="savePDF" size="sm" id="dropdown-1" text="Печать в PDF" class="mr-2">
          <b-dropdown-item @click="print">Распечатать</b-dropdown-item>
          <b-dropdown-item>Удалить</b-dropdown-item>
          <b-dropdown-item>Изменить индефикатор</b-dropdown-item>
          <b-dropdown-divider></b-dropdown-divider>
          <b-dropdown-item @click="toggleViewMode">{{viewSelected?'Вернуть нормальный режим':'Показать только выделеные'}}</b-dropdown-item>
          <b-dropdown-item v-if="!viewSelected">Выделить все</b-dropdown-item>
          <b-dropdown-item @click="clearSelected">Убрать выделение</b-dropdown-item>
        </b-dropdown>
        <div> {{selected.length}} элементов</div>
      </div>
      </div>
      <b-pagination v-show="size>perPage"
                    v-model="currentPage"
                    :total-rows="size"
                    :per-page="perPage"
                    prev-text="<"
                    next-text=">"
                    :hide-goto-end-buttons="true"
                    class="mb-0"
      ></b-pagination>
    </div>
  </b-card>
</template>

<script>
  import {remote} from 'electron'
  let {BrowserWindow, getGlobal, app, shell} = remote;
  import MontFont from '@/assets/fonts/Mont-Regular.ttf';
  import MontBoldFont from '@/assets/fonts/Mont-Bold.ttf';
  import MontLightFont from '@/assets/fonts/Mont-Light.ttf';
  import jsPDF from 'jspdf';
  import qr from 'qrcode';
  import path from 'path';
  import fs from 'fs'
  import values from 'lodash/values';
  import Vue from 'vue'
  import VueFuse from 'vue-fuse'
  Vue.use(VueFuse);
  let addMontFont = (d,m,t)=>{
    d.addFileToVFS('mont'+t+'.ttf',m.split(',')[1]);
    d.addFont('mont'+t+'.ttf','mont',t);
  }
  export default {
    name: "StudentsPage",
    data() {
      return {
        size: 0,
        currentPage: 1,
        selected: [],
        perPage: 10,
        sortBy: 'name',
        sortDesc: false,
        fields: {
          checkbox:{
            sortable: false,
            label: '',
            class: 'table-checkbox'
          },
          name: {
            label: 'Имя',
            sortable: true
          },
          group: {
            label: 'Класс',
            sortable: true,
            class: 'table-student-group'
          },
          // pays:{
          //   label: 'платник'
          // }
        },
        query: '',
        viewSelected: false,
        isBusy: false
      }
    },
    computed: {
      it() {
        let res = values(this.$store.state.Students.students);
        if(this.viewSelected){
          if(this.selected.length<1) this.viewSelected=false;
          else res = res.filter((e)=>this.selected.indexOf(e._id)!==-1);
        }
        return res;
      },
      selectMode(){
        return this.selected.length>0;
      }
    },
    mounted(){
      this.$refs.input.$el.focus();
    },
    methods:{
      toggleViewMode(){
        this.viewSelected = !this.viewSelected;
      },
      async generatePDF(){
        let doc = new jsPDF();
        addMontFont(doc,MontBoldFont,'bold')
        addMontFont(doc,MontLightFont,'light')
        addMontFont(doc,MontFont,'regular')
        let insertCard = async (doc, x, y, name,id,pays)=>{
          doc.setFont('mont', 'bold');
          doc.setFontSize(14);
          doc.text('Карта ученика', x+25, y+6, {maxWidth: 47,align: 'center'});
          doc.setFontSize(7);
          doc.setFont('mont', 'regular');
          doc.text(name, x+25, y+10, {align: 'center'});
          let q = await qr.toDataURL(id, {errorCorrectionLevel: 'Q', margin: 0, width: 200});
          //this.$refs.main.appendChild(q);
          //let qq = await qr.toCanvas(id, {width: 48,type: 'svg', errorCorrectionLevel: 'Q', margin: 0}).toDataURL();
          doc.rect(x+0,y+0,50 ,95);
          //doc.addSvg('<'+q.split('><')[2]+'>', x+1, y+11, 48,48);
          doc.addImage(q,'PNG',x+3, y+12, 44,44)
          doc.setFontSize(11);
          doc.setFont('mont', 'bold');
          doc.text((pays?'':'бес')+'платное питание', x+25, y+62, {maxWidth: 47,align: 'center'});
          return doc;
        }
        let i = 0, j = 0;
        for(let st in this.selected){
          let stInfo = this.$store.state.Students.students[this.selected[st]];
          await insertCard(doc,5+j*50,5+i*95, stInfo.name,stInfo._id, stInfo.pays);
          j++;
          if(j>3){
            j = 0;
            i++;
          }
          if(i>3){
            doc.addPage();
            i = 0; j = 0;
          }
        }
        return doc;
      },
      async savePDF() {
        let doc = await this.generatePDF();
        doc.save('Карты питания.pdf');
      },
      async print(){
        let doc = await this.generatePDF();
        doc.autoPrint();
        let data = doc.output('datauristring').split(',')[1];
        fs.writeFileSync(path.join(app.getPath('temp'),'./print.pdf'), data,'base64');
        shell.openExternal('file://'+path.join(app.getPath('temp'),'./print.pdf'));
      },
      rowClick(d){
        let i = this.selected.indexOf(d._id);
        if(i==-1){
          this.selected.push(d._id);
        }
        else{
          this.selected.splice(i, 1);
        }
        console.log(arguments);
      },
      clearSelected(){
        this.selected = [];
      },
      async founded(){
        if(this.query!==''){
          this.sortBy = '';
          if(this.query.match(/^(1[0-1]|[5-9])([А-я])?$/)){
            let s = this.query.toUpperCase();
            return this.it.filter((e)=>e.group.includes(s));
          }
          let i = await this.$search(this.query,this.it,{
            keys: ['name','group'],
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
          });
          this.size = i.length;
          this.currentPage = 1;
          return i;
        }else {
          this.sortBy = 'name';
          this.sortDesc = false;
          this.size = this.it.length;
          this.currentPage = 1;
          return this.it;
        }
      }
    },
    watch:{
      query(n){
        this.$refs.table.refresh();
      },
      it(){
        this.$refs.table.refresh();
      }
    }
  }
</script>

<style>
  .table-checkbox{
    width: 30px;
    padding-right: 0px !important;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }
  table.table-select-mode tr{
    cursor: pointer;
  }
  table:not(.table-select-mode) tr:hover .table-checkbox {
    opacity: 0.5;
  }
  .table-student-group{
    width: 120px;
  }
  .table-select-mode .table-checkbox{
    opacity: 1;
  }
  table tr:focus{
    outline: none;
    background-color: #e9ecef;
  }
</style>