import trim from 'condense-whitespace';
import genID from "nanoid/generate";
import {update} from '@/components/utils';
import nedb from "nedb-promise";
import path from "path";
import {getGlobal} from "@/components/utils";

export class ValidationError extends Error{
  constructor(message, param, data){
    super(message+':'+JSON.stringify(data));
    this.data = data;
    this.param = param;
  }
}
export default class TheStudent{
  constructor({studentID, code, name, group, pays, _id = null}, db = null){
    this.studentID = studentID;
    this.code = code;
    this.name = trim(name);
    this.group = group;
    this.pays = Boolean(pays).valueOf();
    this._id = _id;
    this.db = db;
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
  static async generateID(db, param = 'id', size = 10){
    let id = null;
    do{
      id = genID('0123456789',size);
    }while((await db.findOne({[param]:id}))!==null);
    return id;
  }
  toJSON(){
    return {studentID: this.studentID, code: this.code, name: this.name, group: this.group, pays: this.pays}
  }
  mustDB(){
    if(!this.db) throw new Error('База не передана');
  }
  mustDBInstance(){
    this.mustDB();
    if(!this._id) throw new Error('База не передана');
  }
  async save(){
    this.mustDBInstance();
    await update(this.db, {_id: this._id}, this.toJSON());
  }
  static async new(db, {studentID = null, code = null, name, group, pays}){
    if(!studentID) studentID = await this.generateID(db, 'studentID');
    if(!code) code = await this.generateID(db, 'code');
    let validationResult = this.isValidFromObject({name,group});
    if(validationResult!==true) throw validationResult;
    let inst = await db.insert({studentID, code, name, group, pays});
    return new this(inst,db);
  }
  static async newOrEdit(db, st){
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
  static async loadFromID(db,studentID, throws = true){
    let rec = await db.findOne({studentID});
    if(rec){
      return new this(rec,db);
    }else{
      if(throws) throw new Error('Ученик не найден');
      else return false;
    }
  }
  static async loadFromCode(db,code, throws = true){
    console.log('start')
    console.log(db,code);
    let rec = await db.findOne({code});
    console.log('after')
    if(rec){
      return new this(rec,db);
    }else{
      if(throws) throw new Error('Ученик не найден');
      else return false;
    }
  }
  static async loadAll(db, request = {}){
    let recs = await db.find(request);
    let r = [];
    for(let i in recs){
      r.push(new this(recs[i],db));
    }
    return r;
  }
  static async getDB(filename){
    let db = nedb({
        filename: path.join(getGlobal('userPath'), 'students.json'),
        timestampData: true
      });
    db.ensureIndex({ fieldName: "studentID", unique: true });
    db.ensureIndex({ fieldName: "code", unique: true });
    return db;
  }
  async remove(){
    return await this.db.remove({_id: this._id});
  }
  static async removeMany(db,els){
    return await db.remove({id:{$in: els}},{multi: true});
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