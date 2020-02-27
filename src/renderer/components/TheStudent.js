import trim from 'condense-whitespace';
import genID from "nanoid/generate";
import {RuntimeError, update} from '@/components/utils';
import nedb from "nedb-promise";
import path from "path";
import {getGlobal} from "@/components/utils";
import database from '@/components/db';
import crc32 from "crc/crc32";
import {hri} from "human-readable-ids";

export class ValidationError extends Error {
    constructor(message, param, data) {
        super(message + ':' + JSON.stringify(data));
        this.data = data;
        this.param = param;
    }
}

export default class TheStudent {
    /**
     *
     * @param {Number} studentID
     * @param {String} code
     * @param {String} name
     * @param {String} group
     * @param {Boolean} pays
     * @param {Number} hash
     * @param {Number} card_data
     * @param {Number} id
     * @param {Function<Trilogy>} db
     */
    constructor({studentID = null, code, name, group, pays, hash = null, card_data = null, id = null, invitaion_code = null}, db = database) {
        this.studentID = studentID || id;
        this.code = code;
        this.name = trim(name);
        this.group = group;
        this.hash = hash;
        this.card_data = card_data;
        this.invitaion_code = invitaion_code;
        this.pays = Boolean(pays).valueOf();
        this._db = database;
    }

    static classRegex() {
        return /^(1[0-1]|[5-9])([А-Я])?$/;
    }

    static isValidFromObject({name, group}) {
        if (!(this.classRegex()).test(group)) {
            return new ValidationError('Формат класса: число от 5 до 11 и буква без пробела', 'group', group);
        }
        // if (crc32(name)!=hash) {
        //     return new ValidationError('Хеш не совпадает', 'hash', group);
        // }
        return true;
    }

    isValid() {
        return this.constructor.isValidFromObject(this.toJSON());
    }

    static async generateID(param = 'id', db = database, size = 10) {
        let id = null;
        do {
            console.log('generationID')
            id = genID('0123456789', size);
            console.log(id)
        } while ((await db().getModel('students').findOne({[param]: id})) !== undefined);
        return id;
    }

    toJSON() {
        return {studentID: this.studentID, code: this.code, name: this.name, group: this.group, pays: this.pays, hash: this.hash, card_data: this.card_data,
            invitaion_code: this.invitaion_code}
    }

    toJSONSQL() {
        return {id: this.studentID, code: this.code, name: this.name, group: this.group, pays: this.pays, hash: this.hash, card_data: this.card_data,
            invitaion_code: this.invitaion_code};
    }

    async save() {
        await this._db().getModel('students').update({id: this.studentID}, this.toJSONSQL());
    }

    static async new({studentID = null, code = null, name, group, pays, card_data = 0}, db = database) {
        //if(!studentID) studentID = await this.generateID(db, 'id');
        if (!code) code = await this.generateID('code', db);
        let validationResult = this.isValidFromObject({name, group});
        if (validationResult !== true) throw validationResult;
        let hash = crc32(name);
        let invitation_code = hri.random();
        let inst = await db().getModel('students').create({id: studentID, code, name, group, pays, hash, card_data, invitation_code});
        console.log(inst)
        return new this(inst, db);
    }

    static async newOrEdit(st, db = database) {
        let inst = null;
        if (st.studentID) inst = await this.loadFromID(st.studentID, false, db);
        if (st.code) inst = await this.loadFromCode(st.code, false, db);
        if (!inst) return await this.new(st, db);
        else {
            inst.name = st.name ? st.name : inst.name;
            inst.group = st.group ? st.group : inst.group;
            inst.card_data = st.card_data ? st.card_data : inst.card_data;
            inst.pays = st.pays !== undefined ? st.pays : inst.pays;
            await inst.save();
            return inst;
        }
        return true;
    }

    static async loadFromID(studentID, throws = true, db = database) {
        let rec = await db().getModel("students").findOne({id: studentID}, {limit: 1});
        if (rec) {
            return new this(rec);
        } else {
            if (throws) throw new Error('Ученик не найден');
            else return false;
        }
    }

    static async loadFromCode(code, throws = true, db = database) {
        let rec = await db().getModel("students").findOne({code: code}, {limit: 1});
        console.log(rec)
        if (rec) {
            return new this(rec, db);
        } else {
            if (throws) throw new RuntimeError(1, {code});
            else return false;
        }
    }

    static async loadFromCard(card_data, card_id, throws = true, db = database) {
        console.log(crc32(""+card_id+card_data));
        let rec = await db().getModel("students").findOne({card_data: crc32(""+card_id+card_data)}, {limit: 1});
        console.log(rec)
        if (rec) {
            return new this(rec, db);
        } else {
            if (throws) throw new RuntimeError(1, {card_data});
            else return false;
        }
    }

    static async loadFromHash(hash, throws = true, db = database) {
        let rec = await db().getModel("students").findOne({hash: hash}, {limit: 1});
        console.log(rec);
        if (rec) {
            return new this(rec, db);
        } else {
            if (throws) throw new RuntimeError(1, {code});
            else return false;
        }
    }

    static async loadAll(request = {}, db = database) {
        let recs = await db().getModel("students").find(request);
        let r = [];
        for (let i in recs) {
            r.push(new this(recs[i], db));
        }
        return r;
    }

    static async loadWithLimit({name, group, ids}, {currentPage, perPage, sortBy, sortDesc}, db = database) {
        let knex = db().knex('students')
            .orderBy(sortBy ? sortBy : 'name', sortDesc ? 'desc' : 'asc');
        if(perPage !==undefined)
            knex.limit(perPage).offset((currentPage - 1) * perPage)
        let knexCount = db().knex('students').count('id')
        if (name) {
            for (let word of name.split(' ')) {
                knex = knex.orWhere('name', 'like', "%" + word + "%")
                knexCount.orWhere('name', 'like', "%" + word + "%")
            }
        }
        if (group) {
            knex = knex.where('group', group);
            knexCount.where('group', group);
        }
        if(ids){
            knex = knex.whereIn('id', ids);
            knexCount.whereIn('id', ids);
        }
        let [recs,c] = await Promise.all([db().raw(knex,true), db().raw(knexCount,true)]);
        let r = [];
        for (let i in recs) {
            r.push(new this(recs[i], db));
        }
        console.log(c)
        return [r, c[0]['count(`id`)']];
    }

    static async getDB(filename) {
        console.warn('Старый вызов getDB');
        return null;
    }

    async remove() {
        return await this._db().getModel("students").remove({id: this.studentID});
    }

    static async removeMany(els, db = database) {
        for (let el of els) {
            await db().getModel('students').remove({id: el})
        }
        //   console.log(els, db().knex('students').whereIn('id', els).delete().toSQL());
        //   db().onQuery(query => console.log(query))
        // return await db().raw(db().knex('students').whereIn('id', els).delete());
    }

    explodeGroup() {
        let rex = /^(1[0-1]|[5-9])([А-Я])?$/;
        let r = rex.exec(this.group);
        return {number: r[1], letter: r[2]};
    }

    async reidentification() {
        console.log('ok')
        this.code = await this.constructor.generateID('code', this._db);
        console.log(this.code)
        let res = await this.save();
        console.log(res)
        return this.code;
    }

    async linkCard(card_id) {
        let salt = await this.constructor.generateID('code', this._db);
        let data = crc32(salt+this.hash);
        console.log(this.hash);
        console.log("db data", data);
        let card_data = crc32(""+card_id+data);
        this.card_data = card_data;
        let res = await this.save();
        return data;
    }

}