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
    this.data = null;
  }
  toString(){
    return this.message+'('+this.code+'):'+JSON.stringify(this.data);
  }
}