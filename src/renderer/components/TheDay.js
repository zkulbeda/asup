import nedb from 'nedb-promise';
import path from "path";
import {DateTime} from "luxon"
import mkdir from 'mkdirp';
let fs = require('fs');
let util = require('util');
const writeFile = util.promisify(fs.writeFile);
const mkdirp = util.promisify(mkdir);
const unlink = util.promisify(fs.unlink);
let {app, getGlobal} = require('electron').remote;
let db = null;
let config = getGlobal('config');
let timeNow = DateTime.local();

async function update(db, need, replaced, many = false) {
  let i = await db.findOne(need);
  if (i === null) throw Error('NOT FOUND: ' + JSON.stringify(need));
  return await db.update(i, {$set: replaced}, {multi: many});
}
export default class TheDay{
  constructor(month,day){
    this.month = month; this.day = day;
    this.filename = path.join(app.getPath('userData'), 'data/' + month + '/' + day + '.json');
    console.log(this.filename)
    this.db = nedb({
      filename: this.filename,
      timestampData: true,
    });
  }
  async load(){
    await this.db.loadDatabase();
    let conf = await this.db.findOne({type: 'config'});
    if (conf === null) {conf = await this.db.insert({type: 'config', started: false, ended: false});}
    this.config = {started: conf.started, ended: conf.ended};
  }
  async startDay(){
    if (this.config.started) throw Error('Сессия уже открыта');
    await update(this.db, {type: 'config'}, {started: true});
    this.config.started = true;
  }
  async endDay(freePrice,notFreePrice){
    if (!this.config.started) throw Error('Сессия еще не открыта');
    if (this.config.ended) throw Error('Сессия уже закрыта');
    if(await this.db.count({type: 'record'})>0) {
      await update(this.db, {type: 'config'}, {started: true, ended: true});
      await this.db.insert({type: 'price', free: freePrice, notFree: notFreePrice});
      this.config.ended = true;
    }else{
      await update(this.db, {type: 'config'}, {started: false, ended: false});
      this.config.started = false;
    }
  }
  async editPrice(freePrice,notFreePrice){
    if (!this.config.started) throw Error('Сессия еще не открыта');
    if (!this.config.ended) throw Error('Сессия не закрыта');
    return update(this.db, {type: 'price'}, {free: freePrice, notFree: notFreePrice});
  }
  async recordStudent(studentID){
    if (!this.config.started) throw Error('Сессия не открыта');
    let f = await this.db.findOne({type: 'record', id: studentID});
    if (f !== null) throw {'message': 'Ученик уже записан', data: {studentID, record: f}};
    return await this.db.insert({type: 'record', studentID});
  }
  async removeDay(){
    this.db = null;
    await unlink(this.filename);
  }
}