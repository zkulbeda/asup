<template>
  <modal :name="modelName"
         :width="400"
         height="auto"
         :adaptive="true"
         @before-open="inits"
         @opened="$emit('opened')"
         @before-close="$emit('closed')">
    <div class="CloseDayModal">
      <CloseIcon class="CloseIcon" @click="close"></CloseIcon>
      <h3>{{edit?'Редактирование дня':'Закрытие дня'}}</h3>
      <template v-if="!isEmpty">
        <div>Дата: {{dayInWord}}</div>
        <p>Необходимa ценa обеда для {{count}} {{count|numWord('ученика','учеников','учеников')}}</p>
        <hr style="margin-left: -20px; margin-right: -20px;">
        <b-form @submit="end" @submit.stop.prevent>
          <b-form-group
              id="input-group-1"
              label="Цена для платников:"
              label-for="input-1"
          >
            <b-form-input
                id="input-1"
                v-model="notfree"
                type="number"
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
              label="Цена для бесплатников:"
              label-for="input-2"
          >
            <b-form-input
                id="number"
                v-model="free"
                type="number"
                step="0.01" max="10" min="0"
                required
                placeholder='0.00'
                :state="!validation.isTouched('free')?null:!validation.hasError('free')"
            ></b-form-input>
            <b-form-invalid-feedback :state="!validation.isTouched('free')?null:!validation.hasError('free')">
              {{validation.firstError('free')}}
            </b-form-invalid-feedback>
          </b-form-group>
          <div style="display: flex; justify-content: space-between;">
            <b-button @click="deleteDay" tag="a" variant="link">Удалить день</b-button>
            <b-button @click="check" type="submit" :variant="edit?'success':'danger'">{{edit?'Редактировать':'Закрыть'}} день</b-button>
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
  import Vue from 'vue';
  import SimpleVueValidation from 'simple-vue-validator';
  import CloseIcon from 'icons/close';
  import {DateTime} from 'luxon'

  Vue.use(SimpleVueValidation);
  import msgs from './validation.js';

  SimpleVueValidation.extendTemplates(msgs);
  const Validator = SimpleVueValidation.Validator;
  export default {
    components: {
      CloseIcon,
    },
    name: "CloseDayReportModel",
    data() {
      return {
        free: null,
        notfree: null,
        dayToEdit: null,
        edit: false,
        modelName: 'closeDayReport'
      }
    },

    validators: {
      free(v) {
        return Validator.value(v).required().float().greaterThanOrEqualTo(0).custom(() => {
          if (v > 10) return "Цена должна быть в пределах разумного"
        });
      },
      notfree(v) {
        return Validator.value(v).required().float().greaterThanOrEqualTo(0).custom(() => {
          if (v > 10) return "Цена должна быть в пределах разумного"
        });
      }
    },
    computed: {
      dayInWord(){
        if(!this.dayToEdit) return '- -';
        return this.dayToEdit.setLocale("ru").toLocaleString("dd LLLL");
      },
      numFree() {
        return Number(this.free);
      },
      numNotFree() {
        return Number(this.notfree);
      },
      isEmpty(){
        return this.count<=0;
      }
    },
    methods: {
      clearState() {
        this.free = null;
        this.notfree = null;
        this.validation.reset();
      },
      check() {
        this.free = this.free || '';
        this.notfree = this.notfree || '';
      },
      async end() {
        if(!this.isEmpty) {
          let res = await this.$validate();
          if (res === false) {
            this.check();
            return;
          }
        }
        this.$wait(this.callback({
          free: this.numFree,
          notFree: this.numNotFree,
          dayToEdit: this.dayToEdit
        }).then(()=>{this.clearState();this.close();}));

      },
      async deleteDay(){
        this.$wait(this.callbackDelete({
          dayToEdit: this.dayToEdit
        }).then(()=>{this.clearState();this.close();}));
      },
      close() {
        this.$modal.hide(this.modelName);
      },
      inits(e){
        console.log(e);
        this.dayToEdit=e.params.dayToEdit;
        this.edit=e.params.edit||false;
        if(this.edit){
          this.free=e.params.price.free||0;
          console.log(e.params.price);
          this.notfree=e.params.price.notFree||0;
        }else{this.clearState()}
        this.count=e.params.count||0;
        this.callback=e.params.callback||(()=>Promise.reject());
        this.callbackDelete=e.params.callbackDelete||(()=>Promise.reject());
      },
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