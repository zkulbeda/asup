import nedb from 'nedb-promise';
import path from "path";
import {DateTime} from "luxon"
import mkdir from 'mkdirp';
let fs = require('fs');
let util = require('util');
const writeFile = util.promisify(fs.writeFile);
const mkdirp = util.promisify(mkdir);
const unlink = util.promisify(fs.unlink);
// let {app, getGlobal} = require('electron').remote;
import {getGlobal} from "@/components/utils";

let db = null;
let config = getGlobal('config');
let timeNow = DateTime.local();
import {RuntimeError, update} from '@/components/utils';
export default class TheDay{
  constructor(month,day){
    this.month = month; this.day = day;
    this.filename = path.join(getGlobal('userPath'), 'data/' + month + '/' + day + '.json');
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
  mustOpened(){
    if (!this.config.started) throw Error('Сессия еще не открыта');
  }
  async endDay(freePrice,notFreePrice){
    if (this.config.ended) throw Error('Сессия уже закрыта');
    if(await this.db.count({type: 'record'})>0) {
      await update(this.db, {type: 'config'}, {started: true, ended: true});
      await this.db.insert({type: 'price', free: freePrice, notFree: notFreePrice});
      this.config.ended = true;
    }else{
      await update(this.db, {type: 'config'}, {started: false, ended: false});
      this.config.started = false;
    }
    return true;
  }
  mustEnded(){
    if (!this.config.ended) throw Error('Сессия не закрыта');
  }
  async editPrice(freePrice,notFreePrice){
    this.mustOpened();
    return update(this.db, {type: 'price'}, {free: freePrice, notFree: notFreePrice});
  }
  async getPrice(){
    return await this.db.findOne({type:'price'});
  }
  async recordStudent(student){
    this.mustOpened();
    let f = await this.db.findOne({type: 'record', studentID: student.studentID});
    if (f !== null) throw new RuntimeError(4,{student, record: f});
    return await this.db.insert({type: 'record', studentID: student.studentID, pays: student.pays});
  }
  async getList({withWhoPays = true, withWhoNotPays = true, count = false, group}){
    try{this.mustOpened();}catch (e) {return [];}
    if(!withWhoPays && !withWhoNotPays) {console.warn('Запрос на получение никого');return [];}
    return await this.db[count?'count':'find']({ type: 'record',pays: withWhoPays && withWhoNotPays?undefined:withWhoPays})
  }
  async removeDay(){
    this.db = null;
    await unlink(this.filename);
  }
  async getRecords(){
    return (await this.getList({})).sort((a,b)=>b.createdAt-a.createdAt);
  }
}