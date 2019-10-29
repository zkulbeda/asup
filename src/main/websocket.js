
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
let connected = []
wss.on('connection', async (ws, req)=>{
    ws.send('connect');
    connected.push(req.connection.remoteAddress);
    console.log(connected);
    console.log('connected');
    ws.on('message', (m)=>{
        console.log(m);
    })
    ws.on('close', (reason)=>{
        console.log('closed', reason);
    })
})

let axios = require('axios');
let Client = require('node-ssdp').Client, client = new Client();
client.on('response', async function (headers, statusCode, rinfo) {
    console.log('Got a response to an m-search.');
    console.log(headers, statusCode, rinfo);
    if(connected.indexOf('::ffff:'+rinfo.address)!=-1){
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
    client.search('urn:rfid-lunch:device:rfid-scanner:1.0');
}, 5000);
