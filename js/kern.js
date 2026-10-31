// Versuchs-Grafik pro Trick (Session-Report) grösser darstellen — Geometrie bleibt, SVG wird skaliert
const TRICK_CHART_SCALE = (window.innerWidth || 1024) <= 768 ? 1 : 1.7;   // Handy: normal gross und auf Bildschirmbreite (ganze Session ohne Wischen)
// Gemeinsamer Kern: alles, was in beiden Sportarten identisch ist.
// ═══════════════ GEMEINSAMER KERN (identisch in beiden Apps) ═══════════════
const SUPABASE_URL = CFG.supabaseUrl;

const SUPABASE_KEY = CFG.supabaseKey;

// ── Rail-Tricks: Vorschlagsliste kommt aus der Config, der Rest ist gemeinsam ──
const SB_RAIL_SUGGESTIONS = CFG.railSuggestions || [];
let SB_CUSTOM_RAIL_TYPES = [];   // in dieser Session neu erfasste Rail-Arten
let SB_RAIL_TRICKS = [];         // team-weit bereits verwendete Rail-Tricks (aus der DB)

// Invite-/Recovery-Links tragen den Typ im URL-Hash — vor supabase-js einlesen
const AUTH_URL_TYPE = (location.hash.match(/type=(\w+)/) || [])[1] || null;
const AUTH_URL_ERROR = decodeURIComponent(((location.hash.match(/error_description=([^&]*)/) || [])[1] || '').replace(/\+/g, ' '));

const { createClient } = supabase;

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════ AUTH (Coach-Login) + Gruppen-Filter ═══════════════
const AUTH_ENABLED = true;
let AUTH_USER = null;
let COACH_SQUAD = null;                       // squad key from the coaches table, null = unknown
let GROUP_FILTER = 'all';
const ALL_SQUADS = CFG.squads.map(s => ({...s})); // unfiltered copy for the selector
// Selector entries; a value can combine several squad keys (joined with '+')
const FILTER_GROUPS = ALL_SQUADS.map(s => ({value:s.key, short:s.short || s.label}));

function showAuthGate(msg) {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="auth-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">Coach login</div>
    <label style="display:block;margin-bottom:4px;">E-Mail</label>
    <input type="email" id="auth-email" autocomplete="username" required style="margin-bottom:12px;">
    <label style="display:block;margin-bottom:4px;">Password</label>
    <input type="password" id="auth-pass" autocomplete="current-password" required style="margin-bottom:6px;">
    <div id="auth-err" style="min-height:16px;font-size:12px;color:#e2001a;margin-bottom:10px;">${msg||''}</div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#148FA0;color:#ffffff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">Sign in</button>
    <div style="text-align:center;margin-top:12px;"><a class="hinweis" href="#" onclick="authForgotPassword();return false;">Forgot password?</a> <span class="hinweis">·</span> <a class="hinweis" href="#" onclick="authHaveCode();return false;">Have a code?</a></div>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const {error} = await db.auth.signInWithPassword({
      email: document.getElementById('auth-email').value.trim(),
      password: document.getElementById('auth-pass').value,
    });
    if (error) {
      btn.disabled = false; btn.textContent = 'Sign in';
      document.getElementById('auth-err').textContent = 'Login failed: ' + error.message;
    } else {
      location.reload();
    }
  });
}

function showSetPasswordGate() {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="setpw-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">Welcome! Choose your password.</div>
    <label style="display:block;margin-bottom:4px;">New password</label>
    <input type="password" id="setpw-1" autocomplete="new-password" required minlength="8" style="margin-bottom:12px;">
    <label style="display:block;margin-bottom:4px;">Repeat password</label>
    <input type="password" id="setpw-2" autocomplete="new-password" required minlength="8" style="margin-bottom:6px;">
    <div id="setpw-err" style="min-height:16px;font-size:12px;color:#e2001a;margin-bottom:10px;"></div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#148FA0;color:#ffffff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">Save password</button>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('setpw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const p1 = document.getElementById('setpw-1').value, p2 = document.getElementById('setpw-2').value;
    const err = document.getElementById('setpw-err');
    if (p1 !== p2) { err.textContent = 'Passwords do not match.'; return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    const {error} = await db.auth.updateUser({password: p1});
    if (error) {
      btn.disabled = false; btn.textContent = 'Save password';
      err.textContent = 'Error: ' + error.message;
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      location.reload();
    }
  });
}

// Reset via 6-stelligem Code statt Link — Links werden vom Outlook-Link-Scanner
// verbraucht, bevor die Coaches sie öffnen können (Mail-Template muss {{ .Token }} enthalten)
async function authForgotPassword() {
  const email = (document.getElementById('auth-email')?.value || '').trim();
  const err = document.getElementById('auth-err');
  if (!email) { err.textContent = 'Enter your e-mail above first, then tap the link again.'; return; }
  err.style.color = 'var(--muted)';
  err.textContent = 'Sending code…';
  const {error} = await db.auth.resetPasswordForEmail(email);
  if (error) {
    err.style.color = '#e2001a';
    err.textContent = 'Error: ' + error.message;
    return;
  }
  showOtpGate(email);
}

// Code-Eingabe öffnen ohne neue Mail auszulösen (Mail-Stundenlimit, verspätete Mail)
function authHaveCode() {
  const email = (document.getElementById('auth-email')?.value || '').trim();
  const err = document.getElementById('auth-err');
  if (!email) { err.textContent = 'Enter your e-mail above first, then tap the link again.'; return; }
  showOtpGate(email);
}

function showOtpGate(email) {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="otp-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">We sent a code to<br><b>${email}</b> — enter it below.</div>
    <label style="display:block;margin-bottom:4px;">Code</label>
    <input type="text" id="otp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required style="margin-bottom:6px;text-align:center;font-size:20px;letter-spacing:4px;">
    <div id="otp-err" style="min-height:16px;font-size:12px;color:#e2001a;margin-bottom:10px;"></div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#148FA0;color:#ffffff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">Verify code</button>
    <div style="text-align:center;margin-top:12px;"><a class="hinweis" href="#" onclick="showAuthGate();return false;">Back to login</a></div>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('otp-code').focus();
  document.getElementById('otp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Checking…';
    const {error} = await db.auth.verifyOtp({
      email,
      token: document.getElementById('otp-code').value.trim(),
      type: 'recovery',
    });
    if (error) {
      btn.disabled = false; btn.textContent = 'Verify code';
      document.getElementById('otp-err').textContent = 'Code invalid or expired (' + error.message + '). Go back and request a new one.';
    } else {
      showSetPasswordGate();
    }
  });
}

async function initAuth() {
  if (!AUTH_ENABLED) return true;   // Login pausiert — App startet ohne Anmeldung
  let session = null;
  try { session = (await db.auth.getSession()).data.session; } catch (e) { console.error(e); }
  if (session && (AUTH_URL_TYPE === 'invite' || AUTH_URL_TYPE === 'recovery')) {
    showSetPasswordGate();
    return false;
  }
  if (!session) {
    showAuthGate(AUTH_URL_ERROR
      ? 'This link is invalid or was already used (' + AUTH_URL_ERROR + '). Ask for a new invite or use “Forgot password?”.'
      : '');
    return false;
  }
  AUTH_USER = session.user;
  try {
    const {data} = await db.from('coaches').select('squad').eq('email', AUTH_USER.email).maybeSingle();
    COACH_SQUAD = data && data.squad ? data.squad : null;
  } catch (e) { COACH_SQUAD = null; }
  return true;
}

function authLogout() {
  db.auth.signOut().finally(() => location.reload());
}

function applyGroupFilter() {
  const saved = localStorage.getItem(SPORT + '_group_filter');
  // Map the coach's squad key to the filter entry that contains it (e.g. freeski X → 'GK+X')
  const coachDefault = COACH_SQUAD
    ? (FILTER_GROUPS.find(g => g.value.split('+').includes(COACH_SQUAD)) || {}).value || 'all'
    : 'all';
  GROUP_FILTER = saved || coachDefault;
  if (GROUP_FILTER !== 'all' && !FILTER_GROUPS.some(g => g.value === GROUP_FILTER)) GROUP_FILTER = 'all';
  if (GROUP_FILTER !== 'all') {
    const keys = new Set(GROUP_FILTER.split('+'));
    // Mutate in place — modules captured these array references at parse time
    const keepA = CFG.athletes.filter(a => keys.has(a.squad));
    CFG.athletes.length = 0; CFG.athletes.push(...keepA);
    const keepS = CFG.squads.filter(s => keys.has(s.key));
    CFG.squads.length = 0; CFG.squads.push(...keepS);
    CFG.athleteOptgroups = CFG.squads.map(sq =>
      `<optgroup label="${sq.label}">` +
      CFG.athletes.filter(a => a.squad === sq.key).map(a => `<option>${a.name}</option>`).join('') +
      `</optgroup>`).join('');
  }
}

function setGroupFilter(v) {
  localStorage.setItem(SPORT + '_group_filter', v);
  location.reload();
}

// «＋ Add new…»-Option in Selects: fragt nach Text, ergänzt und wählt die neue Option
function sbSelectAddNew(sel) {
  if (sel.value !== '__add__') return;
  const v = (window.prompt('New entry:') || '').replace(/\s+/g, ' ').trim();
  if (!v) { sel.value = ''; return; }
  const existing = [...sel.options].find(o => o.value.toLowerCase() === v.toLowerCase());
  if (existing) { sel.value = existing.value; return; }
  const o = document.createElement('option'); o.textContent = v;
  const addOpt = sel.querySelector('option[value="__add__"]');
  if (addOpt) sel.insertBefore(o, addOpt); else sel.appendChild(o);
  sel.value = v;
}

// Team-weit bereits verwendete Combo-/Transfer-Werte aus der DB als Optionen anbieten
async function sbLoadCustomSelectValues() {
  const fill = async (col, selId) => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    try {
      const vals = new Set();
      let from = 0;
      while (true) {
        const {data, error} = await db.from('standort').select(col).not(col, 'is', null).range(from, from + 999);
        if (error || !data) break;
        data.forEach(r => { const v = (r[col] || '').trim(); if (v) vals.add(v); });
        if (data.length < 1000) break;
        from += 1000;
      }
      const have = new Set([...sel.options].map(o => o.value.toLowerCase()));
      const addOpt = sel.querySelector('option[value="__add__"]');
      [...vals].sort((a, b) => a.localeCompare(b)).forEach(v => {
        if (have.has(v.toLowerCase())) return;
        const o = document.createElement('option'); o.textContent = v;
        if (addOpt) sel.insertBefore(o, addOpt); else sel.appendChild(o);
      });
    } catch (e) { /* Basis bleibt: nur «＋ Add new…» */ }
  };
  fill('swap', 'sb-swap');
  fill('transfer', 'sb-transfer');
}

// Session-Typen nach Trainingsgruppe: HP-Gruppen sehen Bag + Halfpipe,
// Park-Gruppen (SS&BA) Bag + Big Air/Slopestyle; DVLP und «All» sehen alles.
const HP_SQUAD_KEYS = new Set(SPORT === 'freeski' ? ['HP'] : ['M']);
const ALLROUND_SQUAD_KEYS = new Set(['DVLP']);
// Welche Session-Typen die gewählte Gruppe braucht: Halfpipe-TGs nur Halfpipe, Park-TGs nur Big Air und Slopestyle,
// DVLP beides, «All» alles; Landing Bag immer. Gilt für die Typ-Knöpfe der Session und die Filter-Chips in Monitoring und Reports.
function typFuerGruppe(typ) {
  if (!typ || typ.startsWith('sr:') || typ === 'Landing Bag') return true;
  const hasHp = CFG.squads.some(sq => HP_SQUAD_KEYS.has(sq.key) || ALLROUND_SQUAD_KEYS.has(sq.key));
  const hasPark = CFG.squads.some(sq => !HP_SQUAD_KEYS.has(sq.key));
  return typ.startsWith('Halfpipe') ? hasHp : hasPark;
}
function updateSessTypeButtons() {
  document.querySelectorAll('.sess-type-btn').forEach(b => {
    const t = b.dataset.type || b.textContent.trim();
    b.style.display = typFuerGruppe(t) ? '' : 'none';
  });
  // Zeilen ohne sichtbare Knöpfe (z.B. Halfpipe für Park-Gruppen) ganz ausblenden
  document.querySelectorAll('.sess-type-row').forEach(r => {
    r.style.display = [...r.querySelectorAll('.sess-type-btn')].some(b => b.style.display !== 'none') ? '' : 'none';
  });
}

function renderAuthControls() {
  const wrap = document.getElementById('auth-controls');
  const sel = document.getElementById('group-filter-sel');
  if (!wrap || !sel) return;
  sel.innerHTML = `<option value="all" ${GROUP_FILTER==='all'?'selected':''}>All</option>` +
    FILTER_GROUPS.map(g => `<option value="${g.value}" ${GROUP_FILTER===g.value?'selected':''}>${g.short}</option>`).join('');
  const logoutBtn = wrap.querySelector('button');
  if (logoutBtn) logoutBtn.style.display = AUTH_USER ? '' : 'none';
  wrap.style.display = 'flex';
}









function val(id) { const el = document.getElementById(id); return el ? el.value || null : null; }


function readFields(prefix) {
  const p = prefix + '-';
  return {
    disziplin: val(p+'disziplin'),
    drehrichtung: val(p+'drehrichtung'), flips: val(p+'flips'), achse: val(p+'achse'),
    rotation: val(p+'rotation'), absprung: val(p+'absprung'), grab: val(p+'grab'),
    bringback: val(p+'bringback'), style: val(p+'style'), railart: val(p+'railart'), slideform: val(p+'slideform'),
    slidevar: val(p+'slidevar'), inspin: val(p+'inspin'), swap: val(p+'swap'), outspin: val(p+'outspin'),
    transfer: val(p+'transfer'), foot: val(p+'foot'),
  };
}


function badge(d) {
  const cls = d==='Jump'||d==='Side Hit'||d==='Landing Bag'?'badge-kicker':d==='Rail'?'badge-rail':'badge-halfpipe';
  return `<span class="badge ${cls}">${d||'?'}</span>`;
}

function avg(arr) {
  const v = arr.filter(x=>x!=null&&x!=='');
  return v.length ? parseFloat((v.reduce((a,b)=>a+parseFloat(b),0)/v.length).toFixed(1)) : null;
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function fmtDate(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('de-CH', {day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d; }
}


let dbAllTricks = [];    // session tricks

let dbAllStandort = [];  // standort tricks

let dbSessionReports = [];







function parsePerfDate(val) {
  if (!val) return '';
  const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const d=m[1].padStart(2,'0'), mo=m[2].padStart(2,'0');
    const y=m[3].length===2?'20'+m[3]:m[3];
    return `${y}-${mo}-${d}`;
  }
  return '';
}






function rcFilter(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.rc-ath-row').forEach(row => {
    row.style.display = (!q || row.dataset.name.includes(q)) ? '' : 'none';
  });
}






let _rebuildInProgress = false;

async function autoRebuildAllReports() {
  if (_rebuildInProgress || !dbSessionReports.length) return;
  _rebuildInProgress = true;
  for (const report of dbSessionReports) {
    await rebuildReportFromTimestamps(report.id, true);
  }
  _rebuildInProgress = false;
}


function arSeasonChange() {
  const v = document.getElementById('ar-season-sel')?.value;
  const dr = document.getElementById('ar-date-range');
  if (dr) dr.style.display = v === 'custom' ? 'flex' : 'none';
}

function trSeasonChange() {
  const v = document.getElementById('tr-season-sel')?.value;
  const dr = document.getElementById('tr-date-range');
  if (dr) dr.style.display = v === 'custom' ? 'flex' : 'none';
}

const SESS_TYPE_SHORT = {'Landing Bag':'Bag','Jump On-Snow':'BA Train','Big Air Training':'BA Train','Big Air Competition':'BA Comp','Slopestyle Training':'SS Train','Slopestyle Competition':'SS Comp','Halfpipe Training':'HP Train','Halfpipe Competition':'HP Comp'};

function populateAthleteReportDropdown() {
  const sel = document.getElementById('ar-athlete-sel');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select athlete —</option>'
    + SESS_ALL_ATHLETES.map(a => `<option value="${a.name}" ${a.name===current?'selected':''}>${a.name}</option>`).join('');
}


function shortName(full) {
  if (!full) return '';
  const parts = full.trim().split(' ');
  if (parts.length === 1) return full;
  return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
}




async function deleteTrick(id) {
  if (!confirm('Delete trick?')) return;
  const { error } = await db.from('tricks').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  showToast('Trick deleted', 'success'); loadDB();
}

async function deleteStandort(id) {
  if (!confirm('Delete assessment entry?')) return;
  const { error } = await db.from('standort').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  showToast('Entry deleted', 'success'); loadDB();
}


// ── Grab-Status-Matrix (Variante B): standort.grab_status = {"Safety":"mastered","Blunt":"goal"} ──
// Solange die Spalte in Supabase fehlt, fällt die App still auf das alte Verhalten zurück.
let _standortHasGrabStatus = true;

function effGrabStatus(entry) {
  if (entry && entry.grab_status && typeof entry.grab_status === 'object') return entry.grab_status;
  if (entry && entry.grab && (entry.status === 'mastered' || entry.status === 'goal')) {
    const out = {};
    entry.grab.split(',').map(g => g.trim()).filter(Boolean).forEach(g => { out[g] = entry.status; });
    return out;
  }
  return {};
}

async function fetchStandortTricks(athlet) {
  if (_standortHasGrabStatus) {
    const {data, error} = await db.from('standort').select('trick_label,disziplin,status,grab,grab_status')
      .eq('athlet', athlet).or('status.eq.mastered,status.eq.goal').order('trick_label');
    if (!error) return data || [];
    if (/grab_status/.test(error.message || '')) _standortHasGrabStatus = false;
    else return [];
  }
  const {data} = await db.from('standort').select('trick_label,disziplin,status,grab')
    .eq('athlet', athlet).or('status.eq.mastered,status.eq.goal').order('trick_label');
  return data || [];
}

async function updateGrabStatus(entryId, gs, localEntry) {
  if (!_standortHasGrabStatus) {
    showToast('grab_status column missing in Supabase — please run the SQL', 'error');
    return false;
  }
  const payload = { grab_status: gs, grab: Object.keys(gs).join(', ') || null };
  const {error} = await db.from('standort').update(payload).eq('id', entryId);
  if (error) {
    if (/grab_status/.test(error.message || '')) {
      _standortHasGrabStatus = false;
      showToast('grab_status column missing in Supabase — please run the SQL', 'error');
    } else showToast('Error: ' + error.message, 'error');
    return false;
  }
  if (localEntry) { localEntry.grab_status = gs; localEntry.grab = payload.grab; }
  return true;
}

function styleAssessGrabBtn(btn, g, st) {
  const base = "border-radius:20px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:inherit;";
  if (st === 'mastered')  { btn.textContent = '✓ ' + g;  btn.style.cssText = base + `background:${UI_GREEN_BG25};border:1px solid ${UI_GREEN};color:${UI_GREEN_TEXT};`; }
  else if (st === 'goal') { btn.textContent = '🎯 ' + g; btn.style.cssText = base + "background:rgba(201,106,31,0.2);border:1px solid #C96A1F;color:#C96A1F;"; }
  else                    { btn.textContent = g;         btn.style.cssText = base + "background:#f4efed;border:1px solid #e7e3e1;color:#5c5c61;"; }
}

