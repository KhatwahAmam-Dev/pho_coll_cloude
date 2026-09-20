/* ============================================================
   State + database (IndexedDB)
   ============================================================ */
const S={session:null,shift:'pagi',date:dateKey(new Date()),view:'login',catId:null,photos:{},meta:{},camOn:false,facing:'environment',pending:0};
let db, stream=null, syncing=false, sheet=null;
const urls=new Map();
const urlOf=r=>{if(!urls.has(r.id))urls.set(r.id,URL.createObjectURL(r.blob));return urls.get(r.id);};
const catOf=(shift,id)=>SHIFTS[shift].cats.find(c=>c.id===id);
const curCat=()=>catOf(S.shift,S.catId);
const grpOf=id=>`${S.date}|${S.shift}|${id}`;

function openDB(){return new Promise((res,rej)=>{
  const r=indexedDB.open('storelog',2);
  r.onupgradeneeded=e=>{const d=r.result;
    if(e.oldVersion<1){
      const p=d.createObjectStore('photos',{keyPath:'id'});p.createIndex('grp','grp');p.createIndex('up','up');
      const c=d.createObjectStore('collages',{keyPath:'id'});c.createIndex('grp','grp');c.createIndex('up','up');
      d.createObjectStore('meta',{keyPath:'key'});
    }
    if(e.oldVersion<2)d.createObjectStore('trash',{keyPath:'id'});};
  r.onsuccess=()=>{db=r.result;res();};
  r.onerror=()=>rej(r.error);
});}
const idb=(store,mode,fn)=>new Promise((res,rej)=>{
  const t=db.transaction(store,mode);
  const q=fn(t.objectStore(store));
  t.oncomplete=()=>res(q&&'result' in q?q.result:undefined);
  t.onerror=()=>rej(t.error);
  t.onabort=()=>rej(t.error);
});

async function loadDay(){
  S.date=dateKey(new Date());
  const prefix=`${S.date}|${S.shift}|`;
  const range=IDBKeyRange.bound(prefix,prefix+'\uffff');
  S.photos={};S.meta={};
  SHIFTS[S.shift].cats.forEach(c=>S.photos[c.id]=[]);
  const all=await idb('photos','readonly',s=>s.index('grp').getAll(range));
  all.forEach(r=>{(S.photos[r.cat]||(S.photos[r.cat]=[])).push(r);});
  Object.values(S.photos).forEach(a=>a.sort((x,y)=>x.takenAt-y.takenAt));
  const metas=await idb('meta','readonly',s=>s.getAll(range));
  metas.forEach(m=>{S.meta[m.key.slice(prefix.length)]=m;});
  await refreshPending();
}
async function saveMeta(catId,patch){
  const m=Object.assign({key:grpOf(catId)},S.meta[catId]||{},patch);
  S.meta[catId]=m;
  await idb('meta','readwrite',s=>s.put(m));
}
async function refreshPending(){
  const a=await idb('photos','readonly',s=>s.index('up').count(IDBKeyRange.only(0)));
  const b=await idb('collages','readonly',s=>s.index('up').count(IDBKeyRange.only(0)));
  const c=await idb('trash','readonly',s=>s.count());
  S.pending=a+b+c;paintSync();
}
