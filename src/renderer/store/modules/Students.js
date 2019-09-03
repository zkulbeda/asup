import nedb from "nedb-promise";
import path from "path";
import keyBy from 'lodash/keyBy'
import faker from 'faker';
faker.locale = 'ru';
import genID from 'nanoid/generate';

let {app} = require('electron').remote;
let db = null;
db = nedb({
  filename: path.join(app.getPath('userData'), 'students.json'),
  timestampData: true
});
console.log(db);
db.ensureIndex({ fieldName: "id", unique: true });

const state = {
  students: null,
  initialized: false,
  loading: true
}

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
    await db.loadDatabase();
    await dispatch('refreshStudents');
    console.log('done');
    commit('init');
    commit('setLoadingState', true);
    return db;
  },
  async refreshStudents({commit}) {
    let res = await db.find({});
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
    }while((await db.findOne({id}))!==null);
    return id;
  },
  async insertStudent({commit,dispatch}, pl) {
    let id = await dispatch('generateID');
    let newStudent = await db.insert({id,name: pl.name, group: pl.group, pays: Boolean(pl.pays)});
    commit('addStudent', newStudent);
    return newStudent;
  },
  async find({}, id) {
    let st = await db.findOne({id: id});
    if (st === null) return false;
    return st;
  },
  async record({dispatch, commit}, {id}) {
    let st = await db.findOne({id: id});
    if (st === null) throw {'message': 'Ученик не найден', id};
    let rd = await dispatch('ThisDay/addStudent', {st, id}, {root: true});
    return {st, rd};
  },
  async reidentification({dispatch},selected) {
    for(let studentID of selected){
      let id = await dispatch('generateID');
      await db.update({id: studentID}, {$set:{id}});
    }
    await dispatch('refreshStudents');
  },
  async remove({dispatch},selected) {
    await db.remove({id:{$in: selected}},{multi: true});
    await dispatch('refreshStudents');
  },
  test({}) {
    return db.find({}).then((d) => {
      console.log(d)
    }).catch((e) => {
      console.error(e)
    });
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
