import {DateTime} from "luxon";


export function getSecondsStamp(luxon_datetime){
  return Math.round(luxon_datetime.toSeconds());
}
/**
 *
 * @param {number} month
 * @param {number} day
 * @returns {number} daystamp
 */
export function getDayStamp(month, day){
  return Math.round(DateTime.local().set({month, day}).startOf('day').toSeconds()/(60*60*24));
}

/***
 * @decelerated
 * @param db
 * @param need
 * @param replaced
 * @param many
 * @returns {Promise<*>}
 */
export async function update(db, need, replaced, many = false) {
  let i = await db.findOne(need);
  if (i === null) throw Error('NOT FOUND: ' + JSON.stringify(need));
  return await db.update(i, {$set: replaced}, {multi: many});
}
export function getGlobal(e){
  if(!(process && process.type === 'renderer')){
    return global[e];
  }else{
    return require('electron').remote.getGlobal(e);
  }
}
let messages = {
  1: 'Ученик не найден',
  2: 'Код не найден',
  3: 'День не найден',
  4: 'Ученик уже записан',
};
export {messages};

export class RuntimeError extends Error{
  /**
   * 1 - Ученик не нейден
   * 2 - Код не найден
   * 3 - День не найден
   * 4 - Ученик уже записан
   * @param {number} code цифра выше
   */
  constructor(code, data = null){
    super(messages[code]);
    this.code = code;
    this.data = data;
  }
  toString(){
    return this.message+'('+this.code+'):'+JSON.stringify(this.data);
  }
}