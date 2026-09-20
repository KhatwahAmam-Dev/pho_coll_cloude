/* ============================================================
   Tampilan
   ============================================================ */
function status(c){
  const n=(S.photos[c.id]||[]).length,m=S.meta[c.id]||{};
  if(m.done)return['done','Selesai'];
  if(n===0)return c.req?['todo','Belum']:['todo','Opsional'];
  if(n<c.min)return['part','Kurang foto'];
  return['ready','Siap diselesaikan'];
}
function rangeText(list){
  if(!list.length)return '';
  const ts=list.map(p=>p.takenAt),a=Math.min(...ts),b=Math.max(...ts);
  return fmtT(a)===fmtT(b)?fmtT(a):`${fmtT(a)}–${fmtT(b)}`;
}
function tplLogin(){
  return `<div class="screen login">
    <div class="login-hero">
      <div class="led js-clock">00:00:00</div>
      <div class="led-date">${fmtDateLong(new Date())}</div>
      <h1>StoreLog</h1>
      <p>Foto harian toko, tersusun per kegiatan dan siap dibagikan.</p>
    </div>
    <form class="login-card" id="loginForm" autocomplete="on">
      <label class="field">Username<input id="lu" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label class="field">PIN<input id="lp" type="password" inputmode="numeric" autocomplete="current-password" required></label>
      <p class="err" id="lerr" role="alert"></p>
      <button class="btn pri" type="submit" id="lbtn">Masuk</button>
      ${CONFIG.SCRIPT_URL?'':'<p class="hint">Mode demo aktif. Masuk dengan username demo dan PIN 1234.</p>'}
    </form>
  </div>`;
}
function tplHome(){
  const cats=SHIFTS[S.shift].cats;
  const req=cats.filter(c=>c.req),doneN=req.filter(c=>S.meta[c.id]&&S.meta[c.id].done).length;
  const pct=req.length?Math.round(doneN/req.length*100):0;
  const dark=document.documentElement.dataset.theme==='dark';
  return `<div class="screen home">
    <header class="top">
      <div class="who"><div class="av">${esc(S.session.nama.charAt(0).toUpperCase())}</div>
        <div><div class="hi">Halo, ${esc(S.session.nama)}</div><div class="store">${esc(CONFIG.STORE_NAME)}</div></div></div>
      <div class="icons">
        <button class="icon-btn" data-a="theme" aria-label="${dark?'Tema terang':'Tema gelap'}">${svg(dark?'sun':'moon',20)}</button>
        <button class="icon-btn" data-a="logout" aria-label="Keluar">${svg('logout',20)}</button>
      </div>
    </header>
    <section class="panel">
      <div class="led js-clock">00:00:00</div>
      <div class="dl">${fmtDateLong(new Date())}${tzLabel()?' '+tzLabel():''}</div>
      <div class="seg" role="group" aria-label="Pilih shift">
        ${Object.entries(SHIFTS).map(([k,v])=>`<button data-a="shift" data-v="${k}" class="${S.shift===k?'on':''}" aria-pressed="${S.shift===k}">${v.label}</button>`).join('')}
      </div>
    </section>
    <section class="prog">
      <div class="prog-row"><span class="ptxt">${doneN} dari ${req.length} kegiatan wajib selesai</span>
        <button class="sync js-sync" data-a="sync">…</button></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    </section>
    <ul class="tags">
      ${cats.map(c=>{
        const list=S.photos[c.id]||[],n=list.length,[st,lbl]=status(c);
        const np=Math.min(Math.max(c.min,n),10);
        const pips=Array.from({length:np},(_,i)=>`<i class="${i<n?'f':''}"></i>`).join('');
        return `<li><button class="tag st-${st}" data-a="open" data-id="${c.id}">
          <span class="edge"></span><span class="ico" aria-hidden="true">${c.icon}</span>
          <span><span class="tname">${esc(c.name)}</span>
            <span class="tmeta"><span class="pips">${pips}</span>${n} foto${c.min===c.max?'':', target '+c.min+' sampai '+c.max}</span></span>
          <span class="tside"><span class="pill">${lbl}</span><span class="rg">${rangeText(list)}</span></span>
        </button></li>`;}).join('')}
    </ul>
    ${cats.some(c=>(S.photos[c.id]||[]).length||S.meta[c.id])?`<div class="tools"><button class="link" data-a="resetshift">Reset seluruh ${SHIFTS[S.shift].label}</button></div>`:''}
    <p class="foot-hint">Foto hanya bisa diambil lewat kamera aplikasi. Jam tercatat saat tombol foto ditekan.</p>
  </div>`;
}
function stripHTML(){
  const c=curCat(),list=S.photos[c.id]||[];
  if(!list.length)return '<div class="empty-strip">Belum ada foto. Ambil foto pertama dengan tombol putih.</div>';
  return list.map(r=>`<button class="th" data-a="view" data-id="${r.id}"><img src="${urlOf(r)}" alt="Foto jam ${fmtT(r.takenAt)}"><span class="up ${r.up?'ok':''}"></span><span class="tt">${fmtT(r.takenAt)}</span></button>`).join('');
}
function tplCat(){
  const c=curCat(),list=S.photos[c.id]||[],m=S.meta[c.id]||{},done=!!m.done;
  const target=c.min===c.max?c.min:`${c.min}–${c.max}`;
  return `<div class="screen cam">
    <header class="cam-top">
      <button class="icon-btn" data-a="back" aria-label="Kembali">${svg('back')}</button>
      <div><div class="ctitle">${esc(c.name)}</div><div class="csub" id="camSub"></div></div>
      <div class="cbadge" id="camCnt"></div>
    </header>
    ${done?`<div class="donebox"><div class="ok" aria-hidden="true">✓</div>
        <h2>Kegiatan selesai</h2>
        <p>${list.length} foto, rentang waktu ${rangeText(list)}${tzLabel()?' '+tzLabel():''}.${m.meter?' Angka meter '+esc(m.meter)+' kWh.':''}</p>
        <div class="row"><button class="btn pri" data-a="seecollage">Lihat collage</button><button class="btn sec" data-a="reopen">Buka kembali</button></div></div>`
    :`<div class="vf" id="vf">
        <video id="vid" playsinline muted autoplay></video>
        <div class="led vf-stamp js-clock">00:00:00</div>
        <div class="gps wait" id="gpsChip">GPS mencari…</div>
        <div class="vf-off" id="vfOff"><div aria-hidden="true">${svg('camoff',40)}</div><div>Kamera mati</div>
          <button class="btn" data-a="camtoggle">Nyalakan kamera</button></div>
        <div class="flash" id="flash"></div>
        <div class="ctrls">
          <button class="tog" id="btnTog" data-a="camtoggle" aria-label="Nyalakan atau matikan kamera"><span class="dot"></span><span class="lbl">Kamera mati</span></button>
          <button class="shutter" id="btnShoot" data-a="shoot" aria-label="Ambil foto"></button>
          <button class="flip" id="btnFlip" data-a="flip" aria-label="Balik kamera">${svg('flip',22)}</button>
        </div></div>`}
    <div class="strip" id="strip">${stripHTML()}</div>
    ${c.meter&&!done?`<label class="meter">Angka meter KWH<input id="meter" inputmode="decimal" placeholder="contoh 12345.6" value="${esc(m.meter||'')}"></label>`:''}
    ${(list.length||done)?`<div class="tools"><button class="link" data-a="resetcat">Reset kegiatan ini</button></div>`:''}
    ${done?'':`<div class="cta"><button class="btn pri" id="btnFinish" data-a="finish">Selesai dan buat collage</button></div>`}
  </div>`;
}
function paintStrip(){
  const c=curCat();if(!c)return;
  const list=S.photos[c.id]||[],target=c.min===c.max?c.min:`${c.min}–${c.max}`;
  const st=$('#strip');if(st)st.innerHTML=stripHTML();
  const cnt=$('#camCnt');if(cnt)cnt.textContent=`${list.length}/${c.max}`;
  const sub=$('#camSub');
  if(sub)sub.textContent=list.length?`Rentang ${rangeText(list)}${tzLabel()?' '+tzLabel():''}`:`Target ${target} foto`;
  const f=$('#btnFinish');if(f)f.disabled=list.length<c.min;
}
function render(){
  const app=$('#app');
  app.innerHTML=S.view==='login'?tplLogin():S.view==='home'?tplHome():tplCat();
  paintSync();tick();
  if(S.view==='cat'){paintStrip();paintCam();paintGeo();}
}
function tick(){const t=fmtTS(Date.now());$$('.js-clock').forEach(e=>e.textContent=t);if($('#gpsChip'))paintGeo();}
async function go(view,catId){
  stopCam();S.view=view;S.catId=catId||null;
  if(view!=='login')startGeo();
  if(view!=='login')await loadDay();
  render();
  if(view==='cat'&&!(S.meta[catId]&&S.meta[catId].done)){await startCam();paintCam();}
}
