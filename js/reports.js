// Reiter «Reports»: Video-Markierungen, Video-Feed, Report bearbeiten und die Ansicht für Athlet:innen.
// Gemeinsam für Freeski und Snowboard (Wunsch Emilie 14.11.2026). Die Module rufen nur diese Stellen auf:
//   repVidMarksSvg, repVidChip, repVidCount, repVidLegendHtml, repListVidBadge   wo im Report ein Video hinterlegt ist
//   repReportBtnsHtml(report, editable)   Knöpfe «Video feed» und «Edit report» oben im Report
//   repFeedOpen(opts)                     Video-Feed eines Reports zum Durchscrollen (Coaches)
//   repEditOpen()                         Session-Angaben, Notizen und Contest-Resultate bearbeiten
//   repAttTextFieldsHtml / repAttTextValues   Trick und Kommentar eines Versuchs im ✎-Bearbeiten
//   repAthLoad()                          Reports für Athlet:innen: eigene Tricks mit Anzahl und eigene Videos, ohne Bewertung
// Wie das Kommentar-Feld eines Versuchs aufgebaut ist, unterscheidet sich pro Sportart: attKommentar(alt, text) im Modul.
// Videos: Bucket TRICK_VIDEO_BUCKET (kern.js), Pfad in tricks.video_path, im Report-JSON als attempt.video.

const REP_RUN_RE = /^Run \d+ · /;                       // Run-Markierung im Kommentar («Run 2 · 3/6»)
const REP_KAT_RE = /^(Takeoff|Grab|Trick|Landing):/;    // Freeski: Kategorien im Kommentar
const REP_GRUEN = '#3E8E5A';

// Freier Kommentar ohne Run-Markierung und ohne Kategorien
function repFreeText(s) {
  return String(s || '').split(' | ').map(t => t.trim()).filter(t => t && !REP_RUN_RE.test(t) && !REP_KAT_RE.test(t)).join(' | ');
}

// ═══════════════ WO IST EIN VIDEO? ═══════════════
function repVidCount(list) { return (list || []).filter(a => a && a.video).length; }
function repReportVidCount(report) {
  return (Array.isArray(report && report.trick_data) ? report.trick_data : []).reduce((n, td) => n + repVidCount(td && td.attempts), 0);
}
// Knopf «▶ 2 videos»: öffnet den Feed mit genau diesen Videos (inline gestylt, weil er auch im PDF-Fenster ohne stil.css steht)
function repVidChip(n, onclick) {
  if (!n) return '';
  return `<button onclick="${onclick}" title="Watch in the video feed" style="border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;background:rgba(62,142,90,.15);border:1px solid ${REP_GRUEN};color:${REP_GRUEN};">▶ ${n} video${n === 1 ? '' : 's'}</button>`;
}
// Grüner Play-Punkt direkt über dem Versuch im Trick-Chart: dieser Versuch hat ein Video (Tippen spielt es ab).
// cx(i) = Mitte von Versuch i. Die Module schieben das Chart dafür um REP_VID_ROW nach unten (nur wenn es Videos gibt).
const REP_VID_ROW = 16;
function repVidMarksSvg(attempts, cx, ai, ti) {
  const y = REP_VID_ROW / 2;
  return (attempts || []).map((a, i) => {
    if (!a || !a.video) return '';
    const x = cx(i);
    return `<g onclick="sbAttPlay(${ai},${ti},${i})" style="cursor:pointer;"><title>Attempt ${i + 1}: video, tap to play</title><circle cx="${x.toFixed(1)}" cy="${y}" r="6.5" fill="${REP_GRUEN}"/><path d="M${(x - 2).toFixed(1)} ${y - 3.5}L${(x + 3.8).toFixed(1)} ${y}L${(x - 2).toFixed(1)} ${y + 3.5}Z" fill="#fff"/></g>`;
  }).join('');
}
function repVidLegendHtml(report) {
  if (!repReportVidCount(report)) return '';
  return `<span><svg width="13" height="13" viewBox="0 0 13 13" style="vertical-align:-2px;"><circle cx="6.5" cy="6.5" r="6.5" fill="${REP_GRUEN}"/><path d="M4.5 3L10.3 6.5L4.5 10Z" fill="#fff"/></svg> above an attempt = video (tap to play)</span>`;
}
// Liste der Reports: wie viele Videos ein Report hat
function repListVidBadge(report) {
  const n = repReportVidCount(report);
  return n ? `<div title="${n} video${n === 1 ? '' : 's'}" style="font-size:12px;font-weight:700;color:${REP_GRUEN};flex-shrink:0;white-space:nowrap;">▶ ${n}</div>` : '';
}
// Knöpfe oben im Report: Video-Feed (nur mit Videos) und Bearbeiten (nur im Reports-Tab)
function repReportBtnsHtml(report, editable) {
  const n = repReportVidCount(report);
  const st = 'padding:7px 14px;border-radius:8px;font-family:inherit;font-size:12px;cursor:pointer;';
  return (n ? `<button onclick="repFeedOpen({})" style="${st}background:rgba(62,142,90,.15);border:1px solid ${REP_GRUEN};color:${REP_GRUEN};font-weight:700;">▶ Video feed (${n})</button>` : '')
    + (editable && report && report.id ? `<button onclick="repEditOpen()" style="${st}background:none;border:1px solid var(--border);color:var(--text);font-weight:600;">✎ Edit report</button>` : '');
}

// ═══════════════ VIDEO-FEED ═══════════════
// Vollbild, ein Video pro Bildschirm, Wischen/Scrollen zum nächsten. Das sichtbare Video läuft (stumm, bis «Sound» an ist),
// das nächste wird schon geladen. Coaches sehen Resultat und Kommentar und können Trick/Kommentar korrigieren,
// Athlet:innen nur Trick und Zeit.
let REP_FEED = null;   // {all, items, namen, filter, muted, rate, urls, cur, dirty, report, edit, io}

