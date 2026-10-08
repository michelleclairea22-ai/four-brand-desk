# Four-Brand Content Desk

Dashboard content planning bulanan untuk **Selesaai, Tumbooh, Saja Co-living dan BADAX Malaysia**.
HTML/CSS/JS statik. Tiada backend, tiada build step. Buka terus `index.html` dalam Chrome desktop (`file://` pun jalan).
App ni berasingan sepenuhnya daripada mana-mana Marketing Calendar Planner.

## Struktur
```
index.html            shell + senarai <script> data bulan
css/style.css         dark (default) / light theme
js/config.js          brand, warna, masa post, platform, format
js/store.js           localStorage (desk:YYYY-MM:*) + kalendar/minggu
js/app.js             Overview, Content Planner, modal, bell, Undo, Export/Import, Tambah bulan
data/2026-10.js       Oktober 2026 (124 post = 4 brand x 31 hari, caption kosong)
data/_template.js     template bulan baru
tools/check-unique.js semakan unik (Node)
screenshots/          screenshot ujian
```

## Minggu
Minggu = blok 7 hari bermula 1hb: **Week 1 = 1–7, Week 2 = 8–14, Week 3 = 15–21, Week 4 = 22–28, Week 5 = 29–hujung bulan** (minggu akhir lebih pendek; Februari biasa ada 4 minggu sahaja).
Oktober 2026 bermula Khamis, jadi setiap minggu ialah Khamis–Rabu dan Week 5 = 29–31 (Kha–Sab).

## Storan (localStorage)
| Key | Isi |
|---|---|
| `desk:YYYY-MM:status` | `{postId: Draft/Ready/Posted}` (postId = `YYYY-MM-DD-brand`) |
| `desk:YYYY-MM:captions` | caption setiap kad (auto-save, kekal lepas refresh) |
| `desk:YYYY-MM:platforms` | checklist Facebook/Instagram/TikTok/Threads |
| `desk:YYYY-MM:undo` | senarai tindakan Posted (untuk Undo global) |
| `desk:YYYY-MM:skeleton` | bulan yang dicipta dengan "Tambah bulan" (sebelum ada data file) |
| `desk:theme`, `desk:lastMonth` | setting |

Progress brand = Posted / jumlah kad brand tu dalam bulan tu x 100.
**Export JSON** muat turun semua key `desk:*`; **Import JSON** pulihkan (key sama ditimpa). Export dulu sebelum clear browser.

## Tambah bulan baru
1. **Cepat (tanpa fail):** klik **+ Tambah bulan** → taip `YYYY-MM`. Skeleton (hari, minggu, masa post setiap brand, idea kosong) disimpan dalam localStorage. Idea/hook/format/pillar boleh diisi terus dalam kad Content Planner.
2. **Kekal (disyorkan):**
   1. Salin `data/_template.js` → `data/YYYY-MM.js`, tukar `YYYY-MM`, isi satu post setiap brand setiap hari (date, brand, pillar, angle, idea, hook, format, 2–4 steps, times). Biar `caption` kosong.
   2. Tambah `<script src="data/YYYY-MM.js"></script>` dalam `index.html` di bahagian *Data bulan*.
   3. Run semakan: `node tools/check-unique.js data/YYYY-MM.js` dan baiki sampai `RESULT: PASS`.
   4. Refresh `index.html`. Data file menggantikan skeleton localStorage untuk bulan tu (status/caption kekal sebab key ikut postId).

## Uniqueness checker
`node tools/check-unique.js data/YYYY-MM.js [--drafts /workspace/drafts] [--jaccard 0.6]`
- **FAIL:** field wajib kosong, format salah, hari/brand tertinggal atau berganda, idea/hook sama, brand+angle sama, Jaccard(idea+hook) > 0.6, sebut brand induk.
- **WARN:** mirip tema dalam `/workspace/drafts` (nama fail, headline poster, baris pertama caption, heading draft) atau senarai tema dalam knowledge pack, atau bertindih dengan fail bulan sebelumnya dalam `data/`.
- Kalau sengaja guna tema lama dengan angle baru, letak `"reuseOk": "sebab"` dalam post → WARN jadi INFO.

## Hukum content
Draft sahaja; Michelle approve dulu. Satu brand satu voice. Jangan reka harga, spec, testimoni, nama staf, nombor, unit, deposit, WhatsApp. Tak pasti = **UNCONFIRMED**. Satu-satunya harga confirm: Saja master room female-only RM900/bulan (guna hanya jika Michelle sahkan masih valid). Badax: jangan reka handle creator; tulis `Inspired credit: UNCONFIRMED` sampai handle & link disahkan.
