import keyBy from 'lodash/keyBy'
import faker from 'faker';
faker.locale = 'ru';
import TheStudent from "@/components/TheStudent";
import {RuntimeError} from "@/components/utils";

let db = null;
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
    state.students = keyBy(pl, 'studentID');
  },
  addStudent(state, pl) {
    state.students[pl.id] = pl;
  },
  setLoadingState(state, st) {
    state.loading = st;
  }
}

const actions = {
  async init({dispatch, commit}) {
    commit('setLoadingState', true);
    console.log('init student db');
    db = await TheStudent.getDB('students.json');
    await db.loadDatabase();
    await dispatch('refreshStudents');
    commit('init');
    commit('setLoadingState', true);
    return db;
  },
  async refreshStudents({commit}) {
    let res = await TheStudent.loadAll(db);
    console.log(res);
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
  async insertStudent({commit,dispatch}, pl) {
    let newStudent = await TheStudent.new(db,pl);
    commit('addStudent', newStudent);
    return newStudent;
  },
  async find({}, id) {
    return await TheStudent.loadFromCode(db,id,false);
  },
  async record({dispatch, commit}, {id}) {
    let st = await TheStudent.loadFromCode(db,id,false);
    if (!st) throw new RuntimeError(1);
    let rd = await dispatch('ThisDay/addStudent', {st, id}, {root: true});
    return {st, rd};
  },
  async reidentification({dispatch},selected) {
    for(let studentID of selected){
      await (await TheStudent.loadFromCode(db,studentID)).reidentification();
    }
    await dispatch('refreshStudents');
  },
  async remove({dispatch},selected) {
    await TheStudent.removeMany(db,selected);
    await dispatch('refreshStudents');
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
