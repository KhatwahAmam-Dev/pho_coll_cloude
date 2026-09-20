/* ============================================================
   Mulai
   ============================================================ */
(async function boot(){
  applyTheme();
  try{await openDB();}catch(e){$('#app').innerHTML='<p style="padding:24px">Penyimpanan lokal tidak tersedia di browser ini.</p>';return;}
  S.shift=ls.get('storelog.shift')||(new Date().getHours()<14?'pagi':'siang');
  const saved=ls.get('storelog.session');
  if(saved){try{S.session=JSON.parse(saved);}catch(e){}}
  if(S.session){await loadDay();S.view='home';startGeo();}
  render();
  setInterval(tick,1000);
  addEventListener('online',()=>{paintSync();syncAll(false);});
  addEventListener('offline',paintSync);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){if(S.camOn){stopCam();paintCam();}stopGeo();}
    else if(S.session)startGeo();
  });
  syncAll(false);
})();
})();
