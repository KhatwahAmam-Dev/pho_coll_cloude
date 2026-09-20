/* ============================================================
   Kamera
   ============================================================ */
const G={watch:null,fixes:[],err:null};
let shooting=false;
function startGeo(){
  if(G.watch!==null||!navigator.geolocation)return;
  G.err=null;
  G.watch=navigator.geolocation.watchPosition(p=>{
    G.err=null;
    G.fixes.push({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy,ts:Date.now()});
    G.fixes=G.fixes.filter(f=>Date.now()-f.ts<45000);
    paintGeo();
  },e=>{G.err=e.code;paintGeo();},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function stopGeo(){
  if(G.watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(G.watch);
  G.watch=null;G.fixes=[];
}
function bestFix(){
  const t=Date.now(),r=G.fixes.filter(f=>t-f.ts<45000);
  return r.length?r.reduce((a,b)=>b.acc<a.acc?b:a):null;
}
function oneShot(){return new Promise(res=>{
  if(!navigator.geolocation)return res(null);
  navigator.geolocation.getCurrentPosition(
    p=>res({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy,ts:Date.now()}),
    ()=>res(null),{enableHighAccuracy:true,maximumAge:30000,timeout:4000});
});}
async function fixForShot(){return bestFix()||await oneShot();}
function distM(a,b,c,d){
  const R=6371000,t=Math.PI/180,dl=(c-a)*t,dn=(d-b)*t;
  const h=Math.sin(dl/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dn/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function makeGeo(f){
  const g={lat:f.lat,lng:f.lng,acc:f.acc,ok:f.acc<=CONFIG.GPS_TARGET_M};
  const sg=CONFIG.STORE_GEO;
  if(sg&&sg.lat!=null&&sg.lng!=null){g.dist=Math.round(distM(f.lat,f.lng,sg.lat,sg.lng));g.inside=g.dist<=sg.radius;}
  return g;
}
function paintGeo(){
  const chip=$('#gpsChip');if(!chip)return;
  const f=bestFix();let txt,cls;
  if(!navigator.geolocation){txt='GPS tidak ada';cls='bad';}
  else if(G.err===1){txt='Izin lokasi ditolak';cls='bad';}
  else if(!f){txt='GPS mencari…';cls='wait';}
  else{txt=`GPS ±${Math.round(f.acc)} m`;cls=f.acc<=CONFIG.GPS_TARGET_M?'ok':'warn';}
  chip.textContent=txt;chip.className='gps '+cls;
}
function camError(e){
  if(!navigator.mediaDevices)return 'Kamera butuh alamat HTTPS. Buka aplikasi lewat https://.';
  if(e&&e.name==='NotAllowedError')return 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.';
  if(e&&e.name==='NotFoundError')return 'Kamera tidak ditemukan di perangkat ini.';
  return 'Kamera tidak bisa dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.';
}
function stopCam(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  const v=$('#vid');if(v)v.srcObject=null;
  S.camOn=false;
}
async function startCam(){
  stopCam();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast(camError());return;}
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:S.facing},width:{ideal:1920},height:{ideal:1080}},audio:false});
    const v=$('#vid');v.srcObject=stream;await v.play();S.camOn=true;
  }catch(e){stream=null;S.camOn=false;toast(camError(e));}
}
function paintCam(){
  const off=$('#vfOff');if(!off)return;
  off.hidden=S.camOn;
  const t=$('#btnTog');
  t.classList.toggle('on',S.camOn);
  $('.lbl',t).textContent=S.camOn?'Kamera nyala':'Kamera mati';
  $('#btnShoot').disabled=!S.camOn;
  $('#btnFlip').disabled=!S.camOn;
}
function drawStamp(x,W,H,ms,catName,geo){
  const d=new Date(ms),tz=tzLabel();
  const m=Math.round(W*.04),bh=Math.round(W*.34);
  const g=x.createLinearGradient(0,H-bh,0,H);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.78)');
  x.fillStyle=g;x.fillRect(0,H-bh,W,bh);
  x.textBaseline='alphabetic';x.textAlign='left';
  let y=H-m;
  x.font=`600 ${Math.round(W*.03)}px ${MONO}`;
  if(geo){x.fillStyle=geo.ok?'#7ee0b5':'#ffc069';x.fillText(`${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}  ±${Math.round(geo.acc)} m`,m,y);}
  else{x.fillStyle='#ffc069';x.fillText('Lokasi tidak tersedia',m,y);}
  y-=Math.round(W*.048);
  x.font=`600 ${Math.round(W*.034)}px ${SANS}`;x.fillStyle='rgba(255,255,255,.94)';
  x.fillText(`${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}  |  ${catName}`,m,y);
  y-=Math.round(W*.058);
  x.font=`700 ${Math.round(W*.078)}px ${MONO}`;
  x.fillStyle='#ff9a2e';x.shadowColor='rgba(255,140,0,.6)';x.shadowBlur=12;
  x.fillText(`${fmtTS(ms)}${tz?' '+tz:''}`,m,y);
  x.shadowBlur=0;
}
async function shoot(){
  if(shooting)return;
  const c=curCat();
  if(!S.camOn)return toast('Nyalakan kamera dulu.');
  if(S.meta[c.id]&&S.meta[c.id].done)return;
  const list=S.photos[c.id]||(S.photos[c.id]=[]);
  if(list.length>=c.max)return toast(`Maksimal ${c.max} foto untuk kegiatan ini.`);
  if(CONFIG.GPS_WAJIB){
    const bf=bestFix();
    if(!bf)return toast('GPS belum terkunci. Aktifkan lokasi lalu tunggu sebentar.');
    if(bf.acc>CONFIG.GPS_TARGET_M)return toast(`GPS masih ±${Math.round(bf.acc)} m, target ±${CONFIG.GPS_TARGET_M} m. Tunggu atau pindah ke area yang lebih terbuka.`);
  }
  const v=$('#vid');if(!v||!v.videoWidth)return toast('Kamera belum siap, tunggu sebentar.');
  shooting=true;
  try{
    const now=Date.now();                    // jam dicatat saat tombol ditekan
    const vw=v.videoWidth,vh=v.videoHeight,ratio=3/4;
    let sw=vw,sh=vw/ratio;if(sh>vh){sh=vh;sw=vh*ratio;}
    const W=CONFIG.PHOTO_W,H=Math.round(W/ratio);
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const x=cv.getContext('2d');
    x.drawImage(v,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,W,H);   // bingkai diambil saat itu juga
    const fl=$('#flash');fl.classList.remove('go');void fl.offsetWidth;fl.classList.add('go');
    if(navigator.vibrate)navigator.vibrate(25);
    const fix=await fixForShot();
    const geo=fix?makeGeo(fix):null;
    drawStamp(x,W,H,now,c.name,geo);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',CONFIG.JPEG_Q));
    const rec={id:uid(),grp:grpOf(c.id),date:S.date,shift:S.shift,cat:c.id,takenAt:now,user:S.session.user,blob,geo,up:0,url:null};
    await idb('photos','readwrite',s=>s.put(rec));
    list.push(rec);
    paintStrip();refreshPending();syncAll(false);
  }finally{shooting=false;}
}
