<template>
    <b-card>
        <b-row>
            <b-button-group :vertical="true">
                <b-button @click="selectCamera">Выбрать камеру</b-button>
                <b-button @click="openDevTools">Открыть инструменты разработчика</b-button>
                <b-button @click="openPath">Открыть папку с программой</b-button>
                <b-button @click="$wait(importDB())">Импорт базы</b-button>
                <b-button @click="$wait(importZip())">Импорт старой базы</b-button>
                <b-button @click="$wait(toKioskMode())">Режим киоска</b-button>
            </b-button-group>
        </b-row>
    </b-card>
</template>

<script>
    let {getGlobal, shell, app, dialog} = require('electron').remote;
    import cameraDialog from './selectCamera';
    import path from 'path';
    import Nedb from 'nedb-promise';
    import fs from 'file-system';
    import promiseIpc from 'electron-promise-ipc';

    export default {
        name: "SettingsView",
        data() {
            return {}
        },
        computed: {},
        methods: {
            async importDB() {
                await promiseIpc.send('importDB');
            },
            async importZip() {
                await promiseIpc.send('importZip');
            },
            async toKioskMode() {
                await promiseIpc.send('changeKioskMode', true);
            },
            async selectCamera() {
                try {
                    let id = await cameraDialog();
                    this.$config.set('deviceID', id);
                } catch (e) {
                }
            },
            openDevTools() {
                getGlobal('mainWindow').openDevTools();
            },
            openPath() {
                shell.showItemInFolder(path.join(app.getPath('userData'), 'config.json'));
            }
        },
        mounted() {

        }
    }
</script>

<style scoped>

</style>