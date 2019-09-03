import {app, BrowserWindow, ipcMain, dialog, ipcRenderer} from 'electron'
//import '../renderer/store'
import xl from 'excel4node';
import merge from 'lodash/merge';
import fs from 'fs';
import path from "path";
import Config from 'electron-store'
import promiseIpc from 'electron-promise-ipc';
import uniqWith from 'lodash/uniqWith';
import findIndex from 'lodash/findIndex'

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
global.kiosk_mode = true;

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
  mainWindow.webContents.openDevTools();
  global.mainWindow = mainWindow;

  mainWindow.on('closed', () => {
    mainWindow = null
    global.mainWindow = null;
  })
}

global.config = new Config();

app.on('ready', () => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
promiseIpc.on('getMonths', async (e) => {
  let url = path.join(app.getPath('userData'), 'data/');
  let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
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
        if (conf === null || conf.started == false || conf.ended == false) continue;
        count++;
      }
      return count>0;
    }
    return false;
  }));
  return res;
});

let generateWS = (wb, shotname, name, st, data, stCell) => {
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
  for (let i = 0; i < data.length; i++) {
    ws.column(2 + i).setWidth(6);
    ws.cell(3, 2 + i).string(data[i].id + '').style(stCell);
  }
  ws.column(1 + data.length + 1).setWidth(10);
  ws.column(1 + data.length + 2).setWidth(12);
  let last = 4;
  for (let i in st) {
    ws.cell(last, 1).string(st[i].name).style(border);
    for (let j = 0; j < data.length; j++) {
      console.log(data[j].students,st[i]);
      if (findIndex(data[j].students, (e) => e.id === st[i].id) !== -1) {
        console.log('ok');
        ws.cell(last, 2 + j).number(st[i].pays ? data[j].price.notFree : data[j].price.free).style(border).style(dem);
      }
    }
    ws.cell(last, 2 + data.length).formula('SUM(' + xl.getExcelCellRef(last, 2) + ":" + xl.getExcelCellRef(last, 1 + data.length) + ")").style(dem);
    ws.cell(last, 2 + data.length + 1).formula('COUNT(' + xl.getExcelCellRef(last, 2) + ":" + xl.getExcelCellRef(last, 1 + data.length) + ")");
    if(i%2===1) ws.cell(last, 1, last, 1+data.length+2).style({
      fill:{
        type: 'pattern',
        patternType: 'gray125',
        bgColor: 'white',
        fgColor: '#d9d9d9'
      }
    });
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
  let stC = {
    fill: {
      type: 'pattern',
      patternType: 'solid',
      bgColor: '#f2f2f2',
      fgColor: '#f2f2f2'
    }
  }
  ws.cell(2,1+data.length+1, last, 1+data.length+2).style(stC);
  ws.cell(last-1,2, last, 1+data.length+2).style(stC);
  ws.setPrintArea(2,1,last, 1+data.length+2);
  //return ws;
};
let monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',];
import nedb from "nedb-promise";

promiseIpc.on('generateExcel', async (e) => {
  console.log(e);
  let mth = e.month;
  let data = [];
  for (let i = 1; i < 32; i++) {
    let p = path.join(app.getPath('userData'), 'data/' + mth + '/' + i + '.json');
    if (!fs.existsSync(p)) continue;
    let vdb = nedb({
      filename: p,
      timestampData: true,
      autoload: true
    });
    let conf = await vdb.findOne({type: 'config'});
    console.log(conf);
    if(conf === null || conf.started==false || conf.ended==false) continue;
    else{
      let students = await vdb.find({type: 'record'});
      let price = await vdb.findOne({type: "price"});
      data.push({
        students,
        price,
        id: i
      });
    }
  }
  console.log(data);
  let db = nedb({
    filename: path.join(app.getPath('userData'), 'students.json'),
    timestampData: true,
    autoload: true
  });
  let wb = new xl.Workbook({});
  let styleCentered = {alignment: {horizontal: 'center', vertical: 'center'}};
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
  let stCell = wb.createStyle(merge({}, styleCentered));
  console.log(stCell);
  let classes = uniqWith(await db.find({}), (a, b) => a.group == b.group).map((e) => e.group).sort();
  let st = await db.find({});
  let mntn = monthNames[mth-1];
  generateWS(wb, 'Общая', "Общий отчёт питания по всей школе за " + mntn, st, data, stCell);
  st = await db.find({pays: true});
  generateWS(wb, 'Общая П', "Общий отчёт платного питания по всей школе за " + mntn, st, data, stCell);
  st = await db.find({pays: false});
  generateWS(wb, 'Общая Б', "Общий отчёт бесплатного питания по всей школе за " + mntn, st, data, stCell);
  for (let i = 0; i < classes.length; i++) {
    st = await db.find({pays: true, group: classes[i]});
    if (st.length > 0) {
      generateWS(wb, classes[i] + ' П', "Отчёт платного питания " + classes[i] + " класса за " + mntn, st, data, stCell);
    }
    st = await db.find({pays: false, group: classes[i]});
    if (st.length > 0) {
      generateWS(wb, classes[i] + ' Б', "Отчёт бесплатного питания " + classes[i] + " класса за " + mntn, st, data, stCell);
    }
  }
  ;

  dialog.showSaveDialog(mainWindow, {
    title: 'Сохранение таблицы',
    defaultPath: 'Полный отчёт питания школы за '+mntn,
    filters: [{name: 'Таблица Excel', extensions: ['xlsx']}]
  }, (file) => {
    wb.writeToBuffer().then((buf) => {
      fs.writeFileSync(file, buf);
    })
  });
});
