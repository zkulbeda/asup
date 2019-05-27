import nedb from "nedb-promise";
import path from "path";
import keyBy from 'lodash/keyBy'

let {app} = require('electron').remote;
let db = null;
db = nedb({
  filename: path.join(app.getPath('userData'), 'students.json'),
  timestampData: true
});
console.log(db);

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
    state.students = keyBy(pl, '_id');
  },
  addStudent(state, pl) {
    state.students[pl._id] = pl;
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
  async insertStudent({commit}, pl) {
    let newStudent = await db.insert({name: pl.name, group: pl.group, pays: Boolean(pl.pays)});
    commit('addStudent', newStudent);
    return newStudent;
  },
  async random({commit}, n) {
    for (let i = 0; i < n; i++) {
      let newStudent = await db.insert({name: 'dfghfgh', group: '10Б', pays: true, id: '123' + i});
      commit('addStudent', newStudent);
    }
  },
  async find({}, id) {
    let st = await db.findOne({_id: id});
    if (st === null) return false;
    return st;
  },
  async record({dispatch, commit}, {id}) {
    let st = await db.findOne({_id: id});
    if (st === null) throw {'message': 'Ученик не найден'};
    let rd = await dispatch('ThisDay/addStudent', {st, id}, {root: true});
    return {st, rd};
  },
  async reidentification({dispatch},selected) {
    let st = await db.find({_id:{$in: selected}});
    await db.remove({_id:{$in: selected}},{multi: true});
    st.forEach((e)=>{delete e._id});
    await db.insert(st);
    await dispatch('refreshStudents');
  },
  async remove({dispatch},selected) {
    await db.remove({_id:{$in: selected}},{multi: true});
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
