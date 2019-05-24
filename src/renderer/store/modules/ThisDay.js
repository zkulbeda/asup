import nedb from "nedb-promise";
import path from "path";
import {DateTime} from "luxon"
import mkdir from 'mkdirp';
import bll from 'blob-to-buffer';
let fs = require('fs');
let util = require('util');
const writeFile = util.promisify(fs.writeFile);
const mkdirp = util.promisify(mkdir);
const tobuff = util.promisify(bll);
function getCanvasBlob(canvas, ...p) {
  return new Promise(function(resolve, reject) {
    canvas.toBlob(function(...blob) {
      resolve(...blob)
    }, ...p)
  })
}
let {app, getGlobal} = require('electron').remote;
let db = null;
let config = getGlobal('config');
let timeNow = DateTime.local();

async function update(db, need, replaced) {
  let i = await db.findOne(need);
  if (i === null) throw Error('NOT FOUND: ' + JSON.stringify(need));
  return await db.update(i, {$set: replaced});
}

const state = {
  initialized: false,
  started: false,
  ended: false,
  listOfRecords: [],
  day: null,
  month: null,
  hasNoClosedDay: false,
  loading: false,
}

const mutations = {
  init(state) {
    if (state.initialized) {
      console.error("DB ThisDay was initialized yet");
    } else state.initialized = true;
  },
  setStartState(state, arr) {
    state.started = arr[0];
    state.ended = arr[1];
    if(arr.length>2){
      state.month = arr[2];
      state.day = arr[3];
    }
  },
  pushRecord(state, rd) {
    state.listOfRecords.unshift(rd);
  },
  setList(state, rds){
    state.listOfRecords = rds;
  },
  setLoadingState(state, st){
    state.loading = st;
  },
  setClosedDayState(state, st){
    state.hasNoClosedDay = st;
  },
}

const actions = {
  async init({dispatch, commit}) {
    commit('setLoadingState', true);
    let m = timeNow.month, d = timeNow.day;
    if(config.has('opened')){
      let mm = config.get('opened.month');
      let dd = config.get('opened.day');
      if(mm!==m || dd!==d){
        m = mm;
        d = dd;
        commit('setClosedDayState', true);
      }
    }
    db = nedb({
      filename: path.join(app.getPath('userData'), 'data/' + m + '/' + d + '.json'),
      timestampData: true,
    });
    await db.loadDatabase();
    let conf = await db.findOne({type: 'config'});
    if (conf === null) await db.insert({type: 'config', started: false, ended: false});
    else commit('setStartState', [conf.started, conf.ended, m,d]);
    commit('setList', (await db.find({type: 'record'})).sort((a,b)=>b.createdAt-a.createdAt));
    commit('setLoadingState', false);
    commit('init');
    return db;
  },
  async startSession({commit, state}) {
    if (state.started) throw Error('Сессия уже открыта');
    await update(db, {type: 'config'}, {started: true});
    commit('setStartState', [true, false]);
    config.set('opened.month', state.month);
    config.set('opened.day', state.day);
    return true;
  },
  async closeSession({commit, state, dispatch}, pl) {
    console.log(pl);
    if (!state.started) throw Error('Сессия еще не открыта');
    await update(db, {type: 'config'}, {started: true, ended: true});
    await db.insert({type: 'price', ...pl});
    commit('setStartState', [true, true]);
    config.delete('opened');
    if(state.hasNoClosedDay){
      commit('setClosedDayState', false);
      dispatch("init");
    }
    return false;
  },
  async addStudent({commit, state, dispatch}, st) {
    let {id} = st;
    if (!state.started) throw Error('Сессия не открыта');
    let f = await db.findOne({type: 'record', id});
    if (f !== null) throw {'message': 'Ученик уже записан', data: {student: st.st, record: f}};
    // let url = await dispatch('createImageUrl', {rd: st, imagedata: st.img});
    let rd = await db.insert({type: 'record', id});
    commit('pushRecord', rd);
    return rd;
  },
  async createImageUrl({dispatch, commit}, {rd, imagedata}){
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);
    let b = await getCanvasBlob(canvas,'image/webp', 0.4);
    let url = path.join(app.getPath('userData'), 'data/' + timeNow.month + '/' + timeNow.day + '/'+rd.id+'.webp');
    await mkdirp(path.dirname(url));
    await writeFile(url, await tobuff(b));
    return 'file://'+url;
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
