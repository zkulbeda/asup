import nedb from "nedb-promise";
import path from "path";
import keyBy from 'lodash/keyBy'
import faker from 'faker';
import {promisifyAll} from 'bluebird';
let {app} = require('electron').remote;
import genID from 'nanoid/generate';
faker.locale = 'ru';
let LinvoDB =  require ("linvodb3");
// Следующие две строки очень важны
// Инициализируйте хранилище по умолчанию для level-js - хранилища только для JS, которое будет работать без перекомпиляции в NW.js / Electron
LinvoDB.defaults.store = { db: require("level-js") }; // Закомментируем использование LevelDB вместо level-js
// Устанавливаем dbPath - это должно быть сделано явно и будетдиректорией, в которой хранится хранилище каждой модели
LinvoDB.dbPath = app.getPath('userData');

let db = null;
db = new LinvoDB("doc", {},{
  timestampData: true
});
db.ensureIndex({ fieldName: "id", unique: true });
promisifyAll(db);
// db = nedb({
//   filename: path.join(app.getPath('userData'), 'students.json'),
// });
console.log(db);

const state = {
  students: null,
  initialized: false,
  loading: true
};

const mutations = {
  init(state) {
    if (state.initialized) {
      console.error("DB Students was initialized yet");
    } else state.initialized = true;
  },
  setStudents(state, pl) {
    state.students = keyBy(pl, 'id');
  },
  addStudent(state, pl) {
    state.students[pl.id] = pl;
  },
  setLoadingState(state, st) {
    state.loading = st;
  },
  test() {

  }
}

const actions = {
  async init({dispatch, commit}) {
    commit('setLoadingState', true);
    console.log('init');
    //await db.loadDatabase();
    await dispatch('refreshStudents');
    console.log('done');
    commit('init');
    commit('setLoadingState', true);
    return db;
  },
  async refreshStudents({commit}) {
    let res = await db.findAsync({});
    commit('setStudents', res);
    return res;
  },
  async generateFakeStudents({dispatch}, c){
    for(let i = 0; i<c; i++){
      await dispatch('insertStudent', {
        name: faker.name.findName()+' '+faker.name.lastName(),
        group: faker.random.number({min:5, max:11})+(faker.random.boolean()?'Б':'A'),
        pays: faker.random.boolean()
      });
    }
    await dispatch('refreshStudents');
  },
  async generateID(){
    let id = null;
    do{
      id = genID('0123456789',10);
    }while((await db.findOneAsync({id}))!==null);
    return id;
  },
  async insertStudent({commit,dispatch}, pl) {
    let id = await dispatch('generateID');
    let newStudent = await db.insertAsync({id,name: pl.name, group: pl.group, pays: Boolean(pl.pays)});
    commit('addStudent', newStudent);
    return newStudent;
  },
  async find({}, id) {
    let st = await db.findOneAsync({id: id});
    if (st === null) return false;
    return st;
  },
  async record({dispatch, commit}, {id}) {
    let st = await db.findOneAsync({id: id});
    if (st === null) throw {'message': 'Ученик не найден', id};
    let rd = await dispatch('ThisDay/addStudent', {st, id}, {root: true});
    return {st, rd};
  },
  async reidentification({dispatch},selected) {
    for(let studentID of selected){
      let id = await dispatch('generateID');
      await db.updateAsync({id: studentID}, {$set:{id}});
    }
    await dispatch('refreshStudents');
  },
  async remove({dispatch},selected) {
    await db.removeAsync({id:{$in: selected}},{multi: true});
    await dispatch('refreshStudents');
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
