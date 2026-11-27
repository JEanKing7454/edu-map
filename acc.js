// A-Atlas EduMap 개인 링크 접근 (수파베이스)
// - 링크(#k=…)로 들어오면 토큰을 이 기기에 저장하고 주소창에서 지움
// - 기기 키: 이 기기에서 처음 만든 무작위 값 (개인정보 아님)
// - 지역 데이터는 열린 지역만 서버에서 받아 기기에 저장, 버전이 바뀐 것만 다시 받음
// - 열린 지역에서 빠진 곳은 기기 저장분도 지움
window.ACC=(()=>{
const API='https://enruijclegpmjamwmqym.supabase.co/rest/v1/rpc/', KEY='sb_publishable_oaCsqN8CoNJh0d7ZSxh9TQ_vzB9mBpV';
const REQUIRED=true; // 링크 없이는 열 수 없음 (공개 데이터 없음)
const ls={get:k=>{try{return localStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}},del:k=>{try{localStorage.removeItem(k)}catch(_){}}};
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const never=new Promise(()=>{});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---- 기기 저장소 (IndexedDB) ----
const dbp=new Promise(res=>{try{const r=indexedDB.open('edu-acc',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch(_){res(null)}});
const tx=async(mode,fn)=>{const d=await dbp;if(!d)return null;return new Promise(r=>{try{const q=fn(d.transaction('kv',mode).objectStore('kv'));q.onsuccess=()=>r(q.result??null);q.onerror=()=>r(null)}catch(_){r(null)}})};
const iget=k=>tx('readonly',s=>s.get(k)), iset=(k,v)=>tx('readwrite',s=>s.put(v,k)), idel=k=>tx('readwrite',s=>s.delete(k));
const ikeys=async()=>(await tx('readonly',s=>s.getAllKeys()))||[];
const wipe=async()=>{for(const k of await ikeys())await idel(k)};

// ---- 서버 호출 ----
async function rpc(fn,args){let r;
  try{r=await fetch(API+fn,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(args)})}catch(_){const e=new Error('offline');e.net=true;throw e}
  if(!r.ok){let m='error';try{const j=await r.json();m=j.message||m}catch(_){}if(r.status>=500||r.status===0){const e=new Error(m);e.net=true;throw e}throw new Error(m)}
  return r.json()}

// ---- 토큰·기기 키 ----
let tok=null;const m=location.hash.match(/^#k=([A-Za-z0-9_-]{20,})/);
const inKakao=/KAKAOTALK/i.test(navigator.userAgent);
if(m){tok=m[1];if(!inKakao){ls.set('eduK',tok);history.replaceState(null,'',location.pathname+location.search)}}
else tok=ls.get('eduK');
let dev=ls.get('eduD');if(!dev){const a=new Uint8Array(16);crypto.getRandomValues(a);dev=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');ls.set('eduD',dev)}

// ---- 안내 화면 ----
const MSG={
  invalid:['링크를 확인해 주세요','올바르지 않은 링크입니다. 받으신 링크를 다시 눌러 주세요.'],
  revoked:['사용이 중지된 링크입니다','링크를 보내 주신 분께 문의해 주세요.'],
  expired:['사용 기간이 끝났습니다','링크를 보내 주신 분께 기간 연장을 요청해 주세요.'],
  device_limit:['다른 기기에서 사용 중입니다','이 링크는 이미 정해진 수의 기기에 연결되어 있습니다. 보내 주신 분께 "기기 초기화"를 요청해 주세요.'],
  offline:['인터넷에 연결되어 있지 않습니다','연결된 뒤 다시 열어 주세요.'],
  need:['개인 링크로 열어 주세요','이 지도는 받으신 개인 링크로만 열 수 있습니다.'],
  kakao:['외부 브라우저로 여는 중입니다','카카오톡 안에서는 앱으로 설치할 수 없어 크롬·사파리로 엽니다. 자동으로 넘어가지 않으면 아래 버튼을 눌러 주세요.']};
function gate(code){const [t,d]=MSG[code]||['열 수 없습니다','잠시 뒤 다시 열어 주세요. ('+code+')'];
  const g=document.createElement('div');g.id='accgate';
  g.innerHTML=`<style>#accgate{position:fixed;inset:0;z-index:999;background:#12263c;color:#fff;display:grid;place-items:center;padding:24px;font:15px/1.6 "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif}
#accgate .b{max-width:360px;width:100%}#accgate h2{font-size:19px;margin:12px 0 6px}#accgate p{margin:0 0 14px;color:#d6dde6}
#accgate input{width:100%;box-sizing:border-box;font:inherit;padding:11px;border-radius:8px;border:0;margin:6px 0}
#accgate button,#accgate a.btn{display:block;width:100%;box-sizing:border-box;text-align:center;font:inherit;font-weight:700;padding:11px;border-radius:8px;border:0;background:#e8772e;color:#fff;text-decoration:none;margin-top:6px;cursor:pointer}
#accgate small{color:#aab6c4}#accgate .e{color:#ffb4a8;min-height:1.2em;font-size:13px}</style>
<div class="b"><img src="icons/icon-192.png" width="56" height="56" alt="" style="border-radius:12px"><h2>${esc(t)}</h2><p>${esc(d)}</p><div id="accx"></div></div>`;
  document.body.appendChild(g);const x=g.querySelector('#accx');
  if(code==='kakao'){const ext='kakaotalk://web/openExternal?url='+encodeURIComponent(location.href);x.innerHTML=`<a class="btn" href="${esc(ext)}">외부 브라우저로 열기</a>`;setTimeout(()=>{location.href=ext},300)}
  if(code==='need'||(code==='invalid'&&standalone)){
    x.innerHTML=`<small>${standalone?'브라우저에서 받은 <b>연결 코드</b>(8자리)나 받으신 링크를 붙여 넣어 주세요.':'받으신 링크를 붙여 넣어도 됩니다.'}</small><input id="accin" placeholder="연결 코드 또는 링크" autocomplete="off" autocapitalize="characters"><div class="e" id="acce"></div><button id="accgo">연결하기</button>`;
    x.querySelector('#accgo').onclick=async()=>{const v=x.querySelector('#accin').value.trim(),e=x.querySelector('#acce');e.textContent='';
      const mm=v.match(/#k=([A-Za-z0-9_-]{20,})/);if(mm){ls.set('eduK',mm[1]);location.reload();return}
      try{const t2=await rpc('edu_pair_use',{p_code:v,p_device:dev,p_kind:standalone?'pwa':'browser'});ls.set('eduK',t2);location.reload()}
      catch(err){e.textContent=err.net?'인터넷 연결을 확인해 주세요.':/bad_code/.test(err.message)?'코드가 맞지 않거나 시간이 지났습니다. 브라우저에서 새 코드를 받아 주세요.':(MSG[err.message]||[err.message])[0]}}}
  if(code==='offline'){x.innerHTML='<button onclick="location.reload()">다시 시도</button>'}
}

// ---- 시작 ----
let H=null,on=false;
const ready=(async()=>{
  if(m&&inKakao){await new Promise(r=>document.readyState==='loading'?addEventListener('DOMContentLoaded',r):r());gate('kakao');return never}
  if(!tok){if(REQUIRED){gate('need');return never}return}
  try{H=await rpc('edu_hello',{p_token:tok,p_device:dev,p_kind:standalone?'pwa':'browser'});await iset('hello',H)}
  catch(e){
    if(e.net){H=await iget('hello');if(!H){gate('offline');return never}}
    else{await wipe();ls.del('eduK');gate(/^(invalid|revoked|expired|device_limit)$/.test(e.message)?e.message:'x');return never}}
  on=true;
  for(const k of await ikeys()){const i=k.indexOf(':'),t=k.slice(0,i),r=k.slice(i+1);
    if((t==='reg'&&!(r in H.regs))||(t==='search'&&!(r in H.search)))await idel(k)}
})();

async function region(r){
  const c=await iget('reg:'+r);if(c&&c.ver===H.regs[r])return c;
  try{const x=await rpc('edu_region',{p_token:tok,p_device:dev,p_reg:r});if(x)iset('reg:'+r,structuredClone(x));return x}
  catch(e){if(e.net&&c)return c;throw e}}
async function zones(){
  const c=await iget('zones');if(c&&c.ver===H.zones)return c.j;
  try{const j=await rpc('edu_zones',{p_token:tok,p_device:dev});iset('zones',structuredClone({ver:H.zones,j}));return j}
  catch(e){if(e.net&&c)return c.j;throw e}}
async function search(){
  const regs=Object.keys(H.search),have={},got={};
  for(const r of regs){const c=await iget('search:'+r);if(c){got[r]=c;have[r]=c.ver}}
  try{const n=await rpc('edu_search',{p_token:tok,p_device:dev,p_have:have});for(const [r,v] of Object.entries(n)){got[r]=v;iset('search:'+r,v)}}catch(e){if(!e.net)throw e}
  const rows=[];regs.forEach((r,i)=>{if(got[r])for(const w of got[r].rows)rows.push([w[0],w[1],i,w[3],w[4],w[5]])});
  return {regs,rows}}
function filterAreas(A){const ok=new Set(Object.keys(H.regs));
  for(const a of Object.keys(A)){A[a].g=A[a].g.map(([n,ms])=>[n,ms.filter(r=>ok.has(r))]).filter(g=>g[1].length);if(!A[a].g.length)delete A[a]}}
const pairCode=()=>rpc('edu_pair_create',{p_token:tok,p_device:dev});

return {ready,on:()=>on,region,zones,search,filterAreas,pairCode,ios,standalone,expires:()=>H&&H.expires_at};
})();
