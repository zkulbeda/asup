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
import db from "@/components/db"

let config = getGlobal('config');
let timeNow = DateTime.local();
import {RuntimeError, update} from '@/components/utils';
export default class TheDay{
  constructor(month,day){
    this._id = null;
    this.month = month; this.day = day;
    this.daystamp = DateTime.local().set({month, day}).startOf('day').toSeconds()/(60*60*24);
  }
  async load(){
    let day = db().getModel('days').findOne({day: this.daystamp});
    this.loadFromDBInstance(day);
  }

  async loadFromDBInstance(day){
    this.config = {started: false, ended: false};
    if(day){
      this.config.started = true;
      if(day.free && day.not_free) this.config.ended = true;
      this.free = day.free;
      this.not_free = day.not_free;
    }
  }
  async startDay(){
    if (this.config.started) throw Error('Сессия уже открыта');
    let day = await db().getModel('days').create({day: this.daystamp});
    this.loadFromDBInstance(day)
  }
  mustOpened(){
    if (!this.config.started) throw Error('Сессия еще не открыта');
  }
  async endDay(freePrice,notFreePrice){
    if (this.config.ended) throw Error('Сессия уже закрыта');
    if(await db().getModel('records').count({day_id: this._id})>0) {
      await db.getModel('days').update({id: this._id},{free: freePrice, not_free: notFreePrice});
      this.config.ended = true;
    }else{
      await db().getModel('days').remove({id: this._id});
      this.config.started = false;
    }
    return true;
  }
  mustEnded(){
    if (!this.config.ended) throw Error('Сессия не закрыта');
  }
  async editPrice(freePrice,notFreePrice){
    this.mustOpened();
    let res = await db().getModel('days').update({id: this_id}, {free: freePrice, not_free: notFreePrice});
    this.loadFromDBInstance(res);
  }
  async getPrice(){
    return {free: this.free, notFree: this.not_free};
  }
  async recordStudent(student){
    this.mustOpened();
    let f = db().getModel("records").findOne({day_id: this._id, student_id: student.studentID});
    if (f !== null) throw new RuntimeError(4,{student, record: f});
    return db().getModel("records").create({day_id: this._id, student_id: student.studentID, time: DateTime.local().toSeconds()});
  }
  async getList({withWhoPays = true, withWhoNotPays = true, count = false, group = undefined}){
    try{this.mustOpened();}catch (e) {return [];}
    if(!withWhoPays && !withWhoNotPays) {console.warn('Запрос на получение никого');return [];}
    let query = {type: 'record'};
    let q = db().knex('records').select("*");
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
    return db().raw(q,true);
  }
  async removeDay(){
    await db().getModel('records').remove({day_id: this._id});
    await db().getModel('days').remove({id: this._id});
  }
  async getRecords(){
    return (await this.getList({})).sort((a,b)=>b.time-a.time);
  }
}