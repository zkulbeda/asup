<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <b-card ref="main">
    <h4 class="mb-4">Список учеников
      <router-link to="/create-student" class="btn btn-outline-primary btn-sm btn-with-icon" style="
    float: right;
"><AdAccIcon></AdAccIcon>Добавить ученика</router-link>
    </h4>
    <b-form-group>
      <b-input-group>
        <b-form-input ref="input" @input="startTyping" :value="query" placeholder="Поиск..."></b-form-input>
        <b-input-group-append>
          <b-button variant="outline-secondary" class="btn-with-only-icon StudentPageScanIcon" @click="openScanModal"><QrIcon decorative></QrIcon></b-button>
          <b-button variant="outline-secondary" class="btn-with-only-icon StudentPageScanIcon" @click="openScanModal"><CardScanIcon decorative></CardScanIcon></b-button>
        </b-input-group-append>
      </b-input-group>
    </b-form-group>
    <b-table
        ref="table"
        :busy.sync="isBusy"
        :items="students_provider"
        :per-page="perPage"
        :current-page="currentPage"
        :fields="fields"
        :class="{'table-select-mode': selectMode}"
        @row-clicked="rowClick"
        show-empty
    >
      <template v-slot:empty="scope">
        <p class="text-center">Ученики не найдены. Проверьте ваш запрос.</p>
      </template>
      <template v-slot:cell(checkbox)="data" class="table-checkbox">
        <b-form-checkbox v-model="selected" :value="data.item.studentID" :key="data.item.studentID"></b-form-checkbox>
      </template>
      <template v-slot:cell(pays)="data" class="table-checkbox">
        <b-badge :variant="data.item.pays?'danger':'success'">{{data.item.pays?'платно':'беспл.'}}</b-badge>
      </template>
      <template v-slot:table-busy="scope">
        <div class="text-center text-primary my-2 d-flex justify-content-center align-items-center">
            <b-spinner small  class="align-middle mr-2"></b-spinner>
            <strong>Ожидание...</strong>
        </div>
      </template>
    </b-table>
    <div class="d-flex  justify-content-between align-items-center">
      <div>
        <div class="d-flex justify-content-start align-items-baseline">
        <b-dropdown v-show="selectMode" split @click="$wait(savePDF())" size="sm" id="dropdown-1" class="mr-2 dropdown-with-icon">
          <template slot="button-content">
            <FileDownloadIcon class="top-1px"></FileDownloadIcon>Печать в PDF
          </template>
          <b-dropdown-item @click="$wait(print())"><PrinterIcon></PrinterIcon>Распечатать</b-dropdown-item>
          <b-dropdown-item v-if="selected.length==1" @click="edit"><EditIcon></EditIcon>Изменить</b-dropdown-item>
          <b-dropdown-item @click="remove"><DeleteIcon></DeleteIcon>Удалить</b-dropdown-item>
          <b-dropdown-item @click="reident"><ReAddIcon></ReAddIcon>Изменить идентификатор</b-dropdown-item>
          <b-dropdown-item v-if="selected.length==1" @click="recordCard"><CreditCardWirelessOutlineIcon></CreditCardWirelessOutlineIcon>Привязать карту</b-dropdown-item>
          <b-dropdown-divider></b-dropdown-divider>
          <b-dropdown-item @click="toggleViewMode">
            <toNormalModeIcon v-if="viewSelected"></toNormalModeIcon>
            <toOnlyCheckModeIcon v-else></toOnlyCheckModeIcon>
            {{viewSelected?'Вернуть нормальный режим':'Показать только выделеные'}}
          </b-dropdown-item>
          <b-dropdown-item v-if="!viewSelected" @click="addAll"><CheckAllIcon></CheckAllIcon>Выделить все{{query.length>0?' найденные':''}}</b-dropdown-item>
          <b-dropdown-item @click="clearSelected"><ClearCheckIcon></ClearCheckIcon>Убрать выделение</b-dropdown-item>
        </b-dropdown>
        <div v-if="selectMode"> {{selected.length}} {{selected.length | numWord('элемент','элемента','элементов')}}</div>
        <div v-else class="d-flex justify-content-between align-items-center" style="color: #0D47A1;"><InfoIcon class="mr-1" style="font-size: 24px"></InfoIcon>Выделите ученика, чтобы выполнить действие.</div>
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
    <ScanningStudentCardModel :detect="detect"></ScanningStudentCardModel>
    <StudentDangerActionModel :selected="selected"></StudentDangerActionModel>
    <SelectDeviceModel></SelectDeviceModel>
    <LinkCardModel></LinkCardModel>
  </b-card>
</template>

