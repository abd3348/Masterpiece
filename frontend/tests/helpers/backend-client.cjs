const assert=require('node:assert/strict');
const base=process.env.CAMPUS_BASE_URL||'http://localhost:5080';
class Client {
 cookies=new Map();token='';
 async request(method,url,body,expected=200,options={}) {
  const headers={Cookie:[...this.cookies].map(([k,v])=>k+'='+v).join('; ')};
  if(this.token&&!options.noCsrf)headers['X-CSRF-TOKEN']=this.token;
  if(body!==undefined&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}
  const response=await fetch(new URL(url,base),{method,headers,body,redirect:'manual'});
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');this.cookies.set(pair.slice(0,i),pair.slice(i+1));}
  const raw=await response.text();let data=raw;try{data=JSON.parse(raw);}catch{}
  assert.equal(response.status,expected,`${method} ${url}: ${response.status} ${raw.slice(0,700)}`);
  if(url==='/api/bootstrap'&&response.ok)this.token=data.csrfToken;
  return data;
 }
 bootstrap(){return this.request('GET','/api/bootstrap');}
 async login(email,password='Campus123'){
  await this.bootstrap();
  for(let attempt=0;attempt<3;attempt++)try{const user=await this.request('POST','/api/auth/login',{email,password});await this.bootstrap();return user;}
  catch(error){if(error.actual!==429||attempt===2)throw error;console.log('Waiting for the local authentication rate-limit window…');await new Promise(resolve=>setTimeout(resolve,30000));}
 }
 async register(role,label,run){await this.bootstrap();const user=await this.request('POST','/api/auth/register',{role,firstName:'Workflow',lastName:label,email:`${role}.${label.toLowerCase()}.${run}@campus.test`,phone:'0791234567',password:'TestingPass123',city:'Amman',occupation:'Student',destination:'University of Jordan'});await this.bootstrap();return user;}
 upload(filename,type,bytes){const form=new FormData();form.append('file',new Blob([bytes],{type}),filename);return this.request('POST','/api/media',form);}
}
async function checkout(client,url){const fee=await client.request('POST',url),local=new URL(fee.checkoutUrl);await client.request('GET',local.pathname);await client.request('POST',local.pathname,{},302);}
const preferences={minBudget:100,maxBudget:400,areas:['Jubeiha'],destination:'University of Jordan',commute:30,housing:'Apartment',furnishing:'Furnished',billing:'Monthly',roommates:'1',sleep:'Early bird',schedule:'Daytime',noise:2,cleanliness:4,smoking:'Not allowed',habits:['Reading']};
module.exports={Client,checkout,preferences,base};
