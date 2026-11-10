/* Rivista "Quante Storie": impaginazione, sfoglio e PDF.
   Usato da rivista.html (pubblica) e da admin-rivista.html (anteprima).
   Il contenuto sta in rivista.json; le foto sono percorsi del sito (diario/img/..., rivista/img/...). */
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hl = s => esc(s).replace(/\*([^*]+)\*/g, '<em class="hl">$1</em>');
  const lines = s => hl(s).replace(/\n/g, '<br>');
  function frag(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  let URL_OF = p => p;        // come trasformare un percorso in un indirizzo (l'admin ci mette le foto appena caricate)
  const bg = p => p ? ` style="background-image:url('${String(URL_OF(p)).replace(/'/g, '%27')}')"` : '';

  /* ---------------- pagine fisse ---------------- */
  function pCover(c) {
    const stats = (c.stats || []).filter(s => s && (s.n || s.l)).map(s =>
      `<div class="cv-item"><div class="cv-n">${esc(s.n).replace('×', '<span style="font-size:.5em;vertical-align:middle">×</span>')}</div><div class="cv-l">${esc(s.l)}</div></div>`).join('');
    return `<div class="pg cover"><div class="cv-glow"></div><div class="cv-bar"></div>
      <div class="cv-inner"><div class="cv-tag">${esc(c.etichetta)}</div><h1 class="cv-title">${lines(c.titolo)}</h1><div class="cv-issue">${esc(c.numero)}</div></div>
      <div class="cv-stats"><div class="cv-lab">${esc(c.statsTitolo)}</div><div class="cv-grid">${stats}</div></div>
      ${c.grande ? `<div class="cv-big"><div class="n">${esc(c.grande)}</div><div class="l">${esc(c.grandeTesto)}</div></div>` : ''}
      <div class="cv-foot">${esc(c.fascia)}</div></div>`;
  }
  function pIntro(i) {
    const ps = String(i.testo || '').split('\n').filter(s => s.trim()).map(s => `<p>${hl(s)}</p>`).join('');
    return `<div class="pg intro"><div class="in"><div class="kick">${esc(i.occhiello)}</div><div class="big">${hl(i.grande)}</div>${ps}<div class="sign">${esc(i.firma)}</div></div></div>`;
  }
  function pOpener(t) {
    const ph = t.apertura && t.apertura.src ? `<div class="ph"${bg(t.apertura.src)}></div>` : `<div class="ph noimg">Foto d'apertura</div>`;
    return `<div class="pg opener">${ph}<div class="shade"></div><div class="op-tag">#unabiciperilmondo</div>
      <div class="otitle"><div class="tappa">Tappa <b>${esc(t.numero)}</b></div><h2>${esc(t.da)} <span>→</span> ${esc(t.a)}</h2>
      <div class="when">${esc(t.data)} <span class="km">${esc(t.km)}</span></div></div>
      <div class="ocap">${esc(t.apertura && t.apertura.didascalia)}</div></div>`;
  }
  function pGrid(t) {
    const cells = (t.rullino || []).filter(r => r.src).map(r => `<div class="fig"><div class="ph"${bg(r.src)}></div><div class="cap">${esc(r.didascalia)}</div></div>`).join('');
    return `<div class="pg text"><div class="body"><div class="gtitle">Dal rullino · Tappa ${esc(t.numero)}</div><div class="cells">${cells}</div></div><div class="folio"></div></div>`;
  }
  const pBlank = () => `<div class="pg blank"><div class="mark">Una bici per il mondo</div></div>`;
  function pRetro(r) {
    return `<div class="pg retro"><div class="inner"><div class="k">${esc(r.occhiello)}</div><h3>${hl(r.titolo)}</h3><p>${hl(r.testo)}</p></div><div class="links">${esc(r.link)}</div></div>`;
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
      return `<div class="fig ${f}"><div class="ph"${bg(b.src)}></div>${b.didascalia ? `<div class="cap">${esc(b.didascalia)}</div>` : ''}</div>`;
    }
    if (b.t === 'citazione') return b.testo ? `<div class="pull">«${esc(b.testo)}»</div>` : '';
    if (b.t === 'versi') return b.testo ? `<div class="verse">${esc(b.testo)}</div>` : '';
    return '';
  }

  function flowPages(meas, blocks, runhead, lead) {
    const out = [];
    let pg, body, firstPage = true;
    const deferred = [];
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    function newPage() {
      if (pg) { out.push(pg.outerHTML); pg.remove(); }
      pg = frag(`<div class="pg text"><div class="body"><div class="runhead">${esc(runhead)}</div>${firstPage && lead ? lead : ''}</div><div class="folio"></div></div>`);
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
      if (b.t !== 'testo') { deferred.push(el); continue; }   // foto e citazioni passano alla pagina dopo, il testo continua qui
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
      const lead = `<div class="lead"><div class="kick">${esc(ep.occhiello)}</div><h2>${esc(ep.titolo)}</h2></div>`;
      list.push(...flowPages(meas, ep.blocchi, ep.titolo || '', lead));
    }
    if (list.length % 2 === 0) list.push(pBlank());              // il retro chiude a sinistra
    list.push(pRetro(data.retro || {}));
    const pages = list.map((h, i) => h.replace('<div class="folio"></div>', `<div class="folio">${i + 1}</div>`));
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
    function face(cls, html) {
      const f = document.createElement('div'); f.className = 'rv-fc ' + cls;
      if (html) { f.innerHTML = html; f.firstElementChild.style.transform = `scale(${pageW / pagePx()})`; }
      return f;
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
        pages.forEach(p => { const l = document.createElement('div'); l.className = 'rv-leaf'; l.appendChild(face('rv-fc-f', p)); l.appendChild(face('rv-fc-b', '')); book.appendChild(l); els.push(l); });
      }
    }
    const maxPos = () => mode === 'spread' ? pages.length / 2 : pages.length - 1;
    const pageIndex = () => mode === 'spread' ? Math.max(0, pos * 2 - 1) : pos;
    const posFor = i => mode === 'spread' ? Math.ceil(i / 2) : i;
    function layout(force) {
      if (!pages.length || !stage.clientWidth) return;
      const w = stage.clientWidth - 2, h = stage.clientHeight - 6;
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
        : `<b>${pos + 1}</b> / ${N}`;
      if (ui.prev) ui.prev.disabled = pos === 0;
      if (ui.next) ui.next.disabled = pos === max;
    }
    let tmr;
    function go(d) {
      const max = maxPos(), np = Math.max(0, Math.min(max, pos + d));
      if (np === pos) return;
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
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { const r = book.getBoundingClientRect(); go(e.clientX > r.left + r.width / 2 ? 1 : -1); }
    });
    book.addEventListener('pointercancel', () => { sx = null; });
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => layout(), 120); });
    return {
      setPages(p, goTo) { pages = p; mode = null; layout(true); if (goTo != null) { pos = Math.min(posFor(goTo), maxPos()); render(true); } },
      relayout() { layout(true); },
      go
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

  window.Rivista = { paginate, Flip, pdf, ready };
})();
