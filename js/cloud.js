/* ============================================================
   Cloud (Google Apps Script)
   ============================================================ */
async function api(action,payload){
  const r=await fetch(CONFIG.SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(Object.assign({action,key:CONFIG.API_KEY},payload))});
  return r.json();
}
const b64=blob=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result).split(',')[1]);f.onerror=rej;f.readAsDataURL(blob);});

async function uploadRecord(store,r){
  const cat=catOf(r.shift,r.cat);
  const [y,m]=r.date.split('-');
  const path=[y,`${m}-${BULAN[+m-1]}`,r.date,SHIFTS[r.shift].label,cat.name];
  const name=store==='photos'
    ?`${fmtTS(r.takenAt).replace(/:/g,'')}_${cat.id}_${r.id.slice(-4)}.jpg`
    :`COLLAGE_${cat.id}_hal${r.page}.jpg`;
  const res=await api('upload',{user:r.user,path,filename:name,mime:'image/jpeg',data:await b64(r.blob),takenAt:r.takenAt||null,geo:r.geo||null});
  if(!res.ok)throw new Error(res.msg||'Upload gagal');
  const still=await idb(store,'readonly',s=>s.get(r.id));
  if(!still){await queueTrash([res.id],'',r.user);return;}   // dihapus saat sedang diunggah
  r.up=1;r.url=res.url;r.fileId=res.id;
  await idb(store,'readwrite',s=>s.put(r));
}
const fileIdOf=r=>r.fileId||((r.url||'').match(/\/d\/([-\w]{10,})/)||[])[1]||null;
async function queueTrash(fileIds,note,user){
  const ids=fileIds.filter(Boolean);
  if(!ids.length&&!note)return;
  const list=ids.length?ids:[null];
  await idb('trash','readwrite',s=>{list.forEach((f,i)=>s.put({id:uid()+i,fileId:f,user,at:Date.now(),note:i===0?note:''}));});
}
const collagesOf=grp=>idb('collages','readonly',s=>s.index('grp').getAll(IDBKeyRange.only(grp)));
const dropLocalCollages=grp=>idb('collages','readwrite',s=>{
  const req=s.index('grp').openCursor(IDBKeyRange.only(grp));
  req.onsuccess=()=>{const cur=req.result;if(cur){cur.delete();cur.continue();}};
  return req;
});
const dropUrl=id=>{if(urls.has(id)){URL.revokeObjectURL(urls.get(id));urls.delete(id);}};
async function syncAll(manual){
  if(!CONFIG.SCRIPT_URL){if(manual)toast('Mode demo: isi SCRIPT_URL agar foto masuk ke Google Drive.');return;}
  if(!navigator.onLine){if(manual)toast('Sedang offline. Upload jalan otomatis saat sinyal kembali.');return;}
  if(syncing)return;
  syncing=true;paintSync();
  let fail=0;
  try{
    for(const store of ['photos','collages']){
      const list=await idb(store,'readonly',s=>s.index('up').getAll(IDBKeyRange.only(0)));
      for(const r of list){try{await uploadRecord(store,r);}catch(e){fail++;console.warn(e);}}
    }
    const tr=await idb('trash','readonly',s=>s.getAll());
    for(const t of tr){
      try{
        const res=await api('remove',{fileId:t.fileId,user:t.user,at:t.at,note:t.note});
        if(!res.ok)throw new Error(res.msg||'Gagal');
        await idb('trash','readwrite',s=>s.delete(t.id));
      }catch(e){fail++;console.warn(e);}
    }
  }finally{syncing=false;}
  await refreshPending();
  if(manual)toast(fail?`${fail} file gagal diunggah, coba lagi nanti.`:'Semua file sudah terunggah.');
  if(S.view==='cat'&&$('#strip'))paintStrip();
}
function paintSync(){
  let txt,cls;
  if(!CONFIG.SCRIPT_URL){txt='Mode demo';cls='demo';}
  else if(!navigator.onLine){txt=S.pending?`Offline, ${S.pending} menunggu`:'Offline';cls='off';}
  else if(syncing){txt='Mengunggah…';cls='busy';}
  else if(S.pending){txt=`${S.pending} menunggu upload`;cls='wait';}
  else{txt='Semua tersimpan di cloud';cls='ok';}
  $$('.js-sync').forEach(e=>{e.textContent=txt;e.className='sync js-sync '+cls;});
}
