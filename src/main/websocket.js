
const WebSocket = require('ws');

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
    ws.send('connect');
    data = connected[req.connection.remoteAddress] = {
        ws,
        isAlive: true
    };
    console.log(connected);
    console.log('connected');
    ws.on('message', (m)=>{
        console.log(m);
    })
    ws.on('close', (reason)=>{
        console.log('closed', reason);
        connected[req.connection.remoteAddress] = undefined;
        delete connected[req.connection.remoteAddress];
    })
    ws.on('pong', ()=>{
        data.isAlive = true;
    })
})

let spec_command = {
    type: 'command',
    command: 'scan',
    sectors: [
        {
            sector: 1,
            block: [1],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        },
        {
            sector: 2,
            block: [1,3],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'A'
        }
    ]
}
let spec_write = {
    type: "command",
    command: "write",
    sectors: [
        {
            sector: 1,
            block: [
                {
                    block: 1,
                    type: "write",
                    data: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],
                },
                {
                    block: 1,
                    type: "inc", //dec
                    id: 3,
                    count: 1
                }
            ],
            key: [0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF],
            key_type: 'B'
        },
    ]
}
const WS_OK_RESPONSE = 1;
const WS_ERROR_RESPONSE = 0;
let res = {
    type: "response",
    reason: "",
    has_command: false,
}
let res2 = {
    type: "response",
    status: WS_OK_RESPONSE,
    has_command: true,
    command: spec_command
}



let axios = require('axios');
let Client = require('node-ssdp').Client, client = new Client();
client.on('response', async function (headers, statusCode, rinfo) {
    console.log('Got a response to an m-search.');
    console.log(headers, statusCode, rinfo);
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
        console.log(cn.isAlive);
        if (cn.isAlive === false) return cn.ws.terminate();
        cn.isAlive = false;
        cn.ws.ping();
    }
    client.search('urn:rfid-lunch:device:rfid-scanner:1.0');
}, 5000);
