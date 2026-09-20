/* ============================================================
   Collage
   ============================================================ */
function rr(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();}
function pill(x,text,px,py,font,fg,bg,padX,h){
  x.font=font;const w=x.measureText(text).width+padX*2;
  x.fillStyle=bg;rr(x,px,py,w,h,h/2);x.fill();
  x.fillStyle=fg;x.textBaseline='middle';x.textAlign='left';x.fillText(text,px+padX,py+h/2+1);
  return w;
}
function collageChips(cat,chunk,all,page,pages){
  const base=(t,kind)=>({t,font:`600 24px ${SANS}`,
    fg:kind==='warn'?'#ffd9a3':kind==='ok'?'#b8f5d6':'#dff3ea',
    bg:kind==='warn'?'rgba(240,138,18,.30)':kind==='ok'?'rgba(43,192,132,.28)':'rgba(255,255,255,.12)'});
  const chips=[base(SHIFTS[S.shift].label),base(`Petugas ${S.session.nama}`),base(`${all.length} foto`)];
  if(pages>1)chips.push(base(`Halaman ${page+1} dari ${pages}`));
  const withGeo=all.filter(p=>p.geo),noGeo=all.length-withGeo.length,weak=withGeo.filter(p=>!p.geo.ok).length;
  if(withGeo.length){
    const b=withGeo.reduce((a,c)=>c.geo.acc<a.geo.acc?c:a);
    chips.push(base(`Lokasi ${b.geo.lat.toFixed(5)}, ${b.geo.lng.toFixed(5)} (±${Math.round(b.geo.acc)} m)`));
    const sg=CONFIG.STORE_GEO;
    if(sg&&sg.lat!=null){
      const out=withGeo.filter(p=>p.geo.inside===false).length;
      chips.push(out?base(`Di luar area toko: ${out} foto`,'warn'):base('Di area toko','ok'));
    }
  }
  if(weak)chips.push(base(`GPS kurang akurat: ${weak} foto`,'warn'));
  if(noGeo)chips.push(base(`Tanpa GPS: ${noGeo} foto`,'warn'));
  return chips;
}
function flowChips(mx,chips,P,W,y0){
  let px=P,y=y0;const out=[];
  chips.forEach(c=>{
    mx.font=c.font;const w=mx.measureText(c.t).width+36;
    if(px+w>W-P&&px>P){px=P;y+=56;}
    out.push(Object.assign({},c,{x:px,y,w}));px+=w+10;
  });
  return{out,bottom:y+46};
}
async function makeCollage(cat,photos,meter){
  const all=[...photos].sort((a,b)=>a.takenAt-b.takenAt);
  const pages=Math.ceil(all.length/9),per=Math.ceil(all.length/pages);
  const out=[];
  for(let p=0;p<pages;p++)out.push(await drawPage(cat,all.slice(p*per,(p+1)*per),all,p,pages,meter));
  return out;
}
async function drawPage(cat,chunk,all,page,pages,meter){
  const W=1080,P=40,G=14,FOOT=96;
  const n=chunk.length;
  const chips=collageChips(cat,chunk,all,page,pages);
  const mx=document.createElement('canvas').getContext('2d');
  const flow=flowChips(mx,chips,P,W,268);
  const HEAD=flow.bottom+34;
  const cols=n===1?1:(n===2||n===4)?2:3;
  const rows=Math.ceil(n/cols);
  let cw=(W-2*P-(cols-1)*G)/cols;if(n===1)cw=720;
  const ch=cw*4/3;
  const gridH=rows*ch+(rows-1)*G;
  const H=Math.round(HEAD+24+gridH+24+FOOT);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle='#eef1ef';x.fillRect(0,0,W,H);
  const g=x.createLinearGradient(0,0,W,HEAD);g.addColorStop(0,'#146b4a');g.addColorStop(1,'#0f1a17');
  x.fillStyle=g;x.fillRect(0,0,W,HEAD);
  x.textBaseline='alphabetic';x.textAlign='left';
  x.fillStyle='rgba(255,255,255,.72)';x.font=`600 26px ${SANS}`;
  x.fillText(`Dokumentasi harian ${CONFIG.STORE_NAME}`,P,62);
  let fs=66;x.font=`800 ${fs}px ${SANS}`;
  while(x.measureText(cat.name).width>W-2*P&&fs>36){fs-=2;x.font=`800 ${fs}px ${SANS}`;}
  x.fillStyle='#fff';x.fillText(cat.name,P,138);
  const ts=all.map(p=>p.takenAt),a=Math.min(...ts),b=Math.max(...ts),tz=tzLabel();
  const rng=fmtT(a)===fmtT(b)?fmtT(a):`${fmtT(a)} – ${fmtT(b)}`;
  const w1=pill(x,`${rng}${tz?' '+tz:''}`,P,166,`700 44px ${MONO}`,'#ff9a2e','rgba(0,0,0,.38)',24,80);
  const dateTxt=fmtDateLong(new Date(a));
  let ds=28;x.font=`600 ${ds}px ${SANS}`;
  while(P+w1+14+x.measureText(dateTxt).width+44>W-P&&ds>18){ds--;x.font=`600 ${ds}px ${SANS}`;}
  pill(x,dateTxt,P+w1+14,166,`600 ${ds}px ${SANS}`,'#fff','rgba(255,255,255,.16)',22,80);
  flow.out.forEach(c=>{pill(x,c.t,c.x,c.y,c.font,c.fg,c.bg,18,46);});
  const gy=HEAD+24;
  for(let i=0;i<n;i++){
    const r=Math.floor(i/cols),c=i%cols,inRow=Math.min(cols,n-r*cols);
    const rowW=inRow*cw+(inRow-1)*G;
    const x0=(W-rowW)/2+c*(cw+G),y0=gy+r*(ch+G);
    const bmp=await createImageBitmap(chunk[i].blob);
    x.save();rr(x,x0,y0,cw,ch,18);x.clip();x.drawImage(bmp,x0,y0,cw,ch);x.restore();
    if(bmp.close)bmp.close();
    const t=fmtT(chunk[i].takenAt),big=cols===1;
    x.font=`700 ${big?30:24}px ${MONO}`;
    const tw=x.measureText(t).width+22,th=big?46:38;
    x.fillStyle='rgba(0,0,0,.66)';rr(x,x0+12,y0+12,tw,th,th/2);x.fill();
    x.fillStyle='#ff9a2e';x.textBaseline='middle';x.fillText(t,x0+23,y0+12+th/2+1);
  }
  const fy=H-FOOT/2;
  const now=new Date();
  x.textBaseline='middle';x.textAlign='left';x.fillStyle='#5d6f6a';x.font=`600 24px ${SANS}`;
  x.fillText(`Dibuat ${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}.${pad(now.getMinutes())}`,P,fy);
  if(meter){
    x.font=`700 26px ${MONO}`;
    const t=`Meter ${meter} kWh`,w=x.measureText(t).width+36;
    x.fillStyle='#12211e';rr(x,W-P-w,fy-26,w,52,26);x.fill();
    x.fillStyle='#ff9a2e';x.textAlign='left';x.fillText(t,W-P-w+18,fy+1);
  }else{
    x.textAlign='right';x.font=`800 26px ${SANS}`;x.fillStyle='#146b4a';x.fillText('StoreLog',W-P,fy);
  }
  return new Promise(r=>cv.toBlob(r,'image/jpeg',0.9));
}
async function saveCollages(c,blobs){
  const grp=grpOf(c.id);
  const old=await collagesOf(grp);
  await queueTrash(old.map(fileIdOf),'',S.session.user);   // collage lama di cloud dipindah ke _Dihapus
  await dropLocalCollages(grp);
  await idb('collages','readwrite',s=>{
    blobs.forEach((b,i)=>s.put({id:`${grp}|${i+1}`,grp,date:S.date,shift:S.shift,cat:c.id,page:i+1,user:S.session.user,blob:b,up:0,url:null}));
  });
}
async function showCollage(c,fresh){
  layer(`<div class="scrim"></div><div class="sheet"><div class="busy">Menyusun collage…</div></div>`);
  let recs=[];
  if(!fresh)recs=await idb('collages','readonly',s=>s.index('grp').getAll(IDBKeyRange.only(grpOf(c.id))));
  let blobs;
  if(recs.length){recs.sort((a,b)=>a.page-b.page);blobs=recs.map(r=>r.blob);}
  else{
    try{await document.fonts.load(`800 40px "Plus Jakarta Sans"`);}catch(e){}
    try{
      blobs=await makeCollage(c,S.photos[c.id]||[],S.meta[c.id]&&S.meta[c.id].meter);
      await saveCollages(c,blobs);
    }catch(e){console.error(e);closeLayer();return toast('Collage gagal dibuat. Coba lagi.');}
  }
  sheet={cat:c,fresh,pages:blobs.map(b=>({blob:b,url:URL.createObjectURL(b)}))};
  const cloud=CONFIG.SCRIPT_URL?'Collage masuk antrean upload ke cloud.':'Mode demo: collage hanya tersimpan di HP.';
  layer(`<div class="scrim" data-a="closesheet"></div>
  <div class="sheet" role="dialog" aria-label="Collage ${esc(c.name)}">
    <div><h2>Collage ${esc(c.name)}</h2><p>${cloud} Mengirim ke grup itu opsional.</p></div>
    ${sheet.pages.map((p,i)=>`<img class="cpage" src="${p.url}" alt="Collage halaman ${i+1}">
      <button class="btn sec" data-a="dl" data-i="${i}">Unduh${sheet.pages.length>1?' halaman '+(i+1):''}</button>`).join('')}
    <div class="row"><button class="btn sec" data-a="share">Bagikan</button><button class="btn pri" data-a="closesheet">Selesai</button></div>
  </div>`);
  refreshPending();syncAll(false);
}
function downloadPage(i){
  const p=sheet.pages[i],a=document.createElement('a');
  a.href=p.url;a.download=`${S.date}_${sheet.cat.id}_${i+1}.jpg`;
  document.body.appendChild(a);a.click();a.remove();
}
async function sharePages(){
  const files=sheet.pages.map((p,i)=>new File([p.blob],`${S.date}_${sheet.cat.id}_${i+1}.jpg`,{type:'image/jpeg'}));
  if(navigator.canShare&&navigator.canShare({files})){
    try{await navigator.share({files,title:`${sheet.cat.name} ${S.date}`});}catch(e){}
  }else toast('Perangkat ini belum bisa membagikan file. Pakai Unduh, lalu kirim manual.');
}
