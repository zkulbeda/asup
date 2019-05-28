<template>
  <modal name="closeDay" :width="400" height="auto" :adaptive="true" @opened="$emit('opened')"
         @before-close="$emit('closed')">
    <div class="CloseDayModal">
      <CloseIcon class="CloseIcon" @click="close"></CloseIcon>
      <h3>Закрытие дня</h3>
      <template v-if="!isEmpty">
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
                v-model="free"
                type="number"
                step="0.01" max="10" min="0"
                placeholder='0.00'
                required
                :state="!validation.isTouched('free')?null:!validation.hasError('free')"

            ></b-form-input>
            <b-form-invalid-feedback :state="!validation.isTouched('free')?null:!validation.hasError('free')">
              {{validation.firstError('free')}}
            </b-form-invalid-feedback>
          </b-form-group>
          <b-form-group
              id="input-group-2"
              label="Цена для бесплатников:"
              label-for="input-2"
              description="Повторно сегодня день уже нельзя будет открыть."
          >
            <b-form-input
                id="number"
                v-model="notfree"
                type="number"
                step="0.01" max="10" min="0"
                required
                placeholder='0.00'
                :state="!validation.isTouched('notfree')?null:!validation.hasError('notfree')"
            ></b-form-input>
            <b-form-invalid-feedback :state="!validation.isTouched('notfree')?null:!validation.hasError('notfree')">
              {{validation.firstError('notfree')}}
            </b-form-invalid-feedback>
          </b-form-group>
          <div style="display: flex; justify-content: flex-end;">
            <b-button @click="check" type="submit" variant="danger">Закрыть день</b-button>
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

  Vue.use(SimpleVueValidation);
  import msgs from './validation.js';

  SimpleVueValidation.extendTemplates(msgs);
  const Validator = SimpleVueValidation.Validator;
  export default {
    components: {
      CloseIcon
    },
    name: "CloseDayModel",
    data() {
      return {
        free: null,
        notfree: null,
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
      count() {
        return this.$store.state.ThisDay.listOfRecords.length;
      },
      numFree() {
        return Number(this.free);
      },
      numNotFree() {
        return Number(this.notfree);
      },
      isEmpty(){
        return this.$store.state.ThisDay.listOfRecords.length<=0;
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
        this.close();
        this.$wait(this.$store.dispatch('ThisDay/closeSession', {
          free: this.numFree,
          notFree: this.numNotFree
        }).then(()=>{this.clearState();}));

      },
      close() {
        this.$modal.hide('closeDay');
      }
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