// Maintenance only: import a read-only catalog snapshot. Opening the HTML needs no build.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=process.argv[2]||'tests/artifacts/database-docs/current-schema.json';
const actual=JSON.parse(fs.readFileSync(source,'utf8'));
const context={};vm.runInNewContext(fs.readFileSync('docs/database/database-data.js','utf8'),context);
const model=JSON.parse(JSON.stringify(context.DatabaseDesign));
assert.equal(actual.database,'MasterDB');
const previous=new Map(model.tables.map(t=>[t.name,t]));
const extras={RoommateFavorites:{group:'identity',description:'Saved roommate profiles per account; saving does not imply rental consent.'},RentalAmendments:{group:'rentals',description:'Immutable proposed changes to confirmed rentals, with original terms and individual approval records.'}};
const normalize=s=>s.replace(/[\[\]()\s]/g,'').toLowerCase();
function enumInfo(check){
 const tokens=[...check.expression.matchAll(/\[(\w+)\]\s*=\s*(?:N?'((?:[^']|'')*)'|\((\d+)\))/g)];
 if(!tokens.length||new Set(tokens.map(m=>m[1])).size!==1)return null;
 const name=tokens[0][1];
 let rest=check.expression.replace(/\[\w+\]\s*=\s*(?:N?'(?:[^']|'')*'|\(\d+\))/g,'').replace(new RegExp('\\['+name+'\\]\\s+IS\\s+NULL','gi'),'').replace(/\bOR\b|[()\s]/gi,'');
 if(rest)return null;
 return {name,values:tokens.map(m=>m[2]===undefined?Number(m[3]):m[2].replaceAll("''","'"))};
}
function describe(table,check,old){
 const matched=(old?.checks||[]).find(c=>normalize(c.expression)===normalize(check.expression));if(matched)return matched.description;
 const e=enumInfo(check);if(e)return e.name+' permits only '+e.values.join(', ')+(check.expression.includes('IS NULL')?', or NULL.':'.');
 const json=check.expression.match(/isjson\(\[(\w+)\]\)/i);if(json)return json[1]+' must contain valid JSON'+(check.expression.includes('IS NULL')?' when supplied.':'.');
 if(table==='ListingFees'&&check.expression.includes('[PropertyId]'))return 'A fee targets exactly one property (JOD 20) or one partial-room offer (JOD 5).';
 if(table==='ListingFees'&&check.expression.includes('[PaidAt]'))return 'Paid fees have a payment time; unpaid fees have no payment time.';
 if(table==='Meetings'&&check.expression.includes('[Kind]'))return 'The meeting kind selects exactly one corresponding target: property, roommate profile or partial request.';
 if(table==='Meetings'&&check.expression.includes('[CreatorId]'))return 'The meeting creator and recipient must be different accounts.';
 if(check.expression.includes('datediff'))return 'A partial-room offer lasts between 1 and 30 days.';
 const clean=check.expression.replace(/[\[\]()]/g,'');
 const range=clean.match(/(\w+)\s*>=\s*(\d+)\s+AND\s+\1\s*<=\s*(\d+)/i);if(range)return range[1]+' must be between '+range[2]+' and '+range[3]+'.';
 const comparison=clean.match(/^(\w+)\s*(>=|>|<>)\s*(\w+)$/);if(comparison)return comparison[1]+' must be '+({'>':'greater than ','>=':'at least ','<>':'different from '}[comparison[2]])+comparison[3]+'.';
 return 'Stored values must satisfy '+check.expression+'.';
}
const mappingUpdates={
 'Properties.ReviewStatus':{'approved':'Review approved; publication still depends on the owner’s preference and paid fee.','pending':'Awaiting admin review.','changes-requested':'Hidden; owner must correct and resubmit the same advertisement.','suspended':'Hidden following a serious moderation decision.'},
 'RentalRequests.Status':{draft:'Invitation declined, cancelled or expired; lead tenant chooses another roommate or applies alone.','waiting-roommate':'Waiting for the invited roommate; not yet sent to the landlord.',submitted:'Joint or solo application sent to the landlord.',approved:'Older workflow: owner approved; review the agreement.',inspection:'Owner approved; waiting for lead tenant inspection.',agreement:'Each tenant must accept the same final agreement independently.',payment:'All approvals complete; lead tenant confirms the direct arrangement, not collecting tenant rent.',confirmed:'Confirmed; waiting for key handover.',active:'Keys received; rental active.',closed:'Rental closed.',rejected:'Landlord declined the application.',cancelled:'Application cancelled.'},
 'RentalRequests.InvitationStatus':{pending:'Invitation awaiting a response for up to 48 hours.',accepted:'Roommate agreed to apply; final agreement acceptance remains separate.',declined:'Roommate declined; hidden from their current requests.',cancelled:'Lead tenant cancelled the invitation.',expired:'Invitation expired; also derived when a pending invitation passes its deadline.'},
 'Rentals.Status':{upcoming:'Confirmed; waiting for receipt of keys.',active:'Key handover confirmed; active rental.',closed:'Rental closed; reports retained.'},
 'RentalAmendments.Status':{pending:'Current rental unchanged; waiting for every affected participant.',approved:'All affected participants accepted; revised terms applied as a new version.',rejected:'A participant rejected or withdrew; existing terms stay effective.',cancelled:'Superseded by another amendment, or the rental closed.'}
};
model.project={...model.project,source:'Read-only SQL Server catalog export from the existing MasterDB; checked against EF Core migrations.',snapshotDate:'2026-11-06',excludedTables:actual.excludedTables.map(t=>t.name),description:'Campus Mate connects tenants, landlords and potential roommates to find housing and agree rentals. It stores shared rental invitations, each tenant’s agreement consent, property reviews and room offers, while publishing fees remain separate from rent paid directly to the landlord.',statusExplanation:'These are stored database values and their product meanings. Deadline expiry and temporary account restrictions can also be computed by the server. A status CHECK restricts allowed values; the application enforces transitions, roles and individual consent.'};
model.tables=actual.tables.map(t=>{
 const old=previous.get(t.name),info=old||extras[t.name];assert(info,'Describe new table '+t.name);
 const pk=t.indexes.find(i=>i.pk);assert(pk,'Missing primary key: '+t.name);
 const enums=new Map((t.checks||[]).map(enumInfo).filter(Boolean).map(e=>[e.name,e.values]));
 const columns=t.columns.map(c=>{
  const oldColumn=old?.columns.find(x=>x.name===c.name);
  const item={name:c.name,type:c.type,pk:c.pk,fk:c.fk,uq:c.uq,null:c.null};
  if(c.default!==undefined){item.default=c.default;item.defaultName=c.defaultName;}
  if(c.identity){item.identity=true;item.identitySeed=c.identitySeed;item.identityIncrement=c.identityIncrement;}
  if(enums.has(c.name)){const values=enums.get(c.name),before=oldColumn?.enum||[];item.enum=[...before.filter(v=>values.includes(v)),...values.filter(v=>!before.includes(v))];}
  return item;
 });
 const order=i=>({columns:i.columns.map(c=>c.name),descending:i.columns.map(c=>c.descending),clustered:i.kind==='CLUSTERED'});
 const statusMappings=[];
 for(const c of columns.filter(c=>c.enum)){
  const labels=mappingUpdates[t.name+'.'+c.name]||old?.statusMappings?.find(m=>m.column===c.name)?.values;
  if(labels)statusMappings.push({column:c.name,values:Object.fromEntries(c.enum.map(v=>[v,labels[v]||String(v)]))});
 }
 return {name:t.name,group:info.group,description:info.description,columns,primaryKey:pk.columns.map(c=>c.name),primaryKeyName:pk.name,primaryKeyClustered:pk.kind==='CLUSTERED',primaryKeyDescending:pk.columns.map(c=>c.descending),
  uniqueConstraints:t.indexes.filter(i=>i.uq).map(i=>({name:i.name,...order(i)})),
  checks:(t.checks||[]).map(c=>({name:c.name,expression:c.expression,description:describe(t.name,c,old)})),
  indexes:t.indexes.filter(i=>!i.pk&&!i.uq).map(i=>({name:i.name,...order(i),unique:i.unique,...(i.filter?{where:i.filter}:{}),...(i.included?.length?{included:i.included.map(c=>c.name)}:{})})),statusMappings};
});
const tableMap=new Map(model.tables.map(t=>[t.name,t]));
const oldLinks=new Map(model.relationships.map(r=>[r.from+'.'+r.column,r]));
const labels={'RoommateFavorites.UserId':'saved by','RoommateFavorites.RoommateId':'saves','RentalRequests.RoommateUserId':'invites','RentalAmendments.ProposedBy':'proposed by','RentalAmendments.RentalId':'amends'};
model.relationships=actual.relationships.map((r,i)=>{
 assert(r.ordinal===1,'Composite FK requires a grouped renderer: '+r.name);assert(!r.disabled&&!r.untrusted,'Untrusted FK: '+r.name);
 const table=tableMap.get(r.from),column=table.columns.find(c=>c.name===r.column),old=oldLinks.get(r.from+'.'+r.column);
 const oneChild=(table.primaryKey.length===1&&table.primaryKey[0]===column.name)||table.uniqueConstraints.some(u=>u.columns.length===1&&u.columns[0]===column.name)||table.indexes.some(ix=>ix.unique&&ix.columns.length===1&&ix.columns[0]===column.name);
 return {id:'rel-'+(i+1),name:r.name,from:r.from,column:r.column,to:r.to,toColumn:r.toColumn,fromCardinality:oneChild?'zeroOne':'zeroMany',toCardinality:column.null?'zeroOne':'one',label:old?.label||labels[r.from+'.'+r.column]||'references',onDelete:r.onDelete,onUpdate:r.onUpdate};
});
model.LAYOUT=model.LAYOUT.map(column=>column.filter(name=>tableMap.has(name)));
if(!model.LAYOUT.flat().includes('RoommateFavorites'))model.LAYOUT[0].push('RoommateFavorites');
if(!model.LAYOUT.flat().includes('RentalAmendments'))model.LAYOUT[2].push('RentalAmendments');
model.applicationRules=model.applicationRules.filter(r=>r.title!=='Shared rental consent'&&r.title!=='Moderation and owner visibility'&&r.title!=='Structured amendment records');
model.applicationRules.push(
 {title:'Shared rental consent',text:'A 48-hour roommate invitation is hidden from the landlord until accepted. Inspection, each tenant’s own agreement acceptance, confirmation and key handover are separate server-enforced stages. Changed terms require fresh approvals.'},
 {title:'Moderation and owner visibility',text:'Properties.ReviewStatus is independent from OwnerWantsPublished. Correction retains paid posting fees. Advertisement action does not close reports; each investigation gets its own recorded outcome. Suspension periods, ownership and user roles are checked by the server.'},
 {title:'Structured amendment records',text:'RentalAmendments stores original/proposed terms and approver lists as JSON text. The current SQL schema does not add ISJSON checks or foreign keys inside these JSON fields. The server validates their structure, permissions and unanimous consent before applying new terms.'});
fs.writeFileSync('docs/database/database-data.js','/* Current MasterDB application schema. Single source for all five views.\n   Captured from read-only SQL Server catalogs; open database.html directly. */\n\'use strict\';\nglobalThis.DatabaseDesign = Object.freeze('+JSON.stringify(model,null,2)+');\n');
console.log('Updated documentation data from '+source+'; no database was created or modified.');
