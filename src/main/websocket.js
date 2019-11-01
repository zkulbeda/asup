const WS_TYPE_RESPONSE = 1
const WS_TYPE_COMMAND = 2
const WS_COMMAND_READ = 1
const WS_COMMAND_WRITE = 2
const WS_COMMAND_CONTINUE = 3
const WS_OK_RESPONSE = 1;
const WS_ERROR_RESPONSE = 0;
const WS_NONE_RESPONSE = 2
const WebSocket = require('ws');
console.log('loading');
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
        connected[i].ws.send(text);
        a.push(ws_promise_response(connected[i].ws));
    }
    return Promise.all(a);
}
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
            let ans = await awaitAll(JSON.stringify(spec_write));
            ans = ans[0];
            console.log(ans);
            let c = await awaitAll(JSON.stringify({
                ...spec_command,
                type: WS_TYPE_RESPONSE,
                status: WS_NONE_RESPONSE,
                has_command: true
            }));
            console.log(c);
    }
});



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
