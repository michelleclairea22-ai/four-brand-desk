// TEMPLATE bulan baru. Salin ke data/YYYY-MM.js, tukar 'YYYY-MM', isi satu post setiap brand setiap hari.
// Lepas tu tambah <script src="data/YYYY-MM.js"></script> dalam index.html (bahagian "Data bulan") dan run:
//   node tools/check-unique.js data/YYYY-MM.js
// Field wajib: date, brand (selesaai|tumbooh|saja|badax), pillar, angle, idea, hook,
//   format (Reel/Video | Photo/Static | Carousel/Info | Story/Thread), steps (2-4), times.
// Pilihan: note (cth 'Inspired credit: UNCONFIRMED'), reuseOk (sebab sengaja guna tema lama dengan angle baru), caption (biar kosong).
// Masa post (knowledge pack): Selesaai 1:00 PM & 7:00 PM · Tumbooh 3:00 PM · Saja 3:40 PM · Badax 3:00 PM & 7:40 PM
// JANGAN reka harga/spec/testimoni/nama staf/nombor/unit/deposit/WhatsApp. Tak pasti = UNCONFIRMED. Jangan sebut brand induk.
window.MONTHS = window.MONTHS || {};
window.MONTHS['YYYY-MM'] = {
  month: 'YYYY-MM',
  label: 'Bulan YYYY',
  posts: [
    { date: 'YYYY-MM-01', brand: 'selesaai', pillar: '', angle: '', idea: '', hook: '', format: 'Reel/Video', steps: ['', ''], times: ['1:00 PM', '7:00 PM'], caption: '' },
    { date: 'YYYY-MM-01', brand: 'tumbooh', pillar: '', angle: '', idea: '', hook: '', format: 'Carousel/Info', steps: ['', ''], times: ['3:00 PM'], caption: '' },
    { date: 'YYYY-MM-01', brand: 'saja', pillar: '', angle: '', idea: '', hook: '', format: 'Photo/Static', steps: ['', ''], times: ['3:40 PM'], caption: '' },
    { date: 'YYYY-MM-01', brand: 'badax', pillar: '', angle: '', idea: '', hook: '', format: 'Reel/Video', steps: ['', ''], times: ['3:00 PM', '7:40 PM'], caption: '' },
    // ... ulang untuk setiap hari dalam bulan
  ],
};
