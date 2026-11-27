// A-Atlas EduMap 서비스워커
// - 화면(index.html·아이콘): 네트워크 우선, 오프라인이면 캐시
// - 지역 데이터는 개인 링크로 수파베이스에서 받아 앱(IndexedDB)이 따로 저장. 예전 공개 데이터 캐시는 지움
// - 카카오 지도·API 등 다른 도메인 요청은 절대 캐시하지 않음 (카카오 이용약관)
const SHELL='edu-shell-v57', DATA='edu-data-v1';
const SHELL_FILES=['./','index.html','acc.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_FILES.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k.startsWith('edu-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request, url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin)return;          // 외부(카카오 등)는 손대지 않음
  const file=url.pathname.split('/').pop();
  if(/admin\.html$/.test(url.pathname))return;                          // 관리자 페이지는 손대지 않음
  if((req.mode==='navigate'&&/\/(index\.html)?$/.test(url.pathname))||SHELL_FILES.some(f=>url.pathname.endsWith(f.replace('./','/')))){e.respondWith(netFirst(req));return}
});
async function netFirst(req){
  const c=await caches.open(SHELL);
  try{const nav=req.mode==='navigate';const r=await fetch(nav?new Request('index.html?_='+Date.now(),{cache:'no-store'}):req,{cache:'no-cache'});if(r.ok)c.put(req.mode==='navigate'?'index.html':req,r.clone());return r}
  catch(_){return (await c.match(req,{ignoreSearch:true}))||(await c.match('index.html'))||Response.error()}
}
async function dataSWR(e,req,url){
  const c=await caches.open(DATA);
  const hit=await c.match(req);
  const net=fetch(req).then(async r=>{
    if(r.ok){ // 같은 파일의 이전 버전(?v=…)은 지우고 새 버전만 보관
      for(const k of await c.keys()){const u=new URL(k.url);if(u.pathname===url.pathname&&u.search!==url.search)c.delete(k)}
      await c.put(req,r.clone())}
    return r}).catch(()=>null);
  if(hit){e.waitUntil(net);return hit}
  const r=await net; if(r)return r;
  return (await c.match(req,{ignoreSearch:true}))||Response.error();
}
