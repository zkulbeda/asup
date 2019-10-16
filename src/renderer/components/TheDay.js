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
import database from "@/components/db"

let config = getGlobal('config');
let timeNow = DateTime.local();
import {RuntimeError, update} from '@/components/utils';

export default class TheDay {
    /**
     *
     * @param {Number} id
     * @param {Number} day
     * @param {Number} free
     * @param {Number} not_free
     * @param {Function<Trilogy>} db
     */
    constructor({id, day, free = null, not_free = null}, db = database) {
        this.daystamp = day
        this.config = {started: true, ended: false};
        if (free && not_free) this.config.ended = true;
        this.free = free;
        this.not_free = not_free;
        this.id = id;
        this._db = db;
    }

    isEnded() {
        return this.free > 0 && this.not_free > 0
    }

    async save(){
        console.log({free: this.free, not_free: this.not_free});
        return await this._db().getModel('days').update({id: this.id}, {free: this.free, not_free: this.not_free});
    }

    /**
     *
     * @param month
     * @param day
     * @param {Function<Trilogy>} db
     * @returns {Promise<boolean|TheDay>}
     */
    static async loadFromDate(month, day, db = database) {
        let daystamp = getDayStamp(month, day);
        return this.loadFromDayStamp(daystamp, db)
    }

    static async loadFromDayStamp(daystamp, db = database) {
        let d = await db().getModel('days').findOne({day: daystamp});
        if (d === undefined) return false;
        return new this(d, db);
    }

    static async loadFromID(id, db = database) {
        let d = await db().getModel('days').findOne({id: id});
        if (d === undefined) return false;
        return new this(d, db);
    }


    static async startNewDay(month, day, db = database) {
        return this.startNewDayFromDaystamp(getDayStamp(month, day),db)
    }

    static async startNewDayFromDaystamp(daystamp, db = database) {
        let exists = await this.loadFromDayStamp(daystamp, db);
        if (exists !== false) {
            console.warn('День уже начат: ', exists);
            return exists;
        }
        let d = await this._createFromDayStamp(daystamp, db);
        console.log(d)
        return new this(d, db)
    }

    static async _createFromDayStamp(daystamp, db = database) {
        return db().getModel('days').create({day: daystamp});
    }

    static async startDayOrEdit({id = null, day = null, free = null, not_free = null}, db = database) {
        let rec = false;
        if (!day) throw Error('err_argv');
        rec = await this.loadFromDayStamp(day, db);
        if (!rec) rec = new this(await this._createFromDayStamp(day, db), db);
        rec.free = free;
        rec.not_free = not_free;
        await rec.save();
        return rec;
    }

    static async startOrLoadDayFromDate(month, day, db = database){
        let d = await this.loadFromDate(month, day, db);
        if(d){
            return d;
        }else{
            return this.startNewDay(month, day, db)
        }
    }

    async endDay(freePrice, notFreePrice) {
        if (this.config.ended) throw Error('Сессия уже закрыта');
        if (await this._db().getModel('records').count({day_id: this.id}) > 0) {
            await this._db().getModel('days').update({id: this.id}, {free: freePrice, not_free: notFreePrice});
            this.config.ended = true;
        } else {
            await this._db().getModel('days').remove({id: this.id});
            this.config.started = false;
        }
        return true;
    }

    mustEnded() {
        if (!this.config.ended) throw Error('Сессия не закрыта');
    }

    async editPrice(freePrice, notFreePrice) {
        let res = await this._db().getModel('days').update({id: this.id}, {free: freePrice, not_free: notFreePrice});
        [this.free, this.not_free] = [freePrice, notFreePrice];
        this.config.ended = this.isEnded();
    }

    getPrice() {
        return {free: this.free, notFree: this.not_free};
    }

    async recordStudent(student) {
        let f = await this._db().getModel("records").findOne({day_id: this.id, student_id: student.studentID});
        if (f !== undefined) throw new RuntimeError(4, {student, record: f});
        return this._db().getModel("records").create({
            day_id: this.id,
            student_id: student.studentID,
            time: getSecondsStamp(DateTime.local())
        });
    }

    async getList({withWhoPays = true, withWhoNotPays = true, count = false, group = undefined}) {
        if (!withWhoPays && !withWhoNotPays) {
            console.warn('Запрос на получение никого');
            return [];
        }
        let q = this._db().knex('records').where('day_id', this.id);
        if (count) q = q.count('records.id')
        else q = q.select("*")
        if (!(withWhoPays && withWhoNotPays) || group) {
            let sub_q = this._db().knex('students').select('id');
            if (!(withWhoPays && withWhoNotPays)) {
                sub_q = sub_q.where('pays', '=', withWhoPays);
            }
            if (group) {
                sub_q = sub_q.where('group', '=', group);
            }
            q = q.where('student_id', 'in', sub_q);
        }
        q.leftJoin('students', 'records.student_id', '=', 'students.id');
        console.log(q.toSQL());
        let res = await this._db().raw(q, true);
        console.log(res);
        if(count == true){
            return res[0]['count(`records`.`id`)']
        }
        return res;
    }

    async removeDay() {
        await this._db().getModel('records').remove({day_id: this.id});
        await this._db().getModel('days').remove({id: this.id});
        this.id = null;
    }

    async getRecords() {
        return (await this.getList({})).sort((a, b) => b.time - a.time);
    }
}