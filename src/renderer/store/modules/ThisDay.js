import path from "path";
import {DateTime} from "luxon"
import mkdir from 'mkdirp';
import bll from 'blob-to-buffer';
import TheDay from "@/components/TheDay";
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
// let {app} = require('electron').remote;
import {getGlobal} from "@/components/utils";

let Day = null;
let timeNow = DateTime.local();
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
}

const actions = {
  async init({dispatch, commit}) {
    commit('setLoadingState', true);
    let m = DateTime.local().month, d = DateTime.local().day;
    Day = new TheDay(m,d);
    await Day.load();
    commit('setStartState', [Day.config.started, Day.config.ended, m,d]);
    commit('setList', await Day.getRecords());
    commit('setLoadingState', false);
    commit('init');
  },
  async startSession({commit, state}) {
    await Day.startDay();
    commit('setStartState', [true, false]);
    return true;
  },
  async closeSession({commit, state, dispatch}, pl) {
    console.log(pl);
    await Day.endDay(pl.free, pl.notFree);
    return false;
  },
  async addStudent({commit, state, dispatch}, {st}) {
    let rd = await Day.recordStudent(st);
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
    let url = path.join(getGlobal('userPath'), 'data/' + timeNow.month + '/' + timeNow.day + '/'+rd.id+'.webp');
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
