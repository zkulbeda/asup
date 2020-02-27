let {dialog, getGlobal} = require('electron').remote;
let askUser = (d) => dialog.showMessageBox(getGlobal('mainWindow'),{
        type: "question",
        title:"Окно выбора камеры",
        detail: "Выберите камеру:",
        buttons: d.map((d)=>d.label),
        cancelId: -1,
    }).then(({response})=>{
        console.log(response)
        if(response==-1) throw null;
        return d[response];
    });
export default function getCameras(auto = true){
  return navigator.mediaDevices.enumerateDevices()
    .then((devices)=> {
        console.log(devices);
        let d = devices.filter((e) => e.kind === 'videoinput');
        if (d.length === 1) return Promise.resolve(d[0].deviceId);
        if (d.length === 0)
            return dialog.showMessageBox(getGlobal('mainWindow'),{
                type: "error",
                title:"Камеры не найдены",
                detail: "Нет подсоединенных камер",
                buttons: ['Повторить попытку', 'Отмена'],
                cancelId: -1,
            }).then(({response})=>{
                console.log(response);
                if(response==-1 || response==1) throw null;
                return getCameras();
            });
        return askUser(d);
    });
};