// opts: {} = alle Videos des offenen Reports · {ai} = eine Athlet:in · {ai, ti} = ein Trick einer Athlet:in
// start: dbId des Versuchs, bei dem der Feed beginnt (z.B. nach dem Verschieben eines Videos)
function repFeedOpen(opts = {}, start = null) {
  const report = _sbRV && _sbRV.report;
  if (!report) return;
  const TD = Array.isArray(report.trick_data) ? report.trick_data : [];
  const stomp = TD.some(td => (td.attempts || []).some(a => a && a.outcome));
  const items = [];
  TD.forEach((td, ai) => {
    if (opts.ai != null && opts.ai !== ai) return;
    const atts = Array.isArray(td.attempts) ? td.attempts : [];
    const nur = opts.ti != null ? new Set((_sbRV.groups && _sbRV.groups[ai] && _sbRV.groups[ai][opts.ti] && _sbRV.groups[ai][opts.ti].attempts) || []) : null;
    atts.forEach((a, pos) => {
      if (!a || !a.video || (nur && !nur.has(a))) return;
      items.push({path: a.video, athlet: td.athlet || '', trick: a.trick || '—', pos, n: atts.length, a, stomp, datum: report.datum,
        run: sbAttRun(a), time: a.time ? String(a.time).slice(0, 5) : '', dbId: a.dbId || null});
    });
  });
  const typ = report.session_type ? SESS_TYPE_SHORT[report.session_type] || report.session_type : '';
  repFeedShow(items, {titel: [report.datum ? fmtDate(report.datum) : '', typ].filter(Boolean).join(' · '), report, edit: !!(_sbRVEditable && report.id), opts, start});
}

async function repFeedShow(items, o = {}) {
  repFeedClose(true);
  if (!items.length) { showToast('No videos here yet', 'error'); return; }
  const el = document.createElement('div');
  el.id = 'rep-feed';
  el.className = 'rep-feed';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Video feed');
  el.innerHTML = `<div class="rep-feed-top">
      <div class="rep-feed-title"><b>Video feed</b><span>${srEsc(o.titel || '')}</span></div>
      <button class="rep-feed-btn" id="rep-feed-sound" onclick="repFeedSound()">Sound off</button>
      <button class="rep-feed-btn" id="rep-feed-rate" onclick="repFeedRate()">Speed 1×</button>
      <button class="rep-feed-x" onclick="repFeedClose()" aria-label="Close">×</button>
      <div class="rep-feed-chips" id="rep-feed-chips"></div>
    </div>
    <div class="rep-feed-list" id="rep-feed-list"><div class="rep-feed-load"><span class="spinner"></span></div></div>`;
  document.body.appendChild(el);
  document.body.classList.add('rep-feed-open');
  document.addEventListener('keydown', repFeedKey);
  const F = REP_FEED = {all: items, items, namen: [...new Set(items.map(x => x.athlet))], filter: null, muted: true, rate: 1,
    urls: {}, cur: 0, dirty: false, report: o.report || null, edit: !!o.edit, io: null, opts: o.opts || {}, start: o.start || null};
  // Alle Links auf einmal holen (privater Bucket, Links gelten 1 h)
  try {
    const paths = [...new Set(items.map(x => x.path))];
    const {data, error} = await db.storage.from(TRICK_VIDEO_BUCKET).createSignedUrls(paths, 3600);
    if (error) throw error;
    (data || []).forEach((d, k) => { if (d && d.signedUrl && !d.error) F.urls[d.path || paths[k]] = d.signedUrl; });
  } catch (err) { console.error(err); showToast('Could not load the videos: ' + (err.message || err), 'error'); }
  if (REP_FEED !== F) return;   // inzwischen geschlossen
  repFeedRender();
}

function repFeedRender() {
  const F = REP_FEED, list = document.getElementById('rep-feed-list');
  if (!F || !list) return;
  F.items = F.filter == null ? F.all : F.all.filter(x => x.athlet === F.filter);
  const chips = document.getElementById('rep-feed-chips');
  if (chips) chips.innerHTML = F.namen.length > 1
    ? [[-1, 'All', F.all.length], ...F.namen.map((n, k) => [k, n, F.all.filter(x => x.athlet === n).length])]
      .map(([k, l, c]) => `<button class="rep-feed-chip${(k < 0 ? F.filter == null : F.filter === F.namen[k]) ? ' on' : ''}" onclick="repFeedFilter(${k})">${srEsc(l)} <span>${c}</span></button>`).join('')
    : '';
  if (F.io) F.io.disconnect();
  list.innerHTML = F.items.map((x, i) => `<section class="rep-feed-item" data-i="${i}">
      <div class="rep-feed-vid"><video playsinline loop controls muted preload="none"></video><div class="rep-feed-miss">Video not available</div></div>
      <div class="rep-feed-info" id="rep-feed-info-${i}">${repFeedInfoHtml(x, i)}</div>
    </section>`).join('');
  list.scrollTop = 0;
  F.cur = 0;
  F.io = new IntersectionObserver(es => es.forEach(e => repFeedSeen(e.target, e.isIntersecting && e.intersectionRatio >= 0.6)), {root: list, threshold: [0, 0.6]});
  list.querySelectorAll('.rep-feed-item').forEach(s => F.io.observe(s));
  if (F.start) {   // einmalig zum gewünschten Versuch springen
    const k = F.items.findIndex(x => x.dbId === F.start);
    F.start = null;
    if (k > 0) list.scrollTop = list.querySelector(`.rep-feed-item[data-i="${k}"]`).offsetTop - list.offsetTop;
  }
}

function repFeedFilter(k) {
  const F = REP_FEED; if (!F) return;
  F.filter = k < 0 ? null : F.namen[k];
  repFeedRender();
}

