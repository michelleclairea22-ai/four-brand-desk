// localStorage helpers + calendar helpers. Semua key bermula "desk:" dan dinamakan ikut bulan: desk:YYYY-MM:<name>
(function () {
  const P = 'desk:';
  const read = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const write = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const mk = (m, name) => `${m}:${name}`;

  const Store = {
    get: (m, name, d) => read(mk(m, name), d),
    set: (m, name, v) => write(mk(m, name), v),
    getGlobal: (name, d) => read(name, d),
    setGlobal: (name, v) => write(name, v),
    localMonths() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); const m = /^desk:(\d{4}-\d{2}):skeleton$/.exec(k);
        if (m) out.push(m[1]);
      }
      return out;
    },
    exportAll() {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(P)) data[k] = localStorage.getItem(k); }
      return { app: 'four-brand-desk', version: 1, exportedAt: new Date().toISOString(), data };
    },
    importAll(obj) {
      if (!obj || obj.app !== 'four-brand-desk' || typeof obj.data !== 'object') throw new Error('Fail bukan backup Four-Brand Desk');
      let n = 0;
      for (const [k, v] of Object.entries(obj.data)) { if (k.startsWith(P) && typeof v === 'string') { localStorage.setItem(k, v); n++; } }
      return n;
    },
  };

  const pad = n => String(n).padStart(2, '0');
  const Cal = {
    daysIn: m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); },
    dateStr: (m, d) => `${m}-${pad(d)}`,
    todayStr: () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; },
    parse: s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    // Minggu = blok 7 hari bermula 1hb: Week 1 = 1-7, Week 2 = 8-14, ... minggu terakhir mungkin lebih pendek.
    weeks(m) {
      const n = Cal.daysIn(m), out = [];
      for (let s = 1, w = 1; s <= n; s += 7, w++) out.push({ n: w, start: s, end: Math.min(s + 6, n) });
      return out;
    },
    weekOf: (m, day) => Math.floor((day - 1) / 7),
    nextMonth: m => { let [y, mo] = m.split('-').map(Number); mo++; if (mo > 12) { mo = 1; y++; } return `${y}-${pad(mo)}`; },
    minutes: t => { const r = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ''); if (!r) return 0; let h = +r[1] % 12; if (/pm/i.test(r[3])) h += 12; return h * 60 + +r[2]; },
  };
  window.Store = Store; window.Cal = Cal;
})();
