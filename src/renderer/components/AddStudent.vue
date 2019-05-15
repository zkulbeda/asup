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
                        >

                        </b-form-input>
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
                                v-model="name"
                                required
                                list="listOfClasses"
                        >

                        </b-form-input>
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
                            >Добавить ещё</b-form-checkbox>
                        </div>
                    </b-form-group>
                </b-form>
            </b-col>
        </b-row>
    </b-card>
</template>

<script>
    export default {
        name: "AddStudent",
        data: () => ({
            name: '',
            paysVal: false,
            addMore: false,
            options: ['10Б', '10A','11Б']
        })
    }
</script>

<style scoped>

</style>