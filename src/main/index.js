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
import {RuntimeError} from "@/components/utils";
import * as express from "express";
import {check, query, body, validationResult} from "express-validator";
import {connect} from 'trilogy'
import nedb from "nedb-promise";
import TheDay from "@/components/TheDay";
import TheStudent from "@/components/TheStudent";
import bodyParser from "body-parser";
import authenticator from 'otplib/authenticator'
import crypto from 'crypto'

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
global.kiosk_mode= argv.kiosk;
let db = null;
db = connect(path.join(global.userPath, 'db.db'), {
    client: 'sql.js'
})
global.db = db;

/**
 *
 * @param {Trilogy} db
 * @returns {Promise<void>}
 */
async function initDB(db) {
    db.knex.on('query', (e)=>console.log(e));
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
    }, {index: 'day'});
    global.records = await db.model('records', {
        id: 'increments',
        student_id: {type: Number, nullable: false}, //foreign: "id", inTable: "students"
        day_id: {type: Number, nullable: false}, //, foreign: "id", inTable: "days"
        time: Number,
    }, {index: 'day_id'});
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
    if (global.kiosk_mode) {
        mainWindow = new BrowserWindow({
            kiosk: true
        })
    } else {
        mainWindow = new BrowserWindow({
            height: 563,
            useContentSize: true,
            width: 1000
        })
    }

    mainWindow.loadURL(winURL)
    /*if (argv.dev)*/
    mainWindow.webContents.openDevTools();
    global.mainWindow = mainWindow;

    mainWindow.on('closed', () => {
        mainWindow = null
        global.mainWindow = null;
    })
}

let config = global.config = new Config();

authenticator.options = {crypto};
if(!config.has('totp-secret')){
    config.set('totp-secret', authenticator.generateSecret(20)); //TODO: https://pypi.org/project/pyotp/
    console.log('New Secret: ', config.get('totp-secret'));
}

const server = express();

server.use(bodyParser.urlencoded())

server.use(async(req,res,next)=>{
    try{
        return next();
    }catch (e) {
        res.status(500).json({errors: [e.toString()], error: e});
    }
})

const valid = validations => {
    return async(req, res, next)=> {
        await Promise.all(validations.map((v) => v.run(req)));
        const e = validationResult(req);
        if (e.isEmpty()) {
            return next();
        }
        res.status(422).json({errors: e.array()});
    }
}

const getDay = d => {
    return async (req,res,next)=>{
        return await valid([query('day_id').exists().isNumeric()])(req, res, async ()=>{
            if(!validationResult(req).isEmpty()) return;
            let day = await TheDay.loadFromID(req.query.day_id);
            if(!day) {
                console.log('OOOPS')
                let e = new RuntimeError(3);
                res.status(404).json({error: {code: e.code, message: e.message}})
                return;
            }
            req.day = day;
            return next()
        });
    };
}

server.post('/day',valid([query('daystamp').exists().isNumeric()]), async (req,res) =>{
    let day = await TheDay.loadFromDayStamp(req.query.daystamp)
    if(!day) day = await TheDay.startNewDayFromDaystamp(req.query.daystamp)
    res.json({
        status: day.config.ended?"ended":"opened",
        id: day.id
    })
})

server.get('/day', getDay(), async(req, res)=>{
    let day = req.day;
    res.json({
        'day_id': day.id,
        status: day.config.ended?"ended":"opened",
        count_free: await day.getList({withWhoNotPays: true, count: true}),
        count_not_free: await day.getList({withWhoPays: true, count: true}),
        price_free: day.free,
        price_not_free: day.not_free
    });
})


server.delete('/day', getDay(), async(req, res)=>{
    req.day.removeDay()
    res.json({status: 'success'});
})

server.get('/records_list', getDay(), async (req, res)=>{
    let day = req.day;
    let records = await day.getList({});
    console.log(records);
    let n = [];
    for(let r of records){
        r.student_id=await TheStudent.loadFromID(r.student_id, false);
        n.push(r);
    }
    res.json(n);
})

server.post('/save_price', [body('free').exists().isDecimal(),body('not_free').exists().isDecimal(), getDay()], async(req,res)=>{
    let day = req.day;
    await day.editPrice(req.body.free, req.body.not_free)
    res.json({status: 'success'});
})


server.post('/record_student', [body('code').exists(), getDay()], async(req, res)=>{
    try{
        let day = req.day;
        console.log(req.body);
        let student = await TheStudent.loadFromCode(req.body.code, true);
        await day.recordStudent(student);
        res.json({name: student.name, group: student.group, pays: student.pays, id: student.code});
    }catch (e) {
        if(e instanceof RuntimeError){
            res.status(400);
            res.json({error: {code: e.code, message: e.message}});
        }
        else throw e;
    }
})


