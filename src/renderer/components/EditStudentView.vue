<template>
  <b-card style="max-width: 600px;">
    <b-row>
      <b-col class="">
        <h3 class="mb-4 mt-2 text-center">Изменение карты питания ученика</h3>
        <b-form @submit="end" @submit.stop.prevent>
          <b-form-group id="name-group" label="ФИО ученика: " label-for="name" label-cols="3" label-align="right">
            <b-form-input if="name" v-model="name" required
                :state="!validation.isTouched('name')?null:!validation.hasError('name')"
            ></b-form-input>
            <b-form-invalid-feedback
                :state="!validation.isTouched('name')?null:!validation.hasError('name')">
              {{validation.firstError('name')}}
            </b-form-invalid-feedback>
          </b-form-group>
          <b-form-group id="class-group" label="Класс: " label-for="class" label-cols="3" label-align="right">
            <b-form-input if="class" v-model="group" required list="listOfClasses"
                :formatter="classFormat"
                :state="!validation.isTouched('group')?null:!validation.hasError('group')"
            ></b-form-input>
            <b-form-invalid-feedback
                :state="!validation.isTouched('group')?null:!validation.hasError('group')">
              {{validation.firstError('group')}}
            </b-form-invalid-feedback>
          </b-form-group>
          <b-form-group id="pays-group" label="Статус: " label-for="pays" label-cols="3" label-align="right">
            <b-form-radio-group id="pays" class="pt-2"
                :options="[{text: 'платник', value: true},{text:'бесплатник', value: false}]"
                v-model="paysVal"
                required
            ></b-form-radio-group>
          </b-form-group>
          <b-form-group
              label-cols="3"
          >
            <div class="d-flex justify-content-between align-items-center">
              <b-button @click="check" type="submit" variant="primary">Сохранить</b-button>
            </div>
          </b-form-group>
        </b-form>
      </b-col>
    </b-row>
  </b-card>
</template>

<script>
  import Vue from "vue";
  import SimpleVueValidation from 'simple-vue-validator';

  Vue.use(SimpleVueValidation);
  import msgs from './validation.js';

  SimpleVueValidation.extendTemplates(msgs);
  const Validator = SimpleVueValidation.Validator;
  export default {
    name: "AddStudent",
    data() {
      return {
        name: null,
        group: null,
        paysVal: true,
        added: [],
        studentID: null
      }
    },
    computed:{
      isCanEndAdding(){
        return this.added.length>0 && !this.addMore && (!this.validation.isTouched('name') || this.validation.hasError());
      }
    },
    validators: {
      name(v) {
        return Validator.value(v).required();
      },
      group(v) {
          return Validator.value(v).required().regex(/^(1[0-1]|[5-9])([А-Я])?$/, "Формат класса: число от 5 до 11 и буква без пробела")
        },
    },
    mounted(){
      if(!this.$route.query.studentID || this.$store.state.Students.students[this.$route.query.studentID]===undefined){
        console.error('Редактирование ученика - параметр не указан');
        this.$router.back();
      }else{
        let student = this.$store.state.Students.students[this.$route.query.studentID];
        this.name = student.name;
        this.group = student.group;
        this.paysVal = student.pays;
        this.studentID = student.studentID;
      }
    },
    methods: {
      check() {
        this.name = this.name || '';
        this.group = this.group || '';
        this.$validate();
        console.log('test');
      },
      async end() {
        let res = await this.$validate();
        if (res === false) {
          this.check();
          return;
        }
        let st = await this.$store.dispatch('Students/editStudent', {
          studentID: this.studentID,
          name: this.name,
          group: this.group,
          pays: this.paysVal
        });
        console.log(st);
        this.endAdding();
      },
      endAdding(){
        this.$router.push({path: '/students',query:{selected: [this.studentID]}});
      },
      classFormat(v) {
        return v.toUpperCase();
      }
    }
  }
</script>

<style scoped>

</style>