function repFeedInfoHtml(x, i) {
  const F = REP_FEED, n = F ? F.items.length : 1;
  const wo = x.run ? `Run ${x.run.run}${x.run.pos ? ', element ' + x.run.pos : ''}` : `Attempt ${x.pos + 1} of ${x.n}`;
  const res = x.a ? repFeedResHtml(x) : '';            // Athlet:innen-Feed hat kein a: keine Bewertung
  const cmt = x.a ? repFreeText(x.a.comment) : '';
  const edit = F && F.edit && x.dbId ? `<button class="rep-feed-btn" onclick="repFeedEdit(${i})">✎ Edit trick / comment</button><button class="rep-feed-btn" onclick="repFeedMove(${i})">⇄ Wrong attempt?</button><button class="rep-feed-btn" onclick="repFeedDelete(${i})">🗑 Delete video</button>` : '';
  return `<div class="rep-feed-meta"><b>${srEsc(x.athlet)}</b><span>${wo}${x.time ? ' · ' + srEsc(x.time) : ''}</span><span class="rep-feed-n">${i + 1} / ${n}</span></div>
    <div class="rep-feed-trick">${srEsc(x.trick)}</div>
    ${res || cmt ? `<div class="rep-feed-res">${res}${cmt ? `<span class="rep-feed-cmt">${srEsc(cmt)}</span>` : ''}</div>` : ''}
    <div class="rep-feed-acts"><button class="rep-feed-btn" onclick="repFeedDownload(${i})">⬇ Download</button>${edit}</div>`;
}

