// Mobile Navigationsleiste. Laeuft nach dem Boot.

// Als App vom Home-Bildschirm kein Zoomen: weder beim Antippen von Eingabefeldern noch mit zwei Fingern oder Doppeltippen
// (Wunsch Emilie 14.11.2026). Im normalen Browser bleibt Zoomen erlaubt.
(function keinZoomAlsApp() {
  const alsApp = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (!alsApp) return;
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  document.documentElement.classList.add('als-app');
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), {passive: false}));
})();
function updateMobileNav(pageId) {
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const idx = {'standort':0,'erfassen':1,'entwicklung':2,'datenbank':3,'monitoring':4,'sessionreport':5,'runcheck':6,'accounts':7};
  const btns = document.querySelectorAll('.mobile-nav-btn');
  if (btns[idx[pageId]] !== undefined) btns[idx[pageId]].classList.add('active');
}
// Runs at the end of bootSport (after auth) — window functions are installed by then
function bootOpenInitialPage() {
  if(localStorage.getItem(CFG.sessionKey)){
    const sessBtn=Array.from(document.querySelectorAll('.nav-tab')).find(t=>t.textContent.trim()==='Session');
    if(sessBtn) sessBtn.click();
  }
  updateMobileNav(localStorage.getItem(CFG.sessionKey)?'erfassen':'standort');
}
