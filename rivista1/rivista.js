/* Rivista "Quante Storie": impaginazione, sfoglio e PDF.
   Usato da rivista.html (pubblica) e da admin-rivista.html (anteprima).
   Il contenuto sta in rivista.json; le foto sono percorsi del sito (diario/img/..., rivista/img/...). */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // colori a scelta in tutta la rivista: *parola* = arancione, _parola_ = bianco (nero sulle pagine chiare)
  const hl = s => esc(s)
    .replace(/\*([^*\n]+)\*/g, '<em class="hl or">$1</em>')
    .replace(/(^|[^\w])_([^_\n]+)_(?=$|[^\w])/g, '$1<em class="hl bi">$2</em>');
  const plain = s => String(s == null ? '' : s).replace(/\*([^*\n]+)\*/g, '$1').replace(/(^|[^\w])_([^_\n]+)_(?=$|[^\w])/g, '$1$2');
  const lines = s => hl(s).replace(/\n/g, '<br>');
  function frag(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  // misure reali delle foto (larghezza/altezza): servono per mostrarle sempre per intero
  const DIM = {};
  // dichiarazioni CSS del riquadro che contiene tutta la foto, dentro un massimo di larghezza e altezza (mm)
  function fit(src, maxW, maxH) {
    const d = DIM[src]; if (!d || !d.w || !d.h) return '';
    const r = d.w / d.h, w = Math.min(maxW, maxH * r), h = w / r;
    return `width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;`;
  }
  // pagine a foto piena (copertina, aperture): se la proporzione è vicina a quella della pagina (A5) la foto
  // riempie tutta la pagina con un ritaglio minimo; se è molto diversa resta intera, con fasce del colore di fondo
  function fullPage(src, pos) {
    const d = DIM[src]; if (!d || !d.w || !d.h) return '';
    const k = (d.w / d.h) / (148 / 210);
    return (k >= 0.88 && k <= 1.12) ? `background-size:cover;background-position:${pos};` : '';
  }
  // scarica le dimensioni di tutte le foto della rivista prima di impaginare
  function measure(data, urlFn) {
    const toUrl = urlFn || (p => p), srcs = new Set(), add = p => { if (p) srcs.add(p); };
    add(data.copertina && data.copertina.foto);
    const stage = t => { add(t.apertura && t.apertura.src); (t.blocchi || []).forEach(b => b.t === 'foto' && add(b.src)); (t.rullino || []).forEach(r => add(r.src)); };
    (data.tappe || []).forEach(stage); if (data.epilogo) stage(data.epilogo);
    return Promise.all(Array.from(srcs).filter(p => !DIM[p]).map(p => new Promise(ok => {
      const im = new Image();
      im.onload = () => { DIM[p] = { w: im.naturalWidth, h: im.naturalHeight }; ok(); };
      im.onerror = () => ok(); setTimeout(ok, 8000);
      im.src = String(toUrl(p));
    })));
  }

  let URL_OF = p => p;        // come trasformare un percorso in un indirizzo (l'admin ci mette le foto appena caricate)
  const bg = (p, extra) => p ? ` style="${extra || ''}background-image:url('${String(URL_OF(p)).replace(/'/g, '%27')}')"` : '';

  /* ---------------- pagine fisse ---------------- */
  function pCover(c) {
    const stats = (c.stats || []).filter(s => s && (s.n || s.l)).map(s =>
      `<div class="cv-item"><div class="cv-n">${hl(s.n).replace('×', '<span style="font-size:.5em;vertical-align:middle">×</span>')}</div><div class="cv-l">${hl(s.l)}</div></div>`).join('');
    const foto = c.foto ? `<div class="cv-photo ph"${bg(c.foto, fullPage(c.foto, 'center 60%'))}></div><div class="cv-veil"></div>` : '';
    return `<div class="pg cover${c.foto ? ' has-photo' : ''}">${foto}<div class="cv-glow"></div><div class="cv-bar"></div>
      <div class="cv-inner"><div class="cv-tag">${hl(c.etichetta).replace(/→/g, '<span class="arr">→</span>')}</div><h1 class="cv-title">${lines(c.titolo)}</h1>${c.numero ? `<div class="cv-issue" style="font-size:${Math.min(24, Math.floor(124 / (String(c.numero).length * 0.45) * 2.835 * 10) / 10)}pt">${hl(c.numero)}</div>` : ''}</div>
      <div class="cv-mid"><div class="cv-stats"><div class="cv-lab">${hl(c.statsTitolo)}</div><div class="cv-grid">${stats}</div></div>
      ${c.grande ? `<div class="cv-big"><div class="n">${hl(c.grande)}</div><div class="l">${hl(c.grandeTesto)}</div></div>` : ''}</div>
      <div class="cv-foot">${hl(c.fascia)}</div></div>`;
  }
  function pIntro(i) {
    const ps = String(i.testo || '').split('\n').filter(s => s.trim()).map(s => `<p>${hl(s)}</p>`).join('');
    return `<div class="pg intro"><div class="in"><div class="kick">${hl(i.occhiello)}</div><div class="big">${hl(i.grande)}</div>${ps}<div class="sign">${hl(i.firma)}</div></div></div>`;
  }
  function pOpener(t) {
    const ph = t.apertura && t.apertura.src ? `<div class="ph"${bg(t.apertura.src, fullPage(t.apertura.src, 'center'))}></div>` : `<div class="ph noimg">Foto d'apertura</div>`;
    return `<div class="pg opener">${ph}<div class="shade"></div><div class="op-tag">#unabiciperilmondo</div><div class="op-ix" data-page="%%INDICE%%" role="link" tabindex="0">Indice</div>
      <div class="otitle"><div class="tappa">Tappa <b>${esc(t.numero)}</b></div><h2>${hl(t.da)} <span>→</span> ${hl(t.a)}</h2>
      <div class="when">${hl(t.data)} <span class="km">${hl(t.km)}</span></div></div>
      <div class="ocap">${hl(t.apertura && t.apertura.didascalia)}</div></div>`;
  }
  function pGrid(t) {
    const cells = (t.rullino || []).filter(r => r.src).map(r => `<div class="fig"><div class="ph${fit(r.src, 57, 70) ? ' fit' : ''}"${bg(r.src, fit(r.src, 57, 70))}></div><div class="cap">${hl(r.didascalia)}</div></div>`).join('');
    return `<div class="pg text"><div class="body"><div class="gtitle">Dal rullino · Tappa ${esc(t.numero)}</div><div class="cells">${cells}</div></div><div class="folio"></div></div>`;
  }
  // indice: una riga per tappa, toccandola si va all'apertura
  function pIndex(rows) {
    const li = rows.map(r => `<div class="ix-row" data-page="${r.page}" role="link" tabindex="0" aria-label="${esc(r.label)}, pagina ${r.page + 1}">
      <span class="ix-n">${esc(r.n)}</span><span class="ix-t">${r.html}</span><span class="ix-dots"></span><span class="ix-p">${r.page + 1}</span></div>`).join('');
    return `<div class="pg text index"><div class="body"><div class="lead"><div class="kick">Indice</div><h2>Le tappe</h2></div><div class="ix">${li}</div></div><div class="folio"></div></div>`;
  }
  const pBlank = () => `<div class="pg blank"><div class="mark">Una bici per il mondo</div></div>`;
  function pRetro(r) {
    return `<div class="pg retro"><div class="inner"><div class="k">${hl(r.occhiello)}</div><h3>${hl(r.titolo)}</h3><p>${hl(r.testo)}</p></div><div class="links">${hl(r.link)}</div></div>`;
  }

  /* ---------------- racconto: riempie le pagine e va a capo da sola ---------------- */
  function blockHTML(b, first) {
    if (b.t === 'testo') {
      const txt = String(b.testo || '').trim(); if (!txt) return '';
      if (first) { const ch = Array.from(txt)[0]; return `<p class="t"><span class="dc">${esc(ch)}</span>${hl(txt.slice(ch.length))}</p>`; }
      return `<p class="t">${hl(txt)}</p>`;
    }
    if (b.t === 'foto') {
      if (!b.src) return '';
      const f = b.formato === 'grande' ? 'grande' : 'affiancata';
      const mh = +b.maxh || 0;   // altezza massima in mm, facoltativa (la usa l'impaginazione automatica per riempire i vuoti)
      const box = f === 'grande' ? fit(b.src, 118, mh || 115) : fit(b.src, 52, mh || 90);
      return `<div class="fig ${f}"><div class="ph${box ? ' fit' : ''}"${bg(b.src, box)}></div>${b.didascalia ? `<div class="cap">${hl(b.didascalia)}</div>` : ''}</div>`;
    }
    if (b.t === 'citazione') return b.testo ? `<div class="pull">«${hl(b.testo)}»</div>` : '';
    if (b.t === 'versi') return b.testo ? `<div class="verse">${hl(b.testo)}</div>` : '';
    return '';
  }

  function flowPages(meas, blocks, runhead, lead) {
    const out = [];
    let pg, body, firstPage = true;
    const deferred = [];
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    function newPage() {
      if (pg) { out.push(pg.outerHTML); pg.remove(); }
      pg = frag(`<div class="pg text"><div class="body"><div class="runhead">${esc(plain(runhead))}</div>${firstPage && lead ? lead : ''}</div><div class="folio"></div></div>`);
      firstPage = false;
      meas.appendChild(pg); body = pg.querySelector('.body');
      while (deferred.length) { const el = deferred.shift(); body.appendChild(el); if (!fits()) { body.removeChild(el); deferred.unshift(el); break; } }
    }
    newPage();
    let first = true;
    for (const b of (blocks || [])) {
      const html = blockHTML(b, first && b.t === 'testo');
      if (!html) continue;
      if (b.t === 'testo') first = false;
      const el = frag(html);
      body.appendChild(el);
      if (fits()) continue;
      body.removeChild(el);
      if (b.t !== 'testo') {
        // foto, citazioni e versi che non entrano vanno in cima alla pagina dopo, e il testo li segue:
        // l'ordine resta quello scelto nell'editor, anche a costo di lasciare spazio bianco in fondo
        newPage(); body.appendChild(el); continue;
      }
      let rest = String(b.testo).trim();
      let isFirst = !!el.querySelector('.dc');
      while (rest) {
        const words = rest.split(/\s+/);
        let lo = 0, hi = words.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          const p = frag(blockHTML({ t: 'testo', testo: words.slice(0, mid).join(' ') }, isFirst));
          if (mid < words.length) p.style.textAlignLast = 'justify';
          body.appendChild(p); const ok = fits(); body.removeChild(p);
          if (ok) lo = mid; else hi = mid - 1;
        }
        if (lo > 0) {
          const p = frag(blockHTML({ t: 'testo', testo: words.slice(0, lo).join(' ') }, isFirst));
          if (lo < words.length) p.style.textAlignLast = 'justify';
          body.appendChild(p); isFirst = false;
        }
        rest = words.slice(lo).join(' ');
        if (rest) {
          const wasEmpty = lo === 0 && body.querySelectorAll('p.t, .fig, .pull, .verse').length === 0;
          if (wasEmpty) { body.appendChild(frag(blockHTML({ t: 'testo', testo: rest }, false))); rest = ''; }
          else newPage();
        }
      }
    }
    while (deferred.length) {
      const before = deferred.length; newPage();
      if (deferred.length === before) body.appendChild(deferred.shift());
    }
    const end = frag('<div class="end">◦ ◦ ◦</div>'); body.appendChild(end); if (!fits()) body.removeChild(end);
    out.push(pg.outerHTML); pg.remove();
    return out;
  }

  function paginate(data, opts) {
    opts = opts || {};
    URL_OF = opts.url || (p => p);
    let meas = document.querySelector('.rv-misura');
    if (!meas) { meas = document.createElement('div'); meas.className = 'rv-misura'; document.body.appendChild(meas); }
    const list = [], anchors = {};
    list.push(pCover(data.copertina || {}));
    list.push(pIntro(data.intro || {}));
    const ixAt = list.length; list.push('%%INDICE_PAGINA%%');      // l'indice: lo riempio quando so i numeri di pagina
    for (const t of (data.tappe || [])) {
      if (t.visibile === false) continue;
      if (list.length % 2 === 1) list.push(pBlank());          // l'apertura cade sempre a destra
      anchors[t.id] = list.length;
      list.push(pOpener(t));
      list.push(...flowPages(meas, t.blocchi, `Tappa ${t.numero} · ${t.da} → ${t.a}`));
      if ((t.rullino || []).some(r => r.src)) list.push(pGrid(t));
    }
    const ep = data.epilogo;
    if (ep && ep.visibile !== false && (ep.blocchi || []).some(b => (b.testo || b.src))) {
      if (list.length % 2 === 1) list.push(pBlank());
      anchors.epilogo = list.length;
      const lead = `<div class="lead"><div class="kick">${hl(ep.occhiello)}</div><h2>${hl(ep.titolo)}</h2></div>`;
      list.push(...flowPages(meas, ep.blocchi, ep.titolo || '', lead));
    }
    if (list.length % 2 === 0) list.push(pBlank());              // il retro chiude a sinistra
    list.push(pRetro(data.retro || {}));
    const rows = (data.tappe || []).filter(t => t.visibile !== false && anchors[t.id] != null).map(t => ({
      n: t.numero, page: anchors[t.id], label: plain(`Tappa ${t.numero}, ${t.da} - ${t.a}`),
      html: `${hl(t.da)} <b>→</b> ${hl(t.a)}<small>${esc(plain(t.km))}</small>` }));
    if (anchors.epilogo != null) rows.push({ n: '·', page: anchors.epilogo, label: plain(ep.titolo), html: hl(ep.titolo) });
    list[ixAt] = pIndex(rows);
    anchors.indice = ixAt;
    const pages = list.map((h, i) => h.replace('<div class="folio"></div>', `<div class="folio">${i + 1}</div>`).replace(/%%INDICE%%/g, ixAt));
    return { pages, anchors };
  }

  /* ---------------- sfoglio ---------------- */
  function Flip(stage, book, ui) {
    const R = 210 / 148;
    let pages = [], mode = null, pos = 0, pageW = 0, els = [], mmPx = 0;
    function pagePx() {
      if (!mmPx) { const p = document.createElement('div'); p.style.width = '148mm'; p.style.position = 'absolute'; p.style.visibility = 'hidden'; document.body.appendChild(p); mmPx = p.getBoundingClientRect().width; p.remove(); }
      return mmPx;
    }
    // le pagine si preparano solo quando sono vicine a quella aperta: sul telefono 88 pagine
    // con foto ed effetti 3D tutte insieme finiscono la memoria grafica e non si vede più niente
    function face(cls, html) {
      const f = document.createElement('div'); f.className = 'rv-fc ' + cls;
      f._html = html || ''; f._done = false;
      return f;
    }
    function fill(l) {
      for (const f of l.children) if (!f._done && f._html) { f.innerHTML = f._html; f.firstElementChild.style.transform = `scale(${pageW / pagePx()})`; f._done = true; }
    }
    function empty(l) { for (const f of l.children) if (f._done) { f.innerHTML = ''; f._done = false; } }
    function prepare(center) {
      els.forEach((e, k) => {
        const near = k >= center - 2 && k <= center + 2;
        if (near) { fill(e); e.style.display = ''; }
        else { e.style.display = 'none'; if (Math.abs(k - center) > 6) empty(e); }
      });
    }
    function build(m) {
      mode = m; book.innerHTML = ''; els = []; book.className = 'rv-book rv-' + m;
      const sh = document.createElement('div'); sh.className = 'rv-shadow'; book.appendChild(sh);
      if (m === 'spread') {
        for (let k = 0; k < pages.length / 2; k++) {
          const l = document.createElement('div'); l.className = 'rv-leaf';
          l.appendChild(face('rv-fc-f', pages[2 * k])); l.appendChild(face('rv-fc-b', pages[2 * k + 1]));
          book.appendChild(l); els.push(l);
        }
      } else {
        // a pagina singola (telefono) le pagine bianche di riempimento non servono: le salto
        solo = pages.map((p, i) => i).filter(i => !/^<div class="pg blank"/.test(pages[i]));
        solo.forEach(i => { const p = pages[i]; const l = document.createElement('div'); l.className = 'rv-leaf'; l.appendChild(face('rv-fc-f', p)); l.appendChild(face('rv-fc-b', '')); book.appendChild(l); els.push(l); });
      }
    }
    let solo = [];   // telefono: indici delle pagine mostrate (senza quelle bianche)
    const maxPos = () => mode === 'spread' ? pages.length / 2 : solo.length - 1;
    const pageIndex = () => mode === 'spread' ? Math.max(0, pos * 2 - 1) : (solo[pos] || 0);
    const posFor = i => { if (mode === 'spread') return Math.ceil(i / 2); const k = solo.findIndex(j => j >= i); return k < 0 ? solo.length - 1 : k; };
    function layout(force) {
      if (!pages.length || !stage.clientWidth) return;
      const cs = getComputedStyle(stage);   // spazio utile, senza i margini interni
      const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
      const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 2;
      const m = (w >= 700 && w / h > 1.05) ? 'spread' : 'single';
      const keep = mode ? pageIndex() : 0;
      const newW = Math.min(h, (m === 'spread' ? w / 2 : w) * R) / R;
      if (m !== mode || force || Math.abs(newW - pageW) > .5) { pageW = newW; build(m); pos = Math.min(posFor(keep), maxPos()); }
      book.style.height = pageW * R + 'px';
      book.style.width = (m === 'spread' ? 2 * pageW : pageW) + 'px';
      els.forEach(e => { e.style.width = pageW + 'px'; e.style.left = (m === 'spread' ? pageW : 0) + 'px'; });
      render(true);
      if (ui.hint) ui.hint.textContent = m === 'spread' ? 'Trascina o clicca sul bordo della pagina, oppure usa le frecce della tastiera' : 'Scorri col dito a destra e sinistra, oppure tocca il bordo della pagina';
    }
    function shift() { const max = maxPos(); return mode === 'spread' ? (pos === 0 ? -pageW / 2 : (pos === max ? pageW / 2 : 0)) : 0; }
    function render(instant) {
      const max = maxPos(), N = pages.length;
      prepare(pos);
      els.forEach((e, k) => {
        if (instant) e.style.transition = 'none';
        e.classList.toggle('rv-turned', k < pos);
        e.style.zIndex = k < pos ? k + 1 : els.length - k;
        if (instant) { void e.offsetWidth; e.style.transition = ''; }
      });
      if (instant) book.style.transition = 'none';
      book.style.transform = `translateX(${shift()}px)`;
      if (instant) { void book.offsetWidth; book.style.transition = ''; }
      if (ui.count) ui.count.innerHTML = mode === 'spread'
        ? (pos === 0 ? `<b>1</b> / ${N}` : pos === max ? `<b>${N}</b> / ${N}` : `<b>${2 * pos}–${2 * pos + 1}</b> / ${N}`)
        : `<b>${pageIndex() + 1}</b> / ${N}`;
      if (ui.prev) ui.prev.disabled = pos === 0;
      if (ui.next) ui.next.disabled = pos === max;
    }
    let tmr;
    function go(d) {
      const max = maxPos(), np = Math.max(0, Math.min(max, pos + d));
      if (np === pos) return;
      prepare(np);
      els[d > 0 ? pos : np].style.zIndex = 1000;
      pos = np;
      els.forEach((e, k) => e.classList.toggle('rv-turned', k < pos));
      book.style.transform = `translateX(${shift()}px)`;
      if (ui.prev) ui.prev.disabled = pos === 0; if (ui.next) ui.next.disabled = pos === max;
      clearTimeout(tmr); tmr = setTimeout(() => render(false), 800);
    }
    ui.prev && ui.prev.addEventListener('click', () => go(-1));
    ui.next && ui.next.addEventListener('click', () => go(1));
    document.addEventListener('keydown', e => {
      if (!stage.offsetParent || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
    });
    let sx = null, sy = null;
    book.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    book.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
      const link = e.target.closest && e.target.closest('[data-page]');
      if (link && Math.abs(dx) < 12 && Math.abs(dy) < 12) { goToPage(+link.dataset.page); return; }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { const r = book.getBoundingClientRect(); go(e.clientX > r.left + r.width / 2 ? 1 : -1); }
    });
    book.addEventListener('pointercancel', () => { sx = null; });
    book.addEventListener('keydown', e => { const l = e.target.closest && e.target.closest('[data-page]'); if (l && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goToPage(+l.dataset.page); } });
    // salto diretto a una pagina: un attimo di dissolvenza invece di girare decine di fogli
    function goToPage(i) {
      const np = Math.min(posFor(i), maxPos()); if (np === pos) return;
      book.style.transition = 'opacity .18s'; book.style.opacity = '0';
      setTimeout(() => { pos = np; render(true); book.style.transition = 'opacity .25s'; book.style.opacity = '1'; setTimeout(() => { book.style.transition = ''; }, 260); }, 180);
    }
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => layout(), 120); });
    return {
      setPages(p, goTo) { pages = p; mode = null; layout(true); if (goTo != null) { pos = Math.min(posFor(goTo), maxPos()); render(true); } },
      relayout() { layout(true); },
      go, goToPage
    };
  }

  /* ---------------- PDF ---------------- */
  function loadScript(src) { return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
  async function pdf(pages, onProgress) {
    if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await ready();
    let box = document.querySelector('.rv-export');
    if (!box) { box = document.createElement('div'); box.className = 'rv-export'; document.body.appendChild(box); }
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [148, 210], orientation: 'portrait', compress: true });
    try {
      for (let i = 0; i < pages.length; i++) {
        onProgress && onProgress(i + 1, pages.length);
        box.innerHTML = pages[i];
        const canvas = await window.html2canvas(box.firstElementChild, { scale: 2.2, backgroundColor: null, useCORS: true, logging: false });
        if (i) doc.addPage([148, 210], 'portrait');
        doc.addImage(canvas.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, 148, 210);
      }
    } finally { box.innerHTML = ''; }
    return doc.output('blob');
  }

  // i font vanno caricati PRIMA di misurare, altrimenti l'impaginazione si fa con quelli di riserva
  function ready() {
    const faces = ['400 10pt Lora', 'italic 400 10pt Lora', '600 10pt Lora', '400 10pt "Barlow Condensed"', '600 10pt "Barlow Condensed"', '800 10pt "Barlow Condensed"', '900 10pt "Barlow Condensed"',
      '300 10pt Barlow', '700 10pt Barlow', '400 10pt "IBM Plex Mono"', '700 10pt "IBM Plex Mono"'];
    const all = Promise.all(faces.map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready);
    return Promise.race([all, new Promise(r => setTimeout(r, 6000))]);
  }

  window.Rivista = { paginate, Flip, pdf, ready, measure };
})();
