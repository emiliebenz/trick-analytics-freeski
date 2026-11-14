// Reiter «Accounts»: Logins der Athlet:innen fuer die ganze App (nur fuer Admins aus der Tabelle app_admins).
// Mit ihrem Login sehen Athlet:innen ihr eigenes Assessment und den Run-Check (siehe applyAthleteMode in kern.js).
// Anlegen, Startpasswort zuruecksetzen und Entfernen laufen ueber die Edge Function athlete-accounts (Service Role);
// Startpasswoerter werden nirgends gespeichert und nur einmal angezeigt.
(function(){
"use strict";
// Unveraenderte Kopie, bevor der Gruppen-Filter CFG.athletes und CFG.squads beim Boot kuerzt
const ATHLETES = (CFG.athletes || []).map(a => ({name: a.name, squad: a.squad}));
const SQUADS = (CFG.squads || []).map(s => ({key: s.key, label: s.label}));
const A = {list: null, sel: {}, out: [], busy: false, arm: null, err: ''};
let root = null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const loginUrl = () => location.origin + location.pathname;

async function load() {
  const {data, error} = await db.from('athlete_accounts').select('athlet,username,must_change_pw');
  if (error) { A.err = 'Could not load accounts: ' + error.message; A.list = A.list || {}; return; }
  A.list = {};
  data.forEach(r => { A.list[r.athlet] = r; });
}

async function call(body) {
  A.busy = true; A.err = ''; render();
  let out = null;
  try {
    const {data, error} = await db.functions.invoke('athlete-accounts', {body});
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    out = data;
  } catch (e) { A.err = 'Action failed: ' + (e.message || e); }
  await load();
  A.busy = false; render();
  return out;
}

function credText() {
  return A.out.map(c => `${c.athlet}\n  Username: ${c.username}\n  Start password: ${c.password}`).join('\n\n') + `\n\nLogin: ${loginUrl()}`;
}

function rowHtml(name) {
  const a = A.list[name], dis = A.busy ? ' disabled' : '';
  if (!a) return `<label class="acc-row"><input type="checkbox" data-act="sel" data-n="${esc(name)}"${A.sel[name] ? ' checked' : ''}${dis}>
      <span class="acc-name">${esc(name)}</span><span class="acc-chip">No login</span></label>`;
  return `<div class="acc-row"><span class="acc-name">${esc(name)}</span>
      <span class="acc-chip ${a.must_change_pw ? 'open' : 'ok'}">${esc(a.username)} · ${a.must_change_pw ? 'start password not changed yet' : 'active'}</span>
      <button class="btn-secondary acc-sm" data-act="reset" data-n="${esc(name)}"${dis}>New start password</button>
      <button class="btn-secondary acc-sm acc-danger" data-act="rm" data-n="${esc(name)}"${dis}>${A.arm === name ? 'Really remove? Run-Check runs are deleted too' : 'Remove login'}</button></div>`;
}

function render() {
  if (!root) return;
  let h = `<div class="acc-head"><div class="acc-title">Athlete logins</div>
    <div class="hinweis">Logins for the whole app. Athletes sign in with their username and start password and then only see their own Assessment and the Run-Check. On first login they choose their own password. Start passwords are shown only once: copy the list right after creating.</div></div>`;
  if (A.out.length) h += `<div class="card acc-creds"><div class="card-title">New logins · visible only now</div>
    <pre class="acc-pre" id="acc-pre">${esc(credText())}</pre>
    <div class="acc-btns"><button class="btn-secondary acc-sm acc-strong" data-act="copy">Copy list</button><button class="btn-secondary acc-sm" data-act="hide">Hide</button></div></div>`;
  if (A.err) h += `<div class="card acc-err">${esc(A.err)}</div>`;
  if (!A.list) { root.innerHTML = h + '<div class="loading"><span class="spinner"></span></div>'; return; }
  const nSel = Object.keys(A.sel).filter(k => A.sel[k] && !A.list[k]).length;
  h += `<div class="acc-btns acc-top"><button class="btn-secondary acc-sm acc-strong" data-act="create"${nSel && !A.busy ? '' : ' disabled'}>${A.busy ? 'Please wait …' : nSel ? `Create ${nSel} login${nSel === 1 ? '' : 's'}` : 'Create logins'}</button>
    <button class="btn-secondary acc-sm" data-act="all"${A.busy ? ' disabled' : ''}>Select all without login</button></div>`;
  const groups = SQUADS.map(s => ({label: s.label, names: ATHLETES.filter(a => a.squad === s.key).map(a => a.name)}));
  const rest = ATHLETES.filter(a => !SQUADS.some(s => s.key === a.squad)).map(a => a.name);
  if (rest.length) groups.push({label: 'Other', names: rest});
  h += groups.filter(g => g.names.length).map(g => `<div class="card"><div class="card-title">${esc(g.label)}</div>${g.names.map(rowHtml).join('')}</div>`).join('');
  root.innerHTML = h;
}

async function onClick(e) {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const act = t.dataset.act, n = t.dataset.n;
  if (act !== 'rm') A.arm = null;
  if (act === 'sel') { A.sel[n] = t.checked; render(); return; }
  if (act === 'all') { ATHLETES.forEach(x => { if (!A.list[x.name]) A.sel[x.name] = true; }); render(); return; }
  if (act === 'hide') { A.out = []; render(); return; }
  if (act === 'copy') {
    navigator.clipboard.writeText(credText()).then(() => showToast('Logins copied', 'success'), () => {
      const pre = document.getElementById('acc-pre'), r = document.createRange();
      r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      showToast('Copying not allowed here: the list is selected, copy it manually', 'error');
    });
    return;
  }
  if (act === 'create') {
    const names = Object.keys(A.sel).filter(k => A.sel[k] && !A.list[k]);
    if (!names.length) return;
    const d = await call({action: 'create', athletes: names});
    if (!d) return;
    A.sel = {}; A.out = A.out.concat(d.created || []);
    if (d.failed && d.failed.length) A.err = 'Not created: ' + d.failed.map(f => `${f.athlet} (${f.error})`).join(', ');
    render(); return;
  }
  if (act === 'reset') {
    const d = await call({action: 'reset', athlet: n});
    if (d) { A.out = A.out.filter(c => c.athlet !== d.athlet).concat([d]); render(); }
    return;
  }
  if (act === 'rm') {
    if (A.arm !== n) { A.arm = n; render(); return; }
    A.arm = null;
    const d = await call({action: 'remove', athlet: n});
    if (d) showToast(`Login of ${n} removed`, 'success');
  }
}

// Beim Boot (boot.js): Reiter nur fuer Admins einblenden
function accountsBoot() {
  if (!IS_ADMIN) return;
  root = document.getElementById('acc-root'); if (!root) return;
  root.addEventListener('click', onClick);
  ['nav-tab-accounts', 'mobile-nav-accounts'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
}
// Bei jedem Oeffnen des Reiters (showPage)
async function loadAccountsPage() {
  if (!root) return;
  render(); await load(); render();
}
window.accountsBoot = accountsBoot;
window.loadAccountsPage = loadAccountsPage;
})();