// ═══════════════ VIDEO HERUNTERLADEN (Coaches und Athlet:innen) ═══════════════
// Signierter Link mit «download»: der Speicher schickt die Datei als Anhang, der Browser speichert sie
// (iPhone: Dateien-App, von dort «Video sichern» in Fotos). Athlet:innen bekommen nur Links zu eigenen Videos (Policy).
function repVidFileName(path, teile) {
  const ext = ((String(path || '').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4').slice(0, 5);
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ((teile || []).map(slug).filter(Boolean).join('_') || 'video') + '.' + ext;
}
async function repVidDownload(path, name) {
  const {data, error} = await db.storage.from(TRICK_VIDEO_BUCKET).createSignedUrl(path, 600, {download: name});
  if (error || !data || !data.signedUrl) { showToast('Download failed: ' + ((error && error.message) || 'no link'), 'error'); return; }
  const a = document.createElement('a');
  a.href = data.signedUrl;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Download started', 'success');
}
function repFeedDownload(i) {
  const F = REP_FEED, x = F && F.items[i];
  if (x) repVidDownload(x.path, repVidFileName(x.path, [x.datum, x.athlet, x.trick, 'attempt-' + (x.pos + 1)]));
}
// Knopf «Download» für das Einzelvideo-Fenster (sbAttPlayPath in kern.js)
function repVidDownloadBtn(path, name) {
  return `<button class="btn btn-secondary" onclick="repVidDownload(${srEsc(JSON.stringify(path))}, ${srEsc(JSON.stringify(name))})">⬇ Download</button>`;
}

// ═══════════════ VIDEO EINEM ANDEREN VERSUCH ZUORDNEN ═══════════════
// Vertauschte Videos korrigieren, ohne neu hochzuladen: Video zu einem anderen Versuch derselben Athlet:in in diesem
// Report verschieben. Hat der Zielversuch schon ein Video, tauschen die beiden. Nur tricks.video_path ändert sich,
// die Dateien bleiben, wo sie sind (gleiche Athlet:in = gleicher Ordner).
function repVidMoveHtml(report, dbId, pre, onclick, btnCls) {
  const td = ((report && report.trick_data) || []).find(t => (t.attempts || []).some(a => a && a.dbId === dbId));
  const atts = td ? td.attempts || [] : [];
  const ziele = atts.map((a, k) => ({a, k})).filter(x => x.a && x.a.dbId && x.a.dbId !== dbId);
  if (!ziele.length) return '';
  return `<div class="rep-move">
    <label for="${pre}-ziel">Wrong attempt? Move this video to</label>
    <div class="rep-move-row"><select id="${pre}-ziel">${ziele.map(({a, k}) => `<option value="${a.dbId}">Attempt ${k + 1} of ${atts.length}${a.time ? ' · ' + srEsc(String(a.time).slice(0, 5)) : ''} · ${srEsc(a.trick || '—')}${a.video ? ' · has a video: swap' : ''}</option>`).join('')}</select>
      <button class="${btnCls}" onclick="${onclick}">Move</button></div>
    <div class="rep-move-hint">If that attempt already has a video, the two videos swap places.</div>
  </div>`;
}
// In tricks umhängen. Erst das Ziel, dann die Quelle; schlägt der zweite Schritt fehl, wird der erste zurückgenommen.
async function repVidMoveDb(dbId, zielId) {
  if (!dbId || !zielId || dbId === zielId) return false;
  const {data: rows, error: e1} = await db.from('tricks').select('id,athlet,video_path').in('id', [dbId, zielId]);
  const quelle = (rows || []).find(r => r.id === dbId), ziel = (rows || []).find(r => r.id === zielId);
  if (e1 || !quelle || !ziel) { showToast('Could not load the attempts: ' + ((e1 && e1.message) || 'not found'), 'error'); return false; }
  if (!quelle.video_path) { showToast('This attempt has no video anymore: reload the report', 'error'); return false; }
  if (quelle.athlet !== ziel.athlet) { showToast('Videos can only be moved between attempts of the same athlete', 'error'); return false; }
  const {error: e2} = await db.from('tricks').update({video_path: quelle.video_path}).eq('id', zielId);
  if (e2) { showToast('Error saving: ' + e2.message, 'error'); return false; }
  const {error: e3} = await db.from('tricks').update({video_path: ziel.video_path || null}).eq('id', dbId);
  if (e3) {
    await db.from('tricks').update({video_path: ziel.video_path || null}).eq('id', zielId);
    showToast('Error saving: ' + e3.message, 'error');
    return false;
  }
  sbMonRows = null;
  showToast(ziel.video_path ? 'Videos swapped' : 'Video moved', 'success');
  return true;
}
// ═══════════════ VIDEO LÖSCHEN ═══════════════
// Falsches Video ganz entfernen (Verweis in tricks und Datei). Danach lädt man beim Versuch ein neues hoch.
// Die Datei wird nur gelöscht, wenn kein anderer Versuch mehr auf sie zeigt.
async function repVidDeleteDb(dbId) {
  const {data: row, error: e1} = await db.from('tricks').select('video_path').eq('id', dbId).maybeSingle();
  if (e1 || !row) { showToast('Could not load the attempt: ' + ((e1 && e1.message) || 'not found'), 'error'); return false; }
  if (!row.video_path) { showToast('This attempt has no video anymore: reload the report', 'error'); return false; }
  const {error: e2} = await db.from('tricks').update({video_path: null}).eq('id', dbId);
  if (e2) { showToast('Error deleting: ' + e2.message, 'error'); return false; }
  const {data: andere} = await db.from('tricks').select('id').eq('video_path', row.video_path).limit(1);
  if (!andere || !andere.length) {
    const {error: e3} = await db.storage.from(TRICK_VIDEO_BUCKET).remove([row.video_path]);
    if (e3) console.error(e3);   // Verweis ist weg, übrig bliebe nur eine verwaiste Datei
  }
  sbMonRows = null;
  return true;
}
// Aus dem Einzelvideo-Fenster: löschen und gleich anbieten, das richtige Video hochzuladen. pos = «ai,ti,i»
async function repVidDelete(dbId, pos) {
  if (!confirm('Delete this video? You can upload the right one right after.')) return;
  const report = _sbRV && _sbRV.report;
  if (!report || !(await repVidDeleteDb(dbId))) return;
  await sbAttReload(report);
  const zu = `document.getElementById('sbv-modal').remove()`;
  sbVideoOverlay(`<div style="font-weight:700;font-size:16px;">✓ Video deleted</div>
    <div style="font-size:13px;color:var(--muted);margin-top:6px;">Upload the right video for this attempt now, or later via the attempt («⬆ Video»).</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-secondary" onclick="${zu}">Later</button><button class="btn btn-secondary" style="font-weight:700;" onclick="${zu};sbAttPickVideo(${pos})">⬆ Upload new video</button></div>`);
}
// Aus dem Einzelvideo-Fenster (sbAttPlay in kern.js)
async function repVidMove(dbId) {
  const zielId = +((document.getElementById('mv-ziel') || {}).value || 0);
  const report = _sbRV && _sbRV.report;
  if (!report || !(await repVidMoveDb(dbId, zielId))) return;
  document.getElementById('sbv-modal')?.remove();
  await sbAttReload(report);
}

function repFeedResHtml(x) {
  const q = sbAttQ(x.a);
  const lbl = q === 'perfect' ? (x.stomp ? 'Stomped' : 'Perfect') : q === 'miss' ? (x.stomp ? 'Failed' : 'Miss') : 'Landed';
  const col = q === 'perfect' ? '#148FA0' : q === 'miss' ? '#e2001a' : REP_GRUEN;
  // Snowboard: Sterne; Freeski: QoE (qoeOfLogEntry kommt aus dem Freeski-Modul)
  const extra = typeof x.a.sterne === 'number' && q !== 'miss' ? ` · ${x.a.sterne}/5` : (!x.stomp && typeof qoeOfLogEntry === 'function' ? ` · QoE ${qoeOfLogEntry(x.a)}%` : '');
  return `<span class="rep-feed-q" style="background:${col};">${q === 'perfect' ? '⭐' : q === 'miss' ? '✗' : '✓'} ${lbl}${extra}</span>`;
}

function repFeedSeen(sec, sichtbar) {
  const F = REP_FEED; if (!F) return;
  const i = +sec.dataset.i, v = sec.querySelector('video');
  if (!v) return;
  if (!sichtbar) { if (!v.paused) v.pause(); return; }
  F.cur = i;
  repFeedLoad(i);
  repFeedLoad(i + 1);   // das nächste Video schon laden, damit das Weiterwischen flüssig ist
  v.muted = F.muted;
  v.defaultPlaybackRate = F.rate; v.playbackRate = F.rate;
  const p = v.play();
  // Ohne Antippen erlaubt der Browser Ton oft nicht: dann stumm weiterspielen
  if (p && p.catch) p.catch(() => { if (!v.muted && REP_FEED === F) { F.muted = true; repFeedSoundLbl(); v.muted = true; v.play().catch(() => {}); } });
}

function repFeedLoad(i) {
  const F = REP_FEED, x = F && F.items[i];
  if (!x) return;
  const sec = document.querySelector(`#rep-feed-list .rep-feed-item[data-i="${i}"]`), v = sec && sec.querySelector('video');
  if (!v || v.getAttribute('src')) return;
  const url = F.urls[x.path];
  if (!url) { sec.classList.add('fehlt'); return; }
  v.addEventListener('error', () => sec.classList.add('fehlt'), {once: true});
  v.preload = 'auto';
  v.defaultPlaybackRate = F.rate;
  v.src = url;
}

function repFeedCurVideo() {
  const F = REP_FEED;
  return F ? document.querySelector(`#rep-feed-list .rep-feed-item[data-i="${F.cur}"] video`) : null;
}
function repFeedSound() {
  const F = REP_FEED; if (!F) return;
  F.muted = !F.muted;
  repFeedSoundLbl();
  const v = repFeedCurVideo();
  if (v) { v.muted = F.muted; if (!F.muted) v.play().catch(() => {}); }
}
function repFeedSoundLbl() {
  const b = document.getElementById('rep-feed-sound'), F = REP_FEED;
  if (b && F) { b.textContent = F.muted ? 'Sound off' : 'Sound on'; b.classList.toggle('on', !F.muted); }
}
// Zeitlupe für die Analyse: 1× → ½× → ¼× → 1×
function repFeedRate() {
  const F = REP_FEED; if (!F) return;
  F.rate = F.rate === 1 ? 0.5 : F.rate === 0.5 ? 0.25 : 1;
  document.querySelectorAll('#rep-feed-list video').forEach(v => { v.defaultPlaybackRate = F.rate; v.playbackRate = F.rate; });
  const b = document.getElementById('rep-feed-rate');
  if (b) { b.textContent = 'Speed ' + (F.rate === 1 ? '1×' : F.rate === 0.5 ? '½×' : '¼×'); b.classList.toggle('on', F.rate !== 1); }
}

function repFeedEdit(i) {
  const F = REP_FEED, x = F && F.items[i], el = document.getElementById('rep-feed-info-' + i);
  if (!x || !el) return;
  repAttDraftReset('rf' + i);
  el.innerHTML = `<div class="rep-feed-meta"><b>${srEsc(x.athlet)}</b><span>Edit attempt</span></div>
    ${repAttTextFieldsHtml(x.a, 'rf' + i)}
    <div class="rep-feed-acts"><button class="rep-feed-btn on" onclick="repFeedEditSave(${i})">Save</button><button class="rep-feed-btn" onclick="repFeedEditCancel(${i})">Cancel</button></div>`;
}
// Feed: Video einem anderen Versuch zuordnen, danach den Feed neu öffnen und zum verschobenen Video springen
function repFeedMove(i) {
  const F = REP_FEED, x = F && F.items[i], el = document.getElementById('rep-feed-info-' + i);
  if (!x || !el || !F.report) return;
  el.innerHTML = `<div class="rep-feed-meta"><b>${srEsc(x.athlet)}</b><span>Attempt ${x.pos + 1} of ${x.n}${x.time ? ' · ' + srEsc(x.time) : ''}</span></div>
    ${repVidMoveHtml(F.report, x.dbId, 'rfm' + i, `repFeedMoveSave(${i})`, 'rep-feed-btn on') || '<div class="rep-feed-cmt">No other attempt of this athlete in this report.</div>'}
    <div class="rep-feed-acts"><button class="rep-feed-btn" onclick="repFeedEditCancel(${i})">Cancel</button></div>`;
}
async function repFeedMoveSave(i) {
  const F = REP_FEED, x = F && F.items[i];
  if (!x) return;
  const zielId = +((document.getElementById('rfm' + i + '-ziel') || {}).value || 0);
  if (!(await repVidMoveDb(x.dbId, zielId)) || REP_FEED !== F) return;
  const {opts, report} = F;
  repFeedClose(true);
  await sbAttReload(report);
  repFeedOpen(opts, zielId);
}

// Feed: Video löschen, danach weiter beim nächsten Video (das richtige lädt man beim Versuch im Report hoch)
async function repFeedDelete(i) {
  const F = REP_FEED, x = F && F.items[i];
  if (!x || !x.dbId || !confirm('Delete this video? Upload the right one afterwards at the attempt in the report («⬆ Video»).')) return;
  if (!(await repVidDeleteDb(x.dbId)) || REP_FEED !== F) return;
  showToast('Video deleted', 'success');
  const {opts, report} = F, weiter = (F.items[i + 1] || F.items[i - 1] || {}).dbId || null;
  repFeedClose(true);
  await sbAttReload(report);
  if (repReportVidCount(_sbRV && _sbRV.report)) repFeedOpen(opts, weiter);
}

function repFeedEditCancel(i) {
  const F = REP_FEED, el = document.getElementById('rep-feed-info-' + i);
  if (F && el && F.items[i]) el.innerHTML = repFeedInfoHtml(F.items[i], i);
}
async function repFeedEditSave(i) {
  const F = REP_FEED, x = F && F.items[i];
  if (!x || !x.dbId) return;
  const v = repAttTextValues('rf' + i);
  if (!v.trick) { showToast('Please enter a trick', 'error'); return; }
  const r = await repAttTextUpdate(x.dbId, v);
  if (!r || REP_FEED !== F) return;
  if (r.changed) {
    F.dirty = true;   // beim Schliessen wird der Report neu aus der Tabelle aufgebaut
    x.trick = x.a.trick = r.trick;
    x.a.comment = r.kommentar || '';
    showToast('Attempt updated', 'success');
  }
  repFeedEditCancel(i);
}

function repFeedClose(still) {
  const F = REP_FEED;
  REP_FEED = null;
  document.removeEventListener('keydown', repFeedKey);
  if (F && F.io) F.io.disconnect();
  const el = document.getElementById('rep-feed');
  if (el) {
    el.querySelectorAll('video').forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* Video schon weg */ } });
    el.remove();
  }
  document.body.classList.remove('rep-feed-open');
  if (!still && F && F.dirty && F.report) sbAttReload(F.report);
}

