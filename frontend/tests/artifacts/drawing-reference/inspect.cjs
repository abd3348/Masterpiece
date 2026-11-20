const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const source='C:/Users/user/AppData/Local/Packages/Microsoft.ScreenSketch_8wekyb3d8bbwe/TempState/Recordings/20261102-1131-49.7455754.mp4';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let browser,ws;
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'campus-video-'));
 browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<100;i++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break}catch{}await sleep(100)}
 if(!port)throw Error('Browser did not start');
 const target=await(await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,m=>m.error?reject(Error(m.error.message)):resolve(m.result));ws.send(JSON.stringify({id,method,params}))});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 await send('Page.enable');await send('Page.navigate',{url:'about:blank'});
 await ev('document.body.innerHTML='+JSON.stringify('<video id="v" muted preload="auto" src="data:video/mp4;base64,'+fs.readFileSync(source).toString('base64')+'"></video>'));
 const meta=await ev('(async()=>{const v=document.getElementById("v");if(v.readyState<1)await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(Error("Video could not load"))});return {duration:v.duration,width:v.videoWidth,height:v.videoHeight}})()');console.log(JSON.stringify(meta));
 for(let i=0;i<4;i++){
  const t=Math.min(meta.duration-.05,Math.max(.05,meta.duration*i/4));
  const data=await ev('(async()=>{const v=document.getElementById("v");await new Promise(r=>{v.onseeked=r;v.currentTime='+t+'});const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);return c.toDataURL("image/png").split(",")[1]})()');
  fs.writeFileSync(path.join(__dirname,'frame-'+i+'.png'),Buffer.from(data,'base64'));
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{ws?.close();browser?.kill()});
