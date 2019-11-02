import keyBy from 'lodash/keyBy'
import faker from 'faker';
faker.locale = 'ru';
import TheStudent from "@/components/TheStudent";
import {getGlobal, RuntimeError} from "@/components/utils";
import promiseIpc from "electron-promise-ipc";

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
    state.students = keyBy(pl.map((e)=>e.toJSON()), 'studentID');
  },
  addStudent(state, pl) {
    state.students[pl.studentID] = pl.toJSON();
  },
  editStudent(state,st){
    state.students[st.studentID] = st.toJSON();
  },
  setLoadingState(state, st) {
    state.loading = st;
  }
}

const actions = {
  async init({dispatch, commit}) {
    commit('setLoadingState', true);
    console.log('init student db');
    //db = await TheStudent.getDB('students.json');
    //await db.loadDatabase();
    await dispatch('refreshStudents');
    commit('init');
    commit('setLoadingState', true);
    //return db;
  },
  async refreshStudents({commit}) {
    let res = await TheStudent.loadAll();
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
    let newStudent = await TheStudent.new(pl);
    commit('addStudent', newStudent);
    return newStudent;
  },
  async editStudent({commit,dispatch}, {studentID,name,pays,group}) {
    let student = await TheStudent.loadFromID(studentID);
    student.name = name;
    student.pays = pays;
    student.group = group;
    student.save();
    commit('editStudent', student);
    return student;
  },
  async find({}, id) {
    return await TheStudent.loadFromCode(id,false);
  },
  async record({dispatch, commit}, {id}) {
    let st = await TheStudent.loadFromCode(id,false);
    if (!st) throw new RuntimeError(1);
    let rd = await dispatch('ThisDay/addStudent', {st, id}, {root: true});
    return {st, rd};
  },
  async reidentification({dispatch},selected) {
    for(let studentID of selected){
        console.log('start', studentID)
        let user = await TheStudent.loadFromID(studentID);
        console.log(user);
      await user.reidentification();
      console.log('end')
    }
    await dispatch('refreshStudents');
  },
  async record_card({dispatch}, selected){
    let user = await TheStudent.loadFromID(selected);
    let ws = null;
    let connections = await promiseIpc.send('getRFIDConnections')
    console.log(connections);
    let c = null;
    for(let i in connections){
      c = connections[i];
      break;
    }
    await promiseIpc.send('RFIDRecordCard', {student_id: user.studentID, connection: c});
    },
  async remove({dispatch},selected) {
    await TheStudent.removeMany(selected);
    await dispatch('refreshStudents');
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
