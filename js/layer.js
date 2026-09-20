/* ============================================================
   Layer (sheet / modal / viewer)
   ============================================================ */
function layer(html){const l=$('#layer');l.innerHTML=html;l.classList.add('on');}
function closeLayer(){
  const l=$('#layer');l.classList.remove('on');l.innerHTML='';
  if(sheet){sheet.pages.forEach(p=>URL.revokeObjectURL(p.url));}
}
async function closeSheet(){
  const fresh=sheet&&sheet.fresh;
  closeLayer();sheet=null;
  if(fresh)await go('home');else if(S.view==='cat')render();
}
