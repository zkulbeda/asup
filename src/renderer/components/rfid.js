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
let EventEmitter = require("eventemitter3");
let q = require('./rfid_query');
const MifareKey = q.MifareKey;
let axios = require('axios');
let Client = require('node-ssdp').Client;

export class RFIDDeviceConnection extends EventEmitter{
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
        byteArray = byteArray.slice(0,8);
        var value = 0;
        for ( var i = byteArray.length - 1; i >= 1; i--) {
            value = (value * 256) + byteArray[i];
        }

        return byteArray[0]?-value:value;
    }

    constructor(ws, req, device_port, key_a, key_b, on_scan_callback){
        super();
        this.ws = ws;
        this.req = req;
        this.key_a = key_a;
        this.key_b = key_b;
        this.closedWithContext = this.closed.bind(this);
        ws.on('close', this.closedWithContext)
        this.isAlive = true;
        ws.on('pong', ()=>{
            this.isAlive = true;
        });
        this.device_port = device_port;
        this.scanning = false;
        this.on_scan_callback = on_scan_callback;
    }

    async getInformation(){
        let info = await axios.get('http://' + this.req.connection.remoteAddress + ':' + this.device_port + '/info');
        return info;
    }

    static parse(message){
        console.log(message);
        return JSON.parse(message);
    }

    async handle_scan(message){
        let d = this.constructor.parse(message);
        console.log("handle_scan", d);
        let data = d[2][1].slice(0,16);
        console.log(data);
        let data_number = this.constructor.fromByteArray(data);
        console.log("handle_scan", data_number);
        d['card_id'].unshift(0);
        let card_id = this.constructor.fromByteArray(d['card_id']);
        if(await this.on_scan_callback(data_number, card_id)){
            this.send(q.make_request('ok',q.make_command('c')));
        }else{
            this.send(q.make_request('err',q.make_command('c')));
        }
    }

    start_scan(return_command = false){
        if(this.scanning) {
            console.warn('already scan');
            return;
        }
        this.handle_scan_with_context = this.handle_scan.bind(this);
        this.ws.on('message', this.handle_scan_with_context);
        let command = q.make_command('r',[q.read_sector(2,[1],this.key_a)]);
        this.scanning = true;
        if(return_command){
            return command;
        }else{
            this.send(q.make_command_request(command));
        }
    }

    stop_scan(command){
        if(!this.scanning){return false;}
        this.ws.removeListener('message', this.handle_scan_with_context);
        this.scanning = false;
        this.send(q.make_request('none',command));
        return true;
    }

    async record_student(student, rewrite_callback){
        let was_scanning = this.stop_scan();
        let d = await this.wait_response(q.make_command_request(q.make_command('r',[q.read_sector(2,[1],this.key_a)])));
        console.log(d);
        let card_data = this.constructor.fromByteArray(d[2][1].slice(0,16));
        d['card_id'].unshift(0);
        let card_id = this.constructor.fromByteArray(d['card_id']);
        if(await rewrite_callback(card_data)){
            let new_data = await student.linkCard(card_id);
            console.log("new card_data ",new_data);
            console.log("new card_data bytes ",this.constructor.toByteArray(new_data));
            console.log("test bytes ", this.constructor.fromByteArray(this.constructor.toByteArray(new_data)))
            let d = await this.wait_response(q.make_request('none', q.make_command('w',[q.write_sector(2, [q.write_block(1,this.constructor.toByteArray(new_data))], this.key_b)])));
            console.log(d);
            if(d.status==0){
                this.send(q.make_request('err', was_scanning?this.start_scan(true):undefined));
                throw Error("Запись не удалась");
            }else{
                this.send(q.make_request('ok', was_scanning?this.start_scan(true):undefined));
                return true;
            }
        }
        return false;
    }

    send(data){
        console.log(JSON.stringify(data));
        this.ws.send(JSON.stringify(data));
    }

    wait_response(data){
        return new Promise((ok, err)=>{
            let t = this;
            function handle(text){
                let data = t.constructor.parse(text);
                if(data.type == WS_TYPE_LOG) return;
                t.ws.removeListener('message', handle);
                ok(data);
            }
            this.ws.on('message', handle);
            console.log(data);
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

export class RFIDDeviceServer extends EventEmitter{
    constructor({
        key_a,
        key_b,
        device_port = 57300,
        server_port = 57301,
        on_scan_callback = async()=>{}
                }){
        super();
        this.key_a = new MifareKey(key_a, 'A');
        this.key_b = new MifareKey(key_b, 'B');
        this.device_port = device_port;
        this.server_port = server_port;
        this.on_scan_callback = on_scan_callback;

        this.wss = new WebSocket.Server({
            port: this.server_port
        });
        this.new_connection_with_context = this.new_connection.bind(this);
        this.wss.on('connection', this.new_connection_with_context);
        this.connections = {};
        // this.bonjour = require('bonjour')();
        // console.log(this.browser = this.bonjour.find({}, function (service) {
        //     console.log('Found an HTTP server:', service)
        // }));
        // this.browser.start();
        // setInterval(()=>{
        //     this.browser.update();
        //     console.log('scan');
        // },3000);
        this.ssdp = new Client();
        this.ssdp.on('response', async (headers, statusCode, rinfo)=>{
            if(this.connections['::ffff:'+rinfo.address]!=undefined){
                return;
            }
            console.log('connect to '+rinfo.address);
            try {
                let test = await axios.get('http://' + rinfo.address + ':' + device_port + '/rfid');
                if(test.data=='yes'){
                    await axios.get('http://'+rinfo.address+':'+device_port+'/connect');
                }
            }catch (e) {
                console.log(e);
            }
        });
        // let evilscan = require('evilscan');
        // this.interval_id = setInterval(()=>{
        //     for(let id in this.connections){
        //         let cn = this.connections[id];
        //         if (cn.isAlive === false) return cn.terminate();
        //         cn.isAlive = false;
        //         cn.ping();
        //     }
        //     // this.ssdp.search('urn:rfid-lunch:device:rfid-scanner:1.0');
        //     new evilscan({
        //         target: '192.168.0.0/16',
        //         port: 57300,
        //         status:'O',
        //     }, (err, scan)=>{
        //         if(err){
        //             throw err;
        //         }
        //         let data = [];
        //         scan.on('result', (d)=>{
        //             console.log('data', d);
        //             data.push(d);
        //         })
        //         scan.on('done', ()=>{
        //             console.log('done');
        //             (async (data)=>{
        //                 for(let e of data){
        //                     if(this.connections['::ffff:'+e.ip]!=undefined){
        //                         return;
        //                     }
        //                 try {
        //                     let test = await axios.get('http://' + e.ip + ':' + e.port + '/rfid');
        //                     if(test.data=='yes'){
        //                         await axios.get('http://'+e.ip+':'+e.port+'/connect');
        //                     }
        //                 }catch (e) {
        //                     console.log(e);
        //                 }
        //             }
        //             })(data);
        //         });
        //         scan.run();
        //     });
        // }, 5000);
    }

    new_connection(ws, req){
        let data = this.connections[req.connection.remoteAddress] = new RFIDDeviceConnection(ws, req, this.device_port, this.key_a, this.key_b, this.on_scan_callback);
        data.start_scan();
        this.emit('connected', data);
        data.on('close', (reason)=>{
            this.connections[req.connection.remoteAddress] = undefined;
            delete this.connections[req.connection.remoteAddress];
            this.emit('disconnected', req.connection.remoteAddress);
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

// const readline = require('readline');
//
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// let card_key =new MifareKey([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], 'A')
// let card_key_b =new MifareKey([0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF], 'B')
// let s = new RFIDDeviceServer({key_a: card_key.key, key_b: card_key_b.key});
// rl.on('line', async (input) => {
//     switch (input) {
//         case "scan":
//             console.log(s.connections);
//             for(let k in s.connections){
//                 s.connections[k].start_scan();
//             }
//             break;
//         case "stop":
//             for(let k in s.connections) {
//                 s.connections[k].stop_scan();
//             }
//             break;
//         case "error":
//             sendAll(JSON.stringify(reserror));
//             break;
//         case "ok":
//             sendAll(JSON.stringify(resok));
//             break;
//         case "write":
//             let read_command = make_command('r', [read_sector(2,[1], card_key)]);
//             let c = await awaitAll(make_request('none', read_command));
//             while(true) {
//                 c = c[0];
//                 // console.log(c);
//                 console.log(c[2][1][0]);
//                 c[2][1][0]++;
//                 let ans = await awaitAll(make_request("none", make_command('w', [write_sector(2,[write_block(1,c[2][1])], card_key_b)])));
//                 ans = ans[0];
//                 console.log(ans);
//                 c = await awaitAll(make_request('ok', read_command));
//             }
//     }
// });