function nextGrabState(cur) {
  return cur === undefined ? 'mastered' : cur === 'mastered' ? 'goal' : undefined;
}

function grabChipsHtml(e) {
  if (!e || !e.id || e.disziplin === 'Rail') return '';
  if (e.status !== 'mastered' && e.status !== 'goal') return '';
  const gs = (e.grab_status && typeof e.grab_status === 'object') ? e.grab_status : null;
  if (!gs || !Object.keys(gs).length) return '';
  const chips = Object.entries(gs).map(([g, st]) => {
    const col  = st === 'mastered' ? UI_GREEN_TEXT : '#C96A1F';
    const bg   = st === 'mastered' ? UI_GREEN_BG20 : 'rgba(201,106,31,0.15)';
    const icon = st === 'mastered' ? '✓' : '🎯';
    return `<span onclick="event.stopPropagation();cycleGrabStatus(${e.id},'${g.replace(/'/g,"\\'")}')" title="Tap: ✓ Learned → 🎯 Goal → remove" style="cursor:pointer;font-size:12px;padding:2px 8px;border-radius:10px;background:${bg};border:1px solid ${col};color:${col};white-space:nowrap;">${icon} ${g}</span>`;
  }).join('');
  return `<span style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;align-items:center;">${chips}</span>`;
}

// Was vom Label übrig bleibt, wenn man die aus Feldern ableitbaren Teile + Grabs entfernt
// (z. B. «Frontfoot Bone», «Todeo» — Angaben ohne eigene Spalte, die nur im Label leben)
function labelResidual(label, knownTokens) {
  let s = ' ' + (label || '') + ' ';
  knownTokens.filter(Boolean).forEach(t => {
    const esc = String(t).trim().replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp('\\s' + esc + '(?=\\s)', 'i'), ' ');
  });
  return s.trim().replace(/\s{2,}/g, ' ');
}

function splitTrickGrab(label) {
  const i = (label || '').lastIndexOf(' — ');
  if (i === -1) return { base: (label || '').trim(), grab: '' };
  return { base: label.slice(0, i).trim(), grab: label.slice(i + 3).trim() };
}

function grabSelectHtml(id, grabs, current) {
  const opts = [...grabs];
  if (current && !opts.includes(current)) opts.unshift(current);
  return `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:var(--muted);min-width:36px;">Grab</span>
    <select id="${id}" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:inherit;">
      <option value="">— No Grab —</option>
      ${opts.map(g => `<option value="${g.replace(/"/g,'&quot;')}"${g === current ? ' selected' : ''}>${g}</option>`).join('')}
    </select></div>`;
}

const SESS_ALL_ATHLETES = CFG.athletes;

const SESS_SQUADS = CFG.squads;

let sessSelectedAthletes = [];

let sessAthleteData = {};

let sessLog = [];

let sessType = '';

let sessDate = '';

let sessStartTime = 0;

function sessTodayStr() { return new Date().toISOString().split('T')[0]; }

function sessCurrentDate() { return sessDate || sessTodayStr(); }

function sessDisplayDate() {
  const d = sessDate ? new Date(sessDate + 'T12:00:00') : new Date();
  return d.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

let sessAudioCtx = null;

function sessPlayLogSound(result) {
  try {
    if (!sessAudioCtx) sessAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sessAudioCtx.state === 'suspended') sessAudioCtx.resume();
    const t = sessAudioCtx.currentTime;
    const beep = (freq, start, dur, type, gain) => {
      const o = sessAudioCtx.createOscillator();
      const g = sessAudioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(gain, t + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g); g.connect(sessAudioCtx.destination);
      o.start(t + start); o.stop(t + start + dur + 0.05);
    };
    beep(520, 0, 0.12, 'sine', 0.12);
  } catch(e) {}
}

function onSessDateChange() {
  const inp = document.getElementById('sess-datum');
  if (!inp) return;
  const today = sessTodayStr();
  if (inp.value && inp.value > today) {
    inp.value = today;
    showToast('Session date cannot be in the future', 'error');
  }
  sessDate = (inp.value && inp.value !== today) ? inp.value : '';
  const hint = document.getElementById('sess-datum-hint');
  if (hint) hint.style.display = sessDate ? 'inline' : 'none';
  const label = document.getElementById('sess-date-label');
  if (label) label.textContent = sessDisplayDate();
}




function selectSessType(btn, type) {
  document.querySelectorAll('.sess-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  sessType = type;
}

async function initSessionSetup() {
  if (await restoreSessionState()) return;
  sessDate = '';
  const dInp = document.getElementById('sess-datum');
  if (dInp) { dInp.value = sessTodayStr(); dInp.max = sessTodayStr(); }
  const dHint = document.getElementById('sess-datum-hint');
  if (dHint) dHint.style.display = 'none';
  document.getElementById('sess-date-label').textContent = sessDisplayDate();
  const grid = document.getElementById('sess-athlete-grid');
  grid.innerHTML = SESS_SQUADS.map(sq => {
    const athletes = SESS_ALL_ATHLETES.filter(a => a.squad === sq.key);
    return `<div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sq.color};margin-bottom:8px;">${sq.label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${athletes.map(a => `
          <label style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--surface2);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s;" id="sess-ath-card-${a.name.replace(/\s/g,'_')}">
            <input type="checkbox" value="${a.name}" onchange="toggleSessionAthlete('${a.name}')" style="width:16px;height:16px;accent-color:${sq.color};cursor:pointer;flex-shrink:0;">
            <span style="font-weight:600;font-size:14px;color:var(--text);">${shortName(a.name)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }).join('');
}




function startSession() {
  if (!sessType) { showToast('Please select a session type (Bag / On-Snow / Comp)', 'error'); return; }
  if (sessSelectedAthletes.length === 0) { showToast('Please select at least one athlete', 'error'); return; }
  const isResume = sessStartTime > 0 && sessLog.length > 0;
  sessSelectedAthletes.forEach(name => {
    if (!sessAthleteData[name]) sessAthleteData[name] = {tricks:[],currentTrick:'',stats:{attempts:0,landed:0,perfect:0}};
    sessAthleteData[name].currentTrick = sessAthleteData[name].currentTrick || '';
    if (!isResume) sessAthleteData[name].stats = {attempts:0,landed:0,perfect:0};
  });
  if (!isResume) { sessLog = []; sessStartTime = Date.now(); }
  document.getElementById('sess-setup').style.display = 'none';
  document.getElementById('sess-live').style.display = 'block';
  document.getElementById('sess-live-date').textContent =
    sessDisplayDate()
    + (sessType ? '  ·  ' + sessType : '')
    + (sessDate ? '  ·  ⚠ BACKDATED' : '');
  renderLiveSession();
  saveSessionState();
}










