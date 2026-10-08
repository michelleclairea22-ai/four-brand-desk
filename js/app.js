// Four-Brand Content Desk — UI. Plain JS, tiada build step, jalan terus dari file://
(function () {
  const D = window.DESK, B = D.brands, BK = Object.fromEntries(B.map(b => [b.key, b]));
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { month: null, view: 'overview', week: 0, brand: null, focus: null, modalId: null };
  let M = null; // current month model {key, label, isLocal, posts[], byId{}}

  // ---------- month model ----------
  function monthLabel(m) { const [y, mo] = m.split('-').map(Number); return `${D.monthNames[mo - 1]} ${y}`; }
  function allMonths() { return [...new Set([...Object.keys(window.MONTHS || {}), ...Store.localMonths()])].sort(); }
  function skeleton(m) {
    const posts = [];
    for (let d = 1; d <= Cal.daysIn(m); d++) for (const b of B)
      posts.push({ date: Cal.dateStr(m, d), brand: b.key, pillar: '', angle: '', idea: '', hook: '', format: '', steps: [], times: b.times.slice(), caption: '' });
    return { month: m, label: monthLabel(m), posts };
  }
  function loadMonth(m) {
    const file = (window.MONTHS || {})[m];
    const src = file || Store.get(m, 'skeleton', null) || skeleton(m);
    const posts = src.posts.map(p => ({ ...p, id: `${p.date}-${p.brand}` }))
      .sort((a, b) => a.date.localeCompare(b.date) || B.findIndex(x => x.key === a.brand) - B.findIndex(x => x.key === b.brand));
    const cnt = {};
    posts.forEach(p => { cnt[p.brand] = (cnt[p.brand] || 0) + 1; p.num = cnt[p.brand]; p.day = +p.date.slice(8); });
    M = { key: m, label: src.label || monthLabel(m), isLocal: !file, posts, byId: Object.fromEntries(posts.map(p => [p.id, p])) };
  }
  function saveSkeletonField(id, field, value) {
    const sk = Store.get(M.key, 'skeleton', null); if (!sk) return;
    const p = sk.posts.find(x => `${x.date}-${x.brand}` === id); if (!p) return;
    p[field] = value; Store.set(M.key, 'skeleton', sk); M.byId[id][field] = value;
  }

  // ---------- state helpers ----------
  const getStatus = id => (Store.get(M.key, 'status', {})[id]) || 'Draft';
  const getCaption = id => { const c = Store.get(M.key, 'captions', {}); return id in c ? c[id] : (M.byId[id].caption || ''); };
  const getPlatforms = id => Store.get(M.key, 'platforms', {})[id] || {};
  function setCaption(id, text) { const c = Store.get(M.key, 'captions', {}); c[id] = text; Store.set(M.key, 'captions', c); }
  function setPlatform(id, pk, on) { const all = Store.get(M.key, 'platforms', {}); all[id] = { ...(all[id] || {}), [pk]: on }; Store.set(M.key, 'platforms', all); }
  function setStatus(id, st, opts = {}) {
    const all = Store.get(M.key, 'status', {}); const prev = all[id] || 'Draft';
    if (prev === st) return;
    all[id] = st; Store.set(M.key, 'status', all);
    let undo = Store.get(M.key, 'undo', []);
    if (st === 'Posted' && !opts.fromUndo) { undo.push({ id, prev, at: new Date().toISOString() }); undo = undo.slice(-50); }
    if (prev === 'Posted' && !opts.fromUndo) undo = undo.filter(u => u.id !== id);
    Store.set(M.key, 'undo', undo);
    if (st === 'Posted') toast(`${BK[M.byId[id].brand].name} #${M.byId[id].num} → Posted. Boleh Undo kalau tersilap.`);
    renderAll();
  }
  function undoLast() {
    const undo = Store.get(M.key, 'undo', []); const u = undo.pop();
    if (!u) { toast('Tiada tindakan Posted untuk di-undo (bulan ni).'); return; }
    Store.set(M.key, 'undo', undo);
    setStatus(u.id, u.prev, { fromUndo: true });
    const p = M.byId[u.id]; toast(`Undo: ${BK[p.brand].name} #${p.num} kembali ke ${u.prev}.`);
  }
  const progress = bk => { const ps = M.posts.filter(p => p.brand === bk); const posted = ps.filter(p => getStatus(p.id) === 'Posted').length; return { total: ps.length, posted, ready: ps.filter(p => getStatus(p.id) === 'Ready').length, pct: ps.length ? Math.round(posted / ps.length * 100) : 0 }; };
  function focusDate() {
    const t = Cal.todayStr();
    if (t.startsWith(M.key)) return S.focus && S.focus.startsWith(M.key) ? S.focus : t;
    return S.focus && S.focus.startsWith(M.key) ? S.focus : Cal.dateStr(M.key, 1);
  }
  const fmtDate = (ds, long) => { const d = Cal.parse(ds); return `${(long ? D.dayNames : D.dayShort)[d.getDay()]}, ${d.getDate()} ${D.monthShort[d.getMonth()]}`; };
  const briefText = p => [`${BK[p.brand].name} · #${p.num} · ${fmtDate(p.date, true)} · ${p.times.join(' & ')}`, `Idea: ${p.idea || '-'}`, `Hook: ${p.hook || '-'}`, `Format: ${p.format || '-'} | Pillar: ${p.pillar || '-'} | Angle: ${p.angle || '-'}`, ...(p.steps || []).map((s, i) => `${i + 1}. ${s}`), p.note ? `Nota: ${p.note}` : ''].filter(Boolean).join('\n');

  // ---------- small UI bits ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Disalin ✔');
  }
  const statusPill = st => `<span class="pill st-${st.toLowerCase()}">${st}</span>`;
  const fmtChip = f => f ? `<span class="chip">${esc(f)}</span>` : '<span class="chip muted">Format?</span>';
  const platformBoxes = p => { const on = getPlatforms(p.id); return `<div class="platforms">${D.platforms.map(([k, l]) => `<label><input type="checkbox" data-plat="${k}" data-id="${p.id}" ${on[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>${BK[p.brand].platformNote ? `<div class="tiny warn">${esc(BK[p.brand].platformNote)}</div>` : ''}`; };
  const statusSelect = p => `<select class="status-sel" data-id="${p.id}">${D.statuses.map(s => `<option ${getStatus(p.id) === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
  const unconf = s => esc(s).replace(/UNCONFIRMED/g, '<b class="unc">UNCONFIRMED</b>');

  // ---------- header ----------
  function renderHeader() {
    const sel = $('#monthSelect');
    sel.innerHTML = allMonths().map(m => `<option value="${m}" ${m === M.key ? 'selected' : ''}>${monthLabel(m)}${(window.MONTHS || {})[m] ? '' : ' (local)'}</option>`).join('');
    $('#monthLabel').textContent = `${M.label} workspace${M.isLocal ? ' · skeleton localStorage (belum ada data file)' : ''}`;
    $('#heroBar').innerHTML = `<b>${esc(M.label)}</b> · ${M.posts.length} post · ${B.length} brand · ${Cal.weeks(M.key).map(w => `W${w.n} ${w.start}–${w.end}`).join(' · ')}`;
    $('#navLegend').innerHTML = B.map(b => `<div class="legend" style="--c:${b.color}"><i></i>${esc(b.name)}<small>${b.times.join(' & ')}</small></div>`).join('');
    // bell
    const fd = focusDate(); const out = M.posts.filter(p => p.date === fd && getStatus(p.id) !== 'Posted');
    const badge = $('#bellBadge'); badge.textContent = out.length; badge.hidden = !out.length;
    const pop = $('#bellPopup');
    pop.innerHTML = `<div class="pop-h">Today's posting · ${fmtDate(fd, true)}${fd === Cal.todayStr() ? '' : ' <span class="tiny">(tarikh dipilih)</span>'}</div>` +
      (out.length ? out.sort((a, b) => Cal.minutes(a.times[0]) - Cal.minutes(b.times[0])).map(p => `<div class="pop-item" data-open="${p.id}" style="--c:${BK[p.brand].color}"><b>${p.times.join(' & ')}</b><span>${esc(BK[p.brand].name)}</span>${statusPill(getStatus(p.id))}</div>`).join('') : '<div class="pop-empty">Semua dah Posted hari ni 🎉</div>');
    $('#undoBtn').disabled = !Store.get(M.key, 'undo', []).length;
  }

  // ---------- overview ----------
  function renderOverview() {
    const fd = focusDate(); const day = +fd.slice(8); const wk = Cal.weekOf(M.key, day);
    const todays = B.map(b => M.byId[`${fd}-${b.key}`]).filter(Boolean);
    const weekPosts = M.posts.filter(p => Cal.weekOf(M.key, p.day) === wk);
    const mix = D.formats.map(f => ({ f, n: M.posts.filter(p => p.format === f).length, w: weekPosts.filter(p => p.format === f).length }));
    const icons = { 'Reel/Video': '🎬', 'Photo/Static': '🖼', 'Carousel/Info': '🗂', 'Story/Thread': '💬' };
    $('#view-overview').innerHTML = `
      <div class="toolbar">
        <h2>Overview</h2>
        <label>Tarikh <input type="date" id="focusDate" value="${fd}" min="${Cal.dateStr(M.key, 1)}" max="${Cal.dateStr(M.key, Cal.daysIn(M.key))}"></label>
        <span class="muted">${fd === Cal.todayStr() ? 'Hari ini' : 'Tarikh dipilih'} · Week ${wk + 1}</span>
      </div>
      <h3 class="sec">Idea hari ni · ${fmtDate(fd, true)}</h3>
      <div class="idea-grid">${todays.map(p => `
        <article class="card idea-card" data-open="${p.id}" style="--c:${BK[p.brand].color}">
          <div class="row"><b class="bname">${esc(BK[p.brand].name)}</b>${statusPill(getStatus(p.id))}</div>
          <div class="tiny muted">#${p.num} · ${p.times.join(' & ')} · ${esc(p.pillar || '—')}</div>
          <h4>${esc(p.idea) || '<span class="muted">(idea belum diisi)</span>'}</h4>
          <p class="hook">${esc(p.hook)}</p>
          <div class="row">${fmtChip(p.format)}<span class="tiny link">Buka detail →</span></div>
        </article>`).join('')}</div>
      <div class="two-col">
        <div class="card panel"><h3 class="sec">Posting schedule</h3>
          <table class="sched"><thead><tr><th>Brand</th><th>Masa</th><th>${fmtDate(fd)}</th></tr></thead><tbody>
          ${B.map(b => { const p = M.byId[`${fd}-${b.key}`]; return `<tr style="--c:${b.color}"><td><i class="dot"></i>${esc(b.name)}</td><td>${b.times.join(' & ')}</td><td>${p ? statusPill(getStatus(p.id)) : '-'}</td></tr>`; }).join('')}
          </tbody></table>
          <div class="tiny muted">Masa ikut knowledge pack. Draft sahaja — tak auto-publish.</div>
        </div>
        <div class="card panel"><h3 class="sec">Quick check · format mix</h3>
          <div class="mix">${mix.map(x => `<div class="mix-tile"><div class="mix-ico">${icons[x.f]}</div><div class="mix-n">${x.n}</div><div class="tiny">${x.f}</div><div class="tiny muted">${M.posts.length ? Math.round(x.n / M.posts.length * 100) : 0}% bulan · ${x.w} minggu ni</div></div>`).join('')}</div>
          ${M.posts.some(p => !p.format) ? `<div class="tiny warn">${M.posts.filter(p => !p.format).length} post belum ada format.</div>` : ''}
        </div>
      </div>
      <h3 class="sec">Progress brand · ${esc(M.label)}</h3>
      <div class="prog-grid">${B.map(b => { const g = progress(b.key); return `
        <div class="card prog" style="--c:${b.color}">
          <div class="row"><b>${esc(b.name)}</b><span class="pct">${g.pct}%</span></div>
          <div class="bar"><div style="width:${g.pct}%"></div></div>
          <div class="tiny muted">${g.posted} / ${g.total} Posted · ${g.ready} Ready · ${g.total - g.posted - g.ready} Draft</div>
        </div>`; }).join('')}</div>`;
  }

  // ---------- planner ----------
  function renderPlanner() {
    const weeks = Cal.weeks(M.key); if (S.week >= weeks.length) S.week = 0;
    const w = weeks[S.week]; const mshort = D.monthShort[+M.key.slice(5) - 1];
    const posts = M.posts.filter(p => p.day >= w.start && p.day <= w.end && (!S.brand || p.brand === S.brand));
    const days = [...new Set(posts.map(p => p.date))];
    $('#view-planner').innerHTML = `
      <div class="toolbar"><h2>Content Planner</h2><span class="muted">Minggu = blok 7 hari dari 1hb (minggu akhir mungkin pendek)</span></div>
      <div class="btn-row">${weeks.map((x, i) => `<button class="seg ${i === S.week ? 'on' : ''}" data-week="${i}">Week ${x.n}<small>${x.start}–${x.end} ${mshort} · ${D.dayShort[Cal.parse(Cal.dateStr(M.key, x.start)).getDay()]}–${D.dayShort[Cal.parse(Cal.dateStr(M.key, x.end)).getDay()]}</small></button>`).join('')}</div>
      <div class="btn-row">${B.map(b => `<button class="seg brand ${S.brand === b.key ? 'on' : ''}" data-brand="${b.key}" style="--c:${b.color}">${esc(b.name)}</button>`).join('')}
        <span class="tiny muted">${S.brand ? 'Klik brand sama sekali lagi untuk tunjuk semua brand' : 'Menunjukkan semua brand'}</span></div>
      ${M.isLocal ? '<div class="notice">Bulan ni skeleton localStorage: isi idea/hook/format terus dalam kad. Bila data file <code>data/' + M.key + '.js</code> ditambah, data file akan diguna.</div>' : ''}
      ${days.map(ds => `<h3 class="dayhead">${fmtDate(ds, true)}</h3><div class="plan-grid">${posts.filter(p => p.date === ds).map(planCard).join('')}</div>`).join('')}`;
  }
  function planCard(p) {
    const b = BK[p.brand]; const st = getStatus(p.id);
    const edit = M.isLocal;
    return `<article class="card plan st-${st.toLowerCase()}" style="--c:${b.color}" data-card="${p.id}">
      <div class="row"><span class="tiny"><b class="bname">${esc(b.name)}</b> · Post #${p.num} · ${fmtDate(p.date)}</span>${statusPill(st)}</div>
      ${edit ? `<input class="edit" data-field="idea" data-id="${p.id}" placeholder="Idea (tajuk pendek)" value="${esc(p.idea)}">
                <input class="edit" data-field="hook" data-id="${p.id}" placeholder="Hook 1 baris" value="${esc(p.hook)}">
                <div class="row"><select class="edit" data-field="format" data-id="${p.id}"><option value="">Format…</option>${D.formats.map(f => `<option ${p.format === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
                <input class="edit" data-field="pillar" data-id="${p.id}" placeholder="Pillar" value="${esc(p.pillar)}"></div>`
        : `<h4 class="clickable" data-open="${p.id}">${esc(p.idea)}</h4><p class="hook">${esc(p.hook)}</p>
           <div class="meta">${fmtChip(p.format)} <span class="tiny">${esc(p.pillar)} · <i>${esc(p.angle)}</i></span></div>`}
      <div class="tiny sched-line">⏰ ${p.times.join(' & ')}</div>
      ${p.steps && p.steps.length ? `<ol class="steps">${p.steps.map(s => `<li>${unconf(s)}</li>`).join('')}</ol>` : ''}
      ${p.note ? `<div class="tiny note">${unconf(p.note)}</div>` : ''}
      ${platformBoxes(p)}
      <div class="row">${statusSelect(p)}<button class="btn small" data-copy="${p.id}">📋 Copy</button><button class="btn small ghost" data-open="${p.id}">Detail</button></div>
      <textarea class="caption" data-cap="${p.id}" placeholder="Caption / Quick note (auto-save)">${esc(getCaption(p.id))}</textarea>
    </article>`;
  }

  // ---------- modal ----------
  function openModal(id) {
    const p = M.byId[id]; if (!p) return; S.modalId = id; const b = BK[p.brand]; const st = getStatus(id);
    $('#modal').style.setProperty('--c', b.color);
    $('#modal').innerHTML = `
      <button class="x" data-close>✕</button>
      <div class="tiny"><b class="bname">${esc(b.name)}</b> · Post #${p.num} · ${fmtDate(p.date, true)} · ${statusPill(st)}</div>
      <h2>${esc(p.idea) || '(idea belum diisi)'}</h2>
      <p class="hook big">${esc(p.hook)}</p>
      <div class="meta">${fmtChip(p.format)} <span class="tiny">${esc(p.pillar)} · <i>${esc(p.angle)}</i></span></div>
      <div class="m-grid">
        <div><h4>Practical steps</h4>${p.steps && p.steps.length ? `<ol class="steps">${p.steps.map(s => `<li>${unconf(s)}</li>`).join('')}</ol>` : '<p class="muted">—</p>'}
          ${p.note ? `<div class="tiny note">${unconf(p.note)}</div>` : ''}</div>
        <div><h4>Schedule</h4><p>⏰ ${p.times.join(' & ')} · ${fmtDate(p.date, true)}</p><h4>Platform checklist</h4>${platformBoxes(p)}</div>
      </div>
      <h4>Caption</h4>
      <textarea class="caption big" data-cap="${p.id}" placeholder="Tulis/paste caption di sini (auto-save, draft — tunggu Michelle)">${esc(getCaption(id))}</textarea>
      <div class="row end">
        <button class="btn ghost" data-copy="${id}">📋 Copy</button>
        <button class="btn" data-set="${id}" data-st="Ready" ${st === 'Ready' ? 'disabled' : ''}>Set Ready</button>
        <button class="btn primary" data-set="${id}" data-st="Posted" ${st === 'Posted' ? 'disabled' : ''}>Mark Posted</button>
      </div>`;
    $('#modalBack').hidden = false;
  }
  const closeModal = () => { $('#modalBack').hidden = true; S.modalId = null; };

  // ---------- render ----------
  function renderAll() {
    renderHeader();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === S.view));
    $('#view-overview').hidden = S.view !== 'overview'; $('#view-planner').hidden = S.view !== 'planner';
    if (S.view === 'overview') renderOverview(); else renderPlanner();
    if (S.modalId) openModal(S.modalId);
  }
  function switchMonth(m) {
    S.month = m; S.focus = null; S.week = 0; Store.setGlobal('lastMonth', m); loadMonth(m);
    const t = Cal.todayStr(); if (t.startsWith(m)) S.week = Cal.weekOf(m, +t.slice(8));
    renderAll();
  }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-view],[data-week],[data-brand],[data-copy],[data-set],[data-close]');
    if (!t) { if (!e.target.closest('.bell-wrap')) $('#bellPopup').hidden = true; if (e.target === $('#modalBack')) closeModal(); return; }
    if (t.dataset.close != null) return closeModal();
    if (t.dataset.view) { S.view = t.dataset.view; return renderAll(); }
    if (t.dataset.week) { S.week = +t.dataset.week; return renderPlanner(); }
    if (t.dataset.brand) { S.brand = S.brand === t.dataset.brand ? null : t.dataset.brand; return renderPlanner(); }
    if (t.dataset.copy) { const id = t.dataset.copy; const cap = getCaption(id); return copyText(cap.trim() ? cap : briefText(M.byId[id])); }
    if (t.dataset.set) return setStatus(t.dataset.set, t.dataset.st);
    if (t.dataset.open) { $('#bellPopup').hidden = true; return openModal(t.dataset.open); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('status-sel')) return setStatus(t.dataset.id, t.value);
    if (t.dataset.plat) return setPlatform(t.dataset.id, t.dataset.plat, t.checked);
    if (t.id === 'focusDate' && t.value) { S.focus = t.value; return renderAll(); }
    if (t.classList.contains('edit')) { saveSkeletonField(t.dataset.id, t.dataset.field, t.value); renderHeader(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.cap) { setCaption(t.dataset.cap, t.value); document.querySelectorAll(`[data-cap="${t.dataset.cap}"]`).forEach(x => { if (x !== t) x.value = t.value; }); }
    if (t.classList.contains('edit') && t.tagName === 'INPUT') saveSkeletonField(t.dataset.id, t.dataset.field, t.value);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#bellPopup').hidden = true; } });
  $('#bellBtn').addEventListener('click', e => { e.stopPropagation(); $('#bellPopup').hidden = !$('#bellPopup').hidden; });
  $('#undoBtn').addEventListener('click', undoLast);
  $('#monthSelect').addEventListener('change', e => switchMonth(e.target.value));
  $('#addMonthBtn').addEventListener('click', () => {
    const months = allMonths(); const def = Cal.nextMonth(months[months.length - 1] || Cal.todayStr().slice(0, 7));
    const m = (prompt('Tambah bulan (format YYYY-MM):', def) || '').trim();
    if (!m) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return toast('Format salah. Contoh: 2026-11');
    if (months.includes(m)) { toast(`${monthLabel(m)} dah ada.`); return switchMonth(m); }
    Store.set(m, 'skeleton', skeleton(m));
    toast(`${monthLabel(m)} dicipta (skeleton ${Cal.daysIn(m)} hari, simpan dalam localStorage).`);
    switchMonth(m);
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.exportAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); const d = new Date();
    a.href = URL.createObjectURL(blob); a.download = `four-brand-desk-backup-${Cal.todayStr()}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup JSON dimuat turun.');
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!confirm(`Import ${Object.keys(obj.data || {}).length} key dari ${f.name}? Key yang sama akan ditimpa.`)) return;
        const n = Store.importAll(obj); toast(`Import siap: ${n} key.`);
        const months = allMonths(); switchMonth(months.includes(S.month) ? S.month : months[0]);
      } catch (err) { alert('Import gagal: ' + err.message); }
      e.target.value = '';
    };
    r.readAsText(f);
  });
  function applyTheme(t) { document.body.classList.toggle('light', t === 'light'); $('#themeBtn').textContent = t === 'light' ? '🌙 Dark' : '☀ Light'; }
  $('#themeBtn').addEventListener('click', () => { const t = document.body.classList.contains('light') ? 'dark' : 'light'; Store.setGlobal('theme', t); applyTheme(t); });

  // ---------- init ----------
  applyTheme(Store.getGlobal('theme', 'dark'));
  const months = allMonths(); const cur = Cal.todayStr().slice(0, 7); const last = Store.getGlobal('lastMonth', null);
  if (!months.length) { Store.set(cur, 'skeleton', skeleton(cur)); months.push(cur); }
  const params = new URLSearchParams(location.search);
  if (params.get('view')) S.view = params.get('view');
  const start = params.get('month') && months.includes(params.get('month')) ? params.get('month') : months.includes(cur) ? cur : months.includes(last) ? last : months[months.length - 1];
  switchMonth(start);
})();
