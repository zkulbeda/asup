<template>
    <b-card style="max-width: 600px;">
        <b-row>
            <b-col class="">
                <h3 class="mb-4 text-center">Создание карты питания ученика</h3>
                <b-form>
                    <b-form-group
                            id="name-group"
                            label="Имя ученика: "
                            label-for="name"
                            label-cols="3"
                            label-align="right"
                    >
                        <b-form-input
                                if="name"
                                v-model="name"
                                required
                                :state="!validation.isTouched('name')?null:!validation.hasError('name')"
                        ></b-form-input>
                        <b-form-invalid-feedback
                                :state="!validation.isTouched('name')?null:!validation.hasError('name')">
                            {{validation.firstError('name')}}
                        </b-form-invalid-feedback>
                    </b-form-group>
                    <b-form-group
                            id="class-group"
                            label="Класс: "
                            label-for="class"
                            label-cols="3"
                            label-align="right"
                    >
                        <b-form-input
                                if="class"
                                v-model.lazy="group"
                                required
                                list="listOfClasses"
                                :formatter="classFormat"
                                :state="!validation.isTouched('group')?null:!validation.hasError('group')"
                        ></b-form-input>
                        <b-form-invalid-feedback
                                :state="!validation.isTouched('group')?null:!validation.hasError('group')">
                            {{validation.firstError('group')}}
                        </b-form-invalid-feedback>
                        <b-form-datalist :options="options" id="listOfClasses">
                        </b-form-datalist>
                    </b-form-group>
                    <b-form-group
                            id="pays-group"
                            label="Статус: "
                            label-for="pays"
                            label-cols="3"
                            label-align="right"
                    >
                        <b-form-radio-group
                                id="pays"
                                class="pt-2"
                                :options="[{text:'бесплатник', value: false},{text: 'платник', value: true}]"
                                v-model="paysVal"
                                required
                        ></b-form-radio-group>
                    </b-form-group>
                    <b-form-group
                            label-cols="3"
                    >
                        <div class="d-flex justify-content-between align-items-center">
                            <b-button variant="primary" type="submit">Добавить</b-button>
                            <b-form-checkbox
                                    v-model="addMore"
                            >Добавить ещё
                            </b-form-checkbox>
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
        data: () => ({
            name: '',
            group: '',
            paysVal: false,
            addMore: false,
            options: ['10Б', '10A', '11Б']
        }),
        validators: {
            name(v) {
                return Validator.value(v).required();
            },
            group: {
                validator(v) {
                    return Validator.value(v).required().regex(/(1[0-1]|[5-9])[А-Я]/, "Формат класса: число от 5 до 11 и буква без пробела")
                }
            },
        },
        methods: {
            classFormat(v) {
                return v.toUpperCase();
            }
        }
    }
</script>

<style scoped>

</style>