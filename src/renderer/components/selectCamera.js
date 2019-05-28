let {dialog, getGlobal} = require('electron').remote;
export default function(){
  return navigator.mediaDevices.enumerateDevices()
    .then((devices)=>{
      console.log(devices);
      let d = devices.filter((e)=>e.kind ==='videoinput');
      return new Promise((ok,err)=>{
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
    });
};