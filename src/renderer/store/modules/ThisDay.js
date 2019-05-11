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
let {app} = require('electron').remote;
let db = null;
let timeNow = DateTime.local();
db = nedb({
  filename: path.join(app.getPath('userData'), 'data/' + timeNow.month + '/' + timeNow.day + '.json'),
  timestampData: true
});
console.log(db);

async function update(db, need, replaced) {
  let i = await db.findOne(need);
  if (i === null) throw Error('NOT FOUND: ' + JSON.stringify(need));
  return await db.update(i, {$set: replaced});
}

const state = {
  initialized: false,
  started: false,
  ended: false,
  listOfRecords: []
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
  },
  pushRecord(state, rd) {
    state.listOfRecords.unshift(rd);
  },
  setList(state, rds){
    state.listOfRecords = rds;
  }
}

const actions = {
  async init({dispatch, commit}) {
    commit('init');
    db.loadDatabase();
    let conf = await db.findOne({type: 'config'});
    if (conf === null) await db.insert({type: 'config', started: false, ended: false});
    else commit('setStartState', [conf.started, conf.ended]);
    commit('setList', (await db.find({type: 'record'})).sort((a,b)=>b.createdAt-a.createdAt));
    return db;
  },
  async startSession({commit, state}) {
    if (state.started) throw Error('Сессия уже открыта');

    await update(db, {type: 'config'}, {started: true});
    commit('setStartState', [true, false]);
    return true;
  },
  async closeSession({commit, state}, pl) {
    console.log(pl);
    if (!state.started) throw Error('Сессия еще не открыта');
    await update(db, {type: 'config'}, {started: true, ended: true});
    await db.insert({type: 'price', ...pl});
    commit('setStartState', [true, true]);
    return false;
  },
  async addStudent({commit, state, dispatch}, st) {
    let {id} = st;
    if (!state.started) throw Error('Сессия не открыта');
    let f = await db.findOne({type: 'record', id});
    if (f !== null) throw {'message': 'Ученик уже записан', data: {student: st, record: f}};
    let url = await dispatch('createImageUrl', {rd: st, imagedata: st.img});
    let rd = await db.insert({type: 'record', id, img: url});
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
