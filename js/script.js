(() => {
'use strict';

/* ============================================================
   PENGATURAN — ubah bagian ini saja
   ============================================================ */
const CONFIG = {
  STORE_NAME: 'MM KLM',          
  SCRIPT_URL: '',                   
   API_KEY: 'ganti-dengan-kode-rahasia', 
  DEMO_USERS: { demo: '1234' },     
  PHOTO_W: 960,                     
  JPEG_Q: 0.78,
  // GPS. Angka akurasi dari browser = radius dalam meter (tingkat kepercayaan 95% menurut spesifikasi).
  GPS_TARGET_M: 30,                 
  GPS_WAJIB: false,                 
  STORE_GEO: { lat: null, lng: null, radius: 150 }  // titik toko (isi lat/lng) + radius area toko dalam meter
};

// Daftar kegiatan per shift. min/max = jumlah foto, req = wajib, meter = minta angka KWH
const AKTIVITAS = { id:'aktivitas', name:'Aktivitas Harian', icon:'🛒', min:1, max:30, req:true };
const EXPIRED   = { id:'expired',   name:'Cek Expired',      icon:'📅', min:1, max:30, req:true };
const RAK       = { id:'rak',       name:'Kebersihan Rak',   icon:'🧽', min:3, max:5,  req:true };
const SHIFTS = {
  pagi: { label:'Shift Pagi', cats:[
    { id:'buka',    name:'Buka Toko',         icon:'🔓', min:1, max:1, req:true },
    { id:'kwh_pagi',name:'KWH Listrik Pagi',  icon:'⚡', min:1, max:1, req:true, meter:true },
    { id:'ready',   name:'Store Ready Konsep',icon:'🏪', min:3, max:4, req:true },
    RAK,
    { id:'brief_pagi', name:'Briefing Pagi',  icon:'👥', min:1, max:2, req:true },
    EXPIRED,
    AKTIVITAS
  ]},
  siang: { label:'Shift Siang', cats:[
    { id:'serah',   name:'Serah Terima Tugas',icon:'🤝', min:1, max:3, req:true },
    { id:'brief_siang', name:'Briefing Siang',icon:'👥', min:1, max:3, req:true },
    AKTIVITAS,
    EXPIRED,
    RAK,
    { id:'promo',   name:'Implementasi Promo',icon:'🏷️', min:1, max:10, req:false },
    { id:'kwh_malam',name:'KWH Listrik Malam',icon:'⚡', min:1, max:1, req:true, meter:true },
    { id:'closing', name:'Closing',           icon:'🔒', min:1, max:3, req:true }
  ]}
};
