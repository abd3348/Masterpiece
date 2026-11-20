/* Native Figma plugin runtime. This file is bundled with the existing screen builder. */
const OUTPUT_PAGE = 'Campus Mate · Interactive Mockups';
const ASSETS_PAGE = 'Campus Mate · Prototype Components';
const TARGET_FILE = 'AIZ6AGq0gXUfHv2PD5mhZz';
const report = {screens: 0, controls: 0, interactions: 0, overlays: 0, unresolved: [], errors: []};
const wired = new Set();
const rgb = hex => ({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const solid = hex => [{type:'SOLID',color:rgb(hex)}];
const navAction = id => ({type:'NODE',destinationId:id,navigation:'NAVIGATE',transition:{type:'DISSOLVE',duration:.18,easing:{type:'EASE_OUT'}},resetScrollPosition:true});
const overlayAction = id => ({type:'NODE',destinationId:id,navigation:'OVERLAY',transition:{type:'DISSOLVE',duration:.15,easing:{type:'EASE_OUT'}},overlayRelativePosition:{x:400,y:140}});
async function wire(node, actions) {
  await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions}]);
  wired.add(node.id); report.interactions++;
}
function layout(parent,name,width,gap=16) {
  const n=createAutoLayout('VERTICAL');n.name=name;n.resize(width,100);n.counterAxisSizingMode='FIXED';n.primaryAxisSizingMode='AUTO';n.fills=[];n.itemSpacing=gap;parent.appendChild(n);return n;
}
function label(parent,value,size=16,color='#1d302b',family='DM Sans',style='Regular') {
  const n=figma.createText();n.name=value;n.fontName={family,style};n.fontSize=size;n.lineHeight={unit:'PERCENT',value:140};n.characters=value;n.fills=solid(color);parent.appendChild(n);n.resize(Math.max(24,parent.width-(parent.paddingLeft||0)-(parent.paddingRight||0)),30);n.textAutoResize='HEIGHT';return n;
}
function textProp(component,node,key,value) {
  const id=component.addComponentProperty(key,'TEXT',value);node.componentPropertyReferences={characters:id};
}
async function foundations() {
  let page=figma.root.children.find(p=>p.name===ASSETS_PAGE);
  if(page) {const saved=page.getPluginData('campus-foundations');if(saved)return JSON.parse(saved);throw Error('Component page exists without a completed foundation record; inspect it before rebuilding.');}
  page=figma.createPage();page.name=ASSETS_PAGE;await figma.setCurrentPageAsync(page);
  const collection=figma.variables.createVariableCollection('Campus Mate · Prototype');
  const tokens={};const styles={};const components={};
  const colors={paper:'#f7f3ea',surface:'#fffcf7',ink:'#1d302b',muted:'#6d7972',brand:'#173d36',sage:'#e8eee3',line:'#e3ded2',gold:'#dfa375',white:'#ffffff'};
  for(const [key,value]of Object.entries(colors)){
    const v=figma.variables.createVariable('Color/'+key,collection,'COLOR');v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];v.setValueForMode(collection.defaultModeId,rgb(value));v.setVariableCodeSyntax('WEB','var(--'+(key==='brand'?'green':key)+')');tokens[key]=v.id;
  }
  for(const [key,value]of Object.entries({s8:8,s12:12,s16:16,s24:24,s32:32,s48:48,s64:64,r8:8,r16:16,r24:24,r999:999})){
    const v=figma.variables.createVariable((key[0]==='s'?'Spacing/':'Radius/')+value,collection,'FLOAT');v.scopes=key[0]==='s'?['GAP']:['CORNER_RADIUS'];v.setValueForMode(collection.defaultModeId,value);v.setVariableCodeSyntax('WEB','var(--campus-'+key+')');tokens[key]=v.id;
  }
  for(const [key,size,family,style]of [['heading',42,'Playfair Display','Regular'],['section',23,'Playfair Display','Regular'],['body',15,'DM Sans','Regular'],['label',13,'DM Sans','Medium'],['caption',12,'DM Sans','Regular']]){
    const s=figma.createTextStyle();s.name='Campus Mate/'+key;s.fontName={family,style};s.fontSize=size;s.lineHeight={unit:'PERCENT',value:145};styles[key]=s.id;
  }
  let y=0;
  for(const name of ['Button primary','Button secondary','Badge','Navigation item','Field','Stat','AI button']){
    const c=figma.createComponent();page.appendChild(c);c.name='Campus Mate/'+name;c.x=100;c.y=y;c.layoutMode=name==='Field'||name==='Stat'?'VERTICAL':'HORIZONTAL';c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='AUTO';c.itemSpacing=8;c.paddingLeft=c.paddingRight=16;c.paddingTop=c.paddingBottom=12;c.cornerRadius=name==='Badge'?999:12;
    const bg=['Button primary','AI button'].includes(name)?'brand':name==='Button secondary'?'surface':name==='Badge'?'sage':'surface';
    c.fills=[figma.variables.setBoundVariableForPaint({type:'SOLID',color:rgb(colors[bg])},'color',await figma.variables.getVariableByIdAsync(tokens[bg]))];
    c.setBoundVariable('cornerRadius',await figma.variables.getVariableByIdAsync(tokens[name==='Badge'?'r999':'r16']));
    const t=label(c,name==='Field'?'Field label':name==='Stat'?'Statistic':'Button',name==='Stat'?13:14,['Button primary','AI button'].includes(name)?'#ffffff':'#173d36','DM Sans','Medium');t.textAutoResize='WIDTH_AND_HEIGHT';textProp(c,t,'Label',t.characters);
    if(name==='Field'||name==='Stat'){const v=label(c,name==='Field'?'Choose a value':'03',name==='Stat'?28:14);v.textAutoResize='WIDTH_AND_HEIGHT';v.name='Value';textProp(c,v,'Value',v.characters);c.resize(name==='Field'?380:220,c.height);c.counterAxisSizingMode='FIXED';}
    c.description='Reusable '+name+' for the Campus Mate project prototype.';components[name]=c.id;y+=c.height+36;
  }
  const value={pages:{foundation:page.id},tokens,styles,components,collection:collection.id};page.setPluginData('campus-foundations',JSON.stringify(value));return value;
}
function choicesFor(title) {
  if(/password/i.test(title))return ['Campus123','TestingPass1'];
  if(/email/i.test(title))return ['tenant@campus.test','owner@campus.test','admin@campus.test'];
  if(/date|from|until/i.test(title))return ['1 Nov 2026','1 Dec 2026','1 May 2027'];
  if(/time/i.test(title))return ['10:00','14:30','17:00'];
  if(/duration/i.test(title))return ['30 minutes','6 months','12 months'];
  if(/area|location|city|destination/i.test(title))return ['Jubeiha, Amman','Sweileh, Amman','Shafa Badran, Amman'];
  if(/budget|price|rent|amount/i.test(title))return ['150','190','220'];
  if(/occupancy/i.test(title))return ['I will rent alone','I will rent with a roommate'];
  if(/roommate/i.test(title))return ['Ahmad','Yazan','Mahmoud'];
  if(/photo|video|walkthrough/i.test(title))return ['Sample media selected','No media'];
  if(/furniture/i.test(title))return ['Furnished','Unfurnished'];
  if(/bedroom|bathroom/i.test(title))return ['1','2','3'];
  if(/type|housing|space/i.test(title))return ['Apartment','Studio','Private room'];
  if(/name/i.test(title))return ['Sara Ahmad','Mohammad','Abdallah'];
  if(/mobile|phone/i.test(title))return ['0791234567','0781234567'];
  return ['Sample information entered','Updated information','No preference'];
}
async function connect(page, roots) {
  const refs=Object.fromEntries(SCREEN_SPECS.map(s=>[s.id,roots[s.id]]));
  const screens=await Promise.all(SCREEN_SPECS.map(s=>figma.getNodeByIdAsync(refs[s.id])));
  let overlayIndex=0;
  function modal(title,body,width=480){
    const f=layout(page,'Overlay / '+title,width,16);f.x=9000+(overlayIndex%6)*600;f.y=Math.floor(overlayIndex/6)*800;overlayIndex++;f.fills=solid('#fffcf7');f.paddingLeft=f.paddingRight=f.paddingTop=f.paddingBottom=32;f.cornerRadius=24;label(f,title,26,'#173d36','Playfair Display');if(body)label(f,body,15,'#6d7972');report.overlays++;return f;
  }
  const primary=await figma.getNodeByIdAsync(FOUNDATIONS.components['Button primary']);
  async function modalButton(parent,title,actions){const n=primary.createInstance();parent.appendChild(n);n.name='Action / '+title;const k=Object.keys(primary.componentPropertyDefinitions).find(k=>k.split('#')[0]==='Label');n.setProperties({[k]:title});await wire(n,actions);return n;}
  const acknowledgementCache=new Map();
  async function acknowledge(title,body,destination){
    const key=title+'|'+destination;if(acknowledgementCache.has(key))return acknowledgementCache.get(key);
    const f=modal(title,body);await modalButton(f,'Continue',destination?[navAction(refs[destination])]:[{type:'CLOSE'}]);await modalButton(f,'Close',[{type:'CLOSE'}]);acknowledgementCache.set(key,f.id);return f.id;
  }
  const publicNav={'Home':'public-index','Homes':'public-properties','Market':'public-market','About us':'public-about','Support':'public-support','Sign in':'auth-login'};
  const tenantNav={'Home':'tenant-home','Roommates':'tenant-roommates','Favorites':'tenant-favorites','Meetings':'tenant-meetings','Requests':'tenant-requests','Rentals & arrangements':'tenant-rentals','Partial rentals':'tenant-sublets','Profile':'tenant-profile'};
  const ownerNav={'My properties':'landlord-dashboard','Requests':'landlord-requests','Arrangements':'landlord-bookings','Add property':'landlord-add','Meetings':'landlord-meetings','Profile':'landlord-profile'};
  const adminNav={'Overview':'admin-overview','Users':'admin-users','Properties':'admin-properties','Reports':'admin-reports','Analysis':'admin-analysis','Activity':'admin-activity','Profile':'admin-profile'};
  const roleHome={tenant:'tenant-home',landlord:'landlord-dashboard',admin:'admin-overview'};
  // One role chooser for signing in: all role flows are reachable without changing editor state.
  const login=modal('Choose your demo account','Preview the complete project as a tenant, landlord or administrator.');
  for(const role of ['tenant','landlord','admin'])await modalButton(login,role,[navAction(refs[roleHome[role]])]);
  await modalButton(login,'Cancel',[{type:'CLOSE'}]);
  const direct={
    'Find a home ↗':'public-properties','Search homes':'public-properties','Explore homes ↗':'public-properties','View home ↗':'public-property','View home':'public-property','I have a property':'auth-register','Create an account':'auth-register','Already have an account?':'auth-login','Request to rent ↗':'tenant-request','Send rental request ↗':'tenant-requests','Explore roommates':'tenant-roommates','Choose for rental':'tenant-request','Edit housing preferences':'tenant-preferences','Edit housing profile':'tenant-preferences','Continue rental setup ↗':'tenant-rentals','Review agreement':'tenant-rentals','Agreement & checklist':'tenant-inspection','Accept agreement & inspect ↗':'tenant-inspection','Save checklist & confirm arrangement ↗':'tenant-payment','Confirm arrangement & continue':'tenant-rentals','Condition reports ↗':'tenant-condition','Record move-out & compare':'tenant-condition','Edit offer':'state-edit-offer','Save changes':'tenant-sublets','+ Add a property':'landlord-add','Open market dashboard':'public-market','Review listing':'public-property','AI · Analyze property video':'state-video-analysis','Analyze property video':'state-video-analysis','View sample analysis':'state-video-analysis'
  };
  for(let i=0;i<screens.length;i++){
    const root=screens[i],spec=SCREEN_SPECS[i];
    const go=id=>[navAction(refs[id])];
    const all=root.findAllWithCriteria({types:['INSTANCE','FRAME','TEXT']});
    const controls=all.filter(n=>/^(Action|Nav|Input|Link) \/ /.test(n.name)||['Account','Brand','Global search'].includes(n.name));
    for(const n of controls){
      report.controls++;const title=n.name.replace(/^(Action|Nav|Input|Link) \/ /,'').replace(/✳[︎ ]*/g,'');
      if(n.name.startsWith('Input / ')){
        const f=modal('Choose '+title,'Prototype sample values. The connected application supports real form entry.');
        const valueNode=n.findAllWithCriteria({types:['TEXT']}).find(t=>t.name==='Value');
        const variable=figma.variables.createVariable('Preview/'+spec.id+'/'+n.id.replace(':','-'),FOUNDATIONS.collection,'STRING');variable.scopes=['TEXT_CONTENT'];variable.setValueForMode((await figma.variables.getVariableCollectionByIdAsync(FOUNDATIONS.collection)).defaultModeId,valueNode?valueNode.characters:'');
        if(valueNode)valueNode.setBoundVariable('characters',variable);
        for(const option of choicesFor(title))await modalButton(f,option,[{type:'SET_VARIABLE',variableId:variable.id,variableValue:{type:'STRING',resolvedType:'STRING',value:option}},{type:'CLOSE'}]);
        await modalButton(f,'Cancel',[{type:'CLOSE'}]);await wire(n,[overlayAction(f.id)]);continue;
      }
      if(n.name.startsWith('Nav / ')){const menu=spec.role==='tenant'?tenantNav:spec.role==='landlord'?ownerNav:spec.role==='admin'?adminNav:publicNav;const dest=menu[title]||publicNav[title];if(!dest)throw Error('Unmapped navigation '+title);await wire(n,go(dest));continue;}
      if(n.name==='Brand'){await wire(n,go(roleHome[spec.role]||'public-index'));continue;}
      if(n.name==='Account'){await wire(n,go(spec.role==='public'?'auth-login':spec.role==='auth'?'auth-register':spec.role+'-profile'));continue;}
      if(n.name==='Global search'){await wire(n,go('public-properties'));continue;}
      if(n.name.startsWith('Link / ')){await wire(n,go('public-'+title.toLowerCase()));continue;}
      if(title==='Sign in ↗'||title==='Create account ↗'){await wire(n,[overlayAction(login.id)]);continue;}
      if(title==='Book a meeting'||title==='Meet a landlord'){await wire(n,go(spec.role==='landlord'?'landlord-meetings':'tenant-meetings'));continue;}
      if(title==='Review proposed rent in profile'){await wire(n,go('landlord-profile'));continue;}
      if(title==='Cancel'){await wire(n,go(spec.id==='state-edit-offer'?'tenant-sublets':spec.role==='landlord'?'landlord-meetings':'tenant-meetings'));continue;}
      if(direct[title]){await wire(n,go(direct[title]));continue;}
      if(title==='AI assistant'){
        const f=modal('Campus Mate assistant','Choose a question to explore the project. This preview uses prepared answers.');
        for(const [q,id]of [['Find a home','public-properties'],['How do rental arrangements work?','public-faq'],['Find a roommate','tenant-roommates'],['Contact support','public-support']])await modalButton(f,q,go(id));
        await modalButton(f,'Close',[{type:'CLOSE'}]);await wire(n,[overlayAction(f.id)]);continue;
      }
      const feedback={
        'Apply filters':['Filters applied','Showing furnished homes in Jubeiha within the selected sample budget.','public-properties'],
        'Save profile':['Profile saved','Your sample profile changes are ready in this prototype.'],
        'Send support request':['Support request sent','Your sample support request has been submitted.'],
        'Submit report':['Report submitted','The concern is now ready for review by the administrator.'],
        'Add review':['Review added','Your sample review has been added to Apartment #124.'],
        'Send invitation':['Invitation sent','Your meeting is pending confirmation from the other participant.'],
        'Refresh invitations':['Invitations refreshed','The latest sample invitations are displayed.'],
        'Accept':['Accepted','The sample invitation or partial rental request is accepted.'],
        'Decline':['Declined','The sample invitation or rental request has been declined.'],
        'Accept & approve terms':['Request approved','The tenant can now review the agreement.','landlord-bookings'],
        'Confirm move-in':['Move-in confirmed','Keys received. Your rental is active.','tenant-rentals'],
        'Save condition report':['Condition report saved','Your sample checklist and walkthrough are recorded.'],
        'Pay JD 20 & publish':['Listing fee confirmed','Sample JD 20 fee confirmed. The listing is ready for review.','landlord-dashboard'],
        'Continue to listing fee':['Confirm JD 20 listing fee','Preview payment: no money is charged. Continue to the property dashboard.','landlord-dashboard'],
        'Pay JD 5 & publish offer':['Offer published','Sample JD 5 publishing fee confirmed. No money is charged.','tenant-sublets'],
        'Delete':['Delete this offer?','Continue to remove the sample offer.','tenant-sublets'],
        'Confirm proposed rent':['Price confirmed','JD 175.50 is the agreed monthly rent.'],
        'Decline proposed rent':['Price proposal declined','The tenant can submit another proposal.'],
        'Send price for confirmation':['Proposal sent','JD 175.50 is awaiting the landlord’s confirmation.'],
        'Mark resolved':['Report resolved','This community concern is marked as resolved.'],
        'I am a tenant':['Tenant account selected','Continue with a tenant demo account.','tenant-home'],
        'I am a landlord':['Landlord account selected','Continue with a landlord demo account.','landlord-dashboard'],
        'Next →':['Preferences saved','Budget, housing and lifestyle preferences are ready.','tenant-home'],
        'Skip':['Preferences skipped','You can edit your housing preferences from your profile.','tenant-home'],
        'Back':['Return home','Continue to your tenant dashboard.','tenant-home'],
        'Move-in report':['Move-in report','Apartment #124 · Walls: Good · Floors: Good · Existing scuff near the door.'],
        'Move-out report':['Move-out report','Compare the walkthrough and condition checklist at the end of the stay.']
      };
      if(title==='Join meeting'){
        const f=modal('Meeting preview','Sara Ahmad · Mohammad\n30 Oct 2026 · 14:30 · 30 minutes\nThis Figma screen demonstrates the meeting controls; it does not start a real video call.');
        for(const action of ['Mute microphone','Turn camera off']){const info=await acknowledge(action+' selected','Meeting control updated in the sample preview.');await modalButton(f,action,[overlayAction(info)]);}
        await modalButton(f,'Leave meeting',[{type:'CLOSE'}]);await wire(n,[overlayAction(f.id)]);continue;
      }
      if(!feedback[title]){report.unresolved.push({screen:spec.id,title});continue;}
      const [heading,body,destination]=feedback[title];await wire(n,[overlayAction(await acknowledge(heading,body,destination))]);
    }
    // Body checkboxes, FAQs and table actions are separate editable text controls.
    for(const t of all.filter(n=>n.type==='TEXT'&&n.characters.includes('□'))){
      const initial=t.characters;const v=figma.variables.createVariable('Checkbox/'+t.id.replace(':','-'),FOUNDATIONS.collection,'STRING');v.scopes=['TEXT_CONTENT'];const collection=await figma.variables.getVariableCollectionByIdAsync(FOUNDATIONS.collection);v.setValueForMode(collection.defaultModeId,initial);t.setBoundVariable('characters',v);
      await wire(t,[{type:'CONDITIONAL',conditionalBlocks:[{condition:{type:'EXPRESSION',resolvedType:'BOOLEAN',value:{expressionFunction:'EQUALS',expressionArguments:[{type:'VARIABLE_ALIAS',resolvedType:'STRING',value:{type:'VARIABLE_ALIAS',id:v.id}},{type:'STRING',resolvedType:'STRING',value:initial}]}},actions:[{type:'SET_VARIABLE',variableId:v.id,variableValue:{type:'STRING',resolvedType:'STRING',value:initial.replace(/□/g,'☑')}}]},{actions:[{type:'SET_VARIABLE',variableId:v.id,variableValue:{type:'STRING',resolvedType:'STRING',value:initial}}]}]}]);
    }
    if(spec.kind==='faq')for(const f of all.filter(n=>n.type==='FRAME'&&n.name.endsWith('  +'))){const info=await acknowledge(f.name.slice(0,-3),f.name.includes('paid')?'Rent and deposits are paid directly to the landlord.':'Explore homes, choose a roommate, send a rental request, review the agreement and arrange handover directly with the landlord.');await wire(f,[overlayAction(info)]);}
    if(spec.role==='admin'||spec.kind==='ownerbookings')for(const t of all.filter(n=>n.type==='TEXT'&&/^(Suspend|Review|Approve \/ Remove|View reports)$/.test(n.characters))){const title=t.characters;const info=await acknowledge(title,title==='Suspend'?'The selected sample account is suspended.':title==='Approve / Remove'?'Review the sample listing before approving or removing it.':'Review the selected sample record.',title==='View reports'?'landlord-condition':undefined);await wire(t,[overlayAction(info)]);}
  }
  // Freeze each page at a desktop viewport; content remains available by vertical scrolling.
  for(const root of screens){root.resize(1280,900);root.primaryAxisSizingMode='FIXED';root.counterAxisSizingMode='FIXED';root.clipsContent=true;root.overflowDirection='VERTICAL';}
  page.flowStartingPoints=[['Start · Explore Campus Mate','public-index'],['Tenant journey','tenant-home'],['Landlord journey','landlord-dashboard'],['Administrator journey','admin-overview']].map(([name,id])=>({name,nodeId:refs[id]}));
  report.screens=screens.length;
  for(const root of screens)for(const n of root.findAllWithCriteria({types:['INSTANCE','FRAME','TEXT']}))if(/^(Action|Nav|Input|Link) \/ /.test(n.name)&&!wired.has(n.id))report.unresolved.push({screen:root.name,title:n.name});
  if(report.unresolved.length)throw Error('Unwired controls: '+JSON.stringify(report.unresolved));
  // Every reaction destination must exist on this page.
  for(const n of page.findAllWithCriteria({types:['INSTANCE','FRAME','TEXT']}))if('reactions'in n)for(const reaction of n.reactions)for(const action of reaction.actions||[])if(action.type==='NODE'&&!(await figma.getNodeByIdAsync(action.destinationId)))throw Error('Broken destination '+action.destinationId);
  page.setPluginData('campus-prototype-report',JSON.stringify(report));
}
async function main(){
  try{
    if(figma.fileKey&&figma.fileKey!==TARGET_FILE)throw Error('Open the Untitled file linked in the README before running this plugin.');
    let output=figma.root.children.find(p=>p.name===OUTPUT_PAGE);
    if(output&&output.getPluginData('campus-prototype-report')){await figma.setCurrentPageAsync(output);figma.viewport.scrollAndZoomIntoView(output.children.filter(n=>n.name.startsWith('public-index')));figma.closePlugin('Prototype already exists. Original design preserved.');return;}
    if(output)throw Error('A partial build exists on '+OUTPUT_PAGE+'. Review that page before rerunning; existing work has been preserved.');
    const available=await figma.listAvailableFontsAsync();
    const fonts=[{family:'DM Sans',style:'Regular'},{family:'DM Sans',style:'Medium'},{family:'DM Sans',style:'Bold'},{family:'Playfair Display',style:'Regular'}];
    for(const f of fonts)if(!available.some(x=>x.fontName.family===f.family&&x.fontName.style===f.style))throw Error('Required font unavailable: '+f.family+' '+f.style);
    await Promise.all(fonts.map(f=>figma.loadFontAsync(f)));
    for(const [key,data]of Object.entries(EMBEDDED_IMAGES))PHOTO_HASHES[key]=figma.createImage(figma.base64Decode(data)).hash;
    Object.assign(PHOTO_HASHES,{'3c432c132d311be21f26cee3d49bef146a7f0810':PHOTO_HASHES.home,'26de614eb256ac72f88c8a27481129015c100825':PHOTO_HASHES.studio,'cf62c4c84301e475532584c182a565179dc2c249':PHOTO_HASHES.living,'0477cbd0cc722a76a229625410e912c6521ddb8f':PHOTO_HASHES.hero});
    FOUNDATIONS=await foundations();output=figma.createPage();output.name=OUTPUT_PAGE;await figma.setCurrentPageAsync(output);
    const roots={};
    SCREEN_SPECS.forEach((s,i)=>{const root=createAutoLayout('VERTICAL');output.appendChild(root);root.name=s.id+' · '+s.title.replace(/\n/g,' ');root.resize(1280,900);root.primaryAxisSizingMode='AUTO';root.counterAxisSizingMode='FIXED';root.x=(i%5)*1480;root.y=Math.floor(i/5)*3600;roots[s.id]=root.id;});
    output.setPluginData('campus-screen-roots',JSON.stringify(roots));
    await buildScreens(false,roots,output.id);
    await connect(output,roots);
    figma.viewport.scrollAndZoomIntoView([await figma.getNodeByIdAsync(roots['public-index'])]);
    figma.closePlugin('Created '+report.screens+' mockups, '+report.interactions+' interactions and '+report.overlays+' overlays. Press Present to try it.');
  }catch(error){report.errors.push(error.message);figma.closePlugin('Stopped: '+error.message+'. Existing work is preserved.');}
}
main();
