// Structural verification only. Actual Figma rendering still requires Desktop execution.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
let next=1;const nodes=new Map(),variables=new Map(),collections=new Map();
class Node {
  constructor(type){this.type=type;this.id='test:'+next++;this.name=type;this.children=[];this.width=100;this.height=100;this.paddingLeft=this.paddingRight=this.paddingTop=this.paddingBottom=0;this.itemSpacing=0;this.fills=[];this.strokes=[];this.reactions=[];this.data={};this.fontName={family:'DM Sans',style:'Regular'};nodes.set(this.id,this);}
  appendChild(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);this.children.push(n);n.parent=this;}
  resize(w,h){assert(Number.isFinite(w)&&w>0,'Invalid width '+this.name);assert(Number.isFinite(h)&&h>0,'Invalid height '+this.name);this.width=w;this.height=h;}
  setPluginData(k,v){this.data[k]=v;}
  getPluginData(k){return this.data[k]||'';}
  setBoundVariable(k,v){assert(v===null||v.id,'Missing variable');this.boundVariables={...this.boundVariables,[k]:v};}
  findAllWithCriteria({types}){const found=[];for(const n of this.children){if(types.includes(n.type))found.push(n);found.push(...n.findAllWithCriteria({types}));}return found;}
  addComponentProperty(k,type,value){this.componentPropertyDefinitions||={};const id=k+'#'+this.id;this.componentPropertyDefinitions[id]={type,defaultValue:value};return id;}
  createInstance(){const copy=(src)=>{const n=new Node(src===this?'INSTANCE':src.type);for(const k of ['name','width','height','fontName','characters','textStyleId','componentPropertyReferences'])if(src[k]!==undefined)n[k]=structuredClone(src[k]);for(const child of src.children)n.appendChild(copy(child));return n;};const n=copy(this);n.componentProperties=Object.fromEntries(Object.entries(this.componentPropertyDefinitions).map(([k,v])=>[k,{type:v.type,value:v.defaultValue}]));return n;}
  setProperties(values){for(const [key,value]of Object.entries(values)){assert(this.componentProperties[key],'Unknown property '+key);this.componentProperties[key].value=value;for(const t of this.findAllWithCriteria({types:['TEXT']}))if(t.componentPropertyReferences?.characters===key)t.characters=value;}}
  async setReactionsAsync(reactions){for(const r of reactions){assert.equal(r.trigger.type,'ON_CLICK');for(const a of r.actions){assert(['NODE','SET_VARIABLE','CLOSE','CONDITIONAL'].includes(a.type));if(a.type==='NODE')assert(nodes.has(a.destinationId),'Missing destination');}}this.reactions=reactions;}
}
const document=new Node('DOCUMENT');const originalPage=new Node('PAGE');originalPage.name='Original content';document.appendChild(originalPage);const originalFrame=new Node('FRAME');originalFrame.name='User work';originalPage.appendChild(originalFrame);
let finish;const done=new Promise(r=>finish=r);let message='';
const figma={
  fileKey:'AIZ6AGq0gXUfHv2PD5mhZz',root:document,currentPage:originalPage,
  createPage(){const p=new Node('PAGE');document.appendChild(p);return p;},
  createFrame(){const n=new Node('FRAME');this.currentPage.appendChild(n);return n;},
  createText(){const n=new Node('TEXT');this.currentPage.appendChild(n);return n;},
  createRectangle(){const n=new Node('RECTANGLE');this.currentPage.appendChild(n);return n;},
  createComponent(){const n=new Node('COMPONENT');this.currentPage.appendChild(n);return n;},
  async getNodeByIdAsync(id){return nodes.get(id)||null;},async setCurrentPageAsync(p){this.currentPage=p;},
  async listAvailableFontsAsync(){return ['DM Sans|Regular','DM Sans|Medium','DM Sans|Bold','Playfair Display|Regular'].map(x=>{const [family,style]=x.split('|');return {fontName:{family,style}};});},async loadFontAsync(){},
  createTextStyle(){return {id:'style:'+next++};},base64Decode(s){return Buffer.from(s,'base64');},createImage(data){assert(data.length>0);return {hash:'image:'+next++};},
  closePlugin(s){message=s;finish();},viewport:{scrollAndZoomIntoView(){}},
  variables:{
    createVariableCollection(name){const c={id:'collection:'+next++,name,defaultModeId:'mode:1'};collections.set(c.id,c);return c;},
    createVariable(name,c,type){const id='variable:'+next++;assert(collections.has(typeof c==='string'?c:c.id));const v={id,name,resolvedType:type,setValueForMode(mode,value){this.value=value;},setVariableCodeSyntax(){}};variables.set(id,v);return v;},
    async getVariableByIdAsync(id){return variables.get(id);},async getVariableCollectionByIdAsync(id){return collections.get(id);},setBoundVariableForPaint(p,k,v){assert(v);return {...p,boundVariables:{[k]:{id:v.id}}};}
  }
};
const code=fs.readFileSync(__dirname+'/code.js','utf8');
(async()=>{
 vm.runInNewContext(code,{figma,Uint8Array,console},{timeout:30000});await done;
 assert(message.startsWith('Created '),message);
 const page=document.children.find(p=>p.name==='Campus Mate · Interactive Mockups');
 const report=JSON.parse(page.getPluginData('campus-prototype-report'));
 assert.equal(report.screens,40);assert.equal(report.unresolved.length,0);assert.equal(report.errors.length,0);assert(report.interactions>400);assert.equal(page.flowStartingPoints.length,4);
 assert.equal(originalPage.children[0],originalFrame);assert.equal(originalFrame.name,'User work');
 const starts=page.flowStartingPoints.map(f=>nodes.get(f.nodeId));
 const seen=new Set();const queue=[starts[0]];
 function destinations(actions){return actions.flatMap(a=>a.type==='NODE'?[nodes.get(a.destinationId)]:a.type==='CONDITIONAL'?a.conditionalBlocks.flatMap(b=>destinations(b.actions)):[]);}
 while(queue.length){const root=queue.shift();if(seen.has(root.id))continue;seen.add(root.id);for(const n of [root,...root.findAllWithCriteria({types:['FRAME','INSTANCE','TEXT']})])for(const r of n.reactions)queue.push(...destinations(r.actions));}
 const roots=JSON.parse(page.getPluginData('campus-screen-roots'));
 const unreachable=Object.entries(roots).filter(([,id])=>!seen.has(id)).map(([name])=>name);
 assert.deepEqual(unreachable,[],'Screens unreachable from public start');
 // Rerun must preserve a complete build rather than duplicating output.
 const count=nodes.size;vm.runInNewContext(code,{figma,Uint8Array,console},{timeout:30000});await new Promise(r=>setImmediate(r));assert.equal(nodes.size,count);assert(message.startsWith('Prototype already exists'));
 const result={...report,totalNodes:nodes.size,allScreensReachable:true,rerunPreservesOutput:true,originalContentPreserved:true,validation:'Local Figma API simulation. Not rendered or executed in real Figma.'};
 fs.writeFileSync(__dirname+'/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
