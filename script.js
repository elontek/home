(() => {
  'use strict';
  const data = typeof romData !== 'undefined' ? romData : {};
  const $ = s => document.querySelector(s);
  const listEl = $('#deviceList'), viewEl = $('#deviceView'), countEl = $('#resultCount');
  const sidebar = $('#sidebar'), scrim = $('#scrim'), search = $('#search'), picker = $('#picker');
  const wide = matchMedia('(min-width: 860px)');

  const ICONS = {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>'
  };
  const icon = n => { const t = document.createElement('template'); t.innerHTML = ICONS[n]; return t.content.firstElementChild; };
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      k === 'class' ? (e.className = v) : e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  }

  /* ---- veriyi normalize et (data.js'e dokunulmaz) ---- */
  const BRANDS = [['Samsung', /^samsung\b/i], ['Sony', /^sony\b/i], ['LG', /^lg\b/i], ['Xiaomi', /^(redmi|poco|pocophone)\b/i], ['HTC', /^htc\b/i], ['Huawei', /^huawei\b/i]];
  const ORDER = [...BRANDS.map(b => b[0]), 'Diğer'];
  const LABELS = { OFFICIAL: 'Official', UNOFFICIAL: 'Unofficial', SNAPSHOT: 'Snapshot', NIGHTLY: 'Nightly', EXPERIMENTAL: 'Experimental', DENEYSEL: 'Deneysel', PORT: 'Port' };

  function classify(raw) {
    const m = raw.match(/\b(UNOFFICIAL|OFFICIAL|SNAPSHOT|NIGHTLY|EXPERIMENTAL|DENEYSEL|PORT)\b/i);
    if (!m) {
      if (!raw || raw === '-' || raw === '?') return { kind: 'none', label: '', note: '' };
      return raw.length <= 26 ? { kind: 'other', label: raw, note: '' } : { kind: 'none', label: '', note: raw };
    }
    const k = m[1].toUpperCase();
    let note = raw.replace(m[0], '').replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,:;-]+|[\s,:;-]+$/g, '');
    if (/^[!?.\s]*$/.test(note)) note = '';
    const kind = k === 'OFFICIAL' ? 'official' : k === 'UNOFFICIAL' ? 'unofficial' : k === 'PORT' ? 'port' : 'test';
    return { kind, label: LABELS[k], note };
  }
  function fmtDate(d) {
    d = String(d == null ? '' : d).trim();
    if (!d || d === '-' || d === '?') return '';
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : d;
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

  const slugs = new Set();
  const devices = Object.keys(data).filter(n => n.trim() && Array.isArray(data[n])).map(name => {
    const brand = (BRANDS.find(b => b[1].test(name)) || ['Diğer'])[0];
    const tags = [];
    const base = name.replace(/\(([^)]*)\)/g, (_, t) => { t.split(',').forEach(x => x.trim() && tags.push(x.trim())); return ' '; }).replace(/\s+/g, ' ').trim() || name;
    const roms = data[name].map(r => {
      const c = classify(String(r.type == null ? '' : r.type).trim());
      const url = String(r.url || '').trim();
      return { name: String(r.rom || '').trim(), version: String(r.android == null ? '' : r.android).trim(), date: fmtDate(r.date), url, host: hostOf(url), ...c };
    }).filter(r => r.name || r.url);
    let slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cihaz', s = slug, i = 2;
    while (slugs.has(s)) s = slug + '-' + i++;
    slugs.add(s);
    return { name, base, brand, tags, slug: s, roms, title: brand === 'Samsung' ? base.replace(/^samsung\s+/i, '') || base : base,
      index: (name + ' ' + roms.map(r => r.name).join(' ')).toLowerCase() };
  }).filter(d => d.roms.length);

  /* ---- durum ---- */
  let current = null, filter = 'all', query = '';

  /* ---- cihaz listesi ---- */
  function renderList() {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found = devices.filter(d => terms.every(t => d.index.includes(t)));
    countEl.textContent = terms.length ? found.length + ' cihaz bulundu' : devices.length + ' cihaz';
    listEl.replaceChildren();
    if (!found.length) {
      const clear = h('button', { type: 'button', class: 'link-btn' }, 'Aramayı temizle');
      clear.onclick = () => { search.value = ''; query = ''; renderList(); search.focus(); };
      listEl.append(h('div', { class: 'empty' }, h('strong', {}, 'Eşleşen cihaz yok'), 'Cihaz adı, kod adı (örn. klte) veya ROM adıyla dene. ', clear, h('br'), h('a', { href: 'direct.html' }, 'Eksik cihazı bildir')));
      return;
    }
    ORDER.forEach(brand => {
      const g = found.filter(d => d.brand === brand);
      if (!g.length) return;
      listEl.append(h('h2', { class: 'group-title' }, brand, h('span', {}, g.length)));
      g.forEach(d => {
        const b = h('button', { type: 'button', class: 'device', 'data-slug': d.slug, 'aria-current': current === d ? 'true' : 'false' },
          h('span', { class: 'device-title' }, d.title),
          h('span', { class: 'device-tags' }, d.tags.slice(0, 2).join(' ')),
          h('span', { class: 'device-count' }, d.roms.length));
        b.onclick = () => { select(d); closeSheet(); };
        listEl.append(b);
      });
    });
  }
  function markActive(scroll) {
    listEl.querySelectorAll('.device').forEach(b => {
      const on = current && b.dataset.slug === current.slug;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && scroll) b.scrollIntoView({ block: 'nearest' });
    });
  }

  /* ---- seçili cihaz ---- */
  function select(d, first) {
    current = d; filter = 'all';
    renderView(); markActive(first);
    document.title = d.base + " — Elontech's Archive";
    try { history.replaceState(null, '', '#' + d.slug); } catch (e) {}
    if (!first) window.scrollTo(0, 0);
  }
  function renderView() {
    const d = current, kinds = ['official', 'unofficial', 'test'].filter(k => d.roms.some(r => r.kind === k));
    const names = { official: 'Official', unofficial: 'Unofficial', test: 'Test' };
    viewEl.replaceChildren(...[
      h('header', { class: 'device-head' }, h('h1', {}, d.base), d.tags.length ? h('ul', { class: 'tags' }, d.tags.map(t => h('li', { class: 'tag' }, t))) : null),
      kinds.length > 1 ? h('div', { class: 'filters', role: 'group', 'aria-label': 'Tipe göre filtrele' },
        [['all', 'Tümü', d.roms.length], ...kinds.map(k => [k, names[k], d.roms.filter(r => r.kind === k).length])].map(([k, label, n]) => {
          const b = h('button', { type: 'button', class: 'filter', 'aria-pressed': String(filter === k) }, label, h('span', {}, n));
          b.onclick = () => { filter = k; renderView(); };
          return b;
        })) : null,
      h('ul', { class: 'rom-list', id: 'romList' }, d.roms.filter(r => filter === 'all' || r.kind === filter).map(romRow))].filter(Boolean));
  }
  function romRow(r) {
    const num = /^\d+(\.\d+)*$/.test(r.version);
    const inner = [
      h('span', { class: 'ver' + (num ? (r.version.length > 5 ? ' is-long' : '') : ' is-text') }, r.version),
      h('span', { class: 'rom-body' },
        h('span', { class: 'rom-name' }, r.name || r.url),
        h('span', { class: 'rom-meta' },
          r.label ? h('span', { class: 'badge ' + r.kind }, r.label) : null,
          r.date ? h('span', {}, r.date) : null,
          r.host ? h('span', {}, r.host) : null,
          r.note ? h('span', { class: 'note' }, r.note) : null)),
      r.url ? h('span', { class: 'get' }, icon('download'), h('span', { class: 'get-label' }, 'İndir')) : null
    ];
    return h('li', {}, r.url ? h('a', { class: 'rom', href: r.url, target: '_blank', rel: 'noopener noreferrer' }, inner) : h('div', { class: 'rom' }, inner));
  }

  /* ---- mobil cihaz seçici ---- */
  function openSheet() { sidebar.classList.add('open'); scrim.hidden = false; document.body.classList.add('lock'); $('#sheetClose').focus(); }
  function closeSheet() { if (!sidebar.classList.contains('open')) return; sidebar.classList.remove('open'); scrim.hidden = true; document.body.classList.remove('lock'); picker.focus({ preventScroll: true }); }
  picker.onclick = openSheet;
  scrim.onclick = closeSheet;
  $('#sheetClose').onclick = closeSheet;
  wide.addEventListener('change', () => { if (wide.matches) { sidebar.classList.remove('open'); scrim.hidden = true; document.body.classList.remove('lock'); } });

  search.addEventListener('input', () => { query = search.value; renderList(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    else if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && wide.matches) { e.preventDefault(); search.focus(); }
  });

  /* ---- başlat ---- */
  if (!devices.length) { viewEl.append(h('p', { class: 'empty' }, 'Henüz listelenecek dosya yok.')); return; }
  const hash = decodeURIComponent(location.hash.slice(1));
  current = devices.find(d => d.slug === hash) || devices[0];
  renderList();
  select(current, true);
})();
