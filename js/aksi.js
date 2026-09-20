/* ============================================================
   Aksi
   ============================================================ */
function applyTheme(){
  const t=ls.get('storelog.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=t;
}
function openViewer(id){
  const r=(S.photos[S.catId]||[]).find(p=>p.id===id);if(!r)return;
  const g=r.geo;
  const geoLine=g
    ?`<span>Lokasi ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)} (±${Math.round(g.acc)} m)${g.inside===false?', di luar area toko':''}. <a href="https://maps.google.com/?q=${g.lat},${g.lng}" target="_blank" rel="noopener">Lihat di peta</a></span>`
    :'<span>Lokasi tidak tercatat</span>';
  layer(`<div class="viewer" role="dialog" aria-label="Foto jam ${fmtT(r.takenAt)}">
    <img src="${urlOf(r)}" alt="Foto jam ${fmtT(r.takenAt)}">
    <div class="vbar"><div class="vt"><b class="led">${fmtTS(r.takenAt)}</b><span>${fmtDateLong(new Date(r.takenAt))}</span>${geoLine}</div>
      <div class="row"><button class="btn dng" data-a="delfoto" data-id="${r.id}">Hapus foto</button><button class="btn sec" data-a="closelayer">Tutup</button></div></div>
  </div>`);
}
function confirmSheet(o){
  layer(`<div class="scrim" data-a="closelayer"></div><div class="sheet" role="dialog" aria-label="${esc(o.title)}">
    <h2>${esc(o.title)}</h2><p>${o.body}</p>
    ${o.warn?`<p class="warn">${o.warn}</p>`:''}
    ${o.reason?`<label class="field">Alasan<textarea id="why" placeholder="Contoh: foto buram atau salah objek"></textarea></label>`:''}
    ${o.type?`<label class="field">Ketik RESET untuk melanjutkan<input id="typed" autocapitalize="characters" autocomplete="off"></label>`:''}
    <div class="row"><button class="btn sec" data-a="closelayer">Batal</button><button class="btn dng" data-a="${o.okAction}" data-id="${o.okData||''}">${o.okLabel}</button></div>
  </div>`);
}
const cloudNote=()=>CONFIG.SCRIPT_URL?' Salinan di cloud dipindah ke folder _Dihapus dan tercatat di log, tidak hilang permanen.':'';
function askDelete(id){
  const c=curCat(),r=(S.photos[c.id]||[]).find(p=>p.id===id);if(!r)return;
  const done=S.meta[c.id]&&S.meta[c.id].done;
  confirmSheet({title:'Hapus foto ini?',
    body:`Foto jam ${fmtT(r.takenAt)} dihapus dari aplikasi.${cloudNote()}`,
    warn:done?'Kegiatan ini sudah selesai. Menghapus foto akan membuka kembali kegiatan dan membuang collage lama, jadi collage perlu dibuat ulang.':'',
    okLabel:'Hapus foto',okAction:'confdel',okData:id});
}
async function reopenAndDropCollages(c){
  const grp=grpOf(c.id);
  await saveMeta(c.id,{done:false});
  const recs=await collagesOf(grp);
  await queueTrash(recs.map(fileIdOf),'',S.session.user);
  await dropLocalCollages(grp);
}
async function doDelete(id){
  const c=curCat(),list=S.photos[c.id]||[],r=list.find(p=>p.id===id);if(!r)return;
  const wasDone=!!(S.meta[c.id]&&S.meta[c.id].done);
  await idb('photos','readwrite',s=>s.delete(id));
  S.photos[c.id]=list.filter(p=>p.id!==id);
  dropUrl(r.id);
  await queueTrash([fileIdOf(r)],`Hapus foto ${c.name} jam ${fmtT(r.takenAt)} (${SHIFTS[S.shift].label}, ${S.date})`,S.session.user);
  if(wasDone)await reopenAndDropCollages(c);
  closeLayer();await refreshPending();
  if(wasDone){toast('Kegiatan dibuka kembali. Buat collage ulang setelah selesai.');await go('cat',c.id);}
  else{paintStrip();toast('Foto dihapus.');}
  syncAll(false);
}
async function wipeCat(c){
  const grp=grpOf(c.id),list=S.photos[c.id]||[];
  const cols=await collagesOf(grp);
  const ids=[...list.map(fileIdOf),...cols.map(fileIdOf)];
  await idb('photos','readwrite',s=>{list.forEach(p=>s.delete(p.id));});
  await dropLocalCollages(grp);
  await idb('meta','readwrite',s=>s.delete(grp));
  list.forEach(p=>dropUrl(p.id));
  delete S.meta[c.id];S.photos[c.id]=[];
  return{ids,n:list.length};
}
function askResetCat(){
  const c=curCat(),n=(S.photos[c.id]||[]).length;
  confirmSheet({title:`Reset ${c.name}?`,
    body:`Semua foto (${n}), angka meter, dan collage kegiatan ini dihapus dari aplikasi, lalu kamu bisa mengulang dari awal.${cloudNote()}`,
    reason:true,okLabel:'Reset kegiatan',okAction:'confresetcat'});
}
async function doResetCat(){
  const why=($('#why').value||'').trim();
  if(!why){$('#why').focus();return toast('Isi alasan reset dulu.');}
  const c=curCat(),w=await wipeCat(c);
  await queueTrash(w.ids,`Reset kegiatan ${c.name} (${w.n} foto, ${SHIFTS[S.shift].label}, ${S.date}). Alasan: ${why}`,S.session.user);
  closeLayer();await refreshPending();toast('Kegiatan direset. Silakan mulai lagi.');
  await go('cat',c.id);syncAll(false);
}
function askResetShift(){
  const label=SHIFTS[S.shift].label;
  const n=SHIFTS[S.shift].cats.reduce((a,c)=>a+(S.photos[c.id]||[]).length,0);
  confirmSheet({title:`Reset seluruh ${label}?`,
    body:`Semua foto (${n}), angka meter, dan collage ${label} hari ini dihapus dari aplikasi.${cloudNote()}`,
    warn:'Di dalam aplikasi, tindakan ini tidak bisa dibatalkan.',
    reason:true,type:true,okLabel:'Reset semua',okAction:'confresetshift'});
}
async function doResetShift(){
  const why=($('#why').value||'').trim();
  if(($('#typed').value||'').trim().toUpperCase()!=='RESET')return toast('Ketik RESET untuk melanjutkan.');
  if(!why){$('#why').focus();return toast('Isi alasan reset dulu.');}
  const label=SHIFTS[S.shift].label;
  let ids=[],n=0;
  for(const c of SHIFTS[S.shift].cats){const w=await wipeCat(c);ids=ids.concat(w.ids);n+=w.n;}
  await queueTrash(ids,`Reset seluruh ${label} (${n} foto, ${S.date}). Alasan: ${why}`,S.session.user);
  closeLayer();await refreshPending();toast(`${label} direset.`);
  await go('home');syncAll(false);
}
async function finishCat(){
  const c=curCat(),list=S.photos[c.id]||[];
  if(list.length<c.min)return toast(`Minimal ${c.min} foto untuk kegiatan ini.`);
  if(c.meter){
    const v=($('#meter').value||'').trim();
    if(!v){$('#meter').focus();return toast('Isi angka meter KWH dulu.');}
    await saveMeta(c.id,{meter:v});
  }
  await saveMeta(c.id,{done:true,doneAt:Date.now()});
  stopCam();
  await showCollage(c,true);
}
function askLogout(){
  const miss=SHIFTS[S.shift].cats.filter(c=>c.req&&!(S.meta[c.id]&&S.meta[c.id].done));
  layer(`<div class="scrim" data-a="closelayer"></div><div class="sheet" role="dialog" aria-label="Keluar">
    <h2>Keluar dari akun?</h2>
    ${miss.length?`<p>Kegiatan wajib ${SHIFTS[S.shift].label} yang belum selesai:</p>
      <ul>${miss.map(c=>`<li>${esc(c.name)}</li>`).join('')}</ul>
      <label class="field">Alasan keluar<textarea id="why" placeholder="Tulis alasan singkat"></textarea></label>`:''}
    ${S.pending?`<p class="warn">${S.pending} file belum terunggah. File tetap aman di HP dan diunggah saat aplikasi dibuka dengan sinyal.</p>`:''}
    <div class="row"><button class="btn sec" data-a="closelayer">Batal</button><button class="btn dng" data-a="dologout" data-miss="${miss.length}">Keluar</button></div>
  </div>`);
}
async function doLogout(miss){
  let why='';
  if(miss){
    why=($('#why').value||'').trim();
    if(!why){$('#why').focus();return toast('Isi alasan keluar dulu.');}
    await saveMeta('~keluar',{reason:why,at:Date.now()});
    if(CONFIG.SCRIPT_URL&&navigator.onLine){api('log',{user:S.session.user,note:`Keluar sebelum selesai (${SHIFTS[S.shift].label}, ${S.date}): ${why}`}).catch(()=>{});}
  }
  closeLayer();stopCam();stopGeo();ls.del('storelog.session');S.session=null;
  await go('login');
}
async function doLogin(u,p){
  if(!CONFIG.SCRIPT_URL){
    if(CONFIG.DEMO_USERS[u]!==undefined&&CONFIG.DEMO_USERS[u]===p)return{ok:true,nama:u.charAt(0).toUpperCase()+u.slice(1)};
    return{ok:false,msg:'Username atau PIN salah.'};
  }
  if(!navigator.onLine)return{ok:false,msg:'Login butuh sinyal internet.'};
  try{return await api('login',{user:u,pin:p});}
  catch(e){return{ok:false,msg:'Tidak bisa menghubungi server. Cek SCRIPT_URL dan sinyal.'};}
}

document.addEventListener('submit',async e=>{
  if(e.target.id!=='loginForm')return;
  e.preventDefault();
  const u=$('#lu').value.trim().toLowerCase(),p=$('#lp').value,btn=$('#lbtn'),err=$('#lerr');
  btn.disabled=true;btn.textContent='Memeriksa…';err.textContent='';
  const r=await doLogin(u,p);
  if(r.ok){
    S.session={user:u,nama:r.nama||u};ls.set('storelog.session',JSON.stringify(S.session));
    await go('home');syncAll(false);
  }else{err.textContent=r.msg||'Login gagal.';btn.disabled=false;btn.textContent='Masuk';}
});
document.addEventListener('change',e=>{
  if(e.target.id==='meter'&&S.catId)saveMeta(S.catId,{meter:e.target.value.trim()});
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-a]');if(!t)return;
  const a=t.dataset.a;
  switch(a){
    case 'theme':{const cur=document.documentElement.dataset.theme==='dark'?'light':'dark';ls.set('storelog.theme',cur);document.documentElement.dataset.theme=cur;render();break;}
    case 'logout':askLogout();break;
    case 'dologout':doLogout(+t.dataset.miss);break;
    case 'shift':S.shift=t.dataset.v;ls.set('storelog.shift',S.shift);await loadDay();render();break;
    case 'open':go('cat',t.dataset.id);break;
    case 'back':go('home');break;
    case 'sync':syncAll(true);break;
    case 'camtoggle':if(S.camOn)stopCam();else await startCam();paintCam();break;
    case 'flip':S.facing=S.facing==='environment'?'user':'environment';await startCam();paintCam();break;
    case 'shoot':shoot();break;
    case 'view':openViewer(t.dataset.id);break;
    case 'delfoto':askDelete(t.dataset.id);break;
    case 'confdel':doDelete(t.dataset.id);break;
    case 'resetcat':askResetCat();break;
    case 'confresetcat':doResetCat();break;
    case 'resetshift':askResetShift();break;
    case 'confresetshift':doResetShift();break;
    case 'closelayer':closeLayer();break;
    case 'finish':finishCat();break;
    case 'reopen':await saveMeta(S.catId,{done:false});await go('cat',S.catId);break;
    case 'seecollage':showCollage(curCat(),false);break;
    case 'closesheet':closeSheet();break;
    case 'dl':downloadPage(+t.dataset.i);break;
    case 'share':sharePages();break;
  }
});
