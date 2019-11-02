const WS_TYPE_RESPONSE = 1
const WS_TYPE_COMMAND = 2
const WS_TYPE_LOG = 3
const WS_COMMAND_READ = 1
const WS_COMMAND_WRITE = 2
const WS_COMMAND_CONTINUE = 3
const WS_OK_RESPONSE = 1;
const WS_ERROR_RESPONSE = 0;
const WS_NONE_RESPONSE = 2
const WS_KEY_A = 1
const WS_KEY_B = 2
const WS_WRITE_TYPE_ALL = 1
const WS_WRITE_TYPE_INC = 2
const WS_WRITE_TYPE_DEC = 3
const WebSocket = require('ws');
let isString = require('lodash/isString');
let isArray = require('lodash/isArray');
console.log('loading');
let key = [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF];
longToByteArray = function(/*long*/long) {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if(long < 0){
        byteArray[0] = 1;
        long = -long;
    }
    for ( var index = 1; index < byteArray.length; index ++ ) {
        var byte = long & 0xff;
        byteArray [ index ] = byte;
        long = (long - byte) / 256 ;
    }

    return byteArray;
};

byteArrayToLong = function(/*byte[]*/byteArray) {
    var value = 0;
    for ( var i = byteArray.length - 1; i >= 1; i--) {
        value = (value * 256) + byteArray[i];
    }

    return byteArray[0]?-value:value;
};
console.log(longToByteArray(2134321452353245));
console.log(longToByteArray(-2134321452353245));
console.log(longToByteArray(1756081449));
console.log(longToByteArray(-632524173));
console.log(byteArrayToLong(longToByteArray(-452353245)));
function int_to_byte_array(number){

}
class MifareKey{
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
// function setupWebSocket(){
//     this.wsc = new WebSocket('ws://192.168.4.1:8080/');
//
//     this.wsc.on('open', function open() {
//         wsc.send('connected');
//         console.log('connected')
//     });
//
//     this.wsc.on('message', function incoming(data) {
//         console.log(data);
//     });
//     this.wsc.on("close",function(){
//         setTimeout(setupWebSocket, 1000);
//         console.log(arguments);
//     });
// }

// let evilscan = require('evilscan');
// new evilscan({
//     target: '192.168.100.0/24',
//     port: 57300,
//     status:'O',
// }, function(err, scan){
//     if(err){
//         throw err;
//     }
//     let data = [];
//     scan.on('result', (d)=>{
//         console.log('data', d);
//         data.push(d);
//     })
//     scan.on('done', ()=>{
//         console.log('done');
//         init(data);
//     })
//     scan.run();
// });
let port = 57300;
let wss = new WebSocket.Server({
    port: 57301
});
let connected = {};
wss.on('connection', async (ws, req)=>{
    data = connected[req.connection.remoteAddress] = {
        ws,
        isAlive: true
    };
    console.log(connected);
    console.log('connected');
    ws.on('message', (m)=>{
        console.log(m);
        let data = JSON.parse(m);
        // if(data.type == WS_TYPE_RESPONSE){
        //     ws.send(JSON.stringify(resrep));
        // }
    })
    ws.on('close', (reason)=>{
        console.log('closed', reason);
        connected[req.connection.remoteAddress] = undefined;
        delete connected[req.connection.remoteAddress];
    })
    ws.on('pong', ()=>{
        data.isAlive = true;
    })
});

let ws_promise_response = (ws)=>{
    var promise = new Promise((x)=>{
        ws.on("message", function(m){
            let data = JSON.parse(m);
            if(data.type==WS_TYPE_RESPONSE)
                x(data);
        });
    });
    // Return the Promise
    return promise;
}


const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
let sendAll = (text)=>{
    for(let i in connected)
        connected[i].ws.send(text);
}
let awaitAll = (text)=>{
    let a = [];
    for(let i in connected) {
        a.push(send(connected[i].ws, text));
    }
    return Promise.all(a);
}
let card_key =new MifareKey([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], 'A')
let card_key_b =new MifareKey([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], 'B')
rl.on('line', async (input) => {
    switch (input) {
        case "scan":
            sendAll(JSON.stringify(spec_command));
            break;
        case "error":
            sendAll(JSON.stringify(reserror));
            break;
        case "ok":
            sendAll(JSON.stringify(resok));
            break;
        case "write":
            let read_command = make_command('r', [read_sector(2,[1], card_key)]);
            let c = await awaitAll(make_request('none', read_command));
            while(true) {
                c = c[0];
                // console.log(c);
                console.log(c[2][1][0]);
                c[2][1][0]++;
                let ans = await awaitAll(make_request("none", make_command('w', [write_sector(2,[write_block(1,c[2][1])], card_key_b)])));
                ans = ans[0];
                console.log(ans);
                c = await awaitAll(make_request('ok', read_command));
            }
    }
});

//import isString from 'loadsh/isString';

function read_sector(sector, blocks = [], key){
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

function write_block(block, data){
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

function write_sector(sector, blocks = [], key){
    return {
        sector,
        blocks: blocks,
        key: key.key,
        key_type: key.key_type
    }
}

function make_command(command, command_data = undefined){
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

function make_request(status, command){
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

function send(ws, data){
    return new Promise((ok, err)=>{
        function handle(text){
            let data = JSON.parse(text);
            if(data.type == WS_TYPE_LOG) return;
            ws.removeListener('message', handle);
            ok(data);
        }
        ws.on('message', handle);
        ws.send(JSON.stringify(data));
        console.log(JSON.stringify(data));
    });
}

let spec_command = {
    type: WS_TYPE_COMMAND,
    command: WS_COMMAND_READ,
    sectors: [
        {
            sector: 1,
            blocks: [1,2,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        },
        {
            sector: 2,
            blocks: [1,2,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        },
        {
            sector: 3,
            blocks: [1,2,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        },
        {
            sector: 4,
            blocks: [1,2,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        },
        {
            sector: 5,
            blocks: [1,2,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        }
    ]
}
// rl.question('What do you think of Node.js? ', (answer) => {
//     // TODO: Log the answer in a database
//     console.log(`Thank you for your valuable feedback: ${answer}`);
//
//     //rl.close();
// });
let resrep = {
    type: WS_TYPE_RESPONSE,
    status: WS_OK_RESPONSE,
    command: WS_COMMAND_CONTINUE
}
let response = {
    type: WS_TYPE_RESPONSE,
    data1: {
        "1": {
            "1": [1],
            "2": [1]
        }
    },
    data: [
        {
            sector: 1,
            blocks: [
                {
                    block: 1,
                    type: "write",
                    data: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                },
            ],
        },
    ]
}
let spec_write = {
    type: WS_TYPE_COMMAND, //WS_TYPE_COMMAND
    command: WS_COMMAND_WRITE, //WS_COMMAND_WRITE
    sectors: [
        {
            sector: 2,
            blocks: [
                {
                    block: 2,
                    type: "write",
                    data: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
                }
            ],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'B'
        },
    ]
}
let reserror = {
    type: WS_TYPE_RESPONSE,
    status: WS_ERROR_RESPONSE,
    reason: "",
    has_command: false,
}
let resok = {
    ...spec_command,
    type: WS_TYPE_RESPONSE,
    status: WS_OK_RESPONSE,
    has_command: true
}



let axios = require('axios');
let Client = require('node-ssdp').Client, client = new Client();
client.on('response', async function (headers, statusCode, rinfo) {
    if(connected['::ffff:'+rinfo.address]!=undefined){
        return;
    }
    console.log('connect to '+rinfo.address);
    try {
        let test = await axios.get('http://' + rinfo.address + ':' + port + '/rfid');
        if(test.data=='yes'){
            await axios.get('http://'+rinfo.address+':'+port+'/connect');
        }
    }catch (e) {
        console.log(e);
    }
});
let interval_id = setInterval(()=>{
    for(let id in connected){
        let cn = connected[id];
        if (cn.isAlive === false) return cn.ws.terminate();
        cn.isAlive = false;
        cn.ws.ping();
    }
    client.search('urn:rfid-lunch:device:rfid-scanner:1.0');
}, 5000);
