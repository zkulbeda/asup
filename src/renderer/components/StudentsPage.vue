<template>
  <b-card>
    <b-form-group>
      <b-form-input ref="input" v-model="query" placeholder="Поиск..."></b-form-input>
    </b-form-group>
    <b-table
        ref="table"
        :busy.sync="isBusy"
        :items="founded"
        :per-page="perPage"
        :current-page="currentPage"
        :fields="fields"></b-table>
    <b-pagination
        v-model="currentPage"
        :total-rows="size"
        :per-page="perPage"
        prev-text="Prev"
        next-text="Next"
        :hide-goto-end-buttons="true"
        :no-provider-paging="true"
        :no-provider-sorting="true"
    ></b-pagination>
    <router-link to="/create-student">fvdfv</router-link>
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

        currentPage: 1,
        'perPage': 2,
        items: [
          {age: 123},
          {age: 456},
          {age: 1234},
          {age: 678},
        ],
        fields: {
          name: {
            label: 'Имя',
            sortable: true
          },
          group: {
            label: 'Класс',
            sortable: true
          },
          pays:{
            label: 'платник'
          }
        },
        query: '',
        isBusy: false
      }
    },
    computed: {
      it() {
        return values(this.$store.state.Students.students);
      },
    },
    mounted(){
      this.$refs.input.$el.focus();
    },
    methods:{
      async founded(){
        if(this.query!==''){
          return await this.$search(this.query,this.it,{
            keys: ['name','group'],
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
          });
        }else return this.it;
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

<style scoped>

</style>