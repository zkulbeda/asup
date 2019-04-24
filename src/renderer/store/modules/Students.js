import nedb from "nedb-promise";
import path from "path";
let {app} = require('electron').remote;
let db = null;
db = nedb({
    filename: path.join(app.getPath('userData'), 'students.json'),
    timestampData: true
});
console.log(db);

const state = {
    students: null
}

const mutations = {
    test(){

    }
}

const actions = {
    init({ }) {
        db.loadDatabase();
        //db = e.getGlobal('students');
        // do something async
        console.log(db);
    }
}

export default {
    namespaced: true,
    state,
    mutations,
    actions
}
