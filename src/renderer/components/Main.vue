<template>
    <b-container>
        <b-col cols="3">
            <b-row>
                MENU
            </b-row>
        </b-col>
        <b-col>
            <router-view></router-view>
        </b-col>
    </b-container>
</template>

<script>
    export default {
        name: "Main"
    }
</script>

<style scoped>

</style>