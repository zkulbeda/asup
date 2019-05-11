import { app, BrowserWindow, ipcMain, dialog,ipcRenderer } from 'electron'
//import '../renderer/store'
import xl from 'excel4node';
import merge from 'lodash/merge';
import fs from 'fs';
import path from "path";
import Config from 'electron-store'
import promiseIpc from 'electron-promise-ipc';
import uniqWith from 'lodash/uniqWith';
import findIndex from  'lodash/findIndex'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

let config = new Config();

app.on('ready', ()=>{
    createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
promiseIpc.on('getMonths',(e)=>{
  let url = path.join(app.getPath('userData'), 'data/');
  let months = [1,2,3,4,5,6,7,8,9,10,11,12];
  let res = months.map((e)=>{
    return fs.existsSync(path.join(url, e+'/'));
  });
  return res;
});
import nedb from "nedb-promise";
promiseIpc.on('generateExcel', async (e)=>{
  console.log(e);
  let mth = e.month;
  let data = [];
  for(let i = 1; i<32; i++){
    let p = path.join(app.getPath('userData'), 'data/' + mth + '/' + i + '.json');
    if(!fs.existsSync(p)) continue;
    let vdb = nedb({
      filename: p,
      timestampData: true,
      autoload: true
    });
    let students = await vdb.find({type: 'record'});
    let price = await vdb.findOne({type: "price"});
    data.push({
      students,
      price,
      id: i
    });
  }
  console.log(data);
  let db = nedb({
      filename: path.join(app.getPath('userData'), 'students.json'),
      timestampData: true,
    autoload: true
    });
  let wb = new xl.Workbook({});
  let classes = uniqWith(await db.find({}), (a,b)=>a.group==b.group).map((e)=>e.group);
  console.log(classes);
  let ws = wb.addWorksheet('Общая',{});
  let styleCentered = {alignment: {horizontal:'center', vertical: 'center'}};
  let border = {
    border:{
      outline:true,
      left: {
        type: 'double', color: 'black'
      },
      right: {
        type: 'double', color: 'black'
      },
      top: {
        type: 'double', color: 'black'
      },
      bottom: {
        type: 'double', color: 'black'
      }
    }
  };
  let stCell = merge({},styleCentered, border);
  ws.cell(1,1,1,1+data.length+2, true).string('Полный отсчет за '+mth).style(styleCentered);
  ws.cell(2,1,3,1,true).string("ФИО").style(stCell);
  ws.cell(2,2,2,1+data.length,true).string("День месяца").style(stCell);
  ws.cell(2,1+data.length+1,3,1+data.length+1,true).string("Сумма").style(stCell);
  ws.cell(2,1+data.length+2,3,1+data.length+2,true).string("Количество").style(stCell);
  ws.row(1).setHeight(25 );
  ws.column(1).setWidth(30);
  for(let i = 0; i<data.length; i++){
    ws.column(2+i).setWidth(8);
    ws.cell(3,2+i).number(data[i].id).style(stCell);
  }
  ws.column(1+data.length+1).setWidth(10);
  ws.column(1+data.length+2).setWidth(10);
  let last = 4;
  let st = await db.find({});
  for(let i in st){
    ws.cell(last,1).string(st[i].name).style(border);
    for(let j = 0; j<data.length; j++){
      if(findIndex(data[j].students, (e)=>e.id===st[i].id)!==-1){
        ws.cell(last, 2+j).number(st[i].pays?data[j].price.notFree:data[j].price.free).style(border);
      }
    }
    ws.cell(last,2+data.length).formula('SUM('+xl.getExcelCellRef(last,1)+":"+xl.getExcelCellRef(last,1+data.length)+")").style(border);
    ws.cell(last,2+data.length+1).formula('COUNT('+xl.getExcelCellRef(last,1)+":"+xl.getExcelCellRef(last,1+data.length)+")").style(border);
    last++;
  }
  ws.cell(last, 1).string("Сумма").style(styleCentered);
  for(let i = 0; i<data.length; i++){
    ws.cell(last,2+i).formula('SUM('+xl.getExcelCellRef(4,2+i)+":"+xl.getExcelCellRef(last-1,2+i)+")").style(border);
  }
  last++
  ws.cell(last, 1).string("Количество").style(styleCentered);
  for (let i = 0; i < data.length; i++) {
    ws.cell(last, 2 + i).formula('COUNT(' + xl.getExcelCellRef(4, 2 + i) + ":" + xl.getExcelCellRef(last-2, 2 + i) + ")").style(border);
  }
  dialog.showSaveDialog(mainWindow, {
    title: 'Сохранение таблицы',
    filters: [{name: '123', extensions: ['xlsx','js']}]
  }, (file)=>{
    wb.writeToBuffer().then((buf)=>{
      fs.writeFileSync(file,buf);
    })
  })
});

ipcMain.on('generateExcell', function(){
    let days = [{price: 4.75, purples: [1,2,3]},{price: 4.75, purples: [1,2,3]},{price: 1.34, purples: [1,4,5]},{price: 1.34, purples: [1,4,5]}];
    let purples = {
        1: "Кульбеда",
        2: "Женя ывшакпмука",
        3: "Наталья ываопмгврпм",
        4: "Кузьмааа ваыпмог",
        5: "Шелест Лист"
    };
    let wb = new xl.Workbook({});
    let ws = wb.addWorksheet('1',{

    });
    let styleCentered = {alignment: {horizontal:'center', vertical: 'center'}};
    let border = {
      border:{
        outline:true,
        left: {
          type: 'double', color: 'black'
        },
        right: {
          type: 'double', color: 'black'
        },
        top: {
          type: 'double', color: 'black'
        },
        bottom: {
          type: 'double', color: 'black'
        }
      }
    };
    let stCell = merge({},styleCentered, border);
    console.log(stCell);
    ws.cell(1,1,1,1+days.length+1, true).string('NAME').style(styleCentered);
    ws.cell(2,1,3,1,true).string("ФИО").style(stCell);
    ws.cell(2,2,2,1+days.length,true).string("День месяца").style(stCell);
    ws.cell(2,1+days.length+1,3,1+days.length+1,true).string("Сумма").style(stCell);
    ws.row(1).setHeight(25 );
    ws.column(1).setWidth(30);
    for(let i = 0; i<days.length; i++){
        ws.column(2+i).setWidth(8);
        ws.cell(3,2+i).number(i+1).style(stCell);
    }
    ws.column(1+days.length+1).setWidth(10);
    let last = 4;
    for(let i in purples){
        ws.cell(last,1).string(purples[i]).style(border);
        for(let j = 0; j<days.length; j++){
            if(days[j].purples.indexOf(i-0)!==-1){
                ws.cell(last, 2+j).number(days[j].price).style(border);
            }
        }
        ws.cell(last,2+days.length).formula('SUM('+xl.getExcelCellRef(last,1)+":"+xl.getExcelCellRef(last,1+days.length)+")").style(border);
        last++;
    }

    dialog.showSaveDialog(mainWindow, {
        title: 'Сохранение таблицы',
        filters: [{name: '123', extensions: ['xlsx','js']}]
    }, (file)=>{
        wb.writeToBuffer().then((buf)=>{
            fs.writeFileSync(file,buf);
        })
    })
})