server.use(async(e,req,res,next)=>{
    return res.status(500).json({errors: [e.toString()], error: e})
})

app.on('ready', async () => {
    await initDB(db)
    createWindow()
    let s = server.listen(9321, ()=>{
        console.log(s.address())
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
promiseIpc.on('changeKioskMode', async (state) => {
    global.kiosk_mode = Boolean(state);
    global.mainWindow.webContents.reload();
    global.mainWindow.setKiosk(global.kiosk_mode);
});

promiseIpc.on('getMonths', async (e) => {
    let url = path.join(app.getPath('userData'), 'data/');
    let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return [true, true, true, true, true, true, true, true, true, true, true, true,];
    let res = await Promise.all(months.map(async (e) => {
        if (fs.existsSync(path.join(url, e + '/'))) {
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
            return count > 0;
        }
        return false;
    }));
    return res;
});

promiseIpc.on('getMonthData', async ({month}) => {
    let data = {};
    console.log('getting month data', month);
    let begin = Math.round(DateTime.local().set({month}).startOf('month').toSeconds() / (60 * 60 * 24));
    let end = Math.round(DateTime.local().set({month}).endOf('month').toSeconds() / (60 * 60 * 24));
    let days = await db.raw(db.knex('days').select('*').whereBetween('day', [begin, end]), true);
    console.log(days);
    for (let d of days) {
        let day = new TheDay(d);
        console.log(day);
        let i = DateTime.fromSeconds(day.daystamp * 60 * 60 * 24).day;
        let students = (await day.getList({count: true}));
        console.log(students, i)
        data[i] = {
            type: day.isEnded() ? 'ended' : 'started',
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
        if (k % 2 === 1) ws.cell(last, 1, last, 1 + data.length + 2).style({
            fill: {
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
    let stC = {fill: {type: 'pattern', patternType: 'solid', bgColor: '#f2f2f2', fgColor: '#f2f2f2'}};
    ws.cell(2, 1 + data.length + 1, last, 1 + data.length + 2).style(stC);
    ws.cell(last - 1, 2, last, 1 + data.length + 2).style(stC);
    ws.setPrintArea(2, 1, last, 1 + data.length + 2);
    //return ws;
};
let monthNames = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',];
promiseIpc.on('generateExcel', async (e) => {
    let mth = e.month;
    let month = e.month;
    let data = [];
    let begin = Math.trunc(DateTime.local().set({month}).startOf('month').toSeconds() / (60 * 60 * 24));
    let end = Math.trunc(DateTime.local().set({month}).endOf('month').toSeconds() / (60 * 60 * 24));
    let days = await db.raw(db.knex('days').whereBetween('day', [begin, end]), true);
    for (let d of days) {
        let day = new TheDay(d);
        if (day.isEnded()) {
            data.push({
                students: await day.getRecords(),
                price: day.getPrice(),
                day: DateTime.fromSeconds(day.daystamp * 60 * 60 * 24).day
            });
        }
    }
    let wb = new xl.Workbook({});
    let styleCentered = {alignment: {horizontal: 'center', vertical: 'center'}};
    let stCell = wb.createStyle(merge({}, styleCentered));
    let students = await TheStudent.loadAll();
    let classes = uniqWith(students, (a, b) => a.group == b.group).map((e) => e.group).sort();
    let mntn = monthNames[mth - 1];
    generateWS(wb, 'Общая', "Общий отчёт питания по всей школе за " + mntn, students, data, stCell);
    students = await TheStudent.loadAll({pays: true});
    generateWS(wb, 'Общая П', "Общий отчёт платного питания по всей школе за " + mntn, students, data, stCell);
    students = await TheStudent.loadAll({pays: false});
    generateWS(wb, 'Общая Б', "Общий отчёт бесплатного питания по всей школе за " + mntn, students, data, stCell);
    for (let i = 0; i < classes.length; i++) {
        students = await TheStudent.loadAll({pays: true, group: classes[i]});
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
        defaultPath: 'Полный отчёт питания школы за ' + mntn,
        filters: [{name: 'Таблица Excel', extensions: ['xlsx']}]
    }, (file) => {
        if(file)
            wb.writeToBuffer().then((buf) => {
                fs.writeFileSync(file, buf);
            })
    });
});

import Zip from 'adm-zip';
promiseIpc.on('importDB', async (e) => {
    try {
        let file = await dialog.showOpenDialog(getGlobal('mainWindow'), {
            title: 'Открытие базы данных',
            filters: [{name: 'База данных', extensions: ['db', 'sqlite']}]
        });
        if (!file) return;
        file = file[0];
        console.log(file)
        let answ = await dialog.showMessageBox(getGlobal('mainWindow'), {
            type: 'question',
            buttons: ['Сделать слияние с текущей', 'Заменить базу данных', "Отменить операцию"],
            message: 'Что вы желаете сделать?',
            title: 'Импор базы данных',
            cancelId: 2,
        });
        console.log(answ)
        switch (answ) {
            case 2:
                return;
                break;
            case 1:
                let retry = await dialog.showMessageBox(getGlobal('mainWindow'), {
                    type: 'question',
                    buttons: ['Да', "Отмена"],
                    message: 'Вы действительно хотите заменить базу данных?',
                    title: 'Импорт базы данных',
                    cancelId: 1,
                    noLink: true
                });
                if (retry.response == 0) {
                    db.getModel('students').clear();
                    db.getModel('days').clear();
                    db.getModel('records').clear();
                }
        }
        let newdb = connect(file, {
            client: 'sql.js'
        })
        await initDB(newdb);
        // let students = await newdb.getModel('students').find();
        // for (let student of students) {
        //     await TheStudent.newOrEdit(student);
        // }
        let days = await newdb.getModel('days').find();
        for (let day of days) {
            console.log(day)
            await TheDay.startDayOrEdit(day)
        }
        // let records = await newdb.getModel('records').find();
        // for (let record of records) {
        //     try {
        //         let st = await TheStudent.loadFromID(record.student_id, true);
        //         if (!st) continue;
        //         let inday = await TheDay.loadFromID(record.day_id, () => newdb);
        //         let day = await TheDay.loadFromDayStamp(inday.daystamp);
        //         await day.recordStudent(st);
        //     } catch (e) {
        //
        //     }
        // }
        dialog.showMessageBox(getGlobal('mainWindow'), {
            title: 'Импорт выполен успешно',
            message: 'Импорт выполен успешно',
        });
    }catch (e) {
        console.log(e);
        dialog.showErrorBox("При импорте произошла ошибка", e.toString());
    }
});

promiseIpc.on('importZip', async (e) => {
    let url = path.join(app.getPath('userData'), 'data/');
    let folder = await dialog.showOpenDialog(mainWindow, {
        title: 'Открытие базы данных',
        properties: ['openDirectory']
    });
    if(!folder) return;
    folder = folder[0];
    let dbb = nedb({
        filename: path.join(folder, 'students.json'),
        autoload: true
    });
    console.log(path.join(folder, 'students.json'));
    let stu = {};
    if(dbb) {
        console.log('file is found')
        let st = await dbb.find({});
        console.log(st);
        let d = null, countSt = 0;
        try {
            for (let i in st) {
                d = st[i];
                let ss = await TheStudent.newOrEdit({code: d.code, name: d.name, group: d.group, pays: d.pays});
                stu[d.studentID] = ss.code;
                countSt++;
            }
        } catch (e) {
            console.log('error in', d);
            console.error(e);
            dialog.showMessageBox(getGlobal('mainWindow'), {
                title: 'Импорт выполнен частично',
                message: 'Импорт выполен частично. Произошла ошибка.',
                detail: 'Количество импортированных учеников: ' + count
            });
        }
    }
    console.log(stu);
    url = path.join(folder, 'data/');
    for (let e = 1; e < 13; e++) {
        if (fs.existsSync(path.join(url, e + '/'))) {
            for (let i = 1; i < 32; i++) {
                let p = path.join(url, e + '/' + i + '.json');
                if (!fs.existsSync(p)) continue;
                let vdb = nedb({
                    filename: p,
                    timestampData: true,
                    autoload: true
                });
                let conf = await vdb.findOne({type: 'config'});
                if (conf === null || conf.started == false) continue;
                let day = await TheDay.startOrLoadDayFromDate(e, i);
                let rds = await vdb.find({type: 'record'});
                for (let rdi in rds) {
                    console.log(rds[rdi])
                    let st = await TheStudent.loadFromCode(stu[rds[rdi].studentID], false);
                    console.log(st);
                    if (!st) {dialog.showMessageBox(getGlobal('mainWindow'), {
                        message: 'Ученик не был вставлен.',
                        detail: 'Месяц:' + e + ', день:' + i + ' id:' + rds[rdi].studentID
                    });break;}
                    try {
                        await day.recordStudent(st);
                    } catch (e) {
                        if (!(e instanceof RuntimeError)) {
                            throw e;
                        }
                    }
                }
            }
        }
    }
    ;
    dialog.showMessageBox(getGlobal('mainWindow'), {
        title: 'Импорт выполен успешно',
        message: 'Импорт выполен успешно',
    });

});