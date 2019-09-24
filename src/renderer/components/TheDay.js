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
import {getDayStamp, getGlobal, getSecondsStamp} from "@/components/utils";
import db from "@/components/db"

let config = getGlobal('config');
let timeNow = DateTime.local();
import {RuntimeError, update} from '@/components/utils';

export default class TheDay{
  constructor({id, day, free = null, not_free = null}){
    this.daystamp = day
    this.config = {started: true, ended: false};
    if(free && not_free) this.config.ended = true;
    this.free = free;
    this.not_free = not_free;
    this.id = id;
  }
  isEnded(){
    return this.free>0 && this.not_free>0
  }

  /**
   *
   * @param month
   * @param day
   * @returns {Promise<boolean|TheDay>}
   */
  static async loadFromDate(month, day){
    let daystamp = getDayStamp(month, day);
    return this.loadFromDayStamp(daystamp)
  }

  static async loadFromDayStamp(daystamp){
    let d = await db().getModel('days').findOne({day: daystamp});
    if(d === undefined) return false;
    return new this(d);
  }

  static async loadFromID(id){
    let d = await db().getModel('days').findOne({id: id});
    if(d === undefined) return false;
    return new this(d);
  }


  static async startNewDay(month, day){
    let exists = await this.loadFromDate(month,day);
    if(exists!==false){
      console.warn('День уже начат: ', exists);
      return exists;
    }
    let d = this._createFromDayStamp(getDayStamp(month, day))
    return new this(d)
  }

  static async _createFromDayStamp(daystamp){
    return db().getModel('days').create({day: daystamp});
  }

  static async startDayOrEdit({id = null, day = null, free = null, not_free = null}){
    let rec = false;
    if(!day) throw Error('err_argv');
    if(id){
      rec = await this.loadFromID(id);
    }else rec = await this.loadFromDayStamp(day);
    if(!rec) rec = this._createFromDayStamp(day);
    rec.free = free;
    rec.not_free = not_free;
    rec.save();
  }
  async endDay(freePrice,notFreePrice){
    if (this.config.ended) throw Error('Сессия уже закрыта');
    if(await db().getModel('records').count({day_id: this.id})>0) {
      await db().getModel('days').update({id: this.id},{free: freePrice, not_free: notFreePrice});
      this.config.ended = true;
    }else{
      await db().getModel('days').remove({id: this.id});
      this.config.started = false;
    }
    return true;
  }
  mustEnded(){
    if (!this.config.ended) throw Error('Сессия не закрыта');
  }
  async editPrice(freePrice,notFreePrice){
    let res = await db().getModel('days').update({id: this_id}, {free: freePrice, not_free: notFreePrice});
    [this.free, this.not_free] = [freePrice, notFreePrice];
    this.config.ended = this.isEnded();
  }
  getPrice(){
    return {free: this.free, notFree: this.not_free};
  }
  async recordStudent(student){
    let f = await db().getModel("records").findOne({day_id: this.id, student_id: student.studentID});
    if (f !== undefined) throw new RuntimeError(4,{student, record: f});
    return db().getModel("records").create({day_id: this.id, student_id: student.studentID, time: getSecondsStamp(DateTime.local())});
  }
  async getList({withWhoPays = true, withWhoNotPays = true, count = false, group = undefined}){
    if(!withWhoPays && !withWhoNotPays) {console.warn('Запрос на получение никого');return [];}
    let q = db().knex('records').where('day_id', this.id);
    if(count) q = q.count('id')
    else q = q.select("*")
    if(!(withWhoPays && withWhoNotPays) || group){
      let sub_q = db().knex('students').select('id');
      if(!(withWhoPays && withWhoNotPays)){
        sub_q = sub_q.where('pays','=', withWhoPays);
      }
      if(group){
        sub_q = sub_q.where('group','=', group);
      }
      q = q.where('student_id', 'in', sub_q);
    }
    console.log(q.toSQL());
    return db().raw(q,true);
  }
  async removeDay(){
    await db().getModel('records').remove({day_id: this.id});
    await db().getModel('days').remove({id: this.id});
    this.id = null;
  }
  async getRecords(){
    return (await this.getList({})).sort((a,b)=>b.time-a.time);
  }
}