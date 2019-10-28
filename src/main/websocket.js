
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

let evilscan = require('evilscan');
new evilscan({
    target: '192.168.100.0/24',
    port: 57300,
    status:'O',
}, function(err, scan){
    if(err){
        throw err;
    }
    let data = [];
    scan.on('result', (d)=>{
        console.log('data', d);
        data.push(d);
    })
    scan.on('done', ()=>{
        console.log('done');
        init(data);
    })
    scan.run();
});
let Client = require('node-ssdp').Client, client = new Client();
client.on('response', function (headers, statusCode, rinfo) {
    console.log('Got a response to an m-search.');
    console.log(headers, statusCode, rinfo);
});

client.search('ssdp:all');
let init = async(data)=>{
    let wss = new WebSocket.Server({
        port: 57301
    });

    wss.on('connection', (ws)=>{
        ws.send('connect');
        console.log('connected');
        ws.on('message', (m)=>{
            console.log(m);
        })
        ws.on('close', (reason)=>{
            console.log('closed', reason);
        })
    })
    console.log('broadcast server', data);
    let axios = require('axios');
    for(let e of data){
        try {
            let test = await axios.get('http://' + e.ip + ':' + e.port + '/rfid');
            if(test.data=='yes'){
                await axios.get('http://'+e.ip+':'+e.port+'/connect');
            }
        }catch (e) {
            console.log(e);
        }
    }
}

