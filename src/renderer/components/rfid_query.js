export const WS_TYPE_RESPONSE = 1
export const WS_TYPE_COMMAND = 2
export const WS_TYPE_LOG = 3
export const WS_COMMAND_READ = 1
export const WS_COMMAND_WRITE = 2
export const WS_COMMAND_CONTINUE = 3
export const WS_OK_RESPONSE = 1;
export const WS_ERROR_RESPONSE = 0;
export const WS_NONE_RESPONSE = 2
export const WS_KEY_A = 1
export const WS_KEY_B = 2
export const WS_WRITE_TYPE_ALL = 1
export const WS_WRITE_TYPE_INC = 2
export const WS_WRITE_TYPE_DEC = 3
let isString = require('lodash/isString');
let isArray = require('lodash/isArray');
export function read_sector(sector, blocks = [], key){
    if(!isArray(blocks)){
        throw Error("Параметр blocks должен быть массивом");
    }
    blocks.forEach((e)=>{
        if(e<1 || e>4){
            throw Error("Блока №"+e+" не существует");
        }
    });
    if(!(key instanceof MifareKey)){
        throw Error("Ключь должен быть экземпляром класса MifareKey");
    }
    return {
        sector,
        blocks: blocks,
        key: key.key,
        key_type: key.key_type
    }
}

export function write_block(block, data){
    let d = [];
    for(let i = 0; i<16; i++){
        d[i] = data[i] || 0;
    }
    return {
        block,
        data: d,
        type: WS_WRITE_TYPE_ALL
    }
}

export function write_sector(sector, blocks = [], key){
    return {
        sector,
        blocks: blocks,
        key: key.key,
        key_type: key.key_type
    }
}

export function make_command(command, command_data = undefined){
    if(isString(command)){
        switch (command.toLowerCase()) {
            case 'w':
                command = WS_COMMAND_WRITE;
                break;
            case 'r':
                command = WS_COMMAND_READ;
                break;
            case 'c':
                command = WS_COMMAND_CONTINUE;
        }
    }
    if(command!=WS_COMMAND_READ && command!=WS_COMMAND_WRITE && command!=WS_COMMAND_CONTINUE){
        throw Error("Неверная команда");
    }
    let command_data_attr = "sectors";
    return {
        command,
        [command_data_attr]: command_data
    }
}

export function make_request(status, command){
    if(status===null){
        status = WS_NONE_RESPONSE;
    }
    if(isString(status)){
        switch (status) {
            case 'ok':
                status = WS_OK_RESPONSE;
                break;
            case 'err':
                status = WS_ERROR_RESPONSE;
                break;
            case 'none':
                status = WS_NONE_RESPONSE;
                break;
        }
    }
    if(status !=WS_OK_RESPONSE && status != WS_ERROR_RESPONSE && status !=WS_NONE_RESPONSE){
        throw Error("Неверный статус ответа");
    }
    let data = {
        type: WS_TYPE_RESPONSE,
        status: status
    }
    if(command){
        data.has_command = true;
        data = {...data, ...command};
    }
    return data;
}


export class MifareKey{
    constructor(key, key_type) {
        this.key = [];
        for(let i = 0; i<6; i++){
            this.key[i] = key[i] || 0;
        }
        if(isString(key_type)){
            key_type = key_type.toLowerCase()=='b'?WS_KEY_B:WS_KEY_A;
        }
        if(key_type!=WS_KEY_A && key_type!=WS_KEY_B){
            throw Error('Не указан тип ключа');
        }
        this.key_type = key_type;
    }
}
// module.exports = {
//     make_request,
//     make_command,
//     write_sector,
//     write_block,
//     read_sector,
//     WS_TYPE_RESPONSE,
//     WS_TYPE_COMMAND,
//     WS_TYPE_LOG,
//     WS_COMMAND_READ,
//     WS_COMMAND_WRITE,
//     WS_COMMAND_CONTINUE,
//     WS_OK_RESPONSE ,
//     WS_ERROR_RESPONSE ,
//     WS_NONE_RESPONSE,
//     WS_KEY_A,
//     WS_KEY_B,
//     WS_WRITE_TYPE_ALL,
//     WS_WRITE_TYPE_INC,
//     WS_WRITE_TYPE_DEC,
//     MifareKey
// }