<script>
  import {remote} from 'electron'
  let {BrowserWindow, getGlobal, app, shell} = remote;
  import find from 'lodash/find';
  import MontFont from '@/assets/fonts/Mont-Regular.ttf';
  import MontBoldFont from '@/assets/fonts/Mont-Bold.ttf';
  import MontLightFont from '@/assets/fonts/Mont-Light.ttf';
  import jsPDF from 'jspdf';
  import qr from 'qrcode';
  import path from 'path';
  import fs from 'fs'
  import Vue from 'vue'
  import VueFuse from 'vue-fuse'
  import QrIcon from 'icons/QrcodeScan';
  import CardScanIcon from 'icons/CreditCardScanOutline';
  import AdAccIcon from 'icons/AccountPlus';
  import FileDownloadIcon from 'icons/FileDownload';
  import PrinterIcon from 'icons/Printer';
  import DeleteIcon from 'icons/Delete';
  import EditIcon from 'icons/AccountEdit';
  import ReAddIcon from 'icons/AccountConvert';
  import toNormalModeIcon from 'icons/FormatListChecks';
  import toOnlyCheckModeIcon from 'icons/CheckboxMultipleMarked';
  import CheckAllIcon from 'icons/CheckAll';
  import ClearCheckIcon from 'icons/LayersOff';
  import InfoIcon from 'icons/InformationOutline';
  import StudentDangerActionModel from './StudentDangerActionModel';
  import ScanningStudentCardModel from './ScanningStudentCardModel';
  import LinkCardModel from './LinkCardCard';
  import SelectDeviceModel from './SelectDeviceModel';
  import CreditCardWirelessOutlineIcon from 'icons/CreditCardWirelessOutline';
  import debounce from 'lodash/debounce';
  import TheStudent from "./TheStudent";
  import {compact, flattenDeep} from "lodash/array";
  Vue.use(VueFuse);
  let addMontFont = (d,m,t)=>{
    d.addFileToVFS('mont'+t+'.ttf',m.split(',')[1]);
    d.addFont('mont'+t+'.ttf','mont',t);
  }
  export default {
    name: "StudentsPage",
    components:{FileDownloadIcon, QrIcon,ScanningStudentCardModel,StudentDangerActionModel,AdAccIcon,PrinterIcon,EditIcon,
      DeleteIcon,ReAddIcon, toNormalModeIcon,toOnlyCheckModeIcon,CheckAllIcon,ClearCheckIcon, InfoIcon, CardScanIcon, CreditCardWirelessOutlineIcon,
        SelectDeviceModel, LinkCardModel},
    data() {
      return {
        size: 0,
        currentPage: 1,
        selected: [],
        perPage: 10,
        sortBy: 'name',
        sortDesc: false,
        fields: [
          {
            key:'checkbox',
            sortable: false,
            label: '',
            class: 'table-checkbox'
          },
          {
            key: 'name',
            label: 'Имя',
            sortable: true
          },
          {
            key: 'code',
            label: 'Код',
            sortable: false
          },
          {
            key: 'group',
            label: 'Класс',
            sortable: true,
            class: 'table-student-group'
          },
          {
            key: 'pays',
            label: 'Пит.',
            sortable: true,
            class: 'table-student-status'
          },
          // pays:{
          //   label: 'платник'
          // }
        ],
        query: '',
        lazyQuery: '',
        viewSelected: false,
        isBusy: false
      }
    },
    computed: {
      // it() {
      //   console.log(this.$store.state.Students.students)
      //   let res = values(this.$store.state.Students.students);
      //   if(this.viewSelected){
      //     if(this.selected.length<1) this.viewSelected=false;
      //     else res = res.filter((e)=>this.selected.indexOf(e.studentID)!==-1);
      //     console.log(this.viewSelected);
      //   }
      //   return res;
      // },
      selectMode(){
        return this.selected.length>0;
      }
    },
    created(){
      this.inputQuery = debounce((e)=>{
        this.query = e;this.isBusy = false;
        //console.log(e);
        this.$nextTick(()=>{
          this.$refs.table.refresh();
        });
      },300);
      this.startTyping = (e)=>{
        this.isBusy = true;
          this.inputQuery(e);
      }
    },
    beforeMount(){
      if(this.$route.query.selected){
        this.$route.query.selected = flattenDeep([this.$route.query.selected]);
        this.selected = compact(this.$route.query.selected.map((e)=>Number(e).valueOf())).map((e)=>Number(e).valueOf());
        this.viewSelected = true;
      }
    },
    mounted(){
      this.$refs.input.$el.focus();
      console.log(this.$route)
      this.refresh();
      this.$modal.show('SelectDevice');
    },
    methods:{
      async students_provider(cxt){
        console.log(cxt)
        let st, count;
        if(this.selected.length<=0){
          this.viewSelected = false;
        }
        if(this.viewSelected){
          [st, count] = await TheStudent.loadWithLimit({[TheStudent.classRegex().test(this.query)?'group':'name']: this.query, ids: this.selected}, cxt);
          this.selected = this.selected.filter((e)=>find(st,(el)=>el.studentID==e)!==undefined);
        }
        else [st, count] = await TheStudent.loadWithLimit({[TheStudent.classRegex().test(this.query)?'group':'name']: this.query}, cxt);
        this.size = count;
        console.log(this.size)
        console.log(st, this.selected);
        return st;
      },
      async remove(){
        this.$modal.show('danger-students-action', {
          type: 'remove',
          students: (await TheStudent.loadWithLimit({ids: this.selected},{}))[0],
          callback: ()=>{
            this.$wait(this.$store.dispatch('Students/remove', this.selected).then(
                    ()=>{
                      this.$modal.hide('danger-students-action');
                      this.selected = [];
                      this.refresh()
                    }), true, 0);
          }
        });
      },
      refresh(){
        this.$nextTick(()=>{
          this.$refs.table.refresh();
        });
      },
      async reident(){
        this.$modal.show('danger-students-action', {
          type: 'reidentification',
          students: (await TheStudent.loadWithLimit({ids: this.selected},{}))[0],
          callback: ()=>{
            this.$wait(this.$store.dispatch('Students/reidentification', this.selected).then(()=>{this.$modal.hide('danger-students-action'); this.viewSelected = true}), true, 0);
          }
        });
      },
        awaitModal(modelName, params){
          return new Promise((ok, err)=>{
              this.$modal.show(modelName, {
                  ...params, callback: ()=>{console.log('ok'); ok();}, callbackCancel: ()=>{console.log('err');err();}
              });
          });
        },
      async recordCard(){
        await this.$store.dispatch('Students/record_card', this.selected[0]);
        // let d = await this.awaitModal('SelectDeviceModel');
        // await this.awaitModal('LinkCardModel', {
        //     student: this.selected[0],
        //     connection: d.ip
        // });
      },
      async detect(d){
        let r = await this.$store.dispatch('Students/find', d);
        if(r===undefined) return false;
        if(this.selected.indexOf(r.studentID)===-1) this.selected.push(r.studentID);
        this.viewSelected = true;
      },
      openScanModal(){
        this.$modal.show('scanning-student-card');
      },
      toggleViewMode(){
        this.viewSelected = !this.viewSelected;
        if(this.viewSelected) this.query = '';
        this.refresh();
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
        let [students] = await TheStudent.loadWithLimit({ids:this.selected},{})
        for(let stInfo of students){
          console.log(stInfo)
          await insertCard(doc,5+j*50,5+i*95, stInfo.name,stInfo.code, stInfo.pays);
          j++;
          if(j>3){
            j = 0;
            i++;
          }
          if(i>2){
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
      edit(){
        return this.$router.push({path: '/edit-student',query:{studentID: this.selected[0]}});
      },
      rowClick(d){
        let i = this.selected.indexOf(d.studentID);
        if(i==-1){
          this.selected.push(d.studentID);
        }
        else{
          this.selected.splice(i, 1);
        }
        if(this.viewSelected && this.selected.length<=0){
          this.viewSelected = false;
          this.refresh()
        }
        console.log(arguments);
      },
      clearSelected(){
        this.selected = [];
      },
      async addAll(){
        let l = await this.founded();
        l.forEach((e)=>{
          if(this.selected.indexOf(e.studentID)===-1){
            this.selected.push(e.studentID);
          }
        })
      },
      async founded(){
        return TheStudent.loadAll([TheStudent.classRegex().test(this.query)?'group':'name', 'like', "%"+this.query+"%"]);
        console.log(this.query);
        if(this.query!==''){
          this.sortBy = '';
          if(this.query.match(/^(1[0-1]|[5-9])([А-я])?$/)){
            let s = this.query.toUpperCase();
            let r = this.it.filter((e)=>e.group.includes(s));
            this.currentPage = 1;
            this.isBusy = false;
            this.size = r.length;
            return r;
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
          this.isBusy = false;
          return i;
        }else {
          this.sortBy = 'name';
          this.sortDesc = false;
          this.size = this.it.length;
          this.currentPage = 1;
          this.isBusy = false;
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
    .material-design-icon {
        font-size: 20px;
    }

    .btn .material-design-icon {
        top: 4px;
        left: 7px;
        position: absolute;
    }

    .btn .material-design-icon.top-less {
        top: 3px;
    }

    .dropdown-with-icon .btn:first-child {
        padding-left: 32px;
        position: relative;
    }

    .btn.btn-with-icon {
        padding-left: 32px;
        position: relative;
    }

    .btn.btn-with-only-icon {
        position: relative;
        padding: 1px 6px;
        display: flex;
        align-items: center;
    }

    .btn.btn-with-only-icon .material-design-icon {
        font-size: 24px;
        line-height: 0 !important;
        position: relative;
        top: 0;
        left: 0;
    }

    .material-design-icon svg {
        bottom: 0 !important;
    }

    .dropdown.dropdown-with-icon .dropdown-menu .dropdown-item {
        padding-left: 40px;
        position: relative;
    }

    .dropdown.dropdown-with-icon .dropdown-menu .material-design-icon {
        position: absolute;
        top: 6px;
        left: 12px;
        color: #495057;
    }

    .StudentPageScanIcon {
        border-color: #ced4da !important;
    }

    .table-checkbox {
        width: 30px;
        padding-right: 0px !important;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    table.table-select-mode tr {
        cursor: pointer;
    }

    table:not(.table-select-mode) tr:hover .table-checkbox {
        opacity: 0.5;
    }

    .table-student-group {
        width: 120px;
    }

    .table-student-status {
        width: 30px;
    }

    .table-select-mode .table-checkbox {
        opacity: 1;
    }

    table tr:focus {
        outline: none;
        background-color: #e9ecef;
    }
</style>