function sessPickTrick(name, trick, btn) {
  sessAthleteData[name].currentTrick = trick;
  const col = document.getElementById('sess-col-' + name.replace(/\s/g,'_'));
  col.querySelectorAll('.sess-trick-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}




let sessEditIdx = -1;




function cancelFsEdit() {
  sessEditIdx = -1;
  renderSessionLog();
}







let _srCondition = 0;

function setSrCondition(val, btn) {
  _srCondition = val;
  document.querySelectorAll('#sr-cond-btns button').forEach(b => {
    const active = b === btn;
    b.style.borderColor = active ? '#148FA0' : '#e7e3e1';
    b.style.color = active ? '#148FA0' : '#5c5c61';
    b.style.background = active ? 'rgba(20,143,160,0.15)' : '#f4efed';
  });
}

async function submitSessionReport(duration) {
  const durVal = parseInt(document.getElementById('sr-duration')?.value, 10);
  if (Number.isFinite(durVal) && durVal > 0) duration = durVal;
  const location = (document.getElementById('sr-location')?.value||'').trim();
  const jumpSize = document.getElementById('sr-jumpsize')?.value || '';
  const comments = (document.getElementById('sr-comments')?.value||'').trim();
  const conditions = _srCondition || null;
  const athleteNotes = {};
  sessSelectedAthletes.forEach(n => {
    const v = (document.getElementById('sr-ath-'+n.replace(/\s/g,'_'))?.value||'').trim();
    if (v) athleteNotes[shortName(n)] = v;
  });
  const contestScores = {};
  sessSelectedAthletes.forEach(n => {
    const sid = n.replace(/\s/g,'_');
    const grab = ids => ids.map(id => parseFloat(document.getElementById(id + sid)?.value)).filter(Number.isFinite);
    const quali = grab(['sr-q1-','sr-q2-']);
    const finals = grab(['sr-f1-','sr-f2-','sr-f3-']);
    const rank = parseInt(document.getElementById('sr-rank-' + sid)?.value, 10);
    if (quali.length || finals.length || Number.isFinite(rank)) contestScores[shortName(n)] = {quali, finals, rank: Number.isFinite(rank) ? rank : null};
  });
  document.getElementById('sess-report-modal')?.remove();
  await saveSessionReport(duration, location, conditions, comments, athleteNotes, jumpSize, contestScores);
}







let sbAthlet = '';

let sbData   = []; // all standort entries for current athlete
let sbSessTricks = []; // all session tricks for current athlete (for direction balance)

function toggleSbForm() {
  const card = document.getElementById('sb-form-card');
  const visible = card.style.display !== 'none';
  card.style.display = visible ? 'none' : 'block';
  if (!visible) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}




function sessionDirLegendHtml(dirCnt, dirs, dirColors, total) {
  return dirs.filter(d=>dirCnt[d].att>0).map(d=>{
    const pct = total ? Math.round(dirCnt[d].att/total*100) : 0;
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <div style="width:12px;height:12px;border-radius:3px;background:${dirColors[d]};flex-shrink:0;"></div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text);">${d} <span style="font-weight:800;color:${dirColors[d]};">${pct}%</span></div>
        <div style="font-size:12px;color:var(--muted);">${dirCnt[d].tricks} trick${dirCnt[d].tricks!==1?'s':''} &middot; ${dirCnt[d].att} att.</div>
      </div>
    </div>`;
  }).join('');
}



// Direction-Balance-Balken der gewählten Athlet:in (Session-Tricks + Mastered-Assessment),
// gerendert unterhalb des Richtungs-Radars auf der Assessment-Seite.
function renderAthleteDirBalance(wrap, dirs, colors, dirOf) {
  let bal = document.getElementById('sb-dir-balance');
  if (!bal) {
    bal = document.createElement('div');
    bal.id = 'sb-dir-balance';
    (wrap.querySelector('.card') || wrap).appendChild(bal);
  }
  const counts = {}; dirs.forEach(d => counts[d] = 0);
  sbSessTricks.forEach(t => { const d = dirOf(t); if (d in counts) counts[d]++; });
  const total = dirs.reduce((s,d) => s + counts[d], 0);
  if (!total) { bal.innerHTML = ''; return; }
  bal.innerHTML = '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">'
    + '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;margin-bottom:10px;">Direction Balance — Session Data Only</div>'
    + dirs.map(dir => {
        const pct = Math.round(counts[dir] / total * 100);
        const col = colors[dir];
        return '<div style="margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
          + '<span style="color:var(--text);">' + dir + '</span>'
          + '<span style="color:' + col + ';font-weight:700;">' + pct + '%</span></div>'
          + '<div style="background:var(--surface2);border-radius:4px;height:7px;overflow:hidden;">'
          + '<div style="background:' + col + ';width:' + pct + '%;height:7px;border-radius:4px;transition:width .4s;"></div>'
          + '</div></div>';
      }).join('')
    + '<div style="font-size:12px;color:var(--muted);margin-top:6px;">Based on logged session attempts only — assessment entries are not included.</div>'
    + '</div>';
}

async function deleteSbEntry(id) {
  if (!confirm('Remove entry?')) return;
  const vp = sbData.find(e => e.id === id)?.video_path;
  const { error } = await db.from('standort').delete().eq('id', id);
  if (error) { showToast('Error', 'error'); return; }
  if (vp) db.storage.from(TRICK_VIDEO_BUCKET).remove([vp]);
  sbData = sbData.filter(e => e.id !== id);
  renderStandort();
  showToast('Removed', 'success');
}

const EV_COLORS = ['#396FA8','#06b6d4','#3E8E5A','#C96A1F','#8E5BB8','#f472b6','#3E8E5A','#fb923c','#60a5fa','#fbbf24'];







function extractRotFromLabel(label) {
  const m = (label||'').match(/\b(180|270|360|450|540|630|720|810|900|1080|1260|1440|1620|1800|1980|2160)\b/);
  return m ? parseInt(m[1]) : 0;
}


















function updateQualityChart() {
  const sel = document.getElementById('ev-trick-filter');
  const cvLine = document.getElementById('cv-line');
  const cvEmpty = document.getElementById('cv-line-empty');
  if (!sel || !window._evTricksWithRating) return;
  const chosen = sel.value;
  if (!chosen) {
    if (cvLine) cvLine.style.display = 'none';
    if (cvEmpty) { cvEmpty.style.display = 'block'; cvEmpty.textContent = 'Please select a trick.'; }
    return;
  }
  const filtered = window._evTricksWithRating.filter(t => window._evTrickLabel(t) === chosen);
  if (!filtered.length) {
    if (cvLine) cvLine.style.display = 'none';
    if (cvEmpty) { cvEmpty.style.display = 'block'; cvEmpty.textContent = 'No data for this trick.'; }
    return;
  }
  // Group by date, average rating
  const byDate = {};
  filtered.forEach(t => {
    if (!byDate[t.datum]) byDate[t.datum] = [];
    byDate[t.datum].push(parseFloat(t.gesamt));
  });
  const dates = Object.keys(byDate).sort();
  const avgs = dates.map(d => parseFloat((byDate[d].reduce((a,b)=>a+b,0)/byDate[d].length).toFixed(1)));
  if (cvLine) cvLine.style.display = 'block';
  if (cvEmpty) cvEmpty.style.display = 'none';
  drawLine('cv-line', dates, avgs);
}

function drawRadarDual(canvasId, labels, vals1, vals2, raw1, raw2, lbl1, lbl2, col1, col2) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 72;
  ctx.clearRect(0,0,W,H);
  const n = labels.length;
  const angles = labels.map((_,i) => (i * 2*Math.PI/n) - Math.PI/2);

  // Grid rings
  [0.25,0.5,0.75,1].forEach(frac => {
    ctx.beginPath();
    angles.forEach((a,i) => { const x=cx+Math.cos(a)*r*frac,y=cy+Math.sin(a)*r*frac; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.closePath(); ctx.strokeStyle='#e7e3e1'; ctx.lineWidth=1; ctx.stroke(); ctx.fillStyle='#ffffff'; ctx.fill();
  });
  angles.forEach(a => { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); ctx.strokeStyle='#e7e3e1'; ctx.lineWidth=1; ctx.stroke(); });

  // Polygon 2
  if(vals2.some(v=>v>0)){ ctx.beginPath(); angles.forEach((a,i)=>{ const x=cx+Math.cos(a)*r*vals2[i],y=cy+Math.sin(a)*r*vals2[i]; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.closePath(); ctx.fillStyle=col2+'33'; ctx.fill(); ctx.strokeStyle=col2; ctx.lineWidth=2; ctx.stroke(); }
  // Polygon 1
  if(vals1.some(v=>v>0)){ ctx.beginPath(); angles.forEach((a,i)=>{ const x=cx+Math.cos(a)*r*vals1[i],y=cy+Math.sin(a)*r*vals1[i]; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.closePath(); ctx.fillStyle=col1+'33'; ctx.fill(); ctx.strokeStyle=col1; ctx.lineWidth=2; ctx.stroke(); }

  angles.forEach((a,i) => {
    if(vals1[i]>0){ const x=cx+Math.cos(a)*r*vals1[i],y=cy+Math.sin(a)*r*vals1[i]; ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle=col1; ctx.fill(); }
    if(vals2[i]>0){ const x=cx+Math.cos(a)*r*vals2[i],y=cy+Math.sin(a)*r*vals2[i]; ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle=col2; ctx.fill(); }
    const lx=cx+Math.cos(a)*(r+36), ly=cy+Math.sin(a)*(r+36);
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign = Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center';
    ctx.textBaseline='middle';
    ctx.fillText(labels[i], lx, ly-10);
    let drawX = lx - 30;
    [[raw1[i],col1,lbl1],[raw2[i],col2,lbl2]].forEach(([v,c,l]) => {
      if(v>0){ ctx.fillStyle=c; ctx.font='bold 11px Bebas Neue,sans-serif'; ctx.textAlign='left'; const t=v+'×'; ctx.fillText(t, drawX, ly+6); drawX+=ctx.measureText(t+' ').width+2; }
    });
  });

  // Legend
  [[lbl1,col1],[lbl2,col2]].forEach(([l,c],i) => {
    ctx.fillStyle=c; ctx.fillRect(10, H-22+i*12, 10, 8);
    ctx.fillStyle='#6b6b70'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='left'; ctx.fillText(l, 24, H-14+i*12);
  });
}

function drawRadarSplit(canvasId, labels, valsT, valsS, rawT, rawS) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 80;
  ctx.clearRect(0,0,W,H);

  const n = labels.length;
  // Rotated 45° so Right=top-right, Left=top-left, Switch Right=bottom-right, Switch Left=bottom-left
  const angles = labels.map((_,i) => (i * 2*Math.PI/n) - Math.PI/4);

  // Grid rings
  [0.25,0.5,0.75,1].forEach(frac => {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*frac, y=cy+Math.sin(a)*r*frac;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle='#e7e3e1'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#ffffff'; ctx.fill();
  });

  // Spokes
  angles.forEach(a => {
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    ctx.strokeStyle='#e7e3e1'; ctx.lineWidth=1; ctx.stroke();
  });

  // Standort polygon (amber)
  if (valsS.some(v=>v>0)) {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*valsS[i], y=cy+Math.sin(a)*r*valsS[i];
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(201,106,31,0.18)'; ctx.fill();
    ctx.strokeStyle='#C96A1F'; ctx.lineWidth=2; ctx.stroke();
  }

  // Training polygon (blue)
  if (valsT.some(v=>v>0)) {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*valsT[i], y=cy+Math.sin(a)*r*valsT[i];
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(59,130,246,0.22)'; ctx.fill();
    ctx.strokeStyle='#396FA8'; ctx.lineWidth=2; ctx.stroke();
  }

  // Dots + labels
  angles.forEach((a,i) => {
    // Training dot
    if(valsT[i]>0){
      const x=cx+Math.cos(a)*r*valsT[i], y=cy+Math.sin(a)*r*valsT[i];
      ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle='#396FA8'; ctx.fill();
    }
    // Standort dot
    if(valsS[i]>0){
      const x=cx+Math.cos(a)*r*valsS[i], y=cy+Math.sin(a)*r*valsS[i];
      ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle='#C96A1F'; ctx.fill();
    }
    // Label
    const lx=cx+Math.cos(a)*(r+30), ly=cy+Math.sin(a)*(r+30);
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign = Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center';
    ctx.textBaseline='middle';
    ctx.fillText(labels[i], lx, ly-10);
    // Counts: blue / amber
    ctx.font='bold 11px Bebas Neue,sans-serif';
    const countStr = (rawT[i]>0?`\u25CF${rawT[i]}`:'') + (rawT[i]>0&&rawS[i]>0?' ':'') + (rawS[i]>0?`\u25CF${rawS[i]}`:'');
    // Draw each part in correct color
    const parts=[];
    if(rawT[i]!=null && rawT[i]!==0) parts.push({text:`●${rawT[i]}%`,color:'#148FA0'});
    if(rawS[i]>0) parts.push({text:`●${rawS[i]}`,color:'#C96A1F'});
    let totalW=0;
    parts.forEach(p=>{ ctx.font='bold 11px Bebas Neue,sans-serif'; totalW+=ctx.measureText(p.text+' ').width; });
    let drawX=lx-totalW/2;
    parts.forEach(p=>{
      ctx.font='bold 11px Bebas Neue,sans-serif';
      ctx.fillStyle=p.color; ctx.textAlign='left';
      ctx.fillText(p.text+' ', drawX, ly+6);
      drawX+=ctx.measureText(p.text+' ').width;
    });
  });
}

function drawBarsSplit(containerId, entries) {
  const el = document.getElementById(containerId);
  if (!el || !entries.length) { if(el) el.innerHTML='<div style="color:var(--muted);font-size:14px;padding:8px;">No data</div>'; return; }
  const max = Math.max(...entries.map(e=>e[1]+e[2]), 1);
  el.innerHTML = entries.map(([label, cT, cS]) => {
    const pctT = Math.round(cT/max*100);
    const pctS = Math.round(cS/max*100);
    const total = cT + cS;
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track" style="position:relative;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctT+pctS}%;display:flex;border-radius:4px;overflow:hidden;">
          ${cT>0?`<div style="width:${total?Math.round(cT/total*100):0}%;background:#396FA8;display:flex;align-items:center;padding-left:6px;"><span class="bar-val">${cT>0?cT+'×':''}</span></div>`:''}
          ${cS>0?`<div style="width:${total?Math.round(cS/total*100):0}%;background:#C96A1F;display:flex;align-items:center;padding-left:${cT>0?2:6}px;"><span class="bar-val">${cS+'×'}</span></div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function drawBarsRating(containerId, entries) {
  const el = document.getElementById(containerId);
  if (!el || !entries.length) { if(el) el.innerHTML='<div style="color:var(--muted);font-size:14px;padding:8px;">No rating data</div>'; return; }
  el.innerHTML = entries.map(([label, avg], i) => {
    const pct = Math.round(avg/10*100);
    const col = avg>=8?'#3E8E5A':avg>=6?'#84cc16':'#C96A1F';
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${col};">
          <span class="bar-val">${avg}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function drawLine(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !labels.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top:20, right:20, bottom:40, left:36 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);

  const maxV = 10, minV = 0;
  const xStep = labels.length > 1 ? cw / (labels.length-1) : cw;

  // Grid lines
  [0,2,4,6,8,10].forEach(v => {
    const y = pad.top + ch - (v-minV)/(maxV-minV)*ch;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cw,y);
    ctx.strokeStyle='#e7e3e1'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#6b6b70'; ctx.font='11px DM Sans,sans-serif';
    ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(v, pad.left-6, y);
  });

  if (values.length === 0) return;

  // Gradient fill
  const grad = ctx.createLinearGradient(0,pad.top,0,pad.top+ch);
  grad.addColorStop(0,'rgba(59,130,246,0.3)');
  grad.addColorStop(1,'rgba(59,130,246,0)');

  const pts = values.map((v,i) => ({
    x: pad.left + (labels.length>1 ? i*xStep : cw/2),
    y: pad.top + ch - (v-minV)/(maxV-minV)*ch
  }));

  ctx.beginPath();
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.top+ch);
  ctx.lineTo(pts[0].x, pad.top+ch);
  ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='#396FA8'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();

  // Dots + values
  pts.forEach((p,i) => {
    ctx.beginPath(); ctx.arc(p.x,p.y,4,0,2*Math.PI);
    ctx.fillStyle='#396FA8'; ctx.fill();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(values[i], p.x, p.y-7);
  });

  // X-axis labels (show max 8 to avoid overlap)
  ctx.fillStyle='#6b6b70'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top';
  const step = Math.ceil(labels.length/8);
  labels.forEach((l,i) => {
    if (i % step !== 0 && i !== labels.length-1) return;
    const x = pad.left + (labels.length>1 ? i*xStep : cw/2);
    const shortLabel = l.slice(5); // MM-DD
    ctx.fillText(shortLabel, x, pad.top+ch+6);
  });
}


function sbeToggle(){
  const v=document.getElementById('sbe-disziplin').value;
  const isK=v==='Jump'||v==='Side Hit'||v==='Halfpipe'||v==='Landing Bag';
  document.querySelectorAll('.sbe-kicker').forEach(el=>el.style.display=isK?'':'none');
  document.querySelectorAll('.sbe-rail').forEach(el=>el.style.display=v==='Rail'?'':'none');
}


function closeSbEdit(){document.getElementById('sb-edit-overlay').style.display='none';}



  if(document.getElementById('sb-datum')) document.getElementById('sb-datum').valueAsDate = new Date();

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function parseDateInput(val) {
  if (!val) return '';
  const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const d=m[1].padStart(2,'0'), mo=m[2].padStart(2,'0');
    const y=m[3].length===2?'20'+m[3]:m[3];
    return `${y}-${mo}-${d}`;
  }
  return '';
}

function sbMonRing(pct, color, size, stroke) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg);">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--border)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, Math.max(0, pct)))).toFixed(1)}" stroke-linecap="round"/>
  </svg>`;
}

function sbRunMaxEl() { return sessType && sessType.startsWith('Halfpipe') ? 10 : 8; }

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'datenbank') loadDB();
  if (id === 'entwicklung') loadEntwicklung();
  if (id === 'erfassen') initSessionSetup();
  if (id === 'monitoring') loadMonitoring();
  if (id === 'sessionreport') loadReportsTab();
  if (typeof updateMobileNav === 'function') updateMobileNav(id);
}

function typMatches(typ, filter) { return !filter || typ === filter || (filter === 'Big Air Training' && typ === 'Jump On-Snow'); }

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function sbAllRailTricks() {
  return [...new Set(SB_RAIL_SUGGESTIONS.concat(SB_RAIL_TRICKS))];
}

function sbAllRailTypes() {
  const fromSelect = [...(document.getElementById('sb-railart')?.options || [])]
    .map(o => o.value).filter(Boolean);
  return [...new Set(fromSelect.concat(SB_CUSTOM_RAIL_TYPES))];
}

function sbCanonRailTrick(txt) {
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const hit = sbAllRailTricks().find(t => norm(t) === norm(txt));
  return hit || txt.replace(/\s+/g, ' ').trim();
}

function sbRunState(name) {
  const d = sessAthleteData[name];
  if (!d.run) d.run = {no: 1, elements: [], ratings: [], addMode: '', railType: sbAllRailTypes()[0] || 'Rail', noteOpen: null};
  return d.run;
}

// ── Monitoring: Zustand, in beiden Sportarten gleich ──────────────────
let sbMonView = {level:'team', athlete:null, trick:null};
let sbMonFrom = '';            // custom range bounds (YYYY-MM-DD)
let sbMonTo = '';
let sbMonRows = null;          // cached attempt rows (tricks table, all pages)
let sbMonTyp = '';             // '' | session type
let sbMonRange = 'season';     // 'season' | 'last' | 'all' | 'custom' | 'y:2023' (eine Saison, hier 2023/24)
let _monAthletes = [];
let _monTricks = [];

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function renderMonitoring() {
  const v = sbMonView;
  if (v.level === 'trick' && v.athlete && v.trick) renderMonTrick();
  else if (v.level === 'athlete' && v.athlete) renderMonAthlete();
  else renderMonTeam();
}

function sbMonApplyCustom() {
  sbMonFrom = document.getElementById('mon-date-from')?.value || '';
  sbMonTo = document.getElementById('mon-date-to')?.value || '';
  renderMonitoring();
}

function sbMonBack() {
  sbMonView = sbMonView.level === 'trick'
    ? {level:'athlete', athlete:sbMonView.athlete, trick:null}
    : {level:'team', athlete:null, trick:null};
  if (sbMonView.level === 'team' && sbMonTyp === SR_TAB) sbMonTyp = '';     // «Comp overview» gibt es nur pro Athlet:in
  renderMonitoring();
}

function sbMonOpenAthlete(i) { sbMonView = {level:'athlete', athlete:_monAthletes[i], trick:null}; renderMonitoring(); window.scrollTo(0,0); }

function sbMonOpenTrick(i) { sbMonView = {level:'trick', athlete:sbMonView.athlete, trick:_monTricks[i] ? _monTricks[i].trick : null}; renderMonitoring(); window.scrollTo(0,0); }

function sbMonRangeBounds() {
  const now = new Date();
  const y = now.getMonth() + 1 >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  if (sbMonRange === 'season') return {from: y + '-05-01', to: ''};
  if (sbMonRange === 'last')   return {from: (y-1) + '-05-01', to: y + '-04-30'};
  if (sbMonRange === 'custom') return {from: sbMonFrom || '', to: sbMonTo || ''};
  if (/^y:\d{4}$/.test(sbMonRange)) { const j = +sbMonRange.slice(2); return {from: j + '-05-01', to: (j + 1) + '-04-30'}; }
  return {from: '', to: ''};
}

function sbMonSetRange(val) { sbMonRange = val; renderMonitoring(); }

function sbMonSetTyp(val) { sbMonTyp = val; renderMonitoring(); }

function sbRunAddJump(name, label) {
  if (!label) return;
  const r = sbRunState(name);
  if (r.elements.length >= sbRunMaxEl()) { showToast('Max ' + sbRunMaxEl() + ' elements per run', 'error'); return; }
  r.elements.push({kind:'jump', label});
  r.ratings.push(null);
  r.addMode = '';
  renderLiveSession();
}

function sbRunNewRailType(name) {
  const v = (window.prompt('New rail type:') || '').replace(/\s+/g, ' ').trim();
  if (!v) return;
  const norm = s => s.toLowerCase();
  const existing = sbAllRailTypes().find(t => norm(t) === norm(v));
  const type = existing || v;
  if (!existing) {
    SB_CUSTOM_RAIL_TYPES.push(type);
    // auch im Assessment-Formular als Auswahl ergänzen
    const sel = document.getElementById('sb-railart');
    if (sel) { const o = document.createElement('option'); o.textContent = type; sel.appendChild(o); }
    const sel2 = document.getElementById('sbe-railart');
    if (sel2) { const o = document.createElement('option'); o.textContent = type; sel2.appendChild(o); }
  }
  sbRunState(name).railType = type;
  renderLiveSession();
}

function sbRunNoteToggle(name, i) {
  const r = sbRunState(name);
  r.noteOpen = (i === null || r.noteOpen === i) ? null : i;
  renderLiveSession();
}

function sbRunRate(name, i, val) {
  const r = sbRunState(name);
  r.ratings[i] = r.ratings[i] === val ? null : val;
  renderLiveSession();
}

function sbRunRemoveEl(name, i) {
  const r = sbRunState(name);
  r.elements.splice(i, 1);
  r.ratings.splice(i, 1);
  renderLiveSession();
}

function sbRunSetRailType(name, t) {
  sbRunState(name).railType = t;
  renderLiveSession();
  const inp = document.getElementById('run-rail-trick-' + name.replace(/\s/g,'_'));
  if (inp) inp.focus();
}

function sbRunToggleAdd(name, mode) {
  const r = sbRunState(name);
  r.addMode = r.addMode === mode ? '' : mode;
  renderLiveSession();
}

function setStatsMode(mode) {
  const trickSel = document.getElementById('ev-trick-sel');
  const dateSel  = document.getElementById('ev-date-sel');
  const btnT = document.getElementById('ev-mode-trick');
  const btnS = document.getElementById('ev-mode-session');
  [btnT,btnS].forEach(b=>{if(b){b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--muted)';}});
  const active = mode==='trick'?btnT:btnS;
  if(active){active.style.background='rgba(20,143,160,0.2)';active.style.borderColor='#148FA0';active.style.color='#148FA0';}
  if(trickSel) trickSel.style.display = mode==='trick' ? '' : 'none';
  if(dateSel)  dateSel.style.display  = mode==='session' ? '' : 'none';
  const fRow = document.getElementById('ev-type-filter');
  if(fRow) fRow.style.display = mode==='session' ? 'none' : 'flex';
  if(mode!=='trick'   && trickSel) trickSel.value='';
  if(mode!=='session' && dateSel)  dateSel.value='';
  renderTrickAnalytics();
}

function sbMonFiltered() {
  let rows = sbMonRows || [];
  const {from, to} = sbMonRangeBounds();
  if (from) rows = rows.filter(t => (t.datum || '') >= from);
  if (to)   rows = rows.filter(t => (t.datum || '') <= to);
  if (sbMonTyp && sbMonTyp !== SR_TAB) rows = rows.filter(t => typMatches(t.typ, sbMonTyp));
  return rows;
}

function sbMonSyncSelects(prefix) {
  const {from, to} = sbMonRangeBounds();
  const seasonSel = document.getElementById(prefix + '-season-sel');
  const typSel = document.getElementById(prefix + '-typ-sel');
  const fromEl = document.getElementById(prefix + '-date-from');
  const toEl = document.getElementById(prefix + '-date-to');
  if (seasonSel) seasonSel.value = sbMonRange === 'season' ? 'current' : sbMonRange === 'all' ? 'all' : 'custom';
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  if (typSel) typSel.value = sbMonTyp;
}

// ── Zustand, in beiden Sportarten gleich ─────────────────────────────
let _monCmtHistOpen = false;
let _monCmts = [];
let _monStatus = null;   // KI-Status aus trick_status (Edge Function), null = keiner
let _sbRVEdit = null;      // {ai, ti, i} während ein Versuch editiert wird
let _sbRV = null; // {report, groups: [[{trick, attempts:[...]}]]}
let _sbRVEditable = false; // Edit nur im Reports-Tab, nicht im Modal nach Session-Ende
let _sbRepFrom = '';
let _sbRepTo = '';
let _sbRepRange = 'all';   // 'season' | 'last' | 'all' | 'custom'
let _sbRepTyp = '';        // '' | 'Landing Bag' | 'Jump On-Snow' | 'Big Air Competition'
let _sbRepList = [];
let _sbRepSelIdx = -1;

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function drawSessionDirRadar(canvasId, dirCnt, dirs, dirColors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const total = dirs.reduce((s,d)=>s+dirCnt[d].att,0) || 1;
  const dpr = window.devicePixelRatio || 1;
  const size = 160;
  canvas.width = size*dpr; canvas.height = size*dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const cx=size/2, cy=size/2, r=size/2-4;
  ctx.clearRect(0,0,size,size);

  let startAngle = -Math.PI/2;
  dirs.forEach(d=>{
    const slice = dirCnt[d].att/total * 2*Math.PI;
    if(slice===0) return;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+slice);
    ctx.closePath();
    ctx.fillStyle=dirColors[d]; ctx.fill();
    startAngle += slice;
  });
  startAngle = -Math.PI/2;
  dirs.forEach(d=>{
    const slice = dirCnt[d].att/total * 2*Math.PI;
    if(slice===0) return;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+slice);
    ctx.closePath();
    ctx.strokeStyle='rgba(11,25,41,0.6)'; ctx.lineWidth=1; ctx.stroke();
    startAngle += slice;
  });
}

function endSession() {
  const rawMin = Math.round((Date.now() - sessStartTime) / 1000 / 60 / 30) * 30;
  const duration = Math.max(30, rawMin);
  let existingModal = document.getElementById('sess-report-modal');
  if (existingModal) existingModal.remove();
  const modal = document.createElement('div');
  modal.id = 'sess-report-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `<div style="background:#ffffff;border:1px solid #e7e3e1;border-radius:16px;padding:28px;max-width:480px;width:100%;max-height:92vh;overflow-y:auto;">
    <div style="font-family:inherit;font-size:20px;font-weight:700;color:#148FA0;margin-bottom:4px;">Session Complete</div>
    <div style="font-size:14px;color:#5c5c61;margin-bottom:20px;">${sessLog.length} attempts logged ·
      <input id="sr-duration" type="number" min="5" step="5" value="${duration}" style="width:70px;background:#f4efed;border:1px solid #e7e3e1;border-radius:6px;color:#2c2c2e;padding:3px 6px;font-family:inherit;font-size:14px;text-align:center;"> min
      <span style="font-size:12px;">(editable)</span></div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;">
        <div>
          <label style="font-size:12px;color:#5c5c61;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Location</label>
          <input id="sr-location" type="text" placeholder="e.g. Laax" style="width:100%;background:#f4efed;border:1px solid #e7e3e1;border-radius:8px;color:#2c2c2e;padding:9px 12px;font-family:inherit;font-size:14px;outline:none;">
        </div>
        <div style="${sessType && (sessType.startsWith('Slopestyle') || sessType.startsWith('Halfpipe')) ? 'display:none;' : ''}">
          <label style="font-size:12px;color:#5c5c61;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Jump Size</label>
          <select id="sr-jumpsize" style="width:100%;background:#f4efed;border:1px solid #e7e3e1;border-radius:8px;color:#2c2c2e;padding:9px 12px;font-family:inherit;font-size:14px;outline:none;">
            <option value="">—</option><option>M</option><option>L</option><option>XL</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#5c5c61;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Conditions</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="sr-cond-btns">
          ${[['1','Poor'],['2','Below Avg'],['3','Average'],['4','Good'],['5','Excellent']].map(([v,l])=>`<button onclick="setSrCondition(${v},this)" data-val="${v}" style="padding:7px 12px;border-radius:8px;border:2px solid #e7e3e1;background:#f4efed;color:#5c5c61;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;">${v} — ${l}</button>`).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#5c5c61;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Comments</label>
        <textarea id="sr-comments" placeholder="Coach notes, observations…" rows="2" style="width:100%;background:#f4efed;border:1px solid #e7e3e1;border-radius:8px;color:#2c2c2e;padding:9px 12px;font-family:inherit;font-size:14px;outline:none;resize:vertical;"></textarea>
      </div>
      <div>
        <label style="font-size:12px;color:#5c5c61;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Athlete Notes</label>
        ${sessSelectedAthletes.map(n => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;color:#148FA0;min-width:70px;">${shortName(n)}</span>
          <input type="text" id="sr-ath-${n.replace(/\s/g,'_')}" placeholder="Short note…" style="flex:1;background:#f4efed;border:1px solid #e7e3e1;border-radius:6px;color:#2c2c2e;padding:7px 10px;font-family:inherit;font-size:12px;outline:none;">
        </div>`).join('')}
      </div>
      ${sessType && sessType.includes('Competition') ? (() => {
        const nFinal = sessType.startsWith('Slopestyle') ? 2 : 3;   // BA/HP: 2 Quali + 3 Final · SS: 2 + 2
        const inp = (id, ph) => `<input type="number" step="0.01" min="0" id="${id}" placeholder="${ph}" style="width:76px;background:#f4efed;border:1px solid #e7e3e1;border-radius:6px;color:#2c2c2e;padding:7px 8px;font-family:inherit;font-size:12px;outline:none;text-align:center;">`;
        return `<div>
        <label style="font-size:12px;color:#C96A1F;font-weight:600;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:6px;">Contest Results <span style="text-transform:none;font-weight:400;">(Final empty if not reached)</span></label>
        ${sessSelectedAthletes.map(n => { const sid = n.replace(/\s/g,'_'); return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="font-size:12px;font-weight:600;color:#148FA0;min-width:70px;">${shortName(n)}</span>
          <span style="font-size:12px;color:#5c5c61;font-weight:600;">QUALI</span>
          ${inp('sr-q1-'+sid,'Run 1')}${inp('sr-q2-'+sid,'Run 2')}
          <span style="font-size:12px;color:#5c5c61;font-weight:600;margin-left:6px;">FINAL</span>
          ${inp('sr-f1-'+sid,'Run 1')}${inp('sr-f2-'+sid,'Run 2')}${nFinal === 3 ? inp('sr-f3-'+sid,'Run 3') : ''}
          <span style="font-size:12px;color:#5c5c61;font-weight:600;margin-left:6px;">RANK</span>
          <input type="number" step="1" min="1" id="sr-rank-${sid}" placeholder="#" style="width:56px;background:#f4efed;border:1px solid #e7e3e1;border-radius:6px;color:#2c2c2e;padding:7px 8px;font-family:inherit;font-size:12px;outline:none;text-align:center;">
        </div>`; }).join('')}
      </div>`; })() : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:20px;">
      <button onclick="submitSessionReport(${duration})" style="flex:1;padding:13px;background:#148FA0;color:#faf7f6;border:none;border-radius:8px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;">Save &amp; Close</button>
      
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function sbMonPeriodLabel() {
  const fmt = d => { if (!d) return '…'; const p = d.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); };
  const typ = sbMonTyp ? ' · ' + (SESS_TYPE_SHORT[sbMonTyp]||sbMonTyp) : '';
  if (sbMonRange === 'season') return 'current season' + typ;
  if (sbMonRange === 'last')   return 'last season' + typ;
  if (sbMonRange === 'custom') return fmt(sbMonFrom) + ' – ' + fmt(sbMonTo) + typ;
  if (/^y:\d{4}$/.test(sbMonRange)) { const j = +sbMonRange.slice(2); return 'season ' + j + '/' + String((j + 1) % 100).padStart(2, '0') + typ; }
  return 'all time' + typ;
}

function sbMonRenderComments() {
  const st = document.getElementById('mon-cmt-status');
  const link = document.getElementById('mon-cmt-hist-link');
  const hist = document.getElementById('mon-cmt-history');
  if (!st) return;
  const fmt = d => { if (!d) return ''; const p = String(d).split('-'); return p.length===3 ? p[2]+'.'+p[1]+'.'+p[0].slice(2) : d; };
  const cur = _monCmts[0];
  const aiTag = document.getElementById('mon-cmt-ai-tag');
  if (_monStatus) {
    st.innerHTML = `${_monStatus.status_text} <span class="gedaempft-11">(${fmt(String(_monStatus.updated_at).slice(0,10))})</span>`;
    if (aiTag) aiTag.style.display = '';
  } else {
    st.innerHTML = cur
      ? `${cur.kommentar} <span class="gedaempft-11">(${fmt(cur.datum)})</span>`
      : '<span class="gedaempft">No comments yet.</span>';
    if (aiTag) aiTag.style.display = 'none';
  }
  if (link) {
    link.style.display = _monCmts.length ? '' : 'none';
    link.textContent = (_monCmtHistOpen ? 'Hide history' : 'History') + ` (${_monCmts.length})`;
  }
  if (hist) {
    hist.style.display = _monCmtHistOpen ? '' : 'none';
    hist.innerHTML = _monCmts.map(c => `<div style="font-size:12px;color:var(--text);padding:6px 0;border-top:1px solid var(--border);">
      <span class="gedaempft-10">${fmt(c.datum)}</span><br>${c.kommentar}</div>`).join('');
  }
}

function sbMonSessions(rows) {
  const by = {};
  rows.forEach(t => { const d = t.datum || '?'; (by[d] = by[d] || []).push(t); });
  return Object.keys(by).sort().map(d => ({date: d, rows: by[d]}));
}

function sbMonTrendHtml(tr) {
  if (!tr) return '';
  if (tr.dir === 'up') return `<span style="color:#3E8E5A;font-weight:600;">↗ rising${tr.diff ? ', +' + Math.round(tr.diff*100) + '%' : ''}</span>`;
  if (tr.dir === 'down') return `<span style="color:#e2001a;font-weight:600;">↘ falling${tr.diff ? ', ' + Math.round(tr.diff*100) + '%' : ''}</span>`;
  return `<span style="color:var(--muted);font-weight:600;">→ stable</span>`;
}

function sbRVEditCancel() {
  const e = _sbRVEdit;
  _sbRVEdit = null;
  if (e) sbRVShowDetail(e.ai, e.ti, e.i);
}

function sbRepApplyCustom() {
  _sbRepFrom = document.getElementById('rep-date-from')?.value || '';
  _sbRepTo = document.getElementById('rep-date-to')?.value || '';
  renderReportsList();
}

function sbRepDeleteCurrent() {
  const report = _sbRV && _sbRV.report;
  if (!report || !report.id) return;
  deleteSessionReport(report.id, true);
}

function sbRepRangeBounds() {
  const now = new Date();
  const y = now.getMonth() + 1 >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  if (_sbRepRange === 'season') return {from: y + '-05-01', to: ''};
  if (_sbRepRange === 'last')   return {from: (y-1) + '-05-01', to: y + '-04-30'};
  if (_sbRepRange === 'custom') return {from: _sbRepFrom || '', to: _sbRepTo || ''};
  return {from: '', to: ''};
}

function sbRepSetRange(v) { _sbRepRange = v; renderReportsList(); }

function sbRepSetTyp(v) { _sbRepTyp = v; renderReportsList(); }

function sbRunAddRailCommit(name) {
  const r = sbRunState(name);
  const inp = document.getElementById('run-rail-trick-' + name.replace(/\s/g,'_'));
  const trick = sbCanonRailTrick(inp?.value || '');
  if (!trick) { showToast('Enter the rail trick', 'error'); return; }
  if (r.elements.length >= sbRunMaxEl()) { showToast('Max ' + sbRunMaxEl() + ' elements per run', 'error'); return; }
  if (!SB_RAIL_TRICKS.includes(trick)) SB_RAIL_TRICKS.push(trick);
  r.elements.push({kind:'rail', label: `Rail ${r.railType} — ${trick}`, railType: r.railType});
  r.ratings.push(null);
  r.addMode = '';
  renderLiveSession();
}

function sbRunCardHtml(name, d, trickOptions) {
  const r = sbRunState(name);
  const sid = name.replace(/\s/g,'_');
  const elRows = r.elements.map((el, i) => {
    const rate = r.ratings[i] || null;
    const btn = (val, icon, col) => `<button onclick="sbRunRate('${name}',${i},'${val}')" style="padding:8px 12px;border-radius:8px;border:2px solid ${rate===val?col:'var(--border)'};background:${rate===val?col+'22':'var(--surface2)'};color:${rate===val?col:'var(--muted)'};font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;">${icon}</button>`;
    const hasNote = (el.tags && el.tags.length) || el.note;
    const noteLine = hasNote ? `<div style="margin:-2px 0 6px 62px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        ${(el.tags||[]).map(t => `<span style="font-size:12px;color:#C96A1F;border:1px solid #f59e0b55;border-radius:999px;padding:2px 8px;">${t}</span>`).join('')}
        ${el.note ? `<span class="hinweis">${el.note}</span>` : ''}
      </div>` : '';
    const notePanel = r.noteOpen === i ? `<div style="margin:0 0 8px 30px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;">
        <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px;">Tags</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
          ${sbAllFailReasons().map(t => { const on = (el.tags||[]).includes(t); return `<button onclick="sbRunTagToggle('${name}',${i},'${t.replace(/'/g,"\\'")}')" style="padding:5px 10px;border-radius:999px;border:1.5px solid ${on?'#C96A1F':'var(--border)'};background:${on?'rgba(201,106,31,0.15)':'none'};color:${on?'#C96A1F':'var(--muted)'};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">${t}</button>`; }).join('')}
        </div>
        <div style="display:flex;gap:8px;">
          <input value="${(el.note||'').replace(/"/g,'&quot;')}" oninput="sbRunNoteInput('${name}',${i},this.value)" placeholder="Comment (optional)" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit;">
          <button onclick="sbRunNoteToggle('${name}',null)" style="padding:8px 14px;border-radius:8px;border:1px solid #148FA0;background:rgba(20,143,160,0.15);color:#148FA0;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">Done</button>
        </div>
      </div>` : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--border);">
      <span style="width:20px;height:20px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--muted);flex-shrink:0;">${i+1}</span>
      <span style="flex-shrink:0;font-size:12px;font-weight:700;letter-spacing:.5px;color:${el.kind==='rail'?'#8E5BB8':'#148FA0'};border:1px solid ${el.kind==='rail'?'#8E5BB8':'#148FA0'};border-radius:4px;padding:2px 5px;">${el.kind==='rail'?'RAIL':(sessType && sessType.startsWith('Halfpipe')?'HIT':'JUMP')}</span>
      <span style="flex:1;font-size:12px;font-weight:600;color:var(--text);line-height:1.3;">${el.label}</span>
      ${btn('failed','✗','#e2001a')}${btn('landed','✓','#3E8E5A')}${btn('stomped','★','#148FA0')}
      <button onclick="sbRunNoteToggle('${name}',${i})" title="Tags / comment" style="background:none;border:1px solid ${hasNote || r.noteOpen === i ?'#C96A1F':'var(--border)'};border-radius:8px;color:${hasNote || r.noteOpen === i ?'#C96A1F':'var(--muted)'};cursor:pointer;font-size:14px;padding:6px 9px;">✎</button>
      <button onclick="sbRunRemoveEl('${name}',${i})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:2px 4px;">✕</button>
    </div>${noteLine}${notePanel}`;
  }).join('');

  let addPanel = '';
  if (r.addMode === 'jump') {
    addPanel = `<div style="margin-top:10px;">
      <select onchange="sbRunAddJump('${name}', this.value)" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #148FA0;background:var(--surface2);color:var(--text);font-size:14px;font-family:inherit;">
        <option value="">— select ${sessType && sessType.startsWith('Halfpipe') ? 'hit' : 'jump'} trick —</option>
        ${trickOptions}
      </select>
    </div>`;
  } else if (r.addMode === 'rail') {
    addPanel = `<div style="margin-top:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;">
      <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px;">Rail type</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        ${sbAllRailTypes().map(t => `<button onclick="sbRunSetRailType('${name}','${t.replace(/'/g,"\\'")}')" style="padding:6px 12px;border-radius:999px;border:1.5px solid ${r.railType===t?'#148FA0':'var(--border)'};background:${r.railType===t?'rgba(20,143,160,0.18)':'none'};color:${r.railType===t?'#148FA0':'var(--muted)'};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">${t}</button>`).join('')}
        <button onclick="sbRunNewRailType('${name}')" style="padding:6px 12px;border-radius:999px;border:1.5px dashed #148FA0;background:none;color:#148FA0;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">+ New</button>
      </div>
      <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px;">Trick (free text, with suggestions)</div>
      <div style="display:flex;gap:8px;">
        <input id="run-rail-trick-${sid}" list="run-rail-suggest" placeholder="e.g. Front 270 on" style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;font-family:inherit;">
        <datalist id="run-rail-suggest">${sbAllRailTricks().map(s => `<option value="${s}">`).join('')}</datalist>
        <button onclick="sbRunAddRailCommit('${name}')" style="padding:9px 16px;border-radius:8px;border:1px solid #148FA0;background:rgba(20,143,160,0.15);color:#148FA0;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Add</button>
      </div>
    </div>`;
  }

  const rated = r.ratings.filter(Boolean).length;
  return `<div class="card" style="padding:24px;" id="sess-col-${sid}">
    <div style="font-size:28px;font-weight:800;color:#148FA0;margin-bottom:4px;text-align:center;">${shortName(name)}</div>
    <div style="text-align:center;margin-bottom:14px;">
      <span style="background:rgba(142,91,184,0.15);border:1px solid #8E5BB8;color:#8E5BB8;border-radius:999px;padding:4px 14px;font-size:12px;font-weight:700;">${sessType && sessType.startsWith('Halfpipe') ? 'HALFPIPE' : 'SLOPESTYLE'} RUN #${r.no}</span>

    </div>
    <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px;">Run setup — ${r.elements.length}/${sbRunMaxEl()} ${sessType && sessType.startsWith('Halfpipe') ? 'hits' : 'elements'}</div>
    ${elRows || '<div style="color:var(--muted);font-size:12px;padding:10px 0;">No elements yet — build the run below.</div>'}
    <div style="display:flex;gap:8px;margin-top:10px;">
      <button onclick="sbRunToggleAdd('${name}','jump')" style="flex:1;padding:11px;border-radius:10px;border:2px ${r.addMode==='jump'?'solid #148FA0':'dashed var(--border)'};background:${r.addMode==='jump'?'rgba(20,143,160,0.12)':'none'};color:${r.addMode==='jump'?'#148FA0':'var(--muted)'};font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">${sessType && sessType.startsWith('Halfpipe') ? '+ Hit' : '+ Jump'}</button>
      ${sessType && sessType.startsWith('Halfpipe') ? '' : `<button onclick="sbRunToggleAdd('${name}','rail')" style="flex:1;padding:11px;border-radius:10px;border:2px ${r.addMode==='rail'?'solid #148FA0':'dashed var(--border)'};background:${r.addMode==='rail'?'rgba(20,143,160,0.12)':'none'};color:${r.addMode==='rail'?'#148FA0':'var(--muted)'};font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">+ Rail</button>`}
    </div>
    ${addPanel}
    <button onclick="sbRunSave('${name}')" ${r.elements.length && rated === r.elements.length ? '' : 'disabled'} style="width:100%;margin-top:14px;padding:14px;border-radius:10px;border:none;background:${r.elements.length && rated === r.elements.length ? '#3E8E5A' : 'var(--surface2)'};color:${r.elements.length && rated === r.elements.length ? '#ffffff' : 'var(--muted)'};font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">Save Run #${r.no} (${rated}/${r.elements.length} rated)</button>
    <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">Each element is saved as one attempt (tagged «Run ${r.no} · position»).${sessType && sessType.startsWith('Halfpipe') ? '' : ` New rail tricks are added to the athlete's Assessment automatically as Goal.`}</div>
  </div>`;
}

function sbRunNoteInput(name, i, val) {
  sbRunState(name).elements[i].note = val;   // ohne Re-Render, damit das Tippen flüssig bleibt
}

function updateSeasonLabels() {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const s = mo >= 5 ? yr : yr - 1;
  const fmt = (a, b) => `${String(a).slice(2)}/${String(b).slice(2)}`;
  const sel = document.getElementById('pf-season');
  if (!sel) return;
  sel.options[0].text = `Current season ${fmt(s, s+1)}`;
  sel.options[1].text = `Last season ${fmt(s-1, s)}`;
}

function sbMonToggleHistory() {
  _monCmtHistOpen = !_monCmtHistOpen;
  sbMonRenderComments();
}

// ═══════════════ VIDEOS IM ASSESSMENT ═══════════════
// Bucket «trick-videos» (privat) + Spalte standort.video_path (SQL: supabase/video_migration_fs_sb.sql).
// Filmen mit der Kamera-App, aus der Mediathek wählen; unter 720p (Aufnahme im Upload-Dialog) wird abgelehnt.
const TRICK_VIDEO_BUCKET = 'trick-videos';
function sbVideoIsLow(file) {
  return new Promise(res => {
    const v = document.createElement('video'), url = URL.createObjectURL(file);
    let fin = false; const done = low => { if (fin) return; fin = true; URL.revokeObjectURL(url); res(low); };
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth > 0 && Math.min(v.videoWidth, v.videoHeight) < 720);
    v.onerror = () => done(false); setTimeout(() => done(false), 5000);
    v.src = url;
  });
}
function sbVideoOverlay(html, closable = true) {
  document.getElementById('sbv-modal')?.remove();
  const m = document.createElement('div');
  m.id = 'sbv-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:6000;background:rgba(0,10,20,.78);display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = `<div style="width:100%;max-width:560px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;color:var(--text);">${html}</div>`;
  if (closable) m.addEventListener('click', ev => { if (ev.target === m) m.remove(); });
  document.body.appendChild(m);
}
function sbVideoProgress(p) {
  if (!document.getElementById('sbv-pct')) sbVideoOverlay(`<div style="font-weight:700;font-size:16px;">Uploading video…</div>
    <div style="height:10px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-top:14px;"><i id="sbv-bar" style="display:block;height:100%;width:0;background:#148FA0;transition:width .2s;"></i></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:14px;color:var(--muted);"><span>Please keep the app open until the upload is finished.</span><b id="sbv-pct">0%</b></div>`, false);
  document.getElementById('sbv-bar').style.width = p + '%';
  document.getElementById('sbv-pct').textContent = p + '%';
}
function sbPickVideo(id) {
  const e = (typeof sbData !== 'undefined' ? sbData : []).find(x => x.id === id);
  if (!e) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*';
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    if (await sbVideoIsLow(file)) { alert('This video was recorded directly in the upload dialog and its quality is too low (below 720p). Please film with the camera app and choose the video from your photo library.'); return; }
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const path = `${(e.athlet || 'athlete').replace(/[^\w-]+/g, '_')}/${e.id}-${Date.now()}.${ext}`;
    sbVideoProgress(0);
    try {
      const { data:{ session } } = await db.auth.getSession();
      if (window.tus && session) {
        await new Promise((resolve, reject) => {
          const up = new tus.Upload(file, {
            endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
            retryDelays: [0, 2000, 5000, 10000, 20000],
            headers: { authorization: `Bearer ${session.access_token}`, 'x-upsert': 'false' },
            uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, chunkSize: 6 * 1024 * 1024,
            metadata: { bucketName: TRICK_VIDEO_BUCKET, objectName: path, contentType: file.type || 'video/mp4', cacheControl: '3600' },
            onError: reject, onProgress: (a, b) => sbVideoProgress(Math.round(a / b * 100)), onSuccess: resolve,
          });
          up.findPreviousUploads().then(prev => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
        });
      } else {
        const { error } = await db.storage.from(TRICK_VIDEO_BUCKET).upload(path, file, { contentType: file.type || 'video/mp4' });
        if (error) throw error;
      }
      const old = e.video_path;
      const { error } = await db.from('standort').update({ video_path: path }).eq('id', id);
      if (error) throw error;
      if (old) db.storage.from(TRICK_VIDEO_BUCKET).remove([old]);
      e.video_path = path;
      sbVideoOverlay(`<div style="font-weight:700;font-size:16px;">✓ Video uploaded</div><div style="margin-top:14px;text-align:right;"><button class="btn btn-primary" onclick="document.getElementById('sbv-modal').remove()">OK</button></div>`);
      renderStandort();
    } catch (err) {
      console.error(err); document.getElementById('sbv-modal')?.remove();
      showToast(/video_path|column/i.test(err.message || '') ? 'Video column missing: please run the video SQL in Supabase' : 'Upload failed: ' + (err.message || err), 'error');
    }
  };
  inp.click();
}
async function sbPlayVideo(id) {
  const e = (typeof sbData !== 'undefined' ? sbData : []).find(x => x.id === id);
  if (!e?.video_path) return;
  const { data, error } = await db.storage.from(TRICK_VIDEO_BUCKET).createSignedUrl(e.video_path, 3600);
  if (error) { showToast('Could not load video: ' + error.message, 'error'); return; }
  sbVideoOverlay(`<div style="font-weight:700;font-size:16px;margin-bottom:10px;">${e.trick_label || ''}</div>
    <video src="${data.signedUrl}" controls playsinline autoplay style="width:100%;max-height:70vh;border-radius:10px;background:#000;"></video>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;"><button class="btn btn-secondary" onclick="document.getElementById('sbv-modal').remove();sbPickVideo(${id})">Replace video</button><button class="btn btn-primary" onclick="document.getElementById('sbv-modal').remove()">Close</button></div>`);
}
function sbVideoBtn(e) {
  const st = 'border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;';
  return e.video_path
    ? `<button onclick="sbPlayVideo(${e.id})" style="${st}background:rgba(62,142,90,.15);border:1px solid #3E8E5A;color:#3E8E5A;">▶ Video</button>`
    : `<button onclick="sbPickVideo(${e.id})" style="${st}background:none;border:1px solid #e7e3e1;color:#5c5c61;">⬆ Video</button>`;
}

// ═══════════════ SEASON REVIEW & WETTKÄMPFE (Monitoring, Athlet:innen-Ebene) ═══════════════
// Gemeinsam für Freeski und Snowboard. Die Saison wählen die Coaches oben im Monitoring (Current season / Last season / …).
// Tabs auf der Athlet:innen-Seite:
//   Bag, BA/SS/HP Train, All: nur das Training (wie bisher).
//   BA/SS/HP Comp: nur die Wettkämpfe aus den FIS-Daten: pro Event Runde, Rang, jeder Sprung oder Run mit vollem Trickname
//                  und Note; dazu Europacup und weitere FIS-Rennen mit Rang. Die Wettkampf-Einträge der App bleiben weg.
//   Comp overview: Übersicht (wie die erste Folie des Athletenfeedbacks), Karriere (alle Saisons), Athletenweg, fehlende
//                  Podiums-Tricks mit «Set as goal», Selektion und Coach-Eingabe, für die gewählte Saison.
// Inhalte aus der Wettkampf-Auswertung (Tabellen season_review und selection_check). Sie kommen per SQL aus der Pipeline
// (skripte_coachdecks/season_review_export.py) und liegen NICHT im Repo, weil das Repo öffentlich ist.
// Coach-Eingaben in season_review_input: Ziel und Plan unter der Saison, für die sie gelten; «was die Daten verpassen» unter der
// ausgewerteten Saison; Powertest unter dem Kaderjahr.
// Trainingsstand je Podiums-Trick live aus den Trainingsdaten; was ein Trick ist und wie er bewertet wird, liefert das Modul:
// srParse(label) und srStats(rows). «Set as goal» schreibt einen Assessment-Eintrag (standort, status 'goal') wie sbSave.
const SR_TAB = 'sr:review';
const SR_DN = {BA:'Big Air', SS:'Slopestyle', HP:'Halfpipe'};
const SR_COMP = {'Big Air Competition':'BA', 'Slopestyle Competition':'SS', 'Halfpipe Competition':'HP'};
const SR_KADER = {NM:'National team', A:'A squad', B:'B squad', C:'C squad', Sichtung:'Rookie squad', 'NM/A':'National team / A squad'};
const SR_SERIE = {Weltcup:'World Cup', WM:'Worlds', Olympia:'Olympics'};
const SR_KAT = {EC:'Europa Cup', ECP:'Europa Cup Premium', NAC:'Nor-Am', ANC:'ANC', WJC:'Junior Worlds'};
const SR_STATUS = {
  met:      {label:'Met',        color:'#3E8E5A'},
  on_track: {label:'On track',   color:'#148FA0'},
  open:     {label:'Open',       color:'#5c5c61'},
  not_met:  {label:'Not met',    color:'#e2001a'},
  coach:    {label:'Coaches decide', color:'#8E5BB8'},
};
const SR_GUT = '#3E8E5A', SR_SCHLECHT = '#e2001a', SR_GRAU = '#C9BFB9';
// Saison wie im Monitoring: ab 1. Mai zählt die neue Saison
function srSaisonVon(y) { return `${y}/${String((y + 1) % 100).padStart(2, '0')}`; }
function srNaechste(s) { return srSaisonVon(+s.slice(0, 4) + 1); }
function srVorher(s) { return srSaisonVon(+s.slice(0, 4) - 1); }
const SR_JETZT = (() => { const d = new Date(); return srSaisonVon(d.getMonth() + 1 >= 5 ? d.getFullYear() : d.getFullYear() - 1); })();

let _srData = null;          // {review: {norm: {saison: inhalt}}, selection: {norm: {kader_saison: inhalt}}, input: {norm: {saison|feld: row}}, fehlt}
let _srLoading = null;
let _srStandort = {};        // Athlet:in → Assessment-Einträge (für den Doppel-Check)
let _srAlle = false;         // alle fehlenden Podiums-Tricks zeigen
let _srCur = null;           // {name, saison, items}

function srEsc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
// gleiche Namensregel wie in der Pipeline: Akzente weg, klein, Wörter sortiert («Tanno Giulia» = «Giulia Tanno»)
function srNorm(s) { return ((s || '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().match(/[a-z]+/g) || []).sort().join(' '); }
function srDatum(d) { if (!d) return '–'; const p = String(d).slice(0, 10).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
function srOrd(n) { if (n == null) return '–'; const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({1:'st', 2:'nd', 3:'rd'})[n % 10] || 'th'; return n + s; }
function srF(x, d = 1) { return x == null ? '–' : (+x).toFixed(d); }
function srPct(x) { return x == null ? '–' : Math.round(x * 100) + '%'; }
function srMonitoringSichtbar() { const r = document.getElementById('mon-root'); return !!(r && r.closest('.page')?.classList.contains('active')); }

async function srLoad() {
  if (_srData) return _srData;
  if (_srLoading) return _srLoading;
  _srLoading = (async () => {
    const alle = async (t, cols) => {     // Supabase liefert höchstens 1000 Zeilen pro Abfrage
      let out = [], von = 0;
      while (true) {
        const {data, error} = await db.from(t).select(cols).range(von, von + 999);
        if (error) return {error};
        out = out.concat(data || []);
        if (!data || data.length < 1000) return {data: out};
        von += 1000;
      }
    };
    const [r, s, i] = await Promise.all([alle('season_review', 'athlet,saison,inhalt'), alle('selection_check', 'athlet,kader_saison,inhalt'), alle('season_review_input', '*')]);
    const d = {review:{}, selection:{}, input:{}, fehlt: !!(r.error || s.error || i.error)};
    if (d.fehlt) console.warn('Season review: tables missing or not readable', r.error || s.error || i.error);
    (r.data || []).forEach(x => { const k = srNorm(x.athlet); (d.review[k] = d.review[k] || {})[x.saison] = x.inhalt; });
    (s.data || []).forEach(x => { const k = srNorm(x.athlet); (d.selection[k] = d.selection[k] || {})[x.kader_saison] = x.inhalt; });
    (i.data || []).forEach(x => { const k = srNorm(x.athlet); (d.input[k] = d.input[k] || {})[x.saison + '|' + x.feld] = x; });
    _srData = d; _srLoading = null;
    return d;
  })();
  return _srLoading;
}

// Daten im Hintergrund laden und danach die Seite neu zeichnen
function srEnsure() {
  if (_srData || _srLoading) return;
  srLoad().then(() => { if (srMonitoringSichtbar() && sbMonView.level !== 'trick') renderMonitoring(); });
}
function srStandortLaden(name) {
  if (!_srData || _srStandort[name]) return;
  _srStandort[name] = 'laden';
  db.from('standort').select('*').eq('athlet', name).then(({data, error}) => {
    _srStandort[name] = error ? [] : (data || []);
    if (srMonitoringSichtbar() && sbMonView.level === 'athlete' && sbMonView.athlete === name && sbMonTyp === SR_TAB) renderMonitoring();
  });
}

function srReviews(name) { return (_srData?.review || {})[srNorm(name)] || {}; }
function srSelections(name) { return (_srData?.selection || {})[srNorm(name)] || {}; }
function srInput(name, saison, feld) { return ((_srData?.input || {})[srNorm(name)] || {})[saison + '|' + feld] || null; }
// «Eingabe da» = Ziel oder Plan für die laufende Saison
function srHatInput(name) { return ['ziel', 'plan'].some(f => (srInput(name, SR_JETZT, f)?.wert || '').trim()); }
function srHatInhalt(name) { return !!(_srData && !_srData.fehlt && (Object.keys(srReviews(name)).length || Object.keys(srSelections(name)).length)); }

// Saisons im gewählten Zeitraum (Current season, Last season, All time, Custom period)
function srSaisonen(name) {
  if (sbMonRange === 'season') return [SR_JETZT];
  if (sbMonRange === 'last') return [srVorher(SR_JETZT)];
  if (/^y:\d{4}$/.test(sbMonRange)) return [srSaisonVon(+sbMonRange.slice(2))];
  const {from, to} = sbMonRangeBounds();
  const s = new Set(Object.keys(srReviews(name)));
  Object.keys(srSelections(name)).forEach(k => s.add(srVorher(k)));
  return [...s].filter(x => (!from || `${+x.slice(0, 4) + 1}-04-30` >= from) && (!to || `${x.slice(0, 4)}-05-01` <= to)).sort().reverse();
}

// ── Team-Ebene: eine Zeile über den Kacheln und ein Hinweis pro Kachel ──
function srTeamLine(names) {
  srEnsure();            // lädt die Daten für die Hinweise auf den Kacheln; die Zeile selbst wird nicht mehr gezeigt (Emilie, 29.10.2026)
  return '';
  if (!_srData || _srData.fehlt) return '';
  const mit = names.filter(srHatInhalt);
  if (!mit.length) return '';
  const fertig = mit.filter(srHatInput).length;
  const col = fertig === mit.length ? '#3E8E5A' : '#C96A1F';
  return `<div class="sr-team"><b>Comp overview</b><span>target and plan ${SR_JETZT} entered for <b style="color:${col};">${fertig} of ${mit.length}</b> athletes · open the athlete, tab «Comp overview»</span></div>`;
}
function srTeamChip(name) {
  if (!srHatInhalt(name) || srHatInput(name)) return '';
  return `<div class="sr-chip-open">Target ${SR_JETZT} open</div>`;
}

// ── Athlet:innen-Ebene ──
// Tab «Comp overview» neben den Typ-Filtern (nur auf der Athlet:innen-Seite); roter Punkt, solange Ziel und Plan fehlen
function srChipHtml() {
  if (sbMonView.level !== 'athlete') return '';
  srEnsure();
  const name = sbMonView.athlete;
  if (!srHatInhalt(name)) return '';
  const on = sbMonTyp === SR_TAB;
  return `<button class="sr-tabchip ${on ? 'on' : ''}" onclick="sbMonSetTyp('${SR_TAB}')">Comp overview${srHatInput(name) ? '' : '<i title="Target and plan missing"></i>'}</button>`;
}

// Inhalt statt der Trainingskarten: Comp overview oder Wettkämpfe; null = normale Trainingsansicht
function srAthleteHtml(name) {
  const comp = SR_COMP[sbMonTyp];
  if (sbMonTyp !== SR_TAB && !comp) return null;
  srEnsure();
  if (!_srData) return '<div class="loading"><span class="spinner"></span></div>';
  if (_srData.fehlt) return sbMonTyp === SR_TAB ? '<div class="leer-schmal">Comp overview not available.</div>' : null;
  _srCur = {name, saison: null, items: []};
  return comp ? srCompHtml(name, comp) : srReviewTabHtml(name);
}
function srSubline(name) {
  const R = Object.values(srReviews(name)).find(r => r.kader) || {};
  const S = srSelections(name)[srNaechste(SR_JETZT)] || {};
  const k = R.kader || S.kader;
  return [k ? SR_KADER[k] || k : null, R.jg ? 'born ' + R.jg : null, sbMonPeriodLabel().split(' · ')[0]].filter(Boolean).join(' · ');
}

// ─── Wettkämpfe (BA / SS / HP Comp) ───
function srStatusTxt(st) { return ({DNS:'did not start', DNI:'did not improve', DNF:'did not finish', DSQ:'disqualified', DQ:'disqualified'})[st] || st || ''; }
function srRundeHtml(dz, rd) {
  const kopf = `<div class="sr-runde-h"><b>${rd.phase.charAt(0).toUpperCase() + rd.phase.slice(1)}</b>${rd.heat ? ` <span class="gedaempft">heat ${srEsc(rd.heat.replace('H', ''))}</span>` : ''}` +
    `${rd.rang ? ` · ${srOrd(rd.rang)}${rd.heat ? ' in the heat' : ''}` : ''}${rd.rang_gesamt && rd.heat ? ` · ${srOrd(rd.rang_gesamt)} overall` : ''}` +
    `${rd.total != null ? ` · <b>${dz === 'BA' ? 'total ' : 'best run '}${srF(rd.total, 2)}</b>` : ''}</div>`;
  const zeilen = rd.laeufe.map(l => {
    const sc = l.score != null ? `<b>${srF(l.score, 2)}</b>` : `<span class="gedaempft">${srEsc(srStatusTxt(l.status))}</span>`;
    if (dz === 'BA') return `<div class="sr-lauf ${l.zaehlt ? 'zaehlt' : ''}"><span class="sr-lauf-n">Jump ${srEsc(l.run)}</span><span>${l.trick ? srEsc(l.trick) : '<span class="gedaempft">trick not coded</span>'}</span><span>${sc}${l.zaehlt ? ' <span class="sr-zaehlt">counts</span>' : ''}</span></div>`;
    const sekt = l.sektionen || [];
    // Sektionen bzw. Hits untereinander: Nummer · Art · Trick · Note
    const teile = dz === 'SS'
      ? (sekt.some(x => x.trick || x.score != null)
          ? sekt.map((x, i) => `<div class="sr-sek-z ${x.typ}"><i>${i + 1}</i><span class="sr-sek-typ">${x.typ === 'jump' ? 'Jump' : x.typ === 'rail' ? 'Rail' : 'Section'}</span><span>${x.trick ? srEsc(x.trick) : '<span class="gedaempft">not coded</span>'}</span><span class="sr-sek-note">${x.score != null ? `<b>${srF(x.score, 2)}</b>${x.max ? `<span class="gedaempft">/${srF(x.max, x.max % 1 ? 1 : 0)}</span>` : ''}` : ''}</span></div>`).join('')
          : '<span class="gedaempft">sections not in the FIS list</span>')
      : (l.hits || []).map((h, i) => `<div class="sr-sek-z hit"><i>${i + 1}</i><span>${srEsc(h)}</span></div>`).join('');
    return `<div class="sr-lauf ${l.best ? 'zaehlt' : ''}"><span class="sr-lauf-n">Run ${srEsc(l.run)}</span><span>${sc}${l.best ? ' <span class="sr-zaehlt">best</span>' : ''}</span><span></span>
      ${teile ? `<div class="sr-teile">${teile}</div>` : (dz === 'HP' && l.score != null ? '<div class="sr-teile gedaempft">hits not coded</div>' : '')}</div>`;
  }).join('');
  return `<div class="sr-runde">${kopf}${zeilen}</div>`;
}
function srEventHtml(dz, ev) {
  const erg = ev.rang ? `<b class="sr-rang">${srOrd(ev.rang)}</b>` : '<b class="sr-rang">–</b>';
  const wie = ev.final ? (ev.final_dns ? 'qualified for the final, did not start' : 'final') : ev.abgesagt ? 'final cancelled, qualification counts' : 'qualification';
  return `<div class="sr-event">
    <div class="sr-event-h"><span>${srDatum(ev.datum).slice(0, 6)}${ev.datum.slice(2, 4)}</span><b>${srEsc(ev.event === 'Olympia' ? 'Olympics' : ev.event)}</b><span class="sr-serie">${SR_SERIE[ev.serie] || srEsc(ev.serie)}</span><span class="sr-event-erg">${erg} <span class="gedaempft">${wie}</span></span></div>
    ${ev.runden.map(rd => srRundeHtml(dz, rd)).join('')}
  </div>`;
}
function srCompHtml(name, dz) {
  const saisonen = srSaisonen(name);
  const teile = saisonen.map(sa => {
    const R = srReviews(name)[sa] || {};
    const evs = ((R.wettkampf || {})[dz] || []);
    const fr = (R.fis_resultate || []).filter(x => x.disz === dz);
    const kopf = `<div class="sr-h">${SR_DN[dz]} ${sa}</div>`;
    const elite = `<div class="sr-sub wc">WC · World Cup, Worlds, Olympics</div>` + (evs.length ? evs.map(ev => srEventHtml(dz, ev)).join('')
      : `<div class="leer-schmal">No World Cup, Worlds or Olympic start in ${SR_DN[dz]} ${sa}${sa === SR_JETZT ? ' yet' : ''}.</div>`);
    // untereinander, in Spalten: Datum · Ort · Stufe · Rang
    const liste = (xs) => `<div class="sr-fr">${xs.map(x =>
      `<div class="sr-fr-z"><span>${srDatum(x.datum).slice(0, 6)}</span><span>${srEsc(x.ort)}</span><span class="gedaempft">${SR_KAT[x.kat] || x.kat}</span><span><b>${x.rang ? srOrd(x.rang) : srEsc(srStatusTxt(x.status))}</b>${x.n ? `<span class="gedaempft"> of ${x.n}</span>` : ''}</span></div>`).join('')}</div>`;
    const ec = fr.filter(x => x.kat === 'EC' || x.kat === 'ECP'), andere = fr.filter(x => x.kat !== 'EC' && x.kat !== 'ECP');
    const weitere = (ec.length ? `<div class="sr-sub ec">EC · Europa Cup (rank only)</div>${liste(ec)}` : '')
      + (andere.length ? `<div class="sr-sub">Other FIS · Junior Worlds, Nor-Am, ANC (rank only)</div>${liste(andere)}` : '');
    return `<div class="sr-sek">${kopf}${elite}${weitere}</div>`;
  }).join('');
  return `<div class="sr-comp">${teile || '<div class="leer-schmal">No season in this period.</div>'}
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">FIS result lists and Results Analysis (World Cup, Worlds, Olympics): rank per round, every ${dz === 'BA' ? 'jump' : 'run'} with the full trick name from the FIS trick code and its score${dz === 'BA' ? '; the two counting jumps are marked' : dz === 'SS' ? '; sections with their score and maximum' : ''}. Older seasons: some lists give only the best score and no trick codes. Europa Cup and other FIS races only with the rank. The competition entries logged in the app are not shown here.</div></details></div>`;
}

// ─── Comp overview: Übersicht ───
function srBalken(lab, wert, ref, max, wtxt, rtxt, grau, gut) {
  const w = wert == null ? 0 : Math.max(2, Math.min(100, wert / max * 100)), r = ref == null ? null : Math.min(100, ref / max * 100);
  const col = grau || wert == null ? 'var(--muted)' : gut ? SR_GUT : SR_SCHLECHT;
  return `<div class="sr-balken"><span>${lab}</span><div class="sr-bahn"><div style="width:${w}%;background:${grau ? SR_GRAU : gut ? SR_GUT : SR_SCHLECHT};"></div>${r != null ? `<i style="left:${r}%;"></i>` : ''}</div>
    <span><b style="color:${col};">${wert == null ? '–' : wtxt}</b> <span class="gedaempft">${rtxt}</span></span></div>`;
}
// Punktebänder des FIS Judges Handbook (wie im Coach-Deck): Sturz 1–30, Durchschnitt 30–65, gut 65–85, exzellent 85–100.
// Athlet:in = alle gewerteten Sprünge/Runs der Saison, Ref. = nächste Stufe in denselben Phasen (Finalist:innen in der Quali, Podest im Final).
const SR_BAND = [['fall', 'Fall', '#F2B8B5', '#5c2a28'], ['mid', 'Average or below', '#C5D5E4', '#2c3e55'], ['good', 'Good', '#8DB4D9', '#fff'], ['excellent', 'Excellent', '#0B2E59', '#fff']];
function srBandBar(s) {
  return `<div class="sr-bandbar">${SR_BAND.map(([k, l, bg, fg]) => { const p = Math.round(100 * (s[k] || 0));
    return p ? `<div style="width:${p}%;background:${bg};color:${fg};" title="${l} ${p}%">${p >= 12 ? p + '%' : ''}</div>` : ''; }).join('')}</div>`;
}
function srBaender(lab, b, r, wenig) {
  if (!b || !b.n) return '';
  const ex = Math.round(100 * b.excellent), rex = r ? Math.round(100 * r.excellent) : null, fa = Math.round(100 * b.fall), rfa = r ? Math.round(100 * r.fall) : null;
  const col = wenig ? 'var(--muted)' : rex == null ? 'var(--text)' : ex >= rex ? SR_GUT : SR_SCHLECHT;
  return `<div class="sr-balken sr-baender"><span>${lab}</span>
    <div><div class="sr-bandrow"><i>Athlete</i>${srBandBar(b)}</div>${r ? `<div class="sr-bandrow"><i>Ref.</i>${srBandBar(r)}</div>` : ''}</div>
    <span><b style="color:${col};">${ex}% excellent</b> <span class="gedaempft">${rex == null ? '' : 'Ref. ' + rex + '%'}</span><br><span class="gedaempft">falls ${fa}%${rfa == null ? '' : ' · Ref. ' + rfa + '%'}</span></span></div>`;
}
// Freeski-Slopestyle: Rails. Note pro Rail-Sektion (0–10) und Merkmale gegen die Podest-Athlet:innen derselben Saison
// (alle ihre Läufe); Farbe nur bei Merkmalen, die im ganzen Feld mit einer anderen Rail-Note einhergehen (wie in den Decks)
function srRailsHtml(r) {
  const wirk = m => { if (m.wirkung == null) return '<span class="gedaempft">–</span>';
    const r = Math.round(m.wirkung * 10) / 10;
    return `<span class="${m.gekoppelt ? '' : 'gedaempft'}">${r > 0 ? '+' : r < 0 ? '−' : ''}${srF(Math.abs(r))}</span>`; };
  // als Raster statt Tabelle: bleibt auch auf dem Handy eine kleine Tabelle (Tabellen ab 3 Spalten werden dort zu Karten)
  const merk = (r.merkmale || []).map(m => `<span>${m.lab}</span>
    <span><b style="color:${m.gekoppelt ? (m.gut ? SR_GUT : SR_SCHLECHT) : 'var(--text)'};">${srPct(m.wert)}</b></span><span>${srPct(m.ref)}</span><span>${wirk(m)}</span>`).join('');
  const beste = (r.beste || []).map(b => `<div class="sr-fr-z"><span>${srEsc(b.trick)}</span><span><b>${srF(b.score, 2)}</b><span class="gedaempft">/${srF(b.max, b.max % 1 ? 1 : 0)}</span></span><span class="gedaempft">${srEsc(b.event)} ${srEsc(b.phase)}</span></div>`).join('');
  return `<div class="sr-rails"><div class="sr-ue-sub">Rails <span class="gedaempft">${r.n} clean rail section${r.n === 1 ? '' : 's'}</span></div>
    ${srBalken('Rail score per section' + (r.wenig ? ` (n = ${r.n})` : ''), r.score, r.ref_score, 10, srF(r.score) + ' of 10', 'Podium athletes ' + srF(r.ref_score), r.wenig, r.gut)}
    ${merk ? `<div class="sr-rail-tab"><span class="k">Rail feature</span><span class="k">Share of rails</span><span class="k">Podium athletes</span><span class="k" title="Rail section score with minus without the feature, whole field (points of 10)">Effect on score</span>${merk}</div>`
      : '<div class="sr-ue-fin">Rail features: the rail codes of this season are in an older notation that is not decoded.</div>'}
    ${beste ? `<div class="sr-ue-sub2">Best rail sections</div><div class="sr-fr sr-rail-beste">${beste}</div>` : ''}
  </div>`;
}
function srUebersichtHtml(U, saison) {
  if (!U) return '';
  const bl = Object.entries(U.disz).map(([k, d]) => `<div class="sr-ue-disz">
    <div class="sr-ue-h"><b>${d.name}</b><span class="gedaempft">${d.n_events} event${d.n_events === 1 ? '' : 's'} ${saison} · next level: ${d.next_level}</span></div>
    <div class="sr-kpis">
      <div><b>${d.finals}</b><span>Finals in ${d.n_events} event${d.n_events === 1 ? '' : 's'}</span></div>
      <div><b style="${d.podeste ? 'color:' + SR_SCHLECHT : ''}">${d.podeste}</b><span>Podium places</span></div>
      <div><b>${srEsc(d.best_rank)}</b><span>${d.best_rank_lab}</span></div>
      <div><b style="${d.score_gut ? 'color:' + SR_GUT : ''}">${d.best_score_txt ?? srF(d.best_score)}</b><span>${d.best_score_lab} · ${d.ref_score == null ? 'no comparable reference' : d.ref_label + ' ' + (d.ref_score_txt ?? srF(d.ref_score))}</span></div>
    </div>
    ${(d.lq == null && d.ref_land == null) || (d.bands && k !== 'SS') ? '' : srBalken(d.land_lab + (d.n_lq < 10 ? ` (n = ${d.n_lq})` : ''), d.lq, d.ref_land, 1, srPct(d.lq), 'Ref. ' + srPct(d.ref_land), d.wenig, d.land_gut)}
    ${d.bands ? srBaender((k === 'BA' ? 'Jump scores' : 'Run scores') + (d.bands.n < 10 ? ` (n = ${d.bands.n})` : ''), d.bands, d.ref_bands, d.bands.n < 5) : ''}
    ${d.rot_run === undefined ? '' : srBalken('Rotation, best clean ' + (k === 'BA' ? 'round' : 'run') + (d.rot_run_rots && d.rot_run_rots.length ? ` (${d.rot_run_rots.join('/')})` : ''), d.rot_run, d.ref_rot, d.rot_max, Math.round(d.rot_run) + '°', `${d.rot_lab} Ø ${d.ref_rot != null ? Math.round(d.ref_rot) + '°' : '–'}`, false, d.rot_run_gut)}
    ${d.hoch == null && d.ref_rot == null ? '' : d.ref_rot_max != null
      ? srBalken('Highest good rotation (one jump)', d.hoch, d.ref_rot_max, d.rot_max, d.hoch + '°', `${d.rot_lab} biggest jump Ø ${Math.round(d.ref_rot_max)}°`, false, d.rot_max_gut)
      : srBalken(k === 'SS' && d.rails ? 'Highest good rotation (jumps)' : 'Highest good rotation', d.hoch, d.ref_rot, d.rot_max, d.hoch + '°', `${d.rot_lab} ${d.ref_rot != null ? Math.round(d.ref_rot) + '°' : '–'}`, false, d.rot_gut)}
    ${d.rails ? srRailsHtml(d.rails) : ''}
    <div class="sr-ue-fin">${srEsc(d.finals_txt)}</div>
  </div>`).join('');
  const conti = U.conti ? `<div class="sr-ue-conti"><b>${srEsc(U.conti.split(': ')[0])}:</b> ${srEsc(U.conti.split(': ').slice(1).join(': '))}</div>` : '';
  const texte = (U.texte || []).map(t => `<div class="sr-ue-th">${srEsc(t.titel)}</div><ul>${t.punkte.map(p => `<li>${srEsc(p)}</li>`).join('')}</ul>`).join('');
  return `<div class="sr-sek" id="sr-a-overview"><div class="sr-h">Overview ${saison}</div>
    <div class="sr-ue"><div>${bl}${conti}</div>${texte ? `<div class="sr-ue-text">${texte}</div>` : ''}</div>
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">World Cup, Worlds, Olympics ${saison}; reference values ${saison} (podium or cut, the same rounds one level up). Jump / run scores: the score bands of the FIS Judges Handbook, fall 1 to 30, average or below 30 to 65, good 65 to 85, excellent 85 to 100; all scored jumps (Big Air) or runs (slopestyle, halfpipe) of the season against the next level in the same rounds. Slopestyle keeps clean runs (no section in the fall range) as its own line, because a run with one fallen section usually still scores above 30. Rotation, best clean run: the average rotation of the jumps (hits) in the athlete's best clean run, Big Air the two counting jumps of the best round with both landed, against the average jump of the podium runs (or of the last qualifiers), so a run against runs. Highest good rotation: the largest single rotation scored 65 or more (slopestyle: section score), against the biggest jump of the podium runs (or last qualifiers), averaged over the places. Green: at or above the reference; grey bar: fewer than 5 values. 2025/26: the same figures and texts as in the athlete feedback; earlier seasons: the key figures only.${Object.values(U.disz).some(d => d.rails) ? ' Rails (Freeski slopestyle): every clean rail section (above the fall range, qualification and final), scaled to 0 to 10; podium athletes = all runs of the athletes with a podium in that season, same gender (the same base as for the athlete). Features decoded from the FIS rail codes. Effect on score = average rail score with minus without the feature, whole field; coloured only where that difference is at least 0.3 (green: share at or above the podium athletes where the feature goes with a higher score). A link, not proof: better riders also choose the harder tricks; how a rail is ridden (lock-in, control, style) is not in the codes. Grey bar: fewer than 10 rail sections.' : ''}</div></details></div>`;
}

// ─── Comp overview: Athletenweg ───
function srWegHtml(W) {
  if (!W) return '';
  const a0 = 13, a1 = Math.max(24, W.jetzt + 1), n = a1 - a0 + 1;
  const LW = 150, PW = 470, RH = 34, T = 26, H = T + RH * W.stufen.length + 8;
  const x = a => LW + (a - a0 + 0.5) / n * PW;
  const farbe = {early: SR_GUT, typical: '#2c2c2e', late: SR_SCHLECHT};
  let svg = '';
  for (let a = a0; a <= a1; a++) svg += `<text x="${x(a)}" y="14" text-anchor="middle" class="sr-w-ax">${a}</text><line x1="${x(a)}" y1="${T - 4}" x2="${x(a)}" y2="${H - 6}" class="sr-w-gr"/>`;
  svg += `<line x1="${x(W.jetzt)}" y1="${T - 8}" x2="${x(W.jetzt)}" y2="${H - 2}" class="sr-w-jetzt"/>`;
  W.stufen.forEach((s, i) => {
    const y = T + i * RH + RH / 2, [m, q1, q3] = s.ref;
    svg += `<text x="0" y="${y + 4}" class="sr-w-lab">${srEsc(s.label)}${s.anteil != null ? `<tspan class="sr-w-ant"> ${s.anteil}%</tspan>` : ''}</text>`;
    svg += `<rect x="${x(q1 - 0.5)}" y="${y - 6}" width="${x(q3 + 0.5) - x(q1 - 0.5)}" height="12" rx="2" class="sr-w-band"/><rect x="${x(m) - 1.5}" y="${y - 9}" width="3" height="18" class="sr-w-med"/>`;
    if (s.alter != null) svg += `<circle cx="${x(s.alter)}" cy="${y}" r="7.5" fill="${farbe[s.lage] || '#2c2c2e'}"/>`;
    else if (s.lage !== 'skipped') svg += `<circle cx="${x(W.jetzt)}" cy="${y}" r="6" class="sr-w-offen"/>`;
  });
  const stand = W.stand.map(t => `<li><b${t.farbe ? ` class="${t.farbe}"` : ''}>${srEsc(t.b)}</b>${srEsc(t.t)}</li>`).join('');
  const sig = W.signale.length ? `<ul>${W.signale.map(s => `<li><b>${srEsc(s.label)}:</b> ${s.p}% later reached an elite podium (n = ${s.n}), <b class="${s.signal === 'high share' ? 'gut' : s.signal === 'low share' ? 'gedaempft' : ''}">${s.signal}</b>.</li>`).join('')}</ul>`
                               : `<div class="hinweis">${srEsc(W.signale_leer)}</div>`;
  return `<div class="sr-sek" id="sr-a-pathway"><div class="sr-h">Pathway <span class="sr-h-sub">age at each stage vs today's podium athletes (${srEsc(W.gruppe)}, n = ${W.ref_n}) · as of ${W.saison}</span></div>
    <div class="sr-weg">
      <div class="sr-weg-bild"><svg viewBox="0 0 ${LW + PW + 10} ${H}" role="img" aria-label="Pathway chart">${svg}</svg>
        <div class="sr-weg-leg"><span><i style="background:${SR_GUT}"></i>earlier than the middle half</span><span><i style="background:#2c2c2e"></i>inside</span><span><i style="background:${SR_SCHLECHT}"></i>later</span><span><i class="offen"></i>not yet (at today's age)</span><span><i class="band"></i>middle half of today's podium athletes, line: median</span></div></div>
      <div class="sr-weg-text"><div class="sr-ue-th">Where ${srEsc(W.vorname)} stands</div><ul>${stand}</ul>
        <div class="sr-ue-th" style="color:var(--text);">What earlier athletes did</div>${sig}
        <div class="hinweis">Shares of earlier athletes with the same result (2016/17 to 2020/21). They describe groups, not this athlete. Stages from the ${srEsc(W.quelle)}.</div></div>
    </div></div>`;
}

// ─── Comp overview: fehlende Podiums-Tricks ───
function srItems(R) { return R && R.fehlend ? R.fehlend.map(it => ({...it, p: srParse(it.fam)})) : []; }

// Trainingsstand eines Podiums-Tricks: derselbe Trick (Richtung inkl. Seite, Flips, Rotation), sonst der nächstgrössere
// gelandete Trick derselben Richtung («bigger»). Gleiche Regel wie in den Coach-Review-Decks (landingbag.py).
// Training immer in der laufenden Saison: das ist der Stand für den Plan.
function srTraining(name, it) {
  const z = it.p; if (!z) return null;
  const hp = it.disz === 'HP', von = `${SR_JETZT.slice(0, 4)}-05-01`;
  const rows = (sbMonRows || []).filter(t => t.athlet === name && (t.datum || '') >= von && !/Competition/.test(t.typ || '')
    && (hp ? t.disziplin === 'Halfpipe' : t.disziplin !== 'Halfpipe' && t.disziplin !== 'Rail'));
  const zf = z.flips || 1;
  const V = rows.map(t => ({t, p: srParse(t.trickaufbau)}))
    .filter(v => v.p && v.p.dir === z.dir && v.p.rot >= z.rot && (v.p.flips == null || v.p.flips >= zf));
  const gleich = V.filter(v => v.p.rot === z.rot && v.p.flips === zf);
  const gleichOf = V.filter(v => v.p.rot === z.rot && v.p.flips == null);
  const groesser = V.filter(v => !gleich.includes(v) && !gleichOf.includes(v));
  const lands = X => X.some(v => srStats([v.t]).landed);
  let wahl = null, W = [];
  if (lands(gleich)) { wahl = 'same'; W = gleich; }
  else if (lands(gleichOf)) { wahl = 'flips n/a'; W = gleichOf; }
  else if (lands(groesser)) {
    const kosten = v => (v.p.rot - z.rot) + 360 * ((v.p.flips || zf) - zf);
    const best = Math.min(...groesser.filter(v => srStats([v.t]).landed).map(kosten));
    wahl = 'bigger'; W = groesser.filter(v => kosten(v) === best);
  } else if (gleich.length || gleichOf.length) { wahl = 'same'; W = gleich.concat(gleichOf); }
  else if (groesser.length) { wahl = 'bigger'; W = groesser; }
  if (!W.length) return {wahl: null};
  const lab = {};
  W.forEach(v => { const l = (v.t.trickaufbau || '').split(' — ')[0]; lab[l] = (lab[l] || 0) + 1; });
  const label = Object.entries(lab).sort((a, b) => b[1] - a[1])[0][0];
  return {wahl, label, ...srStats(W.map(v => v.t))};
}

// Steht der Trick schon im Assessment? Richtung und Rotation gleich, Flips gleich oder bei einem der beiden nicht erfasst.
function srAssessment(name, it) {
  const S = _srStandort[name];
  if (!Array.isArray(S)) return null;
  const z = it.p; if (!z) return null;
  const hp = it.disz === 'HP';
  const treffer = S.filter(e => (hp ? e.disziplin === 'Halfpipe' : e.disziplin !== 'Halfpipe' && e.disziplin !== 'Rail')).filter(e => {
    const p = srParse(e.trick_label); if (!p) return false;
    return p.dir === z.dir && p.rot === z.rot && (p.flips == null || z.flips == null || p.flips === z.flips);
  });
  const st = ['mastered', 'erreicht', 'goal'].find(s => treffer.some(e => e.status === s));
  return st ? {status: st, label: treffer.find(e => e.status === st).trick_label} : {status: null};
}

async function srSetGoal(i) {
  const name = _srCur?.name, it = _srCur?.items[i];
  if (!name || !it || !it.goal) return;
  const btn = document.getElementById('sr-goal-' + i); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  const row = {athlet: name, datum: new Date().toISOString().split('T')[0], disziplin: it.goal.disziplin, drehrichtung: it.goal.drehrichtung,
               flips: it.goal.flips || null, rotation: it.goal.rotation, status: 'goal',
               notiz: `Comp overview ${_srCur.saison}: podium trick ${SR_DN[it.disz]} (${it.pod} podium place${it.pod === 1 ? '' : 's'})`};
  row.trick_label = trickDesc(row);
  const {data, error} = await db.from('standort').insert(row).select();
  if (error) { showToast('Error: ' + error.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Set as goal'; } return; }
  if (Array.isArray(_srStandort[name])) _srStandort[name] = [data[0], ..._srStandort[name]];
  if (Array.isArray(dbAllStandort) && dbAllStandort.length) dbAllStandort = [data[0], ...dbAllStandort];
  if (typeof sbAthlet !== 'undefined' && sbAthlet === name && Array.isArray(sbData)) sbData = [data[0], ...sbData];
  showToast('🎯 Saved as goal in Assessment: ' + row.trick_label, 'success');
  renderMonitoring();
}

function srTrickHtml(name, it, i) {
  const own = it.own;
  const step = it.step.ref === null && !own ? 'nothing in this direction yet'
    : `${srEsc(it.step.text)}${it.own_landed_only ? '*' : ''} from <b>${srEsc(own?.name || '–')}</b>` +
      (own ? ` <span class="gedaempft">· ${own.n_well ? `well scored ${own.n_well}×` : `landed ${own.n_landed}×, never 65+`}${own.last ? ', last ' + srEsc(own.last) : ''}</span>` : '');
  const vers = it.versions.map(v => `${srEsc(v.name)} <span class="gedaempft">${v.n}</span>`).join(' · ') + (it.more ? ` <span class="gedaempft">+${it.more} more</span>` : '');
  const od = it.other_dir ? `<div class="sr-zeile"><span class="sr-lab">Other direction</span><span>${srEsc(it.other_dir.name)} <span class="gedaempft">(${it.other_dir.n_well}× well scored)</span></span></div>` : '';
  const tr = srTraining(name, it);
  let trTxt;
  if (!tr || !tr.wahl) trTxt = `<span class="gedaempft">not in training (${SR_JETZT})</span>`;
  else trTxt = `${tr.wahl === 'bigger' ? '<span class="gedaempft">↑ bigger:</span> ' : ''}<b>${srEsc(tr.label)}</b>${tr.wahl === 'flips n/a' ? ' <span class="gedaempft">(flips not recorded)</span>' : ''} · ${tr.text}` +
    (tr.status ? ` <span style="color:${tr.color};font-weight:700;">${tr.status}</span>` : '');
  const as = srAssessment(name, it);
  let ziel;
  if (!as) ziel = `<span class="gedaempft">…</span>`;
  else if (as.status === 'mastered' || as.status === 'erreicht') ziel = `<span class="sr-state" style="--c:#3E8E5A;" title="${srEsc(as.label)}">✅ Learned in Assessment</span>`;
  else if (as.status === 'goal') ziel = `<span class="sr-state" style="--c:#C96A1F;" title="${srEsc(as.label)}">🎯 Goal in Assessment</span>`;
  else if (it.goal) ziel = `<button class="sr-goal" id="sr-goal-${i}" onclick="srSetGoal(${i})">🎯 Set as goal</button>`;
  else ziel = `<span class="gedaempft" title="The FIS code does not name the side">side not in the code</span>`;
  return `<div class="sr-trick">
    <div class="sr-trick-h">
      <div><b class="sr-trick-n">${srEsc(it.trick)}</b> <span class="sr-disz">${SR_DN[it.disz]}</span> <span class="gedaempft">${it.pod} podium place${it.pod === 1 ? '' : 's'}</span></div>
      <div>${ziel}</div>
    </div>
    <div class="sr-zeile"><span class="sr-lab">Step</span><span>${step}</span></div>
    <div class="sr-zeile"><span class="sr-lab">On the podium</span><span>${vers || '–'}</span></div>
    ${od}
    <div class="sr-zeile"><span class="sr-lab">Training ${SR_JETZT}</span><span>${trTxt}</span></div>
  </div>`;
}

function srAlleToggle() { _srAlle = !_srAlle; renderMonitoring(); }

function srTricksHtml(name, R, saison) {
  if (!R || !R.fehlend) return '';
  const disz = Object.entries(R.disz).map(([k, d]) =>
    `<span><b>${d.name}</b>${d.codes ? ` <b>${d.n_covered} of ${d.n_podium_tricks}</b> podium tricks covered` : ' no trick codes'}</span>`).join('');
  const items = _srCur.items;
  const zeigen = _srAlle ? items : items.filter(it => it.im_deck);
  const liste = zeigen.map(it => srTrickHtml(name, it, items.indexOf(it))).join('');
  const mehr = items.length > zeigen.length || _srAlle
    ? `<button class="sr-mehr" onclick="srAlleToggle()">${_srAlle ? 'Show the five from the coach review' : `Show all ${items.length} missing podium tricks`}</button>` : '';
  return `<div class="sr-sek" id="sr-a-tricks">
    <div class="sr-h">Podium tricks ${saison} not yet in the contest record</div>
    <div class="sr-disz-zeile">${disz}</div>
    ${liste || '<div class="leer-schmal">Every podium trick is covered by an own well-scored contest trick.</div>'}
    ${mehr}
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">${srEsc(R.methode)} Training: same trick (direction, flips, rotation) in the current season ${SR_JETZT}, competition entries left out; ↑ = only a bigger trick of the same direction. Set as goal adds the trick to Assessment (direction, flips, rotation; add axis and grab there).</div></details>
  </div>`;
}

// ─── Comp overview: Coach-Eingaben ───
let _srSpeichern = {};
function srSaveInput(name, saison, feld, el) {
  const wert = (el.value || '').trim();
  const alt = srInput(name, saison, feld);
  if ((alt?.wert || '') === wert) return;
  const key = saison + '|' + feld;
  clearTimeout(_srSpeichern[key]);
  _srSpeichern[key] = setTimeout(async () => {
    const info = document.getElementById(`sr-info-${feld}`);
    if (info) info.textContent = 'Saving…';
    const row = {athlet: name, saison, feld, wert, von: AUTH_USER?.email || null, updated_at: new Date().toISOString()};
    const {error} = await db.from('season_review_input').upsert(row, {onConflict: 'athlet,saison,feld'});
    if (error) { if (info) info.textContent = 'Not saved: ' + error.message; showToast('Not saved: ' + error.message, 'error'); return; }
    const k = srNorm(name);
    (_srData.input[k] = _srData.input[k] || {})[key] = row;
    if (info) info.innerHTML = srInfoText(row);
    if (feld === 'powertest') renderMonitoring();
    else { const c = document.querySelector('.sr-tabchip i'); if (c && srHatInput(name)) c.remove(); }
  }, 300);
}
function srInfoText(r) { return r && r.updated_at ? `Saved ${srDatum(r.updated_at)}${r.von ? ' · ' + srEsc(r.von.split('@')[0]) : ''}` : ''; }
function srFeldHtml(name, saison, feld, lab, ph) {
  const r = srInput(name, saison, feld);
  return `<label class="sr-feld"><span>${lab}</span>
    <textarea rows="3" placeholder="${srEsc(ph)}" oninput="srSaveInput(${srEsc(JSON.stringify(name))}, '${saison}', '${feld}', this)">${srEsc(r?.wert || '')}</textarea>
    <span class="hinweis-winzig" id="sr-info-${feld}">${srInfoText(r)}</span></label>`;
}
// Ziel und Plan gelten für die laufende Saison (in der Vorsaison als Fazit); «was die Daten verpassen» für die ausgewertete Saison
function srInputHtml(name, saison, R) {
  const felder = [];
  if (saison === SR_JETZT || srNaechste(saison) === SR_JETZT) {
    felder.push(srFeldHtml(name, SR_JETZT, 'ziel', `Target ${SR_JETZT}`, 'Results or level for the season, e.g. two World Cup finals in Big Air'));
    felder.push(srFeldHtml(name, SR_JETZT, 'plan', `Plan ${SR_JETZT}`, 'Tricks, events, next stage'));
  }
  if (R && R.fehlend) felder.push(srFeldHtml(name, saison, 'fehlt', `What the ${saison} data miss or get wrong`, 'Injury, training, course, judging …'));
  if (!felder.length) return '';
  const titel = saison === SR_JETZT ? 'Coach input' : `Coach input: conclusions for ${SR_JETZT}`;
  return `<div class="sr-sek" id="sr-a-input"><div class="sr-h">${titel}</div><div class="sr-felder">${felder.join('')}</div>
    ${saison !== SR_JETZT ? `<div class="sr-fuss">Target and plan ${SR_JETZT} are the same entries as under Current season.</div>` : ''}</div>`;
}

// ─── Comp overview: Selektion ───
function srAltHtml(a) {
  const st = SR_STATUS[a.status] || SR_STATUS.open;
  let det = '';
  if (a.belege && a.belege.length) det = a.belege.map(b => srEsc(b.text) + ' ' + srDatum(b.datum).slice(0, 6)).join(' · ');
  else if (a.wertung && a.wertung.length) det = a.wertung.map(w => `${w.disz}: ${w.platz}. (${w.punkte} pts, computed)`).join(' · ');
  else if (a.bestes) det = 'best: ' + srEsc(a.bestes.text);
  else if (a.status === 'open' && a.starts === 0) det = 'no start yet';
  if (a.art === 'coach' && /Annex B/.test(a.text) && _srUrteilKontext) det = srUrteilKurz(_srUrteilKontext.name, _srUrteilKontext.ks);
  if (a.fortschritt && a.status !== 'met') det = a.fortschritt + (det ? ' · ' + det : '');
  return `<div class="sr-alt"><i style="background:${st.color};"></i><span>${srEsc(a.text)}${det ? ` <span class="gedaempft">· ${det}</span>` : ''}</span><b style="color:${st.color};">${st.label}</b></div>`;
}
// Rookie-Kader nur für die DVLP-Gruppe: wer einmal im C-Kader war und nicht reselektioniert wird, fällt aus dem System
function srIstDvlp(name) { return (SESS_ALL_ATHLETES.find(a => a.name === name) || {}).squad === 'DVLP'; }
function srStufenHtml(S, ptWert, name, vergangen) {
  if (!S.stufen) return `<div class="leer-schmal">${srEsc(S.hinweis)}</div>`;
  return S.stufen.filter(s => s.stufe !== 'Rookie' || srIstDvlp(name)).map(s => {
    // Powertest nur noch für die DVLP-Gruppe (Kaderathlet:innen machen ihn nicht mehr)
    const zus = srIstDvlp(name) ? s.zusatz.map(z => ({...z, status: ptWert === null ? 'open' : ptWert >= z.punkte ? 'met' : 'not_met'})) : [];
    const st = SR_STATUS[s.status] || SR_STATUS.open;
    const aktuell = (S.kader || '').split('/').includes(s.stufe) || (S.kader === 'Sichtung' && s.stufe === 'Rookie');
    const offen = ['met', 'on_track'].includes(s.status) || aktuell;
    const zusTxt = zus.length ? `<div class="sr-zus">Also required: ${zus.map(z => `${srEsc(z.text)} <b style="color:${SR_STATUS[z.status].color};">${ptWert === null ? (vergangen ? 'not in the app' : 'not entered') : ptWert + ' points'}</b>`).join(' · ')}</div>` : '';
    return `<details class="sr-stufe" ${offen ? 'open' : ''}>
      <summary><span class="sr-stufe-n">${s.name}</span>${aktuell ? `<span class="sr-jetzt">${vergangen ? 'selected ' + S.kader_saison : 'current squad'}</span>` : ''}<b style="color:${st.color};margin-left:auto;">${st.label}</b></summary>
      <div class="sr-alts"><div class="hinweis-winzig" style="margin-bottom:4px;">One of these:</div>${s.alt.map(srAltHtml).join('')}${zusTxt}</div>
    </details>`;
  }).join('');
}
function srResultateTxt(S, n, beste) {
  const r = S.resultate || [];
  const z_ = z => `${z.rang ? z.rang + '.' : srEsc(z.status)} ${srEsc(z.ort)} ${z.disz} (${z.kat})`;
  const wahl = beste ? r.filter(z => z.rang).sort((a, b) => a.rang - b.rang).slice(0, n) : r.slice(-n);
  return `${r.length} FIS result${r.length === 1 ? '' : 's'} in ${S.saison}` + (wahl.length ? (beste ? ', best: ' : ', latest: ') + wahl.map(z_).join(' · ') : '') + '.';
}
// laufende Saison: Stand gegen die geltenden Richtlinien, mit Powertest (wo er ein Kriterium ist) und Selektionswettkämpfen
function srSelektionHtml(name, S) {
  const pt = srInput(name, S.kader_saison, 'powertest');
  const ptWert = pt && pt.wert !== '' && !isNaN(+pt.wert) ? +pt.wert : null;
  const stand = `results ${srDatum(S.fenster[0]).slice(3)} to ${srDatum(S.fenster[1]).slice(3)} count for the squad ${S.kader_saison} · FIS lists as of ${srDatum(S.stand)}`;
  const kopf = !S.n_rennen_gefahren ? `No FIS event in ${S.saison} yet${S.naechstes_rennen ? `; the season starts ${srDatum(S.naechstes_rennen)}` : ''}.` : srResultateTxt(S, 4);
  const ev = (S.selektionsevents || []).map(e => {
    const r = (S.resultate || []).find(z => z.datum === e.datum && z.disz === e.disz);
    return `<div class="sr-fr-z"><span>${srDatum(e.datum).slice(0, 6)}</span><span>${srEsc(e.ort)} ${e.disz}</span><span class="gedaempft">${SR_KAT[e.kat] || e.kat}</span><span>${r ? `<b>${r.rang ? srOrd(r.rang) : srEsc(srStatusTxt(r.status))}</b>${r.n ? `<span class="gedaempft"> of ${r.n}</span>` : ''}` : e.gefahren ? '<span class="gedaempft">no start</span>' : '<span class="gedaempft">upcoming</span>'}</span></div>`;
  }).join('');
  // Powertest nur für die DVLP-Gruppe; die Kaderathlet:innen machen ihn nicht mehr
  const mitPt = srIstDvlp(name);
  return `<div class="sr-sek" id="sr-a-selection">
    <div class="sr-h">Selection ${S.saison} <span class="sr-h-sub">${stand}</span></div>
    <div class="sr-sel-kopf">${kopf}${S.kader ? ` Current squad: <b>${SR_KADER[S.kader] || srEsc(S.kader)}</b>.` : ''}</div>
    ${(_srUrteilKontext = {name, ks: S.kader_saison}, srStufenHtml(S, ptWert, name))}
    ${srUrteilHtml(name, S.kader_saison)}
    ${mitPt ? `<div class="sr-pt"><label for="sr-pt-in">Powertest (points)</label>
      <input id="sr-pt-in" type="number" min="0" max="100" step="1" value="${ptWert ?? ''}" onchange="srSaveInput(${srEsc(JSON.stringify(name))}, '${S.kader_saison}', 'powertest', this)">
      <span class="hinweis-winzig" id="sr-info-powertest">${srInfoText(pt)}</span></div>` : ''}
    ${ev ? `<div class="sr-ev"><span class="sr-lab">Selection events (Annex A)</span><div class="sr-fr">${ev}</div></div>` : ''}
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">${srEsc(S.quelle)}. Checked from FIS result lists: ranks at Olympics, Worlds, World Cup, Junior Worlds and the selection events (Annex A). Standings are computed from the races with the FIS points table (official FIS standings decide); during the season they show «on track». Read as: World Cup SS / BA counts slopestyle and big air together; «1× top 3 and 1× top 5» means two different results. Coach judgement, PISTE assessment and Technical Check-up are not in the result lists. Powertest only for the DVLP group.</div></details>
    <div class="sr-hinweis">Meeting the criteria is not an automatic selection: the selection committee decides (4.1, 4.2).</div>
  </div>`;
}
// vergangene Saison: Prüfung mit den damals geltenden Richtlinien (wo sie vorliegen) und das Kader, das daraus entstand
function srSelektionVergangenHtml(name, S, saison) {
  const kader = S.kader ? ` Squad ${S.kader_saison}: <b>${SR_KADER[S.kader] || srEsc(S.kader)}</b>.` : '';
  if (!S.stufen) return `<div class="sr-sek" id="sr-a-selection">
    <div class="sr-h">Selection ${saison} <span class="sr-h-sub">results ${saison} counted for the squad ${S.kader_saison}</span></div>
    <div class="sr-sel-kopf">${srResultateTxt(S, 5, true)}${kader}</div>
    <div class="sr-leer">${S.regeln ? srEsc(S.hinweis) : `The selection rules of ${saison} (for the squad ${S.kader_saison}) are not in the app yet, so no check against them.`}</div>
  </div>`;
  const ev = (S.selektionsevents || []).map(e => {
    const r = (S.resultate || []).find(z => z.datum === e.datum && z.disz === e.disz);
    return `<div class="sr-fr-z"><span>${srDatum(e.datum).slice(0, 6)}</span><span>${srEsc(e.ort)} ${e.disz}</span><span class="gedaempft">${SR_KAT[e.kat] || e.kat}</span><span>${r ? `<b>${r.rang ? srOrd(r.rang) : srEsc(srStatusTxt(r.status))}</b>${r.n ? `<span class="gedaempft"> of ${r.n}</span>` : ''}` : '<span class="gedaempft">no start</span>'}</span></div>`;
  }).join('');
  const pt = srInput(name, S.kader_saison, 'powertest');
  const ptWert = pt && pt.wert !== '' && !isNaN(+pt.wert) ? +pt.wert : null;
  _srUrteilKontext = null;                          // Trainerurteil jener Saison ist nicht in der App
  return `<div class="sr-sek" id="sr-a-selection">
    <div class="sr-h">Selection ${saison} <span class="sr-h-sub">results ${srDatum(S.fenster[0]).slice(3)} to ${srDatum(S.fenster[1]).slice(3)} against the rules for the squad ${S.kader_saison}</span></div>
    <div class="sr-sel-kopf">${srResultateTxt(S, 5, true)}${kader}</div>
    ${srStufenHtml(S, ptWert, name, true)}
    ${ev ? `<div class="sr-ev"><span class="sr-lab">Selection events ${saison} (Annex A)</span><div class="sr-fr">${ev}</div></div>` : ''}
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">${srEsc(S.quelle)}. Checked from the FIS result lists of ${saison}: ranks at Olympics, Worlds, World Cup, Junior Worlds and the selection events of that season (Annex A, Europa Cup incl. Premium). Standings (World Cup, Europa Cup, and the overall ranking of the selection events) are computed with the FIS points table over all ranked athletes; the official standings decide. «Squad ${S.kader_saison}» is the squad the committee selected. Coach judgement, PISTE assessment and Technical Check-up of that season are not in the app.</div></details>
    <div class="sr-hinweis">Meeting the criteria is not an automatic selection: the selection committee decides (4.1, 4.2).</div>
  </div>`;
}

// ─── Comp overview: Verlauf über die Saisons (All time / eigener Zeitraum) ───
// Jede Saison gegen ihre eigenen Referenzwerte: nicht zusammengelegt, weil Podestnoten und Rotationen jedes Jahr ändern.
function srTrendHtml(name, saisonen) {
  const revs = srReviews(name), zeilen = [];
  const zelle = (wert, ref, gut, wenig, txt, rtxt) => wert == null ? '<span class="gedaempft">–</span>'
    : `<b style="color:${ref == null ? 'var(--text)' : wenig ? 'var(--muted)' : gut ? SR_GUT : SR_SCHLECHT};">${txt}</b> <span class="gedaempft">${ref == null ? 'no comparable ref.' : rtxt}</span>`;
  Object.keys(revs).filter(sa => revs[sa].uebersicht && (!saisonen || saisonen.includes(sa))).sort().reverse().forEach(sa => {
    Object.entries(revs[sa].uebersicht.disz).forEach(([k, d]) => {
      zeilen.push(`<tr onclick="srOpenSaison('${sa}', '${k}')" title="Open the events"><td>${sa}</td><td>${d.name}</td><td>${d.n_events}</td><td>${d.finals}</td>
        <td><b style="${d.podeste ? 'color:' + SR_SCHLECHT : ''}">${d.podeste}</b></td><td>${srEsc(d.best_rank)}${/quali/.test(d.best_rank_lab) ? ' <span class="gedaempft">quali</span>' : ''}</td>
        <td>${zelle(d.lq, d.ref_land, d.land_gut, d.wenig, srPct(d.lq), 'ref ' + srPct(d.ref_land))}</td>
        <td>${zelle(d.rot_run, d.ref_rot, d.rot_run_gut, false, d.rot_run != null ? Math.round(d.rot_run) + '°' : '–', (d.rot_lab === 'Podium' ? 'podium Ø ' : 'cut Ø ') + (d.ref_rot != null ? Math.round(d.ref_rot) + '°' : ''))}</td>
        <td>${d.ref_rot_max != null ? zelle(d.hoch, d.ref_rot_max, d.rot_max_gut, false, d.hoch + '°', (d.rot_lab === 'Podium' ? 'podium biggest ' : 'cut biggest ') + Math.round(d.ref_rot_max) + '°')
          : zelle(d.hoch, d.ref_rot, d.rot_gut, false, d.hoch + '°', (d.rot_lab === 'Podium' ? 'podium ' : 'cut ') + (d.ref_rot != null ? Math.round(d.ref_rot) + '°' : ''))}</td>
        <td>${zelle(d.best_score, d.ref_score, d.score_gut, false, d.best_score_txt ?? srF(d.best_score), d.ref_label + ' ' + (d.ref_score_txt ?? srF(d.ref_score)))}</td></tr>`);
    });
  });
  if (zeilen.length < 2) return '';
  return `<div class="sr-sek" id="sr-a-trend"><div class="sr-h">Trend <span class="sr-h-sub">World Cup, Worlds, Olympics · each season against its own reference values</span></div>
    <div class="table-wrap"><table class="sr-karriere sr-trend"><thead><tr><th>Season</th><th>Discipline</th><th>Events</th><th>Finals</th><th>Podiums</th><th>Best rank</th><th>Landed / clean</th><th>Best clean run (Ø)</th><th>Highest good rotation</th><th>Best score</th></tr></thead>
    <tbody>${zeilen.join('')}</tbody></table></div>
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">Every season is compared with the reference values of the same season (podium mark or cut, landing rate of the rounds one level up, rotation of the podium or of the cut). Seasons are not pooled, because the podium marks and rotations change from year to year. Green: at or above the reference; red: below; grey: fewer than 5 values. Best clean run (Ø): average rotation of the jumps in the best clean run (Big Air: the two counting jumps of the best round with both landed) against the average podium or cut jump. Highest good rotation: largest single rotation scored 65 or more (trick codes from 2017/18), against the biggest jump of the podium or cut runs where the season data has it, otherwise against the average jump. Big Air: «Best jump» where only one jump was scored.</div></details></div>`;
}

// ─── Comp overview: Karriere (alle Saisons in den Daten) ───
function srOpenSaison(sa, dz) {
  const y = +sa.slice(0, 4);
  sbMonRange = y === +SR_JETZT.slice(0, 4) ? 'season' : y === +SR_JETZT.slice(0, 4) - 1 ? 'last' : 'y:' + y;
  sbMonTyp = Object.keys(SR_COMP).find(k => SR_COMP[k] === dz) || '';
  renderMonitoring(); window.scrollTo(0, 0);
}
// nur die Saisons im gewählten Zeitraum (eine Saison oder All time / eigener Zeitraum); andere Saisons über das Menü oben
function srKarriereHtml(name, saison, saisonen) {
  const revs = srReviews(name), zeilen = [];
  const kurz = {WJC: 'JW', NAC: 'Nor-Am', ANC: 'ANC'};
  const eine = saisonen && saisonen.length === 1;
  Object.keys(revs).filter(sa => !saisonen || saisonen.includes(sa)).sort().reverse().forEach(sa => {
    const R = revs[sa];
    ['BA', 'SS', 'HP'].forEach(dz => {
      const evs = (R.wettkampf || {})[dz] || [], alle = (R.fis_resultate || []).filter(x => x.disz === dz);
      const ec = alle.filter(x => x.kat === 'EC' || x.kat === 'ECP'), andere = alle.filter(x => x.kat !== 'EC' && x.kat !== 'ECP');
      if (!evs.length && !alle.length) return;
      // WC = World Cup inkl. Worlds und Olympics
      const fin = evs.filter(e => e.final || e.abgesagt), pod = fin.filter(e => e.rang && e.rang <= 3).length;
      const bf = Math.min(...fin.map(e => e.rang).filter(Boolean)), bq = Math.min(...evs.filter(e => !e.final && !e.abgesagt).map(e => e.rang).filter(Boolean));
      const wcBest = isFinite(bf) ? srOrd(bf) : isFinite(bq) ? srOrd(bq) + ' <span class="gedaempft">quali</span>' : '–';
      const ecR = ec.map(x => x.rang).filter(Boolean), ecB = ecR.length ? Math.min(...ecR) : null;
      const an = andere.filter(x => x.rang).sort((a, b) => a.rang - b.rang)[0];
      const leer = '<span class="gedaempft">–</span>';
      zeilen.push(`<tr class="${sa === saison && !eine ? 'on' : ''}" onclick="srOpenSaison('${sa}', '${dz}')" title="Open the events">
        <td>${sa}</td><td>${SR_DN[dz]}</td>
        <td class="wc">${evs.length || leer}</td><td class="wc">${evs.length ? fin.length : leer}</td><td class="wc">${evs.length ? `<b style="${pod ? 'color:' + SR_SCHLECHT : ''}">${pod}</b>` : leer}</td><td class="wc">${evs.length ? wcBest : leer}</td>
        <td class="ec">${ec.length || leer}</td><td class="ec">${ec.length ? ecR.filter(r => r <= 3).length : leer}</td><td class="ec">${ecB ? srOrd(ecB) : leer}</td>
        <td class="an">${an ? `${srOrd(an.rang)} <span class="gedaempft">${kurz[an.kat] || an.kat}</span>` : andere.length ? `${andere.length} <span class="gedaempft">start${andere.length === 1 ? '' : 's'}</span>` : leer}</td></tr>`);
    });
  });
  if (!zeilen.length) return '';
  return `<div class="sr-sek" id="sr-a-career"><div class="sr-h">${eine ? 'Results ' + saison : 'Career'} <span class="sr-h-sub">${eine ? 'other seasons: menu at the top (All time for the whole career)' : saisonen ? 'seasons in the chosen period' : 'all seasons in the data'} · click a row to open the events</span></div>
    <div class="sr-karriere-leg"><span class="wc">WC = World Cup, Worlds, Olympics</span><span class="ec">EC = Europa Cup incl. Premium</span><span class="an">Other FIS = Junior Worlds (JW), Nor-Am, ANC</span></div>
    <div class="table-wrap"><table class="sr-karriere"><thead><tr><th>Season</th><th>Discipline</th>
      <th class="wc">WC starts</th><th class="wc">WC finals</th><th class="wc">WC podiums</th><th class="wc">WC best</th>
      <th class="ec">EC starts</th><th class="ec">EC podiums</th><th class="ec">EC best</th><th class="an">Other FIS best</th></tr></thead>
    <tbody>${zeilen.join('')}</tbody></table></div>
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">WC: FIS result lists and Results Analysis (trick codes from 2017/18); best = best final rank, otherwise best qualification rank. EC and other FIS: FIS result lists (Europa Cup, Nor-Am, ANC since 2015/16, Junior Worlds since 2012/13), rank only.</div></details></div>`;
}

// ─── Trainerurteil (Selektionsrichtlinien Anhang B) ───
// Mehraugen-Prinzip: jeder Coach bewertet selbst, dreimal pro Saison (Runde 1–3). Die Richtlinien nennen keine Skala:
// 1–5 mit einem Satz pro Stufe, damit eine 4 bei allen Coaches dasselbe heisst. Gespeichert in season_review_input
// (saison = Kaderjahr, feld = urteil:<Runde>:<Kriterium>:<E-Mail>), keine neue Tabelle nötig.
const SR_URTEIL = [
  {k: 'lernkurve', lab: 'Learning curve', frage: 'How fast does the athlete develop?',
   stufen: ['stagnating or going backwards', 'slower than expected', 'as expected for age and stage', 'faster than expected', 'exceptionally fast']},
  {k: 'technik', lab: 'Technique level', frage: 'Technique (SS/BA or HP) in international comparison',
   stufen: ['national level', 'Europa Cup field', 'Europa Cup podium or World Cup qualification', 'World Cup finals', 'World Cup podium']},
  {k: 'mental', lab: 'Mental skills', frage: 'Motivation, goal orientation and work ethic · will to win · focus · handling pressure and emotions',
   stufen: ['clear weakness', 'below the level needed', 'sufficient', 'a strength', 'outstanding']},
];
let _srRunde = null, _srUrteilKontext = null;
function srIch() { return (AUTH_USER?.email || '').toLowerCase(); }
function srWer(email) { return srEsc((email || '').split('@')[0]); }
// {kriterium: {email: wert}} und {email: kommentar} für eine Runde
function srUrteile(name, ks, runde) {
  const alle = (_srData?.input || {})[srNorm(name)] || {}, out = {}, kom = {};
  Object.values(alle).forEach(r => {
    if (r.saison !== ks || !r.feld.startsWith(`urteil:${runde}:`) || !(r.wert || '').trim()) return;
    const [, , k, ...m] = r.feld.split(':'), email = m.join(':');
    if (k === 'kommentar') kom[email] = r.wert; else (out[k] = out[k] || {})[email] = +r.wert;
  });
  return {werte: out, kommentare: kom};
}
function srRundeStandard(name, ks) { for (const r of [3, 2, 1]) if (Object.keys(srUrteile(name, ks, r).werte).length) return r; return 1; }
function srMittel(o) { const v = Object.values(o || {}); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
// kurze Zeile für die Alternative «Coach judgement» in der Stufenliste
function srUrteilKurz(name, ks) {
  const r = srRundeStandard(name, ks), u = srUrteile(name, ks, r).werte;
  const coaches = new Set(Object.values(u).flatMap(o => Object.keys(o)));
  if (!coaches.size) return 'not rated yet, see below';
  return SR_URTEIL.map(c => `${c.lab.split(' ')[0]} ${srMittel(u[c.k]) != null ? srF(srMittel(u[c.k])) : '–'}`).join(' · ') + ` (Ø of ${coaches.size} coach${coaches.size === 1 ? '' : 'es'}, round ${r})`;
}
function srSetRunde(r) { _srRunde = r; renderMonitoring(); }
async function srSetUrteil(name, ks, runde, k, wert) {
  const feld = `urteil:${runde}:${k}:${srIch()}`, alt = srInput(name, ks, feld);
  const neu = alt && +alt.wert === wert ? '' : String(wert);          // gleiche Stufe nochmals: Bewertung löschen
  const row = {athlet: name, saison: ks, feld, wert: neu, von: AUTH_USER?.email || null, updated_at: new Date().toISOString()};
  const {error} = await db.from('season_review_input').upsert(row, {onConflict: 'athlet,saison,feld'});
  if (error) { showToast('Not saved: ' + error.message, 'error'); return; }
  const n = srNorm(name); (_srData.input[n] = _srData.input[n] || {})[ks + '|' + feld] = row;
  renderMonitoring();
}
function srUrteilHtml(name, ks) {
  if (!srIch()) return '';
  const runde = _srRunde || srRundeStandard(name, ks), {werte, kommentare} = srUrteile(name, ks, runde), ich = srIch();
  const coaches = [...new Set(Object.values(werte).flatMap(o => Object.keys(o)).concat(Object.keys(kommentare)))];
  const zeilen = SR_URTEIL.map(c => {
    const mein = (werte[c.k] || {})[ich], m = srMittel(werte[c.k]), andere = Object.entries(werte[c.k] || {}).filter(([e]) => e !== ich);
    return `<div class="sr-ut-zeile">
      <div class="sr-ut-lab"><b>${c.lab}</b><span>${srEsc(c.frage)}</span></div>
      <div class="sr-ut-wahl">${[1, 2, 3, 4, 5].map(v => `<button class="${mein === v ? 'on' : ''}" title="${v}: ${srEsc(c.stufen[v - 1])}" onclick="srSetUrteil(${srEsc(JSON.stringify(name))}, '${ks}', ${runde}, '${c.k}', ${v})">${v}</button>`).join('')}</div>
      <div class="sr-ut-alle"><span class="sr-ut-text">${mein ? 'You: ' + mein + ' · ' + srEsc(c.stufen[mein - 1]) : '<span class="gedaempft">your rating: click 1 to 5</span>'}</span>${m != null ? `<b>Ø ${srF(m)}</b> <span class="gedaempft">${Object.keys(werte[c.k]).length} coach${Object.keys(werte[c.k]).length === 1 ? '' : 'es'}${andere.length ? ' · ' + andere.map(([e, v]) => `${srWer(e)} ${v}`).join(', ') : ''}</span>` : '<span class="gedaempft">no rating yet</span>'}</div>
    </div>`;
  }).join('');
  const meinKom = srInput(name, ks, `urteil:${runde}:kommentar:${ich}`);
  const kom = Object.entries(kommentare).filter(([e]) => e !== ich).map(([e, t]) => `<div><b>${srWer(e)}:</b> ${srEsc(t)}</div>`).join('');
  return `<div class="sr-urteil">
    <div class="sr-ut-kopf"><b>Coach judgement (Annex B)</b><span class="gedaempft">each coach rates on their own, three times per season</span>
      <span class="sr-ut-runden">${[1, 2, 3].map(r => `<button class="${r === runde ? 'on' : ''}" onclick="srSetRunde(${r})">Round ${r}</button>`).join('')}</span></div>
    ${zeilen}
    <label class="sr-feld" style="margin-top:8px;"><span>Your comment (round ${runde})</span>
      <textarea rows="2" placeholder="What the ratings rest on, e.g. last three sessions, Laax World Cup" oninput="srSaveInput(${srEsc(JSON.stringify(name))}, '${ks}', 'urteil:${runde}:kommentar:${ich}', this)">${srEsc(meinKom?.wert || '')}</textarea>
      <span class="hinweis-winzig" id="sr-info-urteil:${runde}:kommentar:${ich}">${srInfoText(meinKom)}</span></label>
    ${kom ? `<div class="sr-ut-kom">${kom}</div>` : ''}
    <details class="sr-info"><summary>How to read</summary><div class="sr-fuss">Annex B of the selection rules: several coaches rate each athlete (multi-eye principle), three times per season. The rules give no scale; 1 to 5 with one sentence per level keeps the ratings comparable between coaches (hover a number to see its level). Ø = mean of the coaches who rated in this round. Click your rating again to remove it. The selection committee decides; the ratings are its basis, not a threshold.</div></details>
  </div>`;
}

// ─── Comp overview: der ganze Tab für die gewählte Saison ───
function srReviewTabHtml(name) {
  const sl = srSaisonen(name);
  const revs = srReviews(name), sels = srSelections(name);
  // bei «All time» / eigenem Zeitraum: die jüngste ausgewertete Saison (Übersicht, Podiums-Tricks), sonst die jüngste mit Inhalt
  const saison = sbMonRange === 'season' || sbMonRange === 'last' || /^y:/.test(sbMonRange) ? sl[0]
    : sl.find(s => revs[s] && (revs[s].uebersicht || revs[s].fehlend)) || sl.find(s => revs[s] || sels[srNaechste(s)]) || sl[0] || SR_JETZT;
  const R = revs[saison], S = sels[srNaechste(saison)];
  _srCur.saison = saison; _srCur.items = srItems(R);
  srStandortLaden(name);
  // Athletenweg: der jüngste vorhandene Stand
  const wegSaison = Object.keys(revs).filter(s => revs[s].weg && s <= saison).sort().pop() || Object.keys(revs).filter(s => revs[s].weg).sort().pop();
  const W = wegSaison && saison >= srVorher(SR_JETZT) ? revs[wegSaison].weg : null;      // Athletenweg: heutiger Stand, nicht bei alten Saisons
  const mehrere = sbMonRange === 'all' || sbMonRange === 'custom';
  const trend = mehrere ? srTrendHtml(name, sbMonRange === 'custom' ? sl : null) : '';
  const karriereS = mehrere ? (sbMonRange === 'custom' ? sl : null) : [saison];
  const teile = [], nav = [];
  const add = (id, lab, html) => { if (html) { teile.push(html); nav.push(`<a href="#sr-a-${id}" onclick="document.getElementById('sr-a-${id}').scrollIntoView({behavior:'smooth'});return false;">${lab}</a>`); } };
  if (saison === SR_JETZT) {
    add('selection', 'Selection', S ? srSelektionHtml(name, S) : '');
    add('input', 'Coach input', srInputHtml(name, saison, R));
    add('overview', 'Overview', srUebersichtHtml(R && R.uebersicht, saison));
    add('tricks', 'Podium tricks', srTricksHtml(name, R, saison));
    add('trend', 'Trend', trend);
    add('career', mehrere ? 'Career' : 'Results', srKarriereHtml(name, saison, karriereS));
    add('pathway', 'Pathway', srWegHtml(W));
    if (!R || !R.uebersicht) {
      const letzte = Object.keys(revs).filter(s => s < saison && revs[s].uebersicht).sort().pop();
      teile.push(`<div class="sr-sek"><div class="sr-leer">Overview and podium tricks for ${saison} follow once the first World Cup events of the season are analysed.${letzte ? ` Season ${letzte}: <button class="sr-link" onclick="sbMonSetRange('last')">switch to Last season</button>.` : ''}</div></div>`);
    }
  } else {
    add('overview', 'Overview', srUebersichtHtml(R && R.uebersicht, saison));
    add('trend', 'Trend', trend);
    add('career', mehrere ? 'Career' : 'Results', srKarriereHtml(name, saison, karriereS));
    add('pathway', 'Pathway', srWegHtml(W));
    add('tricks', 'Podium tricks', srTricksHtml(name, R, saison));
    add('selection', 'Selection', S ? srSelektionVergangenHtml(name, S, saison) : '');
    add('input', 'Coach input', srInputHtml(name, saison, R));
  }
  if (!teile.length) return `<div class="leer-schmal">No data for ${saison}.</div>`;
  return `<div class="sr-review"><div class="sr-nav"><b>Season ${saison}</b>${nav.join('')}</div>${teile.join('')}</div>`;
}

// Zeitraum-Menü im Monitoring: alle Saisons von der laufenden bis 2012/13 (älteste in den Wettkampfdaten), dann All time und Custom period
const SR_ERSTE_SAISON = 2012;
function srSaisonOptionen() {
  const opt = (v, l) => `<option value="${v}" ${sbMonRange === v ? 'selected' : ''}>${l}</option>`;
  const j = +SR_JETZT.slice(0, 4), out = [];
  for (let y = j; y >= SR_ERSTE_SAISON; y--) {
    if (y === j) out.push(opt('season', `${srSaisonVon(y)} · current season`));
    else if (y === j - 1) out.push(opt('last', `${srSaisonVon(y)} · last season`));
    else out.push(opt('y:' + y, srSaisonVon(y)));
  }
  return out.join('') + opt('all', 'All time') + opt('custom', 'Custom period…');
}
