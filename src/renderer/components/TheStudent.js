import trim from 'condense-whitespace';
import genID from "nanoid/generate";
import {update} from '@/components/utils';
import nedb from "nedb-promise";
import path from "path";
import {getGlobal} from "@/components/utils";
import db from '@/components/db';

export class ValidationError extends Error{
  constructor(message, param, data){
    super(message+':'+JSON.stringify(data));
    this.data = data;
    this.param = param;
  }
}
export default class TheStudent{
  constructor({studentID = null, code, name, group, pays, id = null}){
    this.studentID = studentID || id;
    this.code = code;
    this.name = trim(name);
    this.group = group;
    this.pays = Boolean(pays).valueOf();
  }
  static isValidFromObject({group}){
    if(!(/^(1[0-1]|[5-9])([А-Я])?$/).test(group)){
      return new ValidationError('Формат класса: число от 5 до 11 и буква без пробела','group', group);
    }
    return true;
  }
  isValid(){
    return this.constructor.isValidFromObject(this.toJSON());
  }
  static async generateID(dbb, param = 'id', size = 10){
    let id = null;
    do{
      id = genID('0123456789',size);
    }while((await db().getModel('students').findOne({[param]: id}))!==undefined);
    return id;
  }
  toJSON(){
    return {studentID: this.studentID, code: this.code, name: this.name, group: this.group, pays: this.pays}
  }
  toJSONSQL(){
    return {id: this.studentID, code: this.code, name: this.name, group: this.group, pays: this.pays};
  }
  mustDB(){
  }
  mustDBInstance(){
  }
  async save(){
    this.mustDBInstance();
    await db().getModel('students').update({id: this.studentID},this.toJSONSQL());
  }
  static async new(dbb, {studentID = null, code = null, name, group, pays}){
    //if(!studentID) studentID = await this.generateID(db, 'id');
    if(!code) code = await this.generateID(db, 'code');
    let validationResult = this.isValidFromObject({name,group});
    if(validationResult!==true) throw validationResult;
    let inst = await db().getModel('students').create({code, name, group, pays});
    console.log(inst)
    return new this(inst);
  }
  static async newOrEdit(dbb, st){
    let inst = null;
    if(st.studentID) inst = await this.loadFromID(db,st.studentID, false);
    if(!inst) return await this.new(db,st);
    else {
      inst.name = st.name?st.name:inst.name;
      inst.group = st.group?st.group:inst.group;
      inst.pays = st.pays!==undefined?st.pays:inst.pays;
      await inst.save();
      return false;
    }
    return true;
  }
  static async loadFromID(dbb,studentID, throws = true){
    let rec = await db().getModel("students").findOne({id: studentID}, {limit: 1});
    if(rec){
      return new this(rec);
    }else{
      if(throws) throw new Error('Ученик не найден');
      else return false;
    }
  }
  static async loadFromCode(dbb,code, throws = true){
    console.log('start')
    console.log(db,code);
    let rec = await db().getModel("students").findOne({code: code},{limit: 1});
    console.log(rec)
    if(rec){
      return new this(rec);
    }else{
      if(throws) throw new Error('Ученик не найден');
      else return false;
    }
  }
  static async loadAll(dbb, request = {}){
      console.log(db())
    let recs = await db().getModel("students").find(request);
    let r = [];
    for(let i in recs){
      r.push(new this(recs[i]));
    }
    return r;
  }
  static async getDB(filename){
    return null;
      // let db = nedb({
      //   filename: path.join(getGlobal('userPath'), 'students.json'),
      //   timestampData: true
      // });
      // db.ensureIndex({ fieldName: "studentID", unique: true });
      // db.ensureIndex({ fieldName: "code", unique: true });
      // return db;
  }
  async remove(){
    return await db().getModel("students").remove({id: this.studentID});
  }
  static async removeMany(dbb,els){
    return await db().raw(db().knex('students').where('id', els).delete(),true);
  }
  explodeGroup(){
    let rex = /^(1[0-1]|[5-9])([А-Я])?$/;
    let r = rex.exec(this.group);
    return {number: r[1], letter: r[2]};
  }
  async reidentification(){
    this.code = await this.constructor.generateID(db, 'code');
    await this.save();
    return this.code;
  }

}