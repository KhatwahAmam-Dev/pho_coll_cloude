/**
 * StoreLog — backend Google Apps Script (versi 2: hapus/reset + lokasi GPS)
 *
 * Yang perlu disiapkan:
 * 1. Folder Google Drive tujuan → salin ID-nya ke ROOT_FOLDER_ID.
 * 2. Google Sheet dengan sheet bernama "Users", baris 1 = judul kolom:
 *      A: username | B: pin | C: nama | D: aktif (isi "tidak" untuk menonaktifkan)
 *    Format kolom B sebagai Plain text supaya PIN "0123" tidak kehilangan angka 0.
 *    Salin ID Sheet ke SHEET_ID. Sheet "Log" dibuat otomatis.
 * 3. Ganti API_KEY, samakan dengan CONFIG.API_KEY di storelog.html.
 * 4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *    Salin URL /exec ke CONFIG.SCRIPT_URL di storelog.html.
 *
 * Kalau ini pembaruan dari versi sebelumnya:
 *    Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.
 *    URL /exec tetap sama, tidak perlu mengubah SCRIPT_URL.
 *
 * Aturan hapus: foto/collage yang dihapus dari aplikasi TIDAK dihapus permanen.
 * File dipindah ke folder "_Dihapus" di dalam folder utama, dan kejadiannya dicatat di sheet Log.
 */
const CONFIG = {
  API_KEY: 'ganti-dengan-kode-rahasia',
  ROOT_FOLDER_ID: 'ID_FOLDER_DRIVE',
  SHEET_ID: 'ID_GOOGLE_SHEET'
};

function doGet() {
  return json({ ok: true, msg: 'StoreLog API aktif' });
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.key !== CONFIG.API_KEY) return json({ ok: false, msg: 'Kunci API salah' });
    if (b.action === 'login') return json(login(b));
    if (b.action === 'upload') return json(upload(b));
    if (b.action === 'remove') return json(removeFile(b));
    if (b.action === 'log') return json(addLog(b));
    return json({ ok: false, msg: 'Aksi tidak dikenal' });
  } catch (err) {
    return json({ ok: false, msg: String(err) });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function login(b) {
  const sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Users');
  const rows = sh.getDataRange().getValues().slice(1);
  const u = String(b.user || '').trim().toLowerCase();
  const r = rows.find(function (x) {
    return String(x[0]).trim().toLowerCase() === u &&
           String(x[1]) === String(b.pin) &&
           String(x[3]).toLowerCase() !== 'tidak';
  });
  return r ? { ok: true, nama: r[2] || r[0] } : { ok: false, msg: 'Username atau PIN salah.' };
}

function safe(n) {
  return String(n).replace(/[\\\/:*?"<>|]/g, '-').trim() || '-';
}

function upload(b) {
  let folder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  (b.path || []).forEach(function (n) {
    n = safe(n);
    const it = folder.getFoldersByName(n);
    folder = it.hasNext() ? it.next() : folder.createFolder(n);
  });
  const name = safe(b.filename);
  const old = folder.getFilesByName(name);          // nama sama → ganti
  while (old.hasNext()) old.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'image/jpeg', name);
  const f = folder.createFile(blob);

  let loc = 'Lokasi: tidak tercatat';
  if (b.geo) {
    loc = 'Lokasi: ' + b.geo.lat + ',' + b.geo.lng +
          ' (akurasi ±' + Math.round(b.geo.acc) + ' m)' +
          ' | Peta: https://maps.google.com/?q=' + b.geo.lat + ',' + b.geo.lng +
          (b.geo.inside === true ? ' | Di area toko: ya' :
           b.geo.inside === false ? ' | Di area toko: TIDAK' : '');
  }
  f.setDescription(
    'Petugas: ' + (b.user || '-') +
    ' | Foto diambil (jam HP): ' + (b.takenAt ? new Date(b.takenAt).toISOString() : '-') +
    ' | Diterima server: ' + new Date().toISOString() +
    ' | ' + loc
  );
  return { ok: true, id: f.getId(), url: f.getUrl() };
}

// Pindahkan file ke _Dihapus (bukan hapus permanen) dan catat di Log.
function removeFile(b) {
  let moved = false;
  if (b.fileId) {
    try {
      const f = DriveApp.getFileById(b.fileId);
      const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
      const it = root.getFoldersByName('_Dihapus');
      const trash = it.hasNext() ? it.next() : root.createFolder('_Dihapus');
      f.setDescription((f.getDescription() || '') +
        ' | Dihapus oleh ' + (b.user || '-') + ' pada ' + new Date().toISOString());
      f.moveTo(trash);
      moved = true;
    } catch (err) {
      // file sudah tidak ada atau sudah dipindah — anggap selesai
    }
  }
  if (b.note) addLog({ user: b.user, note: b.note });
  return { ok: true, moved: moved };
}

function addLog(b) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sh = ss.getSheetByName('Log') || ss.insertSheet('Log');
  sh.appendRow([new Date(), b.user || '-', b.note || '']);
  return { ok: true };
}
