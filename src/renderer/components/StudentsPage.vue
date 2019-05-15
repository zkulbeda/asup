<template>
  <div>
    <b-table :items="it" :fields="fields"></b-table>
    <router-link to="/create-student">fvdfv</router-link>
  </div>
</template>

<script>
  import values from 'lodash/values';
  export default {
    name: "StudentsPage",
    data() {
      return {
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
        }
      }
    },
    computed: {
      it() {
        return values(this.$store.state.Students.students);
      }
    }
  }
</script>

<style scoped>

</style>