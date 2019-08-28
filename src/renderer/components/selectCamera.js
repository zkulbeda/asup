let {dialog, getGlobal} = require('electron').remote;
let askUser = (d) => new Promise((ok,err)=>{
    dialog.showMessageBox(getGlobal('mainWindow'),{
        type: "question",
        title:"Окно выбора камеры",
        detail: "Выберите камеру:",
        buttons: d.map((d)=>d.label),
        cancelId: -1,
    }, (res)=>{
        if(res==-1) err(null);
        else ok(d[res].deviceId);
    });
});
export default function getCameras(auto = true){
  return navigator.mediaDevices.enumerateDevices()
    .then((devices)=> {
        console.log(devices);
        let d = devices.filter((e) => e.kind === 'videoinput');
        if (d.length === 1) return Promise.resolve(d[0].deviceId);
        if (d.length === 0) return new Promise((ok, err) => {
            dialog.showMessageBox(getGlobal('mainWindow'),{
                type: "error",
                title:"Камеры не найдены",
                detail: "Нет подсоединенных камер",
                buttons: ['Повторить попытку', 'Отмена'],
                cancelId: -1,
            }, (res)=>{
                if(res==-1 || res==1) err(null);
                else getCameras().then(ok,err);
            });
        });
        return askUser(d);
    });
};