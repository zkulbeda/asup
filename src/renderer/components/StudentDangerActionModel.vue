<template>
  <modal name="danger-students-action"
         @before-open="inits"
         :pivotY="0.4"
         :clickToClose="false"
         :scrollable="true"
         :width="500"
         height="auto"
         :adaptive="true">
    <div style="padding: 20px;">

      <h3>Вы уверены?</h3>
      <p>
        <template v-if="type=='reidentification'">
        Вы собираетесь сбросить QR-код карт питания.<br>
        После этого старые карты питания будут недействительны.
        </template>
        <template v-else>
          Вы собираетесь удалить карты питания учеников.<br>
          После этого карты питания будут недействительны.
        </template>
        <br>
        <span class="text-danger">Это действие необратимо.</span>
      </p>
      <hr style="margin-left: -20px; margin-right: -20px;">
      <p class="mb-1">Действие применяется для {{count}} {{count|numWord('ученика','учеников','учеников')}}:</p>
      <ul>
        <li v-for="(group, key) in list">
          {{key}}: {{group.length}} {{group.length|numWord('ученик','ученика','учеников')}}
        </li>
      </ul>
      <div class="d-flex justify-content-end">
        <b-button @click="cancel" variant="light">
          Отмена
        </b-button>
        <b-button @click="ok" class="ml-2" variant="danger">
          Продолжить
        </b-button >
      </div>
    </div>
  </modal>
</template>

<script>
  import groupBy from 'lodash/groupBy'
  import orderBy from 'lodash/orderBy'

  export default {
    name: "StudentDangerActionModel",
    components: {},
    props: {
      selected: Array
    },
    data() {
      return {
        error: false,
        callback: null,
        type: null
      }
    },
    computed: {
      count() {
        return this.selected.length;
      },
      list() {
        return groupBy(orderBy(this.selected.map((e) => this.$store.state.Students.students[e]), ['group', 'name']), 'group');
      }
    },
    methods: {
      cancel(){
        this.$modal.hide('danger-students-action');
      },
      ok(){
        this.callback();
      },
      inits(e){
        console.log(e);
        this.callback=e.params.callback;
        this.type=e.params.type||'remove';
      }
    }
  }
</script>