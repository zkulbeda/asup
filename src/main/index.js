import {app, BrowserWindow, ipcMain, dialog, ipcRenderer, shell} from 'electron'
//import '../renderer/store'
import xl from 'excel4node';
import merge from 'lodash/merge';
import fs from 'fs';
import path from "path";
import Config from 'electron-store'
import promiseIpc from 'electron-promise-ipc';
import uniqWith from 'lodash/uniqWith';
import findIndex from 'lodash/findIndex'
import tempy from 'tempy'
import {getGlobal} from "@/components/utils";
import {DateTime} from "luxon";


global.userPath = app.getPath('userData');
/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}
const argv = global.args = require('yargs').argv
let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`
global.kiosk_mode = argv.kiosk;
import { connect } from 'trilogy'

let db = connect(path.join(global.userPath, 'db.db'), {
  client: 'sql.js'
})
global.db = db;

/**
 *
 * @param {Trilogy} db
 * @returns {Promise<void>}
 */
async function initDB(db){
  global.students = await db.model('students', {
    id: 'increments',
    code: {type: String, nullable: false},
    name: {type: String, nullable: false},
    group: {type: String, nullable: false},
    pays: {type: Boolean, nullable: false},
  }, {index: 'code'});
  global.days = await db.model('days', {
    id: 'increments',
    day: {type: Number, nullable: false},
    free: {type: Number, nullable: true},
    not_free: {type: Number, nullable: true}
  },{index: 'day'});
  global.records = await db.model('records', {
    id: 'increments',
    student_id: {type: Number, nullable: false, foreign: "id", inTable: "students"},
    day_id: {type: Number, nullable: false, foreign: "id", inTable: "days"},
    time: Number,
  },{index: 'day_id'});
  global.db.onQuery(query => console.log(query))
  global.students.onQuery(query => console.log(query))
  global.days.onQuery(query => console.log(query))
  global.records.onQuery(query => console.log(query))
  console.log('OK');
};

function createWindow() {
  /**
   * Initial window options
   */
  let mainWindow = null;
  if(global.kiosk_mode){
    mainWindow = new BrowserWindow({
      kiosk: true
    })
  }else{
    mainWindow = new BrowserWindow({
      height: 563,
      useContentSize: true,
      width: 1000
    })
  }

  mainWindow.loadURL(winURL)
  /*if (argv.dev)*/ mainWindow.webContents.openDevTools();
  global.mainWindow = mainWindow;

  mainWindow.on('closed', () => {
    mainWindow = null
    global.mainWindow = null;
  })
}

global.config = new Config();

app.on('ready', async () => {
  await initDB(db)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
promiseIpc.on('changeKioskMode', async (state)=>{
  global.kiosk_mode = Boolean(state);
  global.mainWindow.webContents.reload();
  global.mainWindow.setKiosk(global.kiosk_mode);
});

promiseIpc.on('getMonths', async (e) => {
  let url = path.join(app.getPath('userData'), 'data/');
  let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return [true,true,true,true,true,true,true,true,true,true,true,true,];
  let res = await Promise.all(months.map(async (e) => {
    if(fs.existsSync(path.join(url, e + '/'))) {
      let count = 0;
      for (let i = 1; i < 32; i++) {
        let p = path.join(app.getPath('userData'), 'data/' + e + '/' + i + '.json');
        if (!fs.existsSync(p)) continue;
        let vdb = nedb({
          filename: p,
          timestampData: true,
          autoload: true
        });
        let conf = await vdb.findOne({type: 'config'});
        if (conf === null || conf.started == false) continue;
        count++;
      }
      return count>0;
    }
    return false;
  }));
  return res;
});

promiseIpc.on('getMonthData', async({month})=>{
  let data = {};
  console.log('getting month data', month);
  let begin = Math.trunc(DateTime.local().set({month}).startOf('month').toSeconds()/(60*60*24));
  let end = Math.trunc(DateTime.local().set({month}).endOf('month').toSeconds()/(60*60*24));
  let days = await db.raw(db.knex('days').select('*').whereBetween('day',[begin, end]),true);
  console.log(days);
  for (let d of days) {
    let day = new TheDay(d);
    let i = DateTime.fromSeconds(day.daystamp*60*60*24).day;
    let students = (await day.getList({count: true}));
    console.log(students, i)
    data[i] = {
      type: day.isEnded()?'ended':'started',
      students: students['count(`id`)'],
      price: day.getPrice(),
      day: i
    };
  }
  return data;
});

let generateWS = (wb, shotname, name, st, data, stCell) => {
  console.log(data);
  let styleCentered = {alignment: {horizontal: 'center', vertical: 'center'}};
  let styleRight = merge({}, styleCentered, {alignment: {horizontal: 'right', indent: 1}});
  let border = {
    border: {
      left: {
        style: 'thin',
        color: 'black',
      },
      right: {
        style: 'thin',
        color: 'black',
      },
      top: {
        style: 'thin',
        color: 'black',
      },
      bottom: {
        style: 'thin',
        color: 'black',
      },
      outline: false,
    },
  };
  let borderLeft = {
    border: {
      left: {
        style: 'double',
        color: 'black',
      },
    }
  };
  let borderTop = {
    border: {
      top: {
        style: 'double',
        color: 'black',
      },
    }
  };
  let ws = wb.addWorksheet(shotname, {
    headerFooter: {
      oddHeader: '&C&B' + name + '&B&R&D',
    },
    margins: {
      top: 0.40,
      bottom: 0.10,
      left: 0.40,
      right: 0.40,
      header: 0.1,
    },
    pageSetup: {
      fitToWidth: 1,
      fitToHeight: 0,
      orientation: 'landscape'
    }
  });
  let stTableH = {font: {bold: true}};
  let dem = {numberFormat: '0.00'};
  ws.cell(1, 1, 1, 1 + data.length + 2, true).string(name).style(styleCentered).style({font: {bold: true, size: 14}});
  ws.cell(2, 1, 3, 1, true).string("ФИО").style(stCell).style(stTableH);
  ws.cell(2, 2, 2, 1 + data.length, true).string("День месяца").style(stCell).style(stTableH);
  ws.cell(2, 1 + data.length + 1, 3, 1 + data.length + 1, true).string("Сумма").style(stCell).style(stTableH);
  ws.cell(2, 1 + data.length + 2, 3, 1 + data.length + 2, true).string("Количество").style(stCell).style(stTableH);
  ws.row(1).setHeight(25);
  ws.row(3).freeze();
  ws.column(1).setWidth(33);
  let k = 0;
  for (let i in data) {
    ws.column(2 + k).setWidth(6);
    console.log(data[i].day + '', k);
    ws.cell(3, 2 + k).string(data[i].day + '').style(stCell);
    k++;
  }
  ws.column(1 + data.length + 1).setWidth(10);
  ws.column(1 + data.length + 2).setWidth(12);
  let last = 4;
  k = 0;
  for (let i in st) {
    ws.cell(last, 1).string(st[i].name).style(border);
    for (let j = 0; j < data.length; j++) {
      console.log(data[j].students);
      if (findIndex(data[j].students, (e) => e.studentID === st[i].studentID) !== -1) {
        ws.cell(last, 2 + j).number(st[i].pays ? data[j].price.notFree : data[j].price.free).style(border).style(dem);
      }
    }
    ws.cell(last, 2 + data.length).formula('SUM(' + xl.getExcelCellRef(last, 2) + ":" + xl.getExcelCellRef(last, 1 + data.length) + ")").style(dem);
    ws.cell(last, 2 + data.length + 1).formula('COUNT(' + xl.getExcelCellRef(last, 2) + ":" + xl.getExcelCellRef(last, 1 + data.length) + ")");
    if(k%2===1) ws.cell(last, 1, last, 1+data.length+2).style({fill:{type: 'pattern',patternType: 'gray125',bgColor: 'white',fgColor: '#d9d9d9'}});
    last++;
  }
  ws.cell(last, 1).string("Сумма").style(styleRight).style(stTableH);
  for (let i = 0; i < data.length; i++) {
    ws.cell(last, 2 + i).formula('SUM(' + xl.getExcelCellRef(4, 2 + i) + ":" + xl.getExcelCellRef(last - 1, 2 + i) + ")").style(dem);
  }
  ws.cell(last, 2 + data.length).formula('SUM(' + xl.getExcelCellRef(4, 2 + data.length) + ":" + xl.getExcelCellRef(last - 1, 2 + data.length) + ")").style(border);
  last++;

  ws.cell(last, 1).string("Количество").style(styleRight).style(stTableH);
  for (let i = 0; i < data.length; i++) {
    ws.cell(last, 2 + i).formula('COUNT(' + xl.getExcelCellRef(4, 2 + i) + ":" + xl.getExcelCellRef(last - 2, 2 + i) + ")");
  }
  ws.cell(2, 1, last, 3 + data.length).style(border);
  ws.cell(2, 1 + data.length + 1, last, 1 + data.length + 1).style(borderLeft);
  ws.cell(last - 1, 1, last - 1, 1 + data.length + 2).style(borderTop);
  let stC = {fill: {type: 'pattern', patternType: 'solid', bgColor: '#f2f2f2', fgColor: '#f2f2f2'}};
  ws.cell(2,1+data.length+1, last, 1+data.length+2).style(stC);
  ws.cell(last-1,2, last, 1+data.length+2).style(stC);
  ws.setPrintArea(2,1,last, 1+data.length+2);
  //return ws;
};
let monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',];
import nedb from "nedb-promise";
import TheDay from "@/components/TheDay";
import TheStudent from "@/components/TheStudent";

promiseIpc.on('generateExcel', async (e) => {
  let mth = e.month;
  let data = [];
  let begin = Math.trunc(DateTime.local().set({month}).startOf('month').toSeconds()/(60*60*24));
  let end = Math.trunc(DateTime.local().set({month}).endOf('month').toSeconds()/(60*60*24));
  let days = await db.raw(db.knex('days').whereBetween('day',[begin, end]),true);
  for (let d of days) {
    let day = new TheDay(d);
    if (day.isEnded()){
      data.push({
        students: await day.getRecords(),
        price: day.getPrice(),
        day: DateTime.fromSeconds(day.daystamp * 60 * 60 * 24).day
      });
    }
  }
  await db.loadDatabase();
  let wb = new xl.Workbook({});
  let styleCentered = {alignment: {horizontal: 'center', vertical: 'center'}};
  let stCell = wb.createStyle(merge({}, styleCentered));
  let students = await TheStudent.loadAll();
  let classes = uniqWith(students, (a, b) => a.group == b.group).map((e) => e.group).sort();
  let mntn = monthNames[mth - 1];
  generateWS(wb, 'Общая', "Общий отчёт питания по всей школе за " + mntn, students, data, stCell);
  students = await TheStudent.loadAll({pays: true});
  generateWS(wb, 'Общая П', "Общий отчёт платного питания по всей школе за " + mntn, students, data, stCell);
  students = await TheStudent.loadAll( {pays: false});
  generateWS(wb, 'Общая Б', "Общий отчёт бесплатного питания по всей школе за " + mntn, students, data, stCell);
  for (let i = 0; i < classes.length; i++) {
    students = await TheStudent.loadAll( {pays: true, group: classes[i]});
    if (students.length > 0) {
      generateWS(wb, classes[i] + ' П', "Отчёт платного питания " + classes[i] + " класса за " + mntn, students, data, stCell);
    }
    students = await TheStudent.loadAll({pays: false, group: classes[i]});
    if (students.length > 0) {
      generateWS(wb, classes[i] + ' Б', "Отчёт бесплатного питания " + classes[i] + " класса за " + mntn, students, data, stCell);
    }
  }
  console.log('saving');
  await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранение таблицы',
    defaultPath: 'Полный отчёт питания школы за '+mntn,
    filters: [{name: 'Таблица Excel', extensions: ['xlsx']}]
  }, (file) => {
    wb.writeToBuffer().then((buf) => {
      fs.writeFileSync(file, buf);
    })
  });
});

import Zip from 'adm-zip';
import {RuntimeError} from "@/components/utils";

promiseIpc.on('importDB', async(e)=>{
  let url = path.join(app.getPath('userData'), 'data/');
  let file = await dialog.showOpenDialog(mainWindow, {
    title: 'Открытие базы данных',
    filters: [{name: 'База данных', extensions: ['db', 'sqlite']}]
  });
  let newdb = connect(file, {
    client: 'sql.js'
  })
  await initDB(newdb);
  let students = await newdb.getModel('students').find();
  for(let student of students){
    await TheStudent.newOrEdit(student);
  }
  let days = await newdb.getModel('days').find();
  for(let day of days){
    await TheDay.startDayOrEdit(day)
  }
  let records = await newdb.getModel('records').find();
  for(let record of days){

  }
});

promiseIpc.on('exportZip', async(e)=>{
  let url = path.join(app.getPath('userData'), 'data/');
  let arch = new Zip();
  arch.addLocalFile(path.join(app.getPath('userData'),'students.json'),'');
  for(let e = 1; e<13; e++){
    if(fs.existsSync(path.join(url, e + '/'))) {
      for (let i = 1; i < 32; i++) {
        let file = e + '/' + i + '.json';
        let p = path.join(url, file);
        if (!fs.existsSync(p)) continue;
        let vdb = nedb({
          filename: p,
          timestampData: true,
          autoload: true
        });
        let conf = await vdb.findOne({type: 'config'});
        if (conf === null || conf.started == false) continue;
        arch.addLocalFile(p,'data/'+e + '/');
      }
    }
  };

  await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранение базы данных',
    defaultPath: 'База данных школьного питания',
    filters: [{name: 'Архив', extensions: ['zip']}]
  }, (file) => {
    arch.writeZip(file);
  });
});

promiseIpc.on('importZip', async(e)=>{
  let url = path.join(app.getPath('userData'), 'data/');
  let file = await dialog.showOpenDialog(mainWindow, {
    title: 'Открытие базы данных',
    filters: [{name: 'Архив', extensions: ['zip']}]
  });
  let arch = new Zip(file);
  let studentsfile = tempy.file({extension:'.json'});
  let db = nedb({
    filename: studentsfile,
    autoload: true
  });
  let st = await db.find({});
  let d = null, countSt = 0;
  try {
    for(let i in st){
      d = st[i];
      await TheStudent.newOrEdit(st[i]);
      countSt++;
    }
  }catch (e) {
    console.log('error in', d);
    console.error(e);
    dialog.showMessageBox(getGlobal('mainWindow'),{
      title: 'Импорт выполнен частично',
      message: 'Импорт выполен частично. Произошла ошибка.',
      detail: 'Количество импортированных учеников: '+count
    });
  }
  let recordspath = tempy.directory();
  arch.extractAllTo(recordspath, true);
  url = path.join(recordspath,'data/');
  shell.showItemInFolder(recordspath);
  for(let e = 1; e<13; e++){
    if(fs.existsSync(path.join(url, e + '/'))) {
      for (let i = 1; i < 32; i++) {
        let file = e + '/' + i + '.json';
        let p = path.join(url, file);
        if (!fs.existsSync(p)) continue;
        let vdb = nedb({
          filename: p,
          timestampData: true,
          autoload: true
        });
        let conf = await vdb.findOne({type: 'config'});
        if (conf === null || conf.started == false) continue;
        let day = await TheDay.loadFromDate(e,i);
        let rds = await vdb.find({type: 'record'});
        for(let rdi in rds){
          let st = TheStudent.loadFromID(rds[rdi].studentID,false);
          if(!st) dialog.showMessageBox(getGlobal('mainWindow'),{
            message: 'Ученик не был вставлен.',
            detail: 'Месяц:'+e+', день:'+i+' id:'+rds[rdi].studentID
          });
          try{
            await day.recordStudent(st);
          }catch (e) {
            if(!(e instanceof RuntimeError)){
              throw e;
            }
          }
        }
      }
    }
  };
  dialog.showMessageBox(getGlobal('mainWindow'),{
    title: 'Импорт выполен успешно',
    message: 'Импорт выполен успешно',
  });

});