function repFeedKey(e) {
  if (!REP_FEED) return;
  const tag = (e.target && e.target.tagName) || '';
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
  const list = document.getElementById('rep-feed-list');
  if (!list) return;
  if (e.key === 'Escape') { e.preventDefault(); repFeedClose(); }
  else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); list.scrollBy({top: list.clientHeight, behavior: 'smooth'}); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); list.scrollBy({top: -list.clientHeight, behavior: 'smooth'}); }
  else if (e.key === ' ' && tag !== 'VIDEO' && tag !== 'BUTTON') {
    e.preventDefault();
    const v = repFeedCurVideo();
    if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
  }
}

// ═══════════════ TRICK UND KOMMENTAR EINES VERSUCHS ═══════════════
// Felder fürs ✎-Bearbeiten im Report und im Feed. Vorschläge: alle Tricks des offenen Reports.
// Das Bearbeiten-Feld wird beim Antippen einer Kategorie neu gezeichnet: die Eingaben leben deshalb in REP_ATT_DRAFT
// (neu bei jedem Start des Bearbeitens, repAttDraftReset in sbRVEditStart).
const REP_ATT_DRAFT = {};
function repAttDraft(pre, k, v) { (REP_ATT_DRAFT[pre] = REP_ATT_DRAFT[pre] || {})[k] = v; }
function repAttDraftReset(pre) { delete REP_ATT_DRAFT[pre]; }
function repAttTextFieldsHtml(a, pre) {
  const TD = Array.isArray(_sbRV && _sbRV.report && _sbRV.report.trick_data) ? _sbRV.report.trick_data : [];
  const tricks = [...new Set(TD.flatMap(td => (td.attempts || []).map(x => x && x.trick)).filter(Boolean))].sort();
  const d = REP_ATT_DRAFT[pre] = REP_ATT_DRAFT[pre] || {trick: (a && a.trick) || '', comment: repFreeText(a && a.comment)};
  return `<div class="rep-att-edit">
    <label for="${pre}-trick">Trick</label>
    <input type="text" id="${pre}-trick" list="${pre}-tricks" value="${srEsc(d.trick)}" oninput="repAttDraft('${pre}','trick',this.value)" autocomplete="off" spellcheck="false">
    <datalist id="${pre}-tricks">${tricks.map(t => `<option value="${srEsc(t)}">`).join('')}</datalist>
    <label for="${pre}-cmt">Comment</label>
    <input type="text" id="${pre}-cmt" value="${srEsc(d.comment)}" oninput="repAttDraft('${pre}','comment',this.value)" placeholder="optional">
  </div>`;
}
// Gespeichert wird «Trick — Grab», angezeigt «Trick: Grab» (ui-regeln.js). Wer den Doppelpunkt (oder « - ») eintippt,
// meint die Grab-Trennung: sonst stünde derselbe Trick als eigener Block im Report und im Monitoring.
function repTrickNorm(s) {
  return String(s || '').replace(/\s*:\s*|\s+[-–]\s+/g, ' — ').replace(/\s{2,}/g, ' ').trim();
}
function repAttTextValues(pre) {
  return {trick: repTrickNorm((document.getElementById(pre + '-trick') || {}).value),
          comment: ((document.getElementById(pre + '-cmt') || {}).value || '').trim()};
}
// Trick und/oder freien Kommentar in tricks ändern (Run-Markierung und Kategorien bleiben, siehe attKommentar im Modul).
// Gibt {changed, trick, kommentar} zurück, bei Fehler null.
async function repAttTextUpdate(dbId, {trick, comment}) {
  const {data: row, error: e1} = await db.from('tricks').select('trickaufbau,kommentar,disziplin').eq('id', dbId).maybeSingle();
  if (e1 || !row) { showToast('Could not load the attempt: ' + ((e1 && e1.message) || 'not found'), 'error'); return null; }
  const upd = {};
  if (trick && trick !== row.trickaufbau) {
    upd.trickaufbau = trick;
    // Grab steht nach « — » im Trick; bei Rails steht dort die Rail-Art, nicht der Grab
    if (row.disziplin !== 'Rail') upd.grab = splitTrickGrab(trick).grab || null;
  }
  const kommentar = attKommentar(row.kommentar, comment);
  if ((kommentar || null) !== (row.kommentar || null)) upd.kommentar = kommentar;
  if (!Object.keys(upd).length) return {changed: false, trick: row.trickaufbau, kommentar: row.kommentar};
  const {error} = await db.from('tricks').update(upd).eq('id', dbId);
  if (error) { showToast('Error saving: ' + error.message, 'error'); return null; }
  if (upd.trickaufbau && typeof syncTrickNameLocally === 'function') syncTrickNameLocally(dbId, trick);
  sbMonRows = null;   // Monitoring-Cache ist veraltet
  return {changed: true, trick: upd.trickaufbau || row.trickaufbau, kommentar};
}

// ═══════════════ REPORT BEARBEITEN: SESSION-ANGABEN, NOTIZEN, CONTEST-RESULTATE ═══════════════
const REP_COND = [['1', 'Poor'], ['2', 'Below Avg'], ['3', 'Average'], ['4', 'Good'], ['5', 'Excellent']];

function repEditOpen() {
  const report = _sbRV && _sbRV.report;
  if (!report || !report.id || !_sbRVEditable) return;
  const TD = Array.isArray(report.trick_data) ? report.trick_data : [];
  const typen = Object.keys(SESS_TYPE_SHORT).filter(t => t !== 'Jump On-Snow' && typFuerGruppe(t));
  if (report.session_type && !typen.includes(report.session_type)) typen.unshift(report.session_type);
  const orte = [...new Set(_sbRepList.map(r => r.location).filter(Boolean))].sort();
  const v = x => srEsc(x == null ? '' : x);
  const zahl = (id, wert, ph) => `<input type="number" step="0.01" min="0" id="${id}" value="${wert == null ? '' : v(wert)}" placeholder="${ph}" class="rep-num">`;
  document.getElementById('rep-edit')?.remove();
  const m = document.createElement('div');
  m.id = 'rep-edit';
  m.className = 'rep-modal';
  m.innerHTML = `<div class="rep-modal-box" role="dialog" aria-label="Edit report">
    <div class="rep-modal-h">Edit report</div>
    <div class="form-grid">
      <div class="form-group"><label for="re-datum">Date</label><input type="date" id="re-datum" value="${v(report.datum)}"></div>
      <div class="form-group"><label for="re-typ">Session type</label><select id="re-typ" onchange="repEditTyp()">${typen.map(t => `<option value="${v(t)}"${t === report.session_type ? ' selected' : ''}>${v(t)}</option>`).join('')}</select></div>
      <div class="form-group"><label for="re-ort">Location</label><input type="text" id="re-ort" list="re-orte" value="${v(report.location)}" placeholder="e.g. Laax"><datalist id="re-orte">${orte.map(o => `<option value="${v(o)}">`).join('')}</datalist></div>
      <div class="form-group"><label for="re-dauer">Duration (min)</label><input type="number" id="re-dauer" min="5" step="5" value="${v(report.duration_min)}"></div>
      <div class="form-group" id="re-size-wrap"><label for="re-size">Jump size</label><select id="re-size"><option value="">—</option>${['M', 'L', 'XL'].map(s => `<option${s === report.jump_size ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="form-group"><label for="re-cond">Conditions</label><select id="re-cond"><option value="">—</option>${REP_COND.map(([k, l]) => `<option value="${k}"${+k === +report.conditions ? ' selected' : ''}>${k} — ${l}</option>`).join('')}</select></div>
      <div class="form-group full"><label for="re-com">Coach comments</label><textarea id="re-com" rows="2" placeholder="Coach notes, observations…">${v(report.comments)}</textarea></div>
    </div>
    ${TD.length ? `<div class="section-divider">Athlete notes</div>
    ${TD.map((td, ai) => `<div class="rep-edit-ath"><span>${v(td.athlet)}</span><input type="text" id="re-note-${ai}" value="${v(td.note)}" placeholder="Short note…"></div>`).join('')}
    <div id="re-comp">
      <div class="section-divider">Contest results <span class="rep-edit-hint">final empty if not reached</span></div>
      ${TD.map((td, ai) => { const q = td.quali_scores || [], f = td.final_scores || [];
        return `<div class="rep-edit-ath rep-edit-comp"><span>${v(td.athlet)}</span>
          <em>Quali</em>${zahl('re-q0-' + ai, q[0], 'Run 1')}${zahl('re-q1-' + ai, q[1], 'Run 2')}
          <em>Final</em>${zahl('re-f0-' + ai, f[0], 'Run 1')}${zahl('re-f1-' + ai, f[1], 'Run 2')}<span class="re-f3">${zahl('re-f2-' + ai, f[2], 'Run 3')}</span>
          <em>Rank</em><input type="number" step="1" min="1" id="re-r-${ai}" value="${td.contest_rank == null ? '' : v(td.contest_rank)}" placeholder="#" class="rep-num rep-num-s"></div>`; }).join('')}
    </div>` : ''}
    <div class="rep-modal-acts"><button class="btn-secondary" onclick="document.getElementById('rep-edit').remove()">Cancel</button><button class="rep-save" id="re-save" onclick="repEditSave()">Save</button></div>
  </div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  repEditTyp();
}

// Jump Size nur bei Sprung-Sessions, Contest-Resultate nur bei Wettkämpfen (Slopestyle: 2 Final-Runs, sonst 3)
function repEditTyp() {
  const t = (document.getElementById('re-typ') || {}).value || '';
  const sw = document.getElementById('re-size-wrap');
  if (sw) sw.style.display = /^(Slopestyle|Halfpipe)/.test(t) ? 'none' : '';
  const c = document.getElementById('re-comp');
  if (c) c.style.display = /Competition/.test(t) ? '' : 'none';
  document.querySelectorAll('#rep-edit .re-f3').forEach(el => { el.style.display = /^Slopestyle/.test(t) ? 'none' : ''; });
}

async function repEditSave() {
  const report = _sbRV && _sbRV.report;
  if (!report || !report.id) return;
  const val = id => ((document.getElementById(id) || {}).value || '').trim();
  const TD = Array.isArray(report.trick_data) ? report.trick_data : [];
  const datum = val('re-datum') || report.datum;
  const session_type = val('re-typ') || report.session_type;
  const comp = /Competition/.test(session_type || ''), nFinal = /^Slopestyle/.test(session_type || '') ? 2 : 3;
  const num = id => { const x = parseFloat(val(id)); return Number.isFinite(x) ? x : null; };
  const trick_data = TD.map((td, ai) => {
    const neu = {...td, note: val('re-note-' + ai)};
    if (comp) {   // ohne Wettkampf bleiben vorhandene Resultate unangetastet
      const q = [0, 1].map(k => num(`re-q${k}-${ai}`)).filter(x => x != null);
      const f = [0, 1, 2].slice(0, nFinal).map(k => num(`re-f${k}-${ai}`)).filter(x => x != null);
      const r = parseInt(val('re-r-' + ai), 10);
      neu.quali_scores = q.length ? q : null;
      neu.final_scores = f.length ? f : null;
      neu.contest_rank = Number.isFinite(r) ? r : null;
    }
    return neu;
  });
  const dauer = parseInt(val('re-dauer'), 10);
  const upd = {datum, session_type, location: val('re-ort') || null, duration_min: dauer > 0 ? dauer : null,
    jump_size: /^(Slopestyle|Halfpipe)/.test(session_type || '') ? null : (val('re-size') || null),
    conditions: parseInt(val('re-cond'), 10) || null, comments: val('re-com') || null, trick_data};
  const btn = document.getElementById('re-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  let {error} = await db.from('session_reports').update(upd).eq('id', report.id);
  if (error && /jump_size/.test(error.message || '')) {   // ältere Projekte ohne Spalte jump_size
    delete upd.jump_size;
    ({error} = await db.from('session_reports').update(upd).eq('id', report.id));
  }
  if (error) {
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    showToast('Error saving report: ' + error.message, 'error');
    return;
  }
  // Datum oder Typ geändert: die Versuche ziehen mit, sonst passen Monitoring und Neuaufbau nicht mehr zum Report
  if (datum !== report.datum || session_type !== report.session_type) {
    const ids = [...new Set(TD.flatMap(td => (td.trickIds || []).concat((td.attempts || []).map(a => a && a.dbId))).filter(Boolean))];
    if (ids.length) {
      const {error: e2} = await db.from('tricks').update({datum, typ: session_type}).in('id', ids);
      if (e2) showToast('Report saved, but the attempts keep the old date and type: ' + e2.message, 'error');
    }
  }
  Object.assign(report, upd);
  const di = dbSessionReports.findIndex(r => r.id === report.id);
  if (di >= 0) Object.assign(dbSessionReports[di], upd);
  sbMonRows = null;
  document.getElementById('rep-edit')?.remove();
  _sbRepList.sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  const idx = _sbRepList.findIndex(r => r.id === report.id);
  if (idx >= 0) await sbOpenReportInline(idx);
  showToast('Report updated', 'success');
}

// ═══════════════ REPORTS FÜR ATHLET:INNEN ═══════════════
// Nur die eigenen Versuche (Tabelle tricks, RLS «tricks own athlete read»), pro Session: welche Tricks wie oft und die eigenen
// Videos. Bewusst ohne Bewertung, Kommentare, Notizen und Daten anderer (session_reports ist für Athlet:innen gesperrt).
let _repAth = null;   // {sessions: [{datum, typ, rows}]}

async function repAthLoad() {
  const root = document.getElementById('sbrep-root');
  if (!root || !ATHLETE_NAME) return;
  root.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  const holen = cols => db.from('tricks').select(cols).eq('athlet', ATHLETE_NAME)
    .order('datum', {ascending: false}).order('created_at', {ascending: true}).limit(5000);
  let res = await holen('id,datum,typ,trickaufbau,created_at,versuch_nr,video_path');
  if (res.error && /versuch_nr|video_path|column/i.test(res.error.message || '')) res = await holen('id,datum,typ,trickaufbau,created_at');
  if (res.error) { root.innerHTML = `<div class="card polster-20">Could not load your sessions: ${srEsc(res.error.message)}</div>`; return; }
  const by = new Map();
  (res.data || []).forEach(t => {
    const k = (t.datum || '') + '|' + (t.typ || '');
    if (!by.has(k)) by.set(k, {datum: t.datum, typ: t.typ, rows: []});
    by.get(k).rows.push(t);
  });
  _repAth = {sessions: [...by.values()].map(s => ({...s, rows: sbAttSort(s.rows)}))};
  repAthRender();
}

function repAthSetRange(v) { _sbRepRange = v; repAthRender(); }

function repAthRender() {
  const root = document.getElementById('sbrep-root');
  if (!root || !_repAth) return;
  if (_sbRepRange === 'custom') _sbRepRange = 'all';
  const {from, to} = sbRepRangeBounds();
  const S = _repAth.sessions.map((s, si) => ({s, si})).filter(({s}) => (!from || (s.datum || '') >= from) && (!to || (s.datum || '') <= to));
  root.innerHTML = `<div class="card polster-20">
    <div class="rep-ath-head">
      <div style="flex:1;min-width:160px;">
        <div style="font-size:20px;font-weight:800;color:var(--text);">My sessions</div>
        <div class="hinweis-gross">Which tricks you did and your videos</div>
      </div>
      <select onchange="repAthSetRange(this.value)" class="rep-ath-sel">
        <option value="all" ${_sbRepRange === 'all' ? 'selected' : ''}>All time</option>
        <option value="season" ${_sbRepRange === 'season' ? 'selected' : ''}>Current season</option>
        <option value="last" ${_sbRepRange === 'last' ? 'selected' : ''}>Last season</option>
      </select>
    </div>
    ${S.length ? S.map(({s, si}) => repAthSessionHtml(s, si)).join('') : '<div class="leer-schmal">No sessions in this period yet.</div>'}
  </div>`;
}

function repAthSessionHtml(s, si) {
  const cnt = new Map();
  s.rows.forEach(r => {
    const k = String(r.trickaufbau || '—').trim();
    const c = cnt.get(k) || {n: 0, v: 0};
    c.n++; if (r.video_path) c.v++;
    cnt.set(k, c);
  });
  const tricks = [...cnt.entries()].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
  const nVid = s.rows.filter(r => r.video_path).length;
  const typ = SESS_TYPE_SHORT[s.typ] || s.typ || 'Session';
  return `<div class="rep-ath-sess">
    <div class="rep-ath-sess-h">
      <div><b>${fmtDate(s.datum)}</b> · ${srEsc(typ)}<div class="hinweis">${s.rows.length} attempt${s.rows.length === 1 ? '' : 's'} · ${tricks.length} trick${tricks.length === 1 ? '' : 's'}</div></div>
      ${nVid ? `<button class="rep-ath-vid" onclick="repAthFeed(${si})">▶ ${nVid} video${nVid === 1 ? '' : 's'}</button>` : ''}
    </div>
    <div class="rep-ath-tricks">${tricks.map(([t, c]) => `<div class="rep-ath-trick"><span class="rep-ath-name">${srEsc(t)}</span>${c.v ? `<span class="rep-ath-v" title="${c.v} video${c.v === 1 ? '' : 's'}">▶ ${c.v}</span>` : ''}<b>${c.n}×</b></div>`).join('')}</div>
  </div>`;
}

function repAthFeed(si) {
  const s = _repAth && _repAth.sessions[si];
  if (!s) return;
  const kurz = shortName(ATHLETE_NAME);
  const zeit = r => r.created_at ? new Date(r.created_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich'}) : '';
  const items = s.rows.map((r, pos) => r.video_path ? {path: r.video_path, athlet: kurz, trick: r.trickaufbau || '—', pos, n: s.rows.length, datum: s.datum, time: zeit(r), run: null} : null).filter(Boolean);
  repFeedShow(items, {titel: `${fmtDate(s.datum)} · ${SESS_TYPE_SHORT[s.typ] || s.typ || 'Session'}`});
}
