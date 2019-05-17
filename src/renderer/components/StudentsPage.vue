<template>
  <b-card>
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
    >
      <template slot="checkbox" slot-scope="data" class="table-checkbox">
        <b-form-checkbox v-model="selected" :value="data.item._id" :key="data.item._id"></b-form-checkbox>
      </template>
    </b-table>
    <div class="d-flex  justify-content-between align-items-center">
      <div>
      <div v-if="selectMode" class="d-flex justify-content-start align-items-baseline">
        <b-dropdown split @click="alert('hjkl')" size="sm" id="dropdown-1" text="Печать" class="mr-2">
          <b-dropdown-item>Распечатать</b-dropdown-item>
          <b-dropdown-item>Удалить</b-dropdown-item>
          <b-dropdown-divider></b-dropdown-divider>
          <b-dropdown-item>Выделить все</b-dropdown-item>
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
  import values from 'lodash/values';
  import Vue from 'vue'
  import VueFuse from 'vue-fuse'
  Vue.use(VueFuse)
  export default {
    name: "StudentsPage",
    data() {
      return {
        size: 0,
        currentPage: 1,
        selected: [],
        perPage: 10,
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
        isBusy: false
      }
    },
    computed: {
      it() {
        return values(this.$store.state.Students.students);
      },
      selectMode(){
        return this.selected.length>0;
      }
    },
    mounted(){
      this.$refs.input.$el.focus();
    },
    methods:{
      rowClick(){
        console.log(arguments)
      },
      clearSelected(){
        this.selected = [];
      },
      async founded(){
        if(this.query!==''){
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