import { app, BrowserWindow, ipcMain, dialog } from 'electron'
//import '../renderer/store'
import xl from 'excel4node';
import merge from 'lodash/merge';
import fs from 'fs';
import nedb from "nedb-promise";
import path from "path";
import Config from 'electron-store'
import {DateTime} from 'luxon'

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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

let timeNow = DateTime.local();
let thisDay = nedb({
    filename: path.join(app.getPath('userData'), 'data/'+timeNow.month+'/'+timeNow.daysInMonth+'.json'),
    timestampData: true
});
let config = new Config();

app.on('ready', ()=>{
    createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('generateExcel', function(){
    let days = [{price: 4.75, purples: [1,2,3]},{price: 4.75, purples: [1,2,3]},{price: 1.34, purples: [1,4,5]},{price: 1.34, purples: [1,4,5]}];
    let purples = {
        1: "Кульбеда",
        2: "Женя ывшакпмука",
        3: "Наталья ываопмгврпм",
        4: "Кузьмааа ваыпмог",
        5: "Шелест Лист"
    };
    let wb = new xl.Workbook({

    });
    let ws = wb.addWorksheet('1',{

    });
    let styleCentered = {alignment: {horizontal:'center', vertical: 'center'}};
    let border = {border:{outline:true,left: {type: 'thin', color: 'black'}, right: {type: 'thin', color: 'black'}, top: {type: 'thin', color: 'black'}, bottom: {type: 'thin', color: 'black'}}};
    let stCell = merge({},styleCentered, border);
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
