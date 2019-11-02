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
let EventEmitter = require("events");
let q = require('./rfid_query');
let axios = require('axios');
let Client = require('node-ssdp').Client;

class RFIDDeviceConnection extends EventEmitter{
    static toByteArray(/*long*/long) {
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
    }
    static fromByteArray(/*byte[]*/byteArray) {
        var value = 0;
        for ( var i = byteArray.length - 1; i >= 1; i--) {
            value = (value * 256) + byteArray[i];
        }

        return byteArray[0]?-value:value;
    }

    constructor(ws, req, device_port, key_a, key_b){
        super();
        this.ws = ws;
        this.req = req;
        this.key_a = key_a;
        this.key_b = key_b;
        ws.on('close', closed)
        this.isAlive = true;
        data.on('pong', ()=>{
            this.isAlive = true;
        });
        this.device_port = device_port;
        this.scanning = false;
    }

    async getInformation(){
        let info = await axios.get('http://' + this.req.connection.remoteAddress + ':' + this.device_port + '/info');
        return info;
    }

    static parse(message){
        return JSON.parse(message);
    }

    handle_scan(data){
        console.log();//
    }

    start_scan(){
        if(this.scanning) {
            console.warn('already scan');
            return;
        }
        this.ws.on('message', this.handle_scan);
        this.send(q.make_request('none', q.make_command('r',[q.read_sector(1,[1],this.key_a)])));
    }

    send(data){
        this.ws.send(JSON.stringify(data));
    }

    wait_response(data){
        return new Promise((ok, err)=>{
            let t = this;
            function handle(text){
                let data = JSON.parse(text);
                if(data.type == WS_TYPE_LOG) return;
                t.ws.removeListener('message', handle);
                ok(data);
            }
            this.ws.on('message', handle);
            this.send(data);
        });
    }

    ping(){
        this.ws.ping();
    }
    terminate(){
        this.ws.terminate();
    }

    closed(reason){
        console.log('closed', reason);
        this.emit('close');
    }
}

class RFIDDeviceServer{
    constructor({
        key_a,
        key_b,
        device_port = 57300,
        server_port = 57301,
                }){
        this.key_a = MifareKey(key_a, 'A');
        this.key_b = MifareKey(key_b, 'B');
        this.device_port = device_port;
        this.server_port = server_port;

        this.wss = new WebSocket.Server({
            port: this.server_port
        });
        this.wss.on('connection', this.new_connection);
        this.connections = [];
        this.ssdp = new Client();
        this.ssdp.on('response', async function (headers, statusCode, rinfo) {
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
        this.interval_id = setInterval(()=>{
            for(let id in connected){
                let cn = connected[id];
                if (cn.isAlive === false) return cn.terminate();
                cn.isAlive = false;
                cn.ping();
            }
            this.ssdp.search('urn:rfid-lunch:device:rfid-scanner:1.0');
        }, 5000);
    }

    new_connection(ws, req){
        let data = this.connections[req.connection.remoteAddress] = new RFIDDeviceConnection(ws, req, this.device_port, this.key_a, this.key_b);
        data.on('close', (reason)=>{
            this.connections[req.connection.remoteAddress] = undefined;
            delete this.connections[req.connection.remoteAddress];
        });
    }
    async wait_response_all(data){
        let d = [];
        for(let i in this.connections){
            d.push(this.connections[i].send(data));
        }
        return Promise.all(d);
    }
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


const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
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