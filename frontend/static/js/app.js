/* ===================================================================
   CarbonLens dashboard — Cool Farm Tool structure, Pakistan edition
   =================================================================== */
'use strict';
const D = window.DATA;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const num = v => { const n = parseFloat(v); return isNaN(n)?0:n; };
const fmt0 = n => Math.round(n).toLocaleString();
const fmt2 = n => (Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
let uid = 1; const nid = () => 'r'+(uid++);

const SRC_COLORS = {fert:'#e0a33b',irrig:'#3b8fd6',land:'#22a85b',resid:'#a8643a',mach:'#7d63c9',pest:'#169c99'};
const SRC_ICONS = {
  fert:'<path pathLength="1" d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /> <path pathLength="1" d="M12 22V12" /> <path pathLength="1" d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" /> <path pathLength="1" d="m7.5 4.27 9 5.15" />',
  irrig:'<path pathLength="1" d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />',
  land:'<path pathLength="1" d="m10 11 11 .9a1 1 0 0 1 .8 1.1l-.665 4.158a1 1 0 0 1-.988.842H20" /> <path pathLength="1" d="M16 18h-5" /> <path pathLength="1" d="M18 5a1 1 0 0 0-1 1v5.573" /> <path pathLength="1" d="M3 4h8.129a1 1 0 0 1 .99.863L13 11.246" /> <path pathLength="1" d="M4 11V4" /> <path pathLength="1" d="M7 15h.01" /> <path pathLength="1" d="M8 10.1V4" /> <circle pathLength="1" cx="18" cy="18" r="2" /> <circle pathLength="1" cx="7" cy="15" r="5" />',
  mach:'<line pathLength="1" x1="3" x2="15" y1="22" y2="22" /> <line pathLength="1" x1="4" x2="14" y1="9" y2="9" /> <path pathLength="1" d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" /> <path pathLength="1" d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />',
  pest:'<path pathLength="1" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path pathLength="1" d="m9 12 2 2 4-4" />',
  resid:'<path pathLength="1" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />'
};
const ico = (k,cls) => `<svg ${cls?`class="${cls}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SRC_ICONS[k]}</svg>`;
const SRC_NAMES  = {fert:'Fertiliser',irrig:'Irrigation',land:'Land preparation',resid:'Residue burning',mach:'Machinery & energy',pest:'Crop protection'};

/* ---------- screens ---------- */
function showScreen(id){
  const needsAuth = (id==='scApp'||id==='scResults');
  if(needsAuth && !IS_AUTHED){ openAuth('login', id); return; }
  $$('.screen').forEach(s=>s.classList.remove('show'));
  const el=document.getElementById(id); if(el) el.classList.add('show');
  closeMenus();
  const pageCls={scHome:'page-home',scAbout:'page-about',scContact:'page-contact',scApp:'page-app',scResults:'page-results',scLogin:'page-login'}[id]||'';
  document.body.className=document.body.className.replace(/\bpage-[a-z]+\b/g,'').trim()+' '+pageCls;
  $$('.nav-home').forEach(b=>b.classList.toggle('active',id==='scHome'));
  $$('.nav-about').forEach(b=>b.classList.toggle('active',id==='scAbout'));
  $$('.nav-contact').forEach(b=>b.classList.toggle('active',id==='scContact'));
  $$('.nav-calc').forEach(b=>b.classList.toggle('active',id==='scApp'||id==='scResults'));
  const lk=document.getElementById('cxLinks'); if(lk) lk.classList.remove('open');
  window.scrollTo(0,0);
  if(window.onScreenShown) window.onScreenShown(id);
}
/* Older versions kept session data in web storage. Clear it once; the session
   now lives only in HttpOnly cookies that page scripts cannot read. */
try{['carbonlens_user','carbonlens_token','cl_wx','darkMode'].forEach(k=>localStorage.removeItem(k));
  ['carbonlens_session_user','carbonlens_session_token'].forEach(k=>sessionStorage.removeItem(k));}catch(e){}
/* Session lives in an HttpOnly cookie set by the server. The page never sees the token.
   AUTH_TOKEN is kept only as a flag so existing "if(!token)" checks keep working. */
let AUTH_TOKEN=null;
let IS_AUTHED=false;
let CURRENT_USER=null;
let AFTER_LOGIN=null;

/* ── Backend URL ── empty = same server (works locally and on any deployment).
   If the frontend is hosted separately, set window.CL_API_BASE before this script. ── */
const API_BASE = (window.CL_API_BASE||'').replace(/\/$/,'');

/* ===================================================================
   API CLIENT
   Every call goes through api(). It sends the anti-CSRF header, includes the
   HttpOnly session cookies, and when the 15-minute access token has expired it
   refreshes the session once (shared between parallel calls) and retries.
   =================================================================== */
let _refreshing=null;
function refreshSession(){
  if(!_refreshing){
    _refreshing=fetch(API_BASE+'/api/auth/refresh',{method:'POST',credentials:'include',
        headers:{'X-CL-Request':'1'}})
      .then(async r=>{const d=await r.json().catch(()=>({}));return r.ok?(d.user||null):null;})
      .catch(()=>null)
      .finally(()=>{setTimeout(()=>{_refreshing=null;},0);});
  }
  return _refreshing;
}
async function api(path, opts={}, _retried=false){
  const o=Object.assign({credentials:'include'},opts);
  o.headers=Object.assign({'X-CL-Request':'1'},opts.headers||{});
  if(o.body!=null && typeof o.body!=='string'){o.body=JSON.stringify(o.body);o.headers['Content-Type']='application/json';}
  else if(typeof o.body==='string' && !o.headers['Content-Type']) o.headers['Content-Type']='application/json';
  const res=await fetch(API_BASE+path,o);
  if(res.status===401 && !_retried && !path.startsWith('/api/auth/')){
    const user=await refreshSession();
    if(user) return api(path,opts,true);
    if(IS_AUTHED){ applyUser(null); toast('Your session has ended. Please sign in again.'); }
  }
  return res;
}
async function apiJSON(path, opts){
  const res=await api(path,opts);
  const data=await res.json().catch(()=>({}));
  return {ok:res.ok,status:res.status,data};
}
/* Keep an open tab signed in: renew a little before the access token runs out,
   and straight away when the user comes back to a tab that slept. */
let _keepAlive=null;
function startKeepAlive(){
  stopKeepAlive();
  _keepAlive=setInterval(()=>{ if(IS_AUTHED) refreshSession().then(u=>{ if(!u) applyUser(null); }); }, 12*60*1000);
}
function stopKeepAlive(){ if(_keepAlive){clearInterval(_keepAlive);_keepAlive=null;} }
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && IS_AUTHED){
    api('/api/auth/me').then(r=>{ if(!r.ok) applyUser(null); }).catch(()=>{});
  }
});

function markFilled(i,w){const inp=document.getElementById(i),wr=document.getElementById(w);if(inp&&wr)wr.classList.toggle('ok',(inp.value||'').trim().length>0);}
function togglePass(id,btn){
  const inp=document.getElementById(id); if(!inp) return;
  const show = inp.type==='password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = show
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.87 4.13M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
}

/* Tab switch between Login / Register */
function switchTab(tab){
  const isLogin = tab==='login';
  const seg=document.getElementById('authTabs');
  const apply=()=>{
    document.getElementById('loginSection').style.display = isLogin?'':'none';
    document.getElementById('registerSection').style.display = isLogin?'none':'';
    document.getElementById('swapTitle').textContent = isLogin?'Welcome back':'Create your account';
    document.getElementById('swapSub').textContent = isLogin?'Sign in to continue to your farm records.':'One account per field officer or farm manager.';
    document.getElementById('swapFootText').textContent = isLogin?'New to CarbonLens?':'Already have an account?';
    document.getElementById('swapFootBtn').textContent = isLogin?'Create an account':'Sign in';
    hideAuthError();
  };
  if(seg){seg.classList.toggle('reg',!isLogin);}
  document.getElementById('tabLogin').classList.toggle('on',isLogin);
  document.getElementById('tabRegister').classList.toggle('on',!isLogin);
  const already = (document.getElementById('loginSection').style.display!=='none') === isLogin;
  if(already){apply();return;}
  if(window.swapAnimate){ window.swapAnimate(document.getElementById('authPane'), apply); } else apply();
}
function openAuth(tab, nextScreen){
  AFTER_LOGIN = nextScreen||null;
  $$('.screen').forEach(s=>s.classList.remove('show'));
  document.getElementById('scLogin').classList.add('show');
  document.body.className=document.body.className.replace(/\bpage-[a-z]+\b/g,'').trim()+' page-login';
  closeMenus(); window.scrollTo(0,0);
  switchTab(tab||'login');
  if(nextScreen) showAuthError('Please sign in to use the calculator.');
  if(window.onScreenShown) window.onScreenShown('scLogin');
  setTimeout(()=>{const f=document.getElementById(tab==='register'?'regFullName':'loginUser');if(f)f.focus();},250);
}

function showAuthError(msg){
  const el=document.getElementById('authError');
  if(el){el.textContent=msg;el.style.display='block';}
}
function hideAuthError(){
  const el=document.getElementById('authError');
  if(el)el.style.display='none';
}

function setAuthLoading(btnId, loading){
  const btn=document.getElementById(btnId);
  if(!btn)return;
  btn.disabled=loading;
  btn.style.opacity=loading?'0.7':'1';
  btn.textContent=loading?(btnId==='loginBtn'?'Signing in…':'Creating account…'):(btnId==='loginBtn'?'Sign in':'Create account');
}

function applyUser(u){
  CURRENT_USER=u||null; IS_AUTHED=!!u; AUTH_TOKEN=u?'cookie':null;
  document.body.classList.toggle('authed',IS_AUTHED);
  if(typeof clGreet==='function' && document.querySelector('#clChatBody .cl-row') && clChatHistory.length===0) clGreet();
  if(!u){ stopKeepAlive(); return; }
  startKeepAlive();
  const base=(u.full_name||u.username||'').trim();
  const name=base.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const init=(name.split(/\s+/).map(w=>w[0]).join('').slice(0,2)||'CL').toUpperCase();
  $$('.hdr-user').forEach(e=>e.textContent=name.split(' ')[0]);
  $$('.hdr-avatar > span').forEach(e=>e.textContent=init);
  setText2('hdrMenuName',name); setText2('hdrMenuMail',u.email||'');
  setText2('pfInit',init); setText2('pfName',name); setText2('pfMail',u.email||'');
  setText2('pfSince', u.created_at ? String(u.created_at).split(' ')[0].split('T')[0] : '—');
}
function onLoginSuccess(user){
  applyUser(user);
  const next=AFTER_LOGIN; AFTER_LOGIN=null;
  if(next==='scApp'){startCalc();return;}
  if(next){showScreen(next);return;}
  goHome();
}

function passwordProblem(pw){
  if(pw.length<8) return 'Password must be at least 8 characters.';
  if(!/[A-Za-z]/.test(pw)||!/\d/.test(pw)) return 'Password must contain at least one letter and one number.';
  return '';
}
async function doLogin(){
  hideAuthError();
  const username=(document.getElementById('loginUser').value||'').trim();
  const password=document.getElementById('loginPass').value||'';
  if(!username||!password){showAuthError('Please enter your username and password.');return;}
  setAuthLoading('loginBtn',true);
  try{
    const r=await apiJSON('/api/auth/login',{method:'POST',
      body:{username,password,remember:!!(document.getElementById('keepSignedIn')||{}).checked}});
    if(!r.ok){showAuthError(r.data.detail||'Username or password is incorrect.');return;}
    document.getElementById('loginPass').value='';
    onLoginSuccess(r.data.user);
  }catch(e){
    showAuthError('Could not reach the server. Check your connection and try again.');
  }finally{
    setAuthLoading('loginBtn',false);
  }
}

/* Live checks: username must not be an email, email must be a real address. */
const USER_RE=/^[A-Za-z0-9._-]{3,40}$/, EMAIL_RE=/^[^\s@<>()\[\],;:"]+@[^\s@<>()\[\],;:"]+\.[A-Za-z]{2,}$/;
function fieldMsg(inputId,errId,msg){
  const i=document.getElementById(inputId), e=document.getElementById(errId);
  if(e) e.textContent=msg||''; if(i&&i.parentElement) i.parentElement.classList.toggle('bad',!!msg);
  return msg||'';
}
function checkRegUser(live){
  const v=(document.getElementById('regUser').value||'').trim();
  let m='';
  if(!v) m=live?'':'Enter a username.';
  else if(v.includes('@')) m='Username cannot be an email. Use letters and numbers, e.g. ali.muzamil';
  else if(/\s/.test(v)) m='No spaces in the username.';
  else if(!/^[A-Za-z0-9._-]+$/.test(v)) m='Only letters, numbers, dot, dash or underscore.';
  else if(v.length<3) m=live?'':'At least 3 characters.';
  return fieldMsg('regUser','regUserErr',m);
}
function checkRegEmail(live){
  const v=(document.getElementById('regEmail').value||'').trim();
  let m='';
  if(!v) m=live?'':'Enter your email address.';
  else if(!EMAIL_RE.test(v)) m=live&&!v.includes('@')?'':'Enter a valid email, e.g. name@example.com';
  return fieldMsg('regEmail','regEmailErr',m);
}
document.addEventListener('DOMContentLoaded',()=>{
  const u=document.getElementById('regUser'), e=document.getElementById('regEmail');
  if(u){u.addEventListener('input',()=>checkRegUser(true));u.addEventListener('blur',()=>checkRegUser(false));}
  if(e){e.addEventListener('input',()=>checkRegEmail(true));e.addEventListener('blur',()=>{ if(e.value.trim()) checkRegEmail(false); });}
});
async function doRegister(){
  hideAuthError();
  const full_name=(document.getElementById('regFullName').value||'').trim();
  const username=(document.getElementById('regUser').value||'').trim();
  const email=(document.getElementById('regEmail').value||'').trim();
  const password=document.getElementById('regPass').value||'';
  if(!full_name||!username||!email||!password){showAuthError('Please fill in all fields.');return;}
  const uErr=checkRegUser(), eErr=checkRegEmail();
  if(uErr||eErr){showAuthError(uErr||eErr);return;}
  const pwErr=passwordProblem(password); if(pwErr){showAuthError(pwErr);return;}
  setAuthLoading('registerBtn',true);
  try{
    const r=await apiJSON('/api/auth/register',{method:'POST',body:{username,email,password,full_name}});
    if(!r.ok){showAuthError(r.data.detail||'Could not create the account.');return;}
    document.getElementById('regPass').value='';
    onLoginSuccess(r.data.user);            /* the server signs the new account in */
    toast('Welcome to CarbonLens, '+(full_name.split(' ')[0]||username));
  }catch(e){
    showAuthError('Could not reach the server. Check your connection and try again.');
  }finally{
    setAuthLoading('registerBtn',false);
  }
}

/* ── Forgot Password — 3-step flow ─────────────────────────────────────── */
let _frUsername='', _frOtp='';

function _frShowStep(n){
  [1,2,3,4].forEach(i=>{
    const el=document.getElementById('frStep'+i);
    if(el) el.style.display=(i===n?'':'none');
  });
  const back=document.getElementById('frBackToLogin');
  if(back) back.style.display=(n===4?'none':'');
}
function _frErr(step,msg){
  const el=document.getElementById('frError'+step);
  if(!el) return;
  el.textContent=msg; el.style.display='block';
}
function _frClearErr(step){
  const el=document.getElementById('frError'+step);
  if(el){el.textContent='';el.style.display='none';}
}
function frGoBack(step){ _frClearErr(step+1); _frShowStep(step); }

const FR_LABELS={frBtn1:'Send code',frBtn2:'Verify code',frBtn3:'Update password'};
function _frBtn(id,busyText){const b=document.getElementById(id);if(!b)return;
  b.disabled=!!busyText;b.textContent=busyText||FR_LABELS[id];}
function openForgot(){
  document.getElementById('forgotOverlay').classList.add('show');
  _frUsername=''; _frOtp='';
  ['forgotUsername','forgotOtp','forgotNewPw','forgotConfPw'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  [1,2,3].forEach(i=>_frClearErr(i));
  Object.keys(FR_LABELS).forEach(id=>_frBtn(id,''));
  _frShowStep(1);
  setTimeout(()=>{const f=document.getElementById('forgotUsername');if(f)f.focus();},150);
}
function closeForgot(){ document.getElementById('forgotOverlay').classList.remove('show'); }

async function frSendOtp(){
  _frClearErr(1);
  const username=(document.getElementById('forgotUsername').value||'').trim();
  if(!username){_frErr(1,'Please enter your username or email.');return;}
  _frBtn('frBtn1','Sending…');
  try{
    const r=await apiJSON('/api/auth/forgot-password',{method:'POST',body:{username}});
    if(!r.ok){_frErr(1,r.data.detail||'Could not send the code. Please try again.');return;}
    _frUsername=username;
    document.getElementById('frOtpSub').textContent=r.data.message||'Check your inbox and enter the code.';
    _frShowStep(2);
    setTimeout(()=>document.getElementById('forgotOtp').focus(),100);
  }catch(e){
    _frErr(1,'Network error. Please try again.');
  }finally{ _frBtn('frBtn1',''); }
}

async function frVerifyOtp(){
  _frClearErr(2);
  const otp=(document.getElementById('forgotOtp').value||'').trim();
  if(!/^\d{6}$/.test(otp)){_frErr(2,'Enter the 6-digit code from the email.');return;}
  _frBtn('frBtn2','Verifying…');
  try{
    const r=await apiJSON('/api/auth/verify-otp',{method:'POST',body:{username:_frUsername,otp}});
    if(!r.ok){_frErr(2,r.data.detail||'That code did not work.');return;}
    _frOtp=otp;
    _frShowStep(3);
    setTimeout(()=>document.getElementById('forgotNewPw').focus(),100);
  }catch(e){
    _frErr(2,'Network error. Please try again.');
  }finally{ _frBtn('frBtn2',''); }
}

async function frResetPassword(){
  _frClearErr(3);
  const pw=document.getElementById('forgotNewPw').value||'';
  const cpw=document.getElementById('forgotConfPw').value||'';
  const pwErr=passwordProblem(pw); if(pwErr){_frErr(3,pwErr);return;}
  if(pw!==cpw){_frErr(3,'Passwords do not match.');return;}
  _frBtn('frBtn3','Updating…');
  try{
    const r=await apiJSON('/api/auth/reset-password',{method:'POST',body:{username:_frUsername,otp:_frOtp,new_password:pw}});
    if(!r.ok){_frErr(3,r.data.detail||'Reset failed. Please start again.');return;}
    _frShowStep(4);
  }catch(e){
    _frErr(3,'Network error. Please try again.');
  }finally{ _frBtn('frBtn3',''); }
}

async function doSignout(){
  closeMenus();
  try{await api('/api/auth/logout',{method:'POST'});}catch(e){}
  applyUser(null); if(typeof clearChat==='function') clearChat(true);
  goHome(); toast('Signed out');
}
function goHome(){showScreen('scHome');loadWeather();loadNews();}
function goAbout(){showScreen('scAbout');}
const FLOW_TXT={
  fert:'<b>Fertiliser.</b> Product manufacture, direct and indirect N₂O from applied nitrogen (IPCC Tier 1), and CO₂ released from urea.',
  irrig:'<b>Irrigation.</b> Pumping energy by source: grid electricity, diesel, petrol or solar, for the area irrigated.',
  land:'<b>Land preparation.</b> Diesel for tillage and levelling, scaled to tractor horsepower, area and number of passes.',
  mach:'<b>Machinery &amp; energy.</b> Fuel for sowing, fertiliser spreading, spraying, weeding and picking runs.',
  pest:'<b>Crop protection.</b> Active ingredient applied, by product class, area and number of sprays.',
  resid:'<b>Residue.</b> Emissions when cotton stalks are burned in the field, from residue quantity and area burned.'};
let FLOW_TIMER=null, FLOW_I=0;
function setFlow(k,manual){
  $$('#flowSvg .fnode').forEach(n=>n.classList.toggle('on',n.dataset.k===k));
  $$('#flowLegend button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  const d=document.getElementById('flowDetail'); if(d) d.innerHTML=FLOW_TXT[k]||'';
  if(manual&&FLOW_TIMER){clearInterval(FLOW_TIMER);FLOW_TIMER=null;}
}
function startFlowCycle(){
  if(FLOW_TIMER||!document.getElementById('flowSvg')) return;
  const keys=['fert','irrig','land','mach','pest','resid'];
  setFlow(keys[0]);
  FLOW_TIMER=setInterval(()=>{FLOW_I=(FLOW_I+1)%keys.length;setFlow(keys[FLOW_I]);},3600);
}
document.addEventListener('DOMContentLoaded',startFlowCycle);

/* ===================================================================
   NEWS — images are cached and served by our own server, so they load
   immediately; a branded placeholder covers the rare article without one.
   =================================================================== */
const NEWS_FALLBACK_IMG='/static/img/news-fallback.svg';
let _newsLoadedAt=0, _newsBusy=false;
async function loadNews(force){
  if(_newsBusy) return;
  if(!force && _newsLoadedAt && Date.now()-_newsLoadedAt<30*60*1000) return;
  _newsBusy=true;
  const grid=document.getElementById('newsGrid');
  try{
    const r=await apiJSON('/api/widgets/news');
    const articles=(r.data.articles||[]).slice(0,2);
    if(!r.ok||!articles.length) throw new Error('no articles');
    if(!grid) return;
    grid.innerHTML=articles.map((a,i)=>{
      const remote=/^https:\/\//.test(a.image_remote||'')?a.image_remote:'';
      const img=esc(a.image||remote||NEWS_FALLBACK_IMG);
      const alt=esc(a.image&&remote?remote:'');
      const url=esc(/^https?:\/\//.test(a.url||'')?a.url:'https://sawie.net');
      const parts=String(a.source||'SAWiE').split('|').map(x=>x.trim()).filter(Boolean);
      const tag=esc(parts[0]||'SAWiE'), meta=esc(parts.slice(1).join(' · ')||'sawie.net');
      return `<a class="news-card" href="${url}" target="_blank" rel="noopener noreferrer">
        <div class="news-media"><img class="news-img" src="${img}" alt="" width="640" height="360" decoding="async"
          ${i===0?'fetchpriority="high"':''} onload="this.classList.add('ok')"
          data-alt="${alt}" referrerpolicy="no-referrer"
          onerror="if(this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt='';return;}this.onerror=null;this.src='${NEWS_FALLBACK_IMG}'"></div>
        <div class="news-body"><div class="news-source">${meta}</div><h3 class="news-title">${esc(a.title)}</h3>
          <p class="news-desc">${esc(a.desc||'')}</p>
          <span class="news-more">Read on sawie.net <span aria-hidden="true">&rarr;</span></span></div></a>`;
    }).join('');
    _newsLoadedAt=Date.now();
  }catch(e){
    if(grid && !_newsLoadedAt) grid.innerHTML='<div class="news-empty"><b>News is not available right now.</b><span>Visit <a href="https://sawie.net" target="_blank" rel="noopener">sawie.net</a> for the latest updates.</span></div>';
  }finally{ _newsBusy=false; }
}

/* ===================================================================
   LIVE WEATHER — detects the visitor's location as soon as the page opens.
   1) Shows weather for the network location straight away (no prompt needed).
   2) Asks the browser for precise GPS location and switches to it when allowed.
   3) Refreshes every 10 minutes while the tab is open.
   GPS needs HTTPS (or localhost); on plain http the network location is used.
   =================================================================== */
const WX_ICONS={
  clear_day:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  clear_night:'<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/>',
  partly_day:'<path d="M8.5 3v1.4M3.6 5.1l1 1M2 10h1.4M13.4 5.1l-1 1"/><path d="M5.6 11.6a3.5 3.5 0 0 1 6.3-3.3"/><path d="M8 20h9.5a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 8 20Z"/>',
  partly_night:'<path d="M11.5 4.2A4.4 4.4 0 0 0 6.2 9.6"/><path d="M8 20h9.5a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.4 1.6A3.2 3.2 0 0 0 8 20Z"/>',
  cloud:'<path d="M7 19h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 19Z"/>',
  fog:'<path d="M7 14h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 14Z"/><path d="M4 18h16M7 21.5h10"/>',
  drizzle:'<path d="M7 15h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 15Z"/><path d="M9 18.5v1M13 18.5v1M17 18.5v1"/>',
  rain:'<path d="M7 14h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 14Z"/><path d="m9 17-1.2 3.5M13 17l-1.2 3.5M17 17l-1.2 3.5"/>',
  snow:'<path d="M7 14h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 14Z"/><path d="M9 18h.01M13 18h.01M17 18h.01M11 21h.01M15 21h.01"/>',
  storm:'<path d="M7 14h10.5a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6 1.8A3.6 3.6 0 0 0 7 14Z"/><path d="m13 14-3 4h4l-3 4"/>'
};
function wxIcon(key,isDay){
  const k=(key==='clear'||key==='partly')?key+(isDay===false?'_night':'_day'):(WX_ICONS[key]?key:'cloud');
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="wx-svg wx-${esc(key||'cloud')}">${WX_ICONS[k]}</svg>`;
}
const WX={coords:null, source:null, at:0, timer:null, busy:false, gpsAsked:false};
/* Last precise position is remembered (rounded to ~1 km) so the right place shows instantly next visit. */
try{ const c=JSON.parse(localStorage.getItem('cl_wx_pos')||'null'); if(c&&c.lat&&c.lon) WX.coords=c; }catch(e){}
function loadWeather(){
  if(WX.at && Date.now()-WX.at<10*60*1000) return;
  if(WX.coords) fetchWeather(WX.coords);        // known device location: correct place immediately
  requestPreciseLocation();                     // GPS first; network location only if GPS is not available
  if(!WX.timer) WX.timer=setInterval(()=>{ if(document.visibilityState==='visible') fetchWeather(WX.coords||{}); },10*60*1000);
}
function requestPreciseLocation(){
  if(WX.gpsAsked) return; WX.gpsAsked=true;
  const fallback=()=>{ if(!WX.coords) fetchWeather({}); };
  if(!navigator.geolocation || !window.isSecureContext){ fallback(); return; }
  const slow=setTimeout(()=>{ if(!WX.at) fallback(); },8000);   // don't leave the card empty while the user decides
  navigator.geolocation.getCurrentPosition(pos=>{
    clearTimeout(slow);
    WX.coords={lat:pos.coords.latitude.toFixed(3),lon:pos.coords.longitude.toFixed(3)};
    try{ localStorage.setItem('cl_wx_pos',JSON.stringify({lat:(+WX.coords.lat).toFixed(2),lon:(+WX.coords.lon).toFixed(2)})); }catch(e){}
    fetchWeather(WX.coords);
  },()=>{ clearTimeout(slow); fallback(); },
  {enableHighAccuracy:true,timeout:15000,maximumAge:10*60*1000});
}
async function fetchWeather(q){
  if(WX.busy){ WX.pending=q; return; }        // run after the current request
  WX.busy=true;
  const bar=document.getElementById('weatherBar');
  const qs=new URLSearchParams(); Object.keys(q||{}).forEach(k=>{if(q[k]!=null&&q[k]!=='')qs.set(k,q[k]);});
  try{
    const r=await apiJSON('/api/widgets/weather'+(qs.toString()?'?'+qs:''));
    const d=r.data;
    if(!r.ok||d.error) throw new Error(d.error||'unavailable');
    document.getElementById('wIcon').innerHTML=wxIcon(d.icon,d.is_day);
    setText2('wCity',d.city||'Your location');
    setText2('wTemp',Math.round(d.temp_c)+'°C');
    setText2('wDesc',d.desc||'');
    setText2('wHumidity',d.humidity+'%');
    setText2('wWind',d.wind_kmph+' km/h');
    setText2('wFeels',Math.round(d.feels_c)+'°C');
    const fc=document.getElementById('wxFc');
    if(fc) fc.innerHTML=(d.forecast||[]).slice(0,4).map((f,i)=>{
      const dt=f.date?new Date(f.date+'T12:00:00'):null;
      const lbl=i===0?'Today':(dt?dt.toLocaleDateString('en-GB',{weekday:'short'}):'');
      const rain=(f.rain_pct!=null&&f.rain_pct>=20)?`<span class="r">${f.rain_pct}%</span>`:'';
      return `<div class="wx-day" title="${esc(f.desc||'')}"><div class="d">${lbl}</div><div class="i">${wxIcon(f.icon,true)}</div><div class="t">${f.max_c}° <span>${f.min_c}°</span></div>${rain}</div>`;
    }).join('');
    if(bar){bar.classList.remove('is-loading','is-error');bar.dataset.cond=d.icon||'cloud';}
    WX.at=Date.now(); WX.source=d.source;
  }catch(e){
    if(bar && !WX.at){bar.classList.remove('is-loading');bar.classList.add('is-error');
      document.getElementById('wIcon').innerHTML=wxIcon('cloud',true);
      setText2('wDesc','Weather is unavailable right now');}
    clearTimeout(WX.retry); WX.retry=setTimeout(()=>fetchWeather(WX.coords||{}),60*1000);
  }finally{
    WX.busy=false;
    if(WX.pending){ const p=WX.pending; WX.pending=null; fetchWeather(p); }
  }
}

function startCalc(){
  if(!IS_AUTHED){openAuth('login','scApp');return;}
  /* A fresh wizard: rebuild every step from its defaults. */
  Object.keys(ROW).forEach(k=>delete ROW[k]);
  PICKN=0; MAX_REACHED=0; CURRENT=0; RESULT=null; LAST=null;
  renderWizard();
  showScreen('scApp'); gotoStep(0); setTimeout(recompute,60);
}
function editInputs(){
  showScreen('scApp');
  gotoStep(0);
  setTimeout(recompute,60);
}

/* ---------- header menu ---------- */
function toggleMenu(ev){
  ev.stopPropagation();
  if(ev.target.closest && ev.target.closest('.hdr-menu')){closeMenus();return;}
  const m=ev.currentTarget.querySelector('.hdr-menu');
  const open=m&&m.classList.contains('show');
  closeMenus();
  if(m&&!open)m.classList.add('show');
}
function closeMenus(){$$('.hdr-menu').forEach(m=>m.classList.remove('show'));}
document.addEventListener('click',closeMenus);

/* ---------- refresh / errors ---------- */
function refreshApp(btn){closeMenus();if(btn&&btn.classList){btn.classList.add('spin');setTimeout(()=>btn.classList.remove('spin'),750);}
  try{
    dismissError();recompute();
    // Home screen par news aur weather reload karo
    const homeVisible=document.getElementById('scHome').classList.contains('show');
    if(homeVisible){
      loadNews(true);
      loadWeather();
    }
    toast('Dashboard refreshed');
  }
  catch(e){console.error(e);showError('Refresh failed: '+(e.message||'error'));}}
function showError(m){$$('.err-msg').forEach(e=>e.textContent=m);$$('.err-bar').forEach(e=>e.classList.add('show'));}
function dismissError(){$$('.err-bar').forEach(e=>e.classList.remove('show'));}
window.addEventListener('error',e=>{
  if(!e||!e.filename||e.filename.indexOf(location.origin)!==0) return;   // ignore extensions/third parties
  console.error(e.error||e.message); showError('Something went wrong on this page. Use Refresh to reload it.');
});
let TOASTT;function toast(m){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d2b0d;color:#fff;padding:11px 20px;border-radius:10px;font:600 13.5px "Plus Jakarta Sans",sans-serif;z-index:400;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transition:.2s';document.body.appendChild(t);}
  t.textContent=m;t.style.opacity='1';clearTimeout(TOASTT);TOASTT=setTimeout(()=>t.style.opacity='0',1800);}

/* ---------- contact ---------- */
function openContact(){closeMenus();showScreen('scContact');
  document.getElementById('contactFormErr').style.display='none';
  document.getElementById('contactFormOk').style.display='none';
  document.getElementById('contactFormWrap').style.display='block';
  document.getElementById('ctName').value='';
  document.getElementById('ctEmail').value='';
  document.getElementById('ctMessage').value='';
  {const b=document.getElementById('ctSendBtn');if(b){b.disabled=false;}}
  document.getElementById('ctCategory').selectedIndex=0;
  {const f=document.querySelector('#ctTopics .ct-topic');if(f)pickTopic(f);}
  if(CURRENT_USER){const n=document.getElementById('ctName'),m=document.getElementById('ctEmail');if(n&&!n.value)n.value=CURRENT_USER.full_name||'';if(m&&!m.value)m.value=CURRENT_USER.email||'';}
  const fid=getVal('farmId')||''; const el=document.getElementById('ctFarmId'); if(el) el.value=fid;
}
function closeContact(){}
function pickTopic(btn){
  $$('#ctTopics .ct-topic').forEach(b=>b.classList.toggle('on',b===btn));
  const sel=document.getElementById('ctCategory'); if(sel) sel.value=btn.dataset.v;
}

async function sendContactForm(){
  const errEl=document.getElementById('contactFormErr');
  const okEl=document.getElementById('contactFormOk');
  errEl.style.display='none'; okEl.style.display='none';

  const category=document.getElementById('ctCategory').value;
  const name=(document.getElementById('ctName').value||'').trim();
  const email=(document.getElementById('ctEmail').value||'').trim();
  const farm_id=(document.getElementById('ctFarmId').value||'').trim();
  const message=(document.getElementById('ctMessage').value||'').trim();

  if(!name){errEl.textContent='Please enter your name.';errEl.style.display='block';return;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errEl.textContent='Please enter a valid email address.';errEl.style.display='block';return;}
  if(!message||message.length<5){errEl.textContent='Please write a short message.';errEl.style.display='block';return;}

  const btn=document.getElementById('ctSendBtn');
  const origLabel=btn.innerHTML;
  btn.disabled=true; btn.innerHTML='Sending…';

  try{
    const res=await api('/api/contact/send',{method:'POST',body:{category,name,email,farm_id,message}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      errEl.textContent=data.detail||'Could not send your message. Please try again.';
      errEl.style.display='block';
    }else{
      document.getElementById('contactFormWrap').style.display='none';
      okEl.textContent=data.message||'Thanks — your message has been sent.';
      okEl.style.display='block';
    }
  }catch(e){
    errEl.textContent='Could not connect to the server. Please try again.';
    errEl.style.display='block';
  }finally{
    btn.disabled=false; btn.innerHTML=origLabel;
  }
}

/* ===================================================================
   SEARCHABLE COMBO (used for district, tehsil, fertiliser, etc.)
   =================================================================== */
function combo(id, placeholder, opts, onpick, val){
  // opts: [{v, label, sub}]
  return `<div class="combo" data-combo="${id}">
    <input class="combo-input" id="${id}" placeholder="${esc(placeholder)}" autocomplete="off" value="${esc(val||'')}"/>
    <div class="combo-list" id="${id}_list"></div></div>`;
}
const COMBO_OPTS = {};   // id -> {opts, onpick}
function registerCombo(id, opts, onpick){ COMBO_OPTS[id]={opts,onpick}; }
function comboFilter(id, showAll=false){
  const inp=document.getElementById(id), list=document.getElementById(id+'_list'), cfg=COMBO_OPTS[id];
  if(!inp||!list||!cfg) return;
  const q=showAll?'':inp.value.toLowerCase().trim();
  const hits=cfg.opts.filter(o=>o.label.toLowerCase().includes(q)).slice(0,80);
  list.innerHTML = hits.length ? hits.map(o=>`<div class="combo-opt" data-v="${esc(o.v)}">${esc(o.label)}${o.sub?` <small>${esc(o.sub)}</small>`:''}</div>`).join('')
    : `<div class="combo-empty">No match. You can type a custom value.</div>`;
  list.classList.add('show');
}
document.addEventListener('input',e=>{ if(e.target.classList.contains('combo-input')) comboFilter(e.target.id); });
document.addEventListener('input',e=>{
  if(e.target.matches('input[type="number"]') && e.target.min!=='' && e.target.value!==''){
    const minV=parseFloat(e.target.min);
    if(!isNaN(minV) && parseFloat(e.target.value)<minV) e.target.value=e.target.min;
  }
});
document.addEventListener('focusin',e=>{ if(e.target.classList.contains('combo-input')) comboFilter(e.target.id); });
document.addEventListener('click',e=>{
  if(e.target.classList.contains('combo-input')){comboFilter(e.target.id,true);return;}
  const opt=e.target.closest('.combo-opt'); if(opt){ const box=opt.closest('.combo'); const inp=box.querySelector('.combo-input');
    const id=inp.id, cfg=COMBO_OPTS[id]; inp.value=opt.textContent.replace(/\s+/g,' ').trim();
    if(!cfg){ box.querySelector('.combo-list').classList.remove('show'); return; }
    const chosen=cfg.opts.find(o=>o.v===opt.dataset.v); if(chosen) inp.value=chosen.label;
    box.querySelector('.combo-list').classList.remove('show'); if(cfg&&cfg.onpick) cfg.onpick(opt.dataset.v, chosen); recompute(); return; }
  if(!e.target.closest('.combo')) $$('.combo-list').forEach(l=>l.classList.remove('show'));
});

/* small helpers to read fields */
function getVal(id){const e=document.getElementById(id);return e?e.value:'';}
function setVal(id,v){const e=document.getElementById(id);if(e)e.value=v;}

/* ===================================================================
   WIZARD DEFINITION
   =================================================================== */
const STEPS = [
  {key:'general',  nav:'Farm registration', icon:'&#127968;'},
  {key:'seed',     nav:'Seed information',   icon:'&#127793;'},
  {key:'fert',     nav:'Fertiliser use',     icon:'&#129521;'},
  {key:'pest',     nav:'Crop protection',    icon:'&#128041;'},
  {key:'mach',     nav:'Energy & machinery', icon:'&#128668;'},
  {key:'resid',    nav:'Residue management', icon:'&#127806;'},
  {key:'harvest',  nav:'Harvesting & labour',icon:'&#9986;'},
  {key:'review',   nav:'Review & calculate', icon:'&#9989;'},
];
let CURRENT = 0;
let MAX_REACHED = 0; // highest step the user has unlocked

function renderWizard(){
  $('#wnav').innerHTML = STEPS.map((s,i)=>
    `<button type="button" class="wnav-item locked" data-step="${i}" onclick="gotoStep(${i})"><span class="dot">${i+1}</span><span>${s.nav}</span></button>`).join('');
  const ms=document.getElementById('wizMstep');
  if(ms) ms.innerHTML = STEPS.map((s,i)=>
    `<button type="button" class="ms-item locked" data-step="${i}" onclick="gotoStep(${i})"><span class="n">${i+1}</span><span class="l">${s.nav}</span></button>`).join('');
  $('#steps').innerHTML = STEPS.map((s,i)=>`<section class="step" id="step_${s.key}">${buildStep(s.key)}</section>`).join('');
  wireGeneral(); wireSeed(); wireFert(); wirePest(); wireIrrig(); wireMach(); wireResid(); wireHarvest();
  gotoStep(0);
}
function gotoStep(i){
  /* Block if step not yet unlocked */
  if(i > MAX_REACHED){
    toast('Please complete the current step first.');
    return;
  }
  CURRENT=i;
  $$('.step').forEach((s,k)=>s.classList.toggle('show',k===i));
  $$('.wnav-item, .ms-item').forEach(n=>{
    const k=+n.dataset.step;
    n.classList.toggle('active', k===i);
    n.classList.toggle('done',   k<i);
    n.classList.toggle('locked', k>MAX_REACHED);
    if(k===i) n.setAttribute('aria-current','step'); else n.removeAttribute('aria-current');
  });
  const act=document.querySelector('.ms-item.active'); if(act&&act.scrollIntoView) act.scrollIntoView({block:'nearest',inline:'center'});
  const main=$('.wiz-main'); if(main) main.scrollTop=0;
  /* animate progress bar */
  const pct = Math.round((i / (STEPS.length - 1)) * 100);
  const bar = document.getElementById('wizProgressBar');
  if(bar) bar.style.width = pct + '%';
  const mt=document.getElementById('wizMeter'); if(mt) mt.style.width=pct+'%';
  setText2('wizPct', pct);
  setText2('wizCrumb', (getVal('farmerName')||'').trim() ? 'Season calculation · '+getVal('farmerName').trim() : 'New season calculation');
  setText2('wizCount', 'Step '+(i+1)+' of '+STEPS.length);
  window.scrollTo({top:0,behavior:'smooth'});
  if(STEPS[i].key==='review') buildReview();
}
/* Call this from Next buttons to unlock the next step */
function validateStep(i){
  /* Scans the current step's DOM for mandatory (*) fields and returns the
     first empty/invalid one, or null if all are filled. */
  const stepEl = document.getElementById('step_'+STEPS[i].key);
  if(!stepEl) return null;
  let bad=null;
  stepEl.querySelectorAll('.field').forEach(fieldEl=>{
    if(!fieldEl.querySelector('.req')) return; // not mandatory
    const input = fieldEl.querySelector('input, select, textarea');
    if(!input || input.disabled || fieldEl.offsetParent===null) { fieldEl.classList.remove('err'); return; }
    if(input.tagName==='SELECT' && input.options.length<=1 && !input.value) return;   // nothing to choose
    const v=(input.value||'').trim();
    const isEmpty = v==='' || (input.closest('.unit-in') && isNaN(num(v)));
    if(isEmpty){
      fieldEl.classList.add('err');
      if(!bad) bad=input;
    } else {
      fieldEl.classList.remove('err');
    }
  });
  return bad;
}
function nextStep(){
  const bad=validateStep(CURRENT);
  if(bad){
    setTimeout(()=>{try{bad.focus();}catch(e){}},50);
    toast('Please complete the highlighted mandatory fields before continuing');
    return;
  }
  const next = CURRENT+1;
  if(next >= STEPS.length) return;
  if(next > MAX_REACHED) MAX_REACHED = next;
  gotoStep(next);
}
function nav(html){return `<div class="step-foot">${html}</div>`;}

/* ---------- generic field helpers ---------- */
function F(label, inner, req, hint, span){
  return `<div class="field${span?' col2':''}"><label>${label}${req?' <span class="req" aria-label="required">*</span>':''}</label>${inner}${hint?`<small class="field-hint">${hint}</small>`:''}</div>`;
}
function IN(id,val,ph,type){return `<input id="${id}" ${type?`type="${type}"`:''} value="${val==null?'':esc(val)}" placeholder="${esc(ph||'')}"/>`;}
function UNIT(id,val,unit,type){return `<div class="unit-in"><input id="${id}" ${type?`type="${type}"`:'type="number" min="0"'} value="${val==null?'':esc(val)}"/><span class="u">${unit}</span></div>`;}
function SEL(id,opts,val){return `<select id="${id}">${opts.map(o=>`<option value="${esc(o)}" ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select>`;}

const COUNTRIES=["Pakistan","Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Chad","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"]
  .filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a==='Pakistan'?-1:b==='Pakistan'?1:a.localeCompare(b));

/* ===================================================================
   STEP 1 — FARM REGISTRATION
   =================================================================== */
function defaultSeason(){
  const d=new Date(), y=d.getFullYear(), start=d.getMonth()>=3?y:y-1;   // cotton is sown from April
  return start+'-'+String((start+1)%100).padStart(2,'0');
}
function buildStep_general(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 1 of 8</div><h2>Farm registration</h2>
    <p>Identify the farm and its land. Choose the province, district and tehsil from the lists.</p></div>
  <div class="card"><div class="card-title"><span class="idx">1</span>General information</div>
    <div class="grid2">
      ${F('Farmer name', IN('farmerName',''), true)}
      ${F('Farm ID', IN('farmId',''))}
      ${F('Country', SEL('country',COUNTRIES,'Pakistan'), true)}
      ${F('Province / State', `<select id="province"></select>`, true)}
      ${F('District / City', `<select id="district"><option value="">— Select district/city —</option></select>`, true)}
      <div class="field" id="tehsilField"><label>Tehsil / Sub-district <span class="req">*</span></label><select id="tehsil"><option value="">— Select tehsil —</option></select></div>
      ${F('Village / mouza', IN('village',''))}
      ${F('Season', IN('season',defaultSeason()), true)}
      ${F('Crop', SEL('crop',['Cotton','Rice','Wheat','Maize','Sugarcane','Soyabean','Hemp'],'Cotton'), true)}
    </div></div>
  <div class="card"><div class="card-title"><span class="idx wide">1.1</span>Land, soil &amp; yield</div>
    <div class="grid3">
      ${F('<span id="lblArea">Cotton area</span>', UNIT('area','','acre'), true)}
      ${F('Harvested area', UNIT('hArea','','acre'), true)}
      ${F('<span id="lblYield">Seed cotton yield</span>', UNIT('yield','','kg/acre'), true)}
      ${F('Soil texture', SEL('soilTexture',['Sandy','Coarse','Medium','Fine','Clay','Loam','Organic'],'Medium'))}
      ${F('Soil organic matter', SEL('som',['< 1.72%','1.72 – 5.16%','> 5.16%'],'1.72 – 5.16%'))}
      ${F('Soil drainage', SEL('drainage',['Poor','Good','Excessive'],'Good'))}
      ${F('Soil pH', SEL('ph',['< 5.5','5.5 – 7.3','7.3 – 8.5','> 8.5'],'7.3 – 8.5'))}
      ${F('Climate', SEL('climate',['Tropical dry','Tropical moist','Warm temperate dry','Warm temperate moist'],'Warm temperate dry'))}
      ${F('Moisture regime', SEL('moisture',['Irrigated','Rainfed'],'Irrigated'))}
    </div></div>
  ${nav(`<span></span><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Seed</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 2 — SEED INFORMATION
   =================================================================== */
function buildStep_seed(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 2 of 8</div><h2>Seed information</h2>
    <p>Variety and seed rate. If seed was treated, add each treatment product.</p></div>
  <div class="card"><div class="card-title"><span class="idx">2</span>Seed</div>
    <div class="grid3">
      ${F('Cotton variety', combo('variety','Search variety…',[],null))}
      ${F('Seed rate', UNIT('seedRate','','kg/acre'), true)}
      ${F('Seed source', SEL('seedSource',['Certified','Own-saved','Ginner-supplied','Company'],'Certified'))}
    </div>
    <div style="margin-top:1rem">
      ${F('Was the seed treated?', `<div class="yesno" id="seedTreatToggle">
        <div class="chip" data-v="no">No</div><div class="chip on" data-v="yes">Yes</div></div>`, false,
        'delinting, fungicide or insecticide coating')}
    </div>
    <div class="subwin show" id="seedTreatWin">
      <div class="subwin-title">Seed treatments</div>
      <div id="treatRows"></div>
      <button class="add-btn" onclick="addTreat()">+ Add a seed treatment</button>
    </div>
  </div>
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(0)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Fertiliser</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 3 — FERTILISER
   =================================================================== */
function buildStep_fert(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 3 of 8</div><h2>Fertiliser &amp; irrigation</h2>
    <p>Add each fertiliser applied. Choosing a product opens only the nutrient windows that apply
       (an NPK opens N, P and K; a sulphate opens S). Pick <b>Other</b> to enter a custom product.</p></div>
  <div class="card"><div class="card-title"><span class="idx">3</span>Fertiliser applications</div>
    <div id="fertRows"></div>
    <button class="add-btn" onclick="addFert()">+ Add a fertiliser</button>

  </div>
  ${buildIrrigCard()}
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(1)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Crop protection</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   IRRIGATION — merged into the Fertiliser & irrigation tab (same step)
   =================================================================== */
function buildIrrigCard(){
  const systems=D.irrigation.map(x=>x.label);
  return `
  <div class="card"><div class="card-title"><span class="idx wide">3.1</span>Irrigation system</div>
    <p class="card-sub">Choose your system. The fields below change to match it — a diesel tube well asks for litres,
       an electric one for kilowatt-hours, canal gravity flow for neither.</p>
    <div class="grid2">
      ${F('Primary irrigation system', SEL('irrigSys',systems,systems[1]), true)}
      ${F('Irrigation area', UNIT('irrigArea','10.4','acre'), true)}
    </div>
    <div id="irrigEnergy"></div>
    <div class="grid3" style="margin-top:.9rem">
      ${F('Number of irrigations', UNIT('irrigCount','6','times'), false, 'this season')}
      ${F('Water depth per irrigation', UNIT('irrigDepth','3','inches'), false, 'for water reporting')}
      ${F('Or total water volume', UNIT('irrigVol','','m³/acre'), false, 'if known')}
    </div>
  </div>`;
}

/* ===================================================================
   STEP 3 — CROP PROTECTION
   =================================================================== */
function buildStep_pest(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 4 of 8</div><h2>Crop protection</h2>
    <p>Add each product. Choosing <b>Other</b> opens a window for a custom product name and details.</p></div>
  <div class="card"><div class="card-title"><span class="idx">4</span>Applications</div>
    <div id="pestRows"></div>
    <button class="add-btn" onclick="addPest()">+ Add a crop-protection product</button>

  </div>
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(2)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Energy &amp; machinery</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 4 — ENERGY & MACHINERY  (activity-first redesign)
   =================================================================== */
function buildStep_mach(){
  const acts=['— Cumulative (total diesel only) —',...Object.keys(D.activities)];
  return `
  <div class="step-head"><div class="step-eyebrow">Step 5 of 8</div><h2>Energy &amp; machinery</h2>
    <p>Add each field operation. Pick the <b>activity</b> first (land prep, sowing, harvesting…),
       then the implement and the tractor — bigger tractors burn more diesel per pass, so horsepower matters.</p></div>
  <div class="card"><div class="card-title"><span class="idx">5</span>Field operations</div>
    <div id="machRows"></div>
    <button class="add-btn" onclick="addMach()">+ Add a field operation</button>

  </div>
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(3)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Residue</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 5 — RESIDUE
   =================================================================== */
function buildStep_resid(){
  const methods=D.residue.map(x=>x.label);
  return `
  <div class="step-head"><div class="step-eyebrow">Step 6 of 8</div><h2>Residue management</h2>
    <p>How was the cotton stalk and trash handled? Only field burning emits at the farm gate — pick any
       other method and the burning fields switch off.</p></div>
  <div class="card"><div class="card-title"><span class="idx">6</span>Crop residue</div>
    <div class="grid2">
      ${F('Management method', SEL('residMethod',methods,methods[0]), true)}
      ${F('Residue quantity', UNIT('residQty','1.8','t/acre'))}
    </div>
    <div class="grid2" style="margin-top:.9rem">
      ${F('Residue area', UNIT('residArea','10.4','acre'))}
    </div>

  </div>
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(4)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Harvesting</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 6 — HARVESTING & LABOUR
   =================================================================== */
function buildStep_harvest(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 7 of 8</div><h2>Harvesting &amp; labour</h2>
    <p>Record how cotton was harvested — by picking round or as a single combined harvest. Labour from weeding and other manual work is captured below and totalled in the report.</p></div>
  <div class="card"><div class="card-title"><span class="idx">7</span>Harvest</div>
    <div class="grid2">
      ${F('Harvest method', SEL('harvestMethod',['Manual picking','Mechanical picker','Mixed'],'Manual picking'))}
      ${F('First picking date', IN('harvestDate','','','date'))}
    </div>
  </div>
  <div class="card"><div class="card-title"><span class="idx wide">7.1</span>Picking</div>
    <div class="grid2" style="margin-bottom:.8rem">
      ${F('Picking entry mode', SEL('pickingMode',['rounds','single'],'rounds'), false, 'rounds = per-picking; single = one total')}
    </div>
    <!-- Round-by-round -->
    <div id="pickRoundsSection">
      <div id="pickRows"></div>
      <button class="add-btn" onclick="addPick()">+ Add a picking round</button>
    </div>
    <!-- Single / combined harvest -->
    <div id="pickSingleSection" style="display:none">
      <div class="grid3">
        ${F('Harvest date', IN('singlePickDate','','','date'))}
        ${F('Total seed cotton picked', UNIT('singlePickQty','','kg'))}
        ${F('Number of pickers / operators', UNIT('singlePickPickers','','people'))}
      </div>
      <div class="grid2" style="margin-top:.6rem">
        ${F('Total days worked', UNIT('singlePickDays','1','days'))}
        ${F('Total labour', UNIT('singlePickLab','','person-days',null), false, 'pickers × days')}
      </div>
    </div>
  </div>
  <div class="card"><div class="card-title"><span class="idx wide">7.2</span>Other manual labour</div>
    <div class="grid2">
      ${F('Manual weeding', UNIT('labWeed','12','person-days'))}
      ${F('Manual fertiliser spreading', UNIT('labFert','4','person-days'))}
    </div>

  </div>
  ${nav(`<button class="btn btn-outline" onclick="gotoStep(5)">&larr; Back</button><button class="btn btn-primary" onclick="nextStep()"><span class="nx"><small>Next step</small>Review</span><span class="arr">&rarr;</span></button>`)}`;
}

/* ===================================================================
   STEP 7 — REVIEW
   =================================================================== */
function buildStep_review(){
  return `
  <div class="step-head"><div class="step-eyebrow">Step 8 of 8</div><h2>Review &amp; calculate</h2>
    <p>A quick check before the result. Anything marked mandatory must be filled.</p></div>
  <div class="card"><div class="card-title"><span class="idx">&#10003;</span>Summary of inputs</div>
    <div id="reviewBody"></div></div>
  <div class="step-foot"><button class="btn btn-outline" onclick="gotoStep(6)">&larr; Back</button>
    <button class="btn btn-cta" id="calcBtn" onclick="calculate()">Calculate footprint <span class="arr">&rarr;</span></button></div>`;
}

function buildStep(key){
  return ({general:buildStep_general,seed:buildStep_seed,fert:buildStep_fert,pest:buildStep_pest,
    mach:buildStep_mach,resid:buildStep_resid,harvest:buildStep_harvest,
    review:buildStep_review})[key]();
}

/* ===================================================================
   WIRING & DYNAMIC ROWS
   =================================================================== */
const ROW = {};  // rowid -> metadata

/* ---------- STEP 1 wiring ---------- */
function wireGeneral(){
  const countrySel=document.getElementById('country');
  const tehField=document.getElementById('tehsilField');
  const cropSel=document.getElementById('crop');
  const $id=id=>document.getElementById(id);
  const optHTML=(list,first)=>(first?`<option value="">${esc(first)}</option>`:'')+
    list.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  /* Province and district switch between a dropdown and a text box depending on
     whether a list exists for the chosen country. Always look elements up by id,
     because swapping replaces the element. */
  function ensure(id,kind,placeholder){
    const el=$id(id); if(!el) return null;
    if(kind==='select' && el.tagName==='SELECT') return el;
    if(kind==='input' && el.tagName==='INPUT') return el;
    const nu=document.createElement(kind==='select'?'select':'input');
    nu.id=id; if(kind==='input'){nu.type='text';nu.placeholder=placeholder||'';nu.autocomplete='off';}
    el.replaceWith(nu); return nu;
  }
  let geoSeq=0;   // ignore answers that arrive after the user changed country again

  function fillTehsilsPK(){
    const prov=$id('province'), distSel=$id('district'), tehSel=$id('tehsil');
    const ts=(D.geo[prov.value]&&D.geo[prov.value][distSel.value])||[];
    tehSel.innerHTML=optHTML(ts,'Select tehsil');
    tehSel.disabled=!distSel.value || !ts.length;
    recompute();
  }
  function fillDistrictsPK(){
    const prov=$id('province'), distSel=ensure('district','select');
    distSel.innerHTML=optHTML(Object.keys(D.geo[prov.value]||{}),'Select district');
    distSel.onchange=fillTehsilsPK;
    fillTehsilsPK();
  }
  function loadPakistan(){
    geoSeq++;
    tehField.style.display='';
    const prov=ensure('province','select');
    prov.innerHTML=Object.keys(D.geo).map(p=>`<option value="${esc(p)}" ${p==='Punjab'?'selected':''}>${esc(p)}</option>`).join('');
    prov.onchange=fillDistrictsPK;
    fillDistrictsPK();
  }
  async function loadGlobalStates(country){
    const seq=++geoSeq;
    tehField.style.display='none';
    const tehSel=$id('tehsil'); tehSel.innerHTML=''; tehSel.disabled=true;
    let prov=ensure('province','select'); prov.innerHTML='<option value="">Loading…</option>'; prov.onchange=null;
    const dist=ensure('district','select'); dist.innerHTML='<option value="">Select district / city</option>';
    let states=[];
    try{ const r=await apiJSON('/api/widgets/geo/states?country='+encodeURIComponent(country)); states=r.data.states||[]; }catch(e){}
    if(seq!==geoSeq) return;
    if(!states.length){
      ensure('province','input','Type province / state');
      ensure('district','input','Type district / city');
      recompute(); return;
    }
    prov=ensure('province','select');
    prov.innerHTML=optHTML(states);
    prov.onchange=()=>loadGlobalCities(country, $id('province').value, seq);
    loadGlobalCities(country, prov.value, seq);
  }
  async function loadGlobalCities(country, state, seq){
    let dist=ensure('district','select'); dist.innerHTML='<option value="">Loading…</option>';
    let cities=[];
    try{ const r=await apiJSON('/api/widgets/geo/cities?country='+encodeURIComponent(country)+'&state='+encodeURIComponent(state)); cities=r.data.cities||[]; }catch(e){}
    if(seq!==geoSeq) return;
    if(!cities.length){ ensure('district','input','Type district / city'); recompute(); return; }
    dist=ensure('district','select');
    dist.innerHTML=optHTML(cities,'Select district / city');
    dist.onchange=recompute;
    recompute();
  }

  countrySel.addEventListener('change',()=>{
    if(countrySel.value==='Pakistan') loadPakistan(); else loadGlobalStates(countrySel.value);
  });
  loadPakistan(); // default country is Pakistan

  /* Crop-aware labels for the land/yield section */
  function updateCropLabels(){
    const crop=(cropSel&&cropSel.value)||'Cotton';
    const areaLbl=document.getElementById('lblArea');
    const yieldLbl=document.getElementById('lblYield');
    if(areaLbl) areaLbl.textContent=crop+' area';
    if(yieldLbl) yieldLbl.textContent='Seed '+crop.toLowerCase()+' yield';
  }
  if(cropSel){ cropSel.addEventListener('change',updateCropLabels); updateCropLabels(); }

  registerCombo('variety',['FH-142','IUB-13','MNH-886','CIM-602','Bt-886','Sitara-008','CRIS-342','Local desi']
    .map(v=>({v,label:v})),null);
}

/* ---------- STEP 2 wiring: seed treatment ---------- */
function wireSeed(){
  const tog=document.getElementById('seedTreatToggle');
  tog.addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;
    tog.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');
    document.getElementById('seedTreatWin').classList.toggle('show',c.dataset.v==='yes');recompute();});
  addTreat();
}
function treatClasses(){return ['Fungicide','Insecticide','Delinting acid','Inoculant / biological','Micronutrient coat','Other'];}
function addTreat(){
  const id=nid(); ROW[id]={kind:'treat'};
  const box=document.createElement('div'); box.className='row-card accent-green'; box.id=id;
  box.innerHTML=`<div class="row-top"><span class="row-tag">Treatment</span>
      <button class="row-del" onclick="delRow('${id}')">&times;</button></div>
    <div class="grid3" style="margin-top:.6rem">
      ${F('Type',SEL(id+'_class',treatClasses(),'Fungicide'))}
      ${F('Product name',IN(id+'_name','','e.g. Imidacloprid'))}
      ${F('Quantity',UNIT(id+'_qty','','g/kg seed'))}
    </div>
    <div class="subwin" id="${id}_other"><div class="subwin-title">Other product details</div>
      <div class="grid3">
        ${F('Custom name',IN(id+'_oname',''))}
        ${F('Active ingredient',UNIT(id+'_oai','','kg a.i./acre'))}
        ${F('Footprint',UNIT(id+'_oef','5.0','kg CO₂e/kg'))}
      </div></div>`;
  document.getElementById('treatRows').appendChild(box);
  document.getElementById(id+'_class').addEventListener('change',e=>{
    document.getElementById(id+'_other').classList.toggle('show',e.target.value==='Other');recompute();});
}

/* ---------- STEP 3 wiring: fertiliser ---------- */
function wireFert(){ addFert(); }
function addFert(){
  const id=nid(); ROW[id]={kind:'fert'};
  const box=document.createElement('div'); box.className='row-card accent-amber'; box.id=id;
  box.innerHTML=`<div class="row-top"><span class="row-tag">Fertiliser</span>
      <button class="row-del" onclick="delRow('${id}')">&times;</button></div>
    <div class="grid2" style="margin-top:.6rem">
      ${F('Product',combo(id+'_prod','Search fertiliser…',[],null),true,'type to search, or Other')}
      ${F('Quantity applied',UNIT(id+'_qty','','kg/acre'),true)}
    </div>
    <div class="subwin" id="${id}_win"></div>`;
  document.getElementById('fertRows').appendChild(box);
  const opts=D.fertilisers.map(f=>({v:f.name,label:f.name,sub:f.note})).concat([{v:'__other__',label:'Other (custom product)…'}]);
  registerCombo(id+'_prod',opts,(v)=>renderFertWin(id,v));
}
function renderFertWin(id,val){
  const win=document.getElementById(id+'_win');
  if(val==='__other__'){
    ROW[id].prod='other';
    win.classList.add('show');
    win.innerHTML=`<div class="subwin-title">Custom fertiliser</div>
      <div class="grid2"><div class="field col2">${''}${F('Product name',IN(id+'_oname',''))}</div></div>
      <div class="field" style="margin-top:.4rem"><label>Which nutrients does it contain?</label>
        <div class="chip-toggle" id="${id}_chips">
          ${Object.keys(D.nutrients).map(k=>`<div class="chip" data-k="${k}">${D.nutrients[k][0]}</div>`).join('')}
        </div></div>
      <div class="grid3" id="${id}_nuts"></div>
      <div class="grid2" style="margin-top:.5rem">${F('Manufacturing footprint',UNIT(id+'_oef','1.00','kg CO₂e/kg product'))}</div>`;
    const chips=document.getElementById(id+'_chips');
    chips.addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;c.classList.toggle('on');
      const k=c.dataset.k, wrap=document.getElementById(id+'_nuts'), fid=id+'_nut_'+k;
      if(c.classList.contains('on')){ if(!document.getElementById(fid)){
        const d=document.createElement('div'); d.innerHTML=F(D.nutrients[k][0],UNIT(fid,'',D.nutrients[k][1])); d.firstElementChild.dataset.nk=k; wrap.appendChild(d.firstElementChild);} }
      else { const ex=document.getElementById(fid); if(ex&&ex.closest('.field')) ex.closest('.field').remove(); }
      recompute();});
    recompute(); return;
  }
  const f=D.fertilisers.find(x=>x.name===val); if(!f){win.classList.remove('show');win.innerHTML='';return;}
  ROW[id].prod=f.name; ROW[id].prodEF=f.prodEF;
  win.classList.add('show');
  const keys=Object.keys(f.nutrients);
  win.innerHTML=`<div class="subwin-title">Nutrient content — ${esc(f.name)}</div>
    <div class="grid3">
      ${keys.map(k=>{const wrap=`<div class="field" data-nk="${k}"><label>${D.nutrients[k][0]}</label>${UNIT(id+'_nut_'+k,f.nutrients[k],D.nutrients[k][1])}</div>`;return wrap;}).join('')}
    </div>
`;
  recompute();
}

/* ---------- STEP 4 wiring: crop protection ---------- */
function wirePest(){ addPest(); }
function addPest(){
  const id=nid(); ROW[id]={kind:'pest'};
  const box=document.createElement('div'); box.className='row-card accent-green'; box.id=id;
  const classes=D.protection.map(p=>p[0]);
  box.innerHTML=`<div class="row-top"><span class="row-tag">Product</span>
      <button class="row-del" onclick="delRow('${id}')">&times;</button></div>
    <div class="grid3" style="margin-top:.6rem">
      ${F('Class',SEL(id+'_class',classes,'Insecticide'),true)}
      ${F('Product name',IN(id+'_name','Imidacloprid','optional'))}
      ${F('Rate',UNIT(id+'_rate','0.5','kg a.i./acre'),true)}
    </div>
    <div class="grid3" style="margin-top:.6rem">
      ${F('Number of passes',UNIT(id+'_pass','1','times'))}
      ${F('Area treated',UNIT(id+'_area','10.4','acre'))}
      ${F('Application method',SEL(id+'_method',['Boom sprayer','Knapsack','Aerial','Granular','Seed dressing'],'Boom sprayer'))}
    </div>
    <div class="subwin" id="${id}_other"><div class="subwin-title">Other product</div>
      <div class="grid2">${F('Custom class / name',IN(id+'_oname',''))}${F('Footprint',UNIT(id+'_oef','5.0','kg CO₂e/kg a.i.'))}</div></div>`;
  document.getElementById('pestRows').appendChild(box);
  document.getElementById(id+'_class').addEventListener('change',e=>{
    document.getElementById(id+'_other').classList.toggle('show',e.target.value==='Other');recompute();});
}

/* ---------- STEP 5 wiring: irrigation ---------- */
function wireIrrig(){
  const sel=document.getElementById('irrigSys');
  sel.addEventListener('change',renderIrrigEnergy);
  renderIrrigEnergy();
}
function irrigInfo(label){return D.irrigation.find(x=>x.label===label)||{energy:'none'};}
function renderIrrigEnergy(){
  const sys=document.getElementById('irrigSys').value, info=irrigInfo(sys), wrap=document.getElementById('irrigEnergy');
  let html='';
  if(info.energy==='electric'){
    html=`<div class="grid2" style="margin-top:.9rem">${F('Electricity used',UNIT('irrigKwh','130','kWh/acre'),true)}
      ${F('Pump / motor rating',UNIT('irrigMotor','','HP'),false,'optional')}</div>`;
  } else if(info.energy==='diesel'){
    html=`<div class="grid2" style="margin-top:.9rem">${F('Diesel used',UNIT('irrigDiesel','60','L/acre'),true)}
      ${F('Engine rating',UNIT('irrigEng','','HP'),false,'optional')}</div>`;
  } else if(info.energy==='petrol'){
    html=`<div class="grid2" style="margin-top:.9rem">${F('Petrol used',UNIT('irrigPetrol','45','L/acre'),true)}
      ${F('Engine rating',UNIT('irrigEng','','HP'),false,'optional')}</div>`;
  } else if(info.energy==='solar'){
    html=`<div class="grid2" style="margin-top:.9rem">${F('Solar pump output',UNIT('irrigSolar','130','kWh/acre'))}</div>`;
  } else if(info.energy==='mixed'){
    html=`<div class="grid3" style="margin-top:.9rem">${F('Canal share',UNIT('irrigCanalPct','50','%'))}
      ${F('Tube-well electricity',UNIT('irrigKwh','80','kWh/acre'))}
      ${F('Tube-well diesel',UNIT('irrigDiesel','0','L/acre'))}</div>`;
  }
  wrap.innerHTML=html;
  recompute();
}

/* ---------- STEP 6 wiring: machinery ---------- */
function wireMach(){ addMach(); }
function addMach(){
  const id=nid(); ROW[id]={kind:'mach'};
  const acts=['— Cumulative (total diesel only) —',...Object.keys(D.activities)];
  const box=document.createElement('div'); box.className='row-card accent-blue'; box.id=id;
  box.innerHTML=`<div class="row-top"><span class="row-tag">Operation</span>
      <button class="row-del" onclick="delRow('${id}')">&times;</button></div>
    <div class="grid2" style="margin-top:.6rem">
      ${F('Activity',SEL(id+'_act',acts,acts[1]),true)}
      ${F('Implement / operation',SEL(id+'_impl',[],''),true)}
    </div>
    <div id="${id}_body"></div>`;
  document.getElementById('machRows').appendChild(box);
  document.getElementById(id+'_act').addEventListener('change',()=>fillImpl(id));
  document.getElementById(id+'_impl').addEventListener('change',()=>machBody(id));
  fillImpl(id);
}
function fillImpl(id){
  const act=document.getElementById(id+'_act').value;
  const impl_sel=document.getElementById(id+'_impl');
  const impl_field=impl_sel.closest('.field');
  if(act.startsWith('\u2014')){
    impl_sel.innerHTML='<option value="">\u2014 not applicable \u2014</option>';
    impl_sel.disabled=true;
    if(impl_field){
      impl_field.classList.remove('err');
      const req=impl_field.querySelector('.req');
      if(req) req.remove();
    }
    ROW[id].cumulative=true; machBody(id); return;
  }
  ROW[id].cumulative=false; impl_sel.disabled=false;
  if(impl_field && !impl_field.querySelector('.req')){
    impl_field.querySelector('label').insertAdjacentHTML('beforeend',' <span class="req">*</span>');
  }
  const impls=D.activities[act]||[];
  impl_sel.innerHTML=impls.map(im=>`<option value="${esc(im[0])}">${esc(im[0])}</option>`).join('');
  machBody(id);
}
function machBody(id){
  const act=document.getElementById(id+'_act').value, impl=document.getElementById(id+'_impl').value;
  const body=document.getElementById(id+'_body');
  if(ROW[id].cumulative){
    body.innerHTML=`<div class="inline-note"><b>Cumulative mode.</b> Enter the total diesel used across all field operations. Implement, tractor, area and passes are not needed.</div><div class="grid2" style="margin-top:.4rem">${F('Total diesel used',UNIT(id+'_diesel','','litres (total)'),true)}${F('Labour',UNIT(id+'_lab','1','person-days'))}</div>`;
    ['_diesel','_lab'].forEach(s=>{const el=document.getElementById(id+s);if(el){el.addEventListener('input',recompute);el.addEventListener('change',recompute);}});
    recompute(); return;
  }
  const rec=(D.activities[act]||[]).find(x=>x[0]===impl)||[impl,0];
  const base=rec[1];
  ROW[id].base=base;
  const tractors=D.tractors.map(t=>t[0]);
  const direct=(base===0);
  let html='';
  if(!direct){
    html=`<div class="grid3" style="margin-top:.6rem">
      ${F('Tractor',SEL(id+'_hp',tractors,tractors[3]),true,'HP affects diesel')}
      ${F('Area / pass',UNIT(id+'_area','10.4','acre'))}
      ${F('Number of passes',UNIT(id+'_pass','1','times'))}</div>
      <div class="grid2" style="margin-top:.6rem">
      ${F('Diesel',UNIT(id+'_diesel','12','L'))}
      ${F('Labour',UNIT(id+'_lab','1','person-days'))}</div>
`;
  } else {
    // direct-fuel activities (transport, irrigation run)
    html=`<div class="grid3" style="margin-top:.6rem">
      ${F('Energy source',SEL(id+'_fuel',['Diesel','Petrol','Electricity','Solar','None'],'Diesel'))}
      ${F('Quantity',UNIT(id+'_qty','','L or kWh (whole job)'))}
      ${F('Labour',UNIT(id+'_lab','1','person-days'))}</div>
      ${act==='Transport'?`<div class="grid2" style="margin-top:.6rem">${F('Distance',UNIT(id+'_dist','','km'),false,'optional')}${F('Load',UNIT(id+'_load','','tonnes'),false,'optional')}</div>`:''}`;
  }
  body.innerHTML=html;
  ['_hp','_area','_pass','_diesel','_fuel','_qty','_lab'].forEach(s=>{const el=document.getElementById(id+s);if(el)el.addEventListener('input',()=>{machCalc(id);recompute();});el&&el.addEventListener&&el.addEventListener('change',()=>{machCalc(id);recompute();});});
  machCalc(id); recompute();
}
function hpOf(id){const sel=document.getElementById(id+'_hp');if(!sel)return D.refHp;const t=D.tractors.find(x=>x[0]===sel.value);return t?t[1]:D.refHp;}
function machCalc(id){}

/* ---------- STEP 7 wiring: residue ---------- */
function wireResid(){
  document.getElementById('residMethod').addEventListener('change',residLogic);
  residLogic();
}
function residMethodKind(label){const r=D.residue.find(x=>x.label===label);return r?r.kind:'incorp';}
function residLogic(){
  const label=document.getElementById('residMethod').value, kind=residMethodKind(label);
  const burn=(kind==='burn');
  ['residQty','residArea','residShare'].forEach(f=>{const el=document.getElementById(f);if(el){el.disabled=!burn;if(!burn)el.closest('.field').classList.add('dim');else el.closest('.field').classList.remove('dim');}});

  recompute();
}

/* ---------- STEP 8 wiring: harvest pickings ---------- */
function wireHarvest(){
  const modeEl=document.getElementById('pickingMode');
  if(modeEl) modeEl.addEventListener('change',()=>{togglePickMode();recompute();});
  ['singlePickPickers','singlePickDays'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('input',()=>{
      const lab=num(getVal('singlePickPickers'))*(num(getVal('singlePickDays'))||1);
      setVal('singlePickLab',lab?lab:'');recompute();
    });
  });
  togglePickMode();
}
function togglePickMode(){
  const mode=getVal('pickingMode')||'rounds';
  const roundsDiv=document.getElementById('pickRoundsSection');
  const singleDiv=document.getElementById('pickSingleSection');
  if(roundsDiv) roundsDiv.style.display=mode==='rounds'?'':'none';
  if(singleDiv) singleDiv.style.display=mode==='single'?'':'none';
  if(mode==='rounds' && document.querySelectorAll('#pickRows .row-card').length===0){addPick();addPick();}
}
let PICKN=0;
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function addPick(){
  const id=nid(); ROW[id]={kind:'pick'}; PICKN++;
  const box=document.createElement('div'); box.className='row-card accent-green'; box.id=id;
  box.dataset.pick=PICKN;
  box.innerHTML=`<div class="row-top"><span class="row-tag" id="${id}_lbl">${ordinal(PICKN)} picking</span>
      <button class="row-del" onclick="delRow('${id}');renumberPicks()">&times;</button></div>
    <div class="grid3" style="margin-top:.6rem">
      ${F('Date',IN(id+'_date','','','date'))}
      ${F('Seed cotton picked',UNIT(id+'_qty','','kg'))}
      ${F('Number of pickers',UNIT(id+'_pickers','','people'))}
    </div>
    <div class="grid2" style="margin-top:.6rem">
      ${F('Days worked',UNIT(id+'_days','1','days'))}
      ${F('Labour',UNIT(id+'_lab','','person-days',null),false,'pickers × days')}
    </div>`;
  document.getElementById('pickRows').appendChild(box);
  ['_pickers','_days'].forEach(s=>document.getElementById(id+s).addEventListener('input',()=>{
    const lab=num(getVal(id+'_pickers'))*(num(getVal(id+'_days'))||1);setVal(id+'_lab',lab?lab:'');recompute();}));
}
function renumberPicks(){let n=0;$$('#pickRows .row-card').forEach(b=>{n++;b.dataset.pick=n;
  const l=b.querySelector('.row-tag');if(l)l.textContent=ordinal(n)+' picking';});PICKN=n;}

function delRow(id){const el=document.getElementById(id);if(el)el.remove();delete ROW[id];recompute();}

/* ===================================================================
   COMPUTE
   =================================================================== */
function computeAll(){
  const area=num(getVal('area'))||num(getVal('hArea'))||1;
  const hArea=num(getVal('hArea'))||area;
  const yieldA=num(getVal('yield'));
  const S={fert:0,irrig:0,land:0,resid:0,mach:0,pest:0};
  let water=0, labour=0, fertDetail={dir:0,ind:0,urea:0,mfg:0};

  // fertiliser
  Object.keys(ROW).filter(k=>ROW[k].kind==='fert').forEach(id=>{
    const qty=num(getVal(id+'_qty')); if(qty<=0)return;
    const kg=qty*area;
    let nPct=0, prodEF=1.0, isUrea=false;
    if(ROW[id].prod==='other'){
      prodEF=num(getVal(id+'_oef'))||1.0;
      const nEl=document.getElementById(id+'_nut_N'); nPct=nEl?num(nEl.value):0;
      isUrea=false;
    } else if(ROW[id].prod){
      const nEl=document.getElementById(id+'_nut_N'); nPct=nEl?num(nEl.value):0;
      prodEF=ROW[id].prodEF||1.0; isUrea=/urea/i.test(ROW[id].prod);
    } else return;
    const N=kg*nPct/100;
    const dir=N*D.ef.ef1_direct*(44/28)*D.ef.n2o_gwp;
    const ind=N*D.ef.fracgasf*D.ef.ef4_indirect*(44/28)*D.ef.n2o_gwp;
    const urea=isUrea?kg*D.ef.urea_co2:0;
    const mfg=kg*prodEF;
    fertDetail.dir+=dir;fertDetail.ind+=ind;fertDetail.urea+=urea;fertDetail.mfg+=mfg;
    S.fert+=dir+ind+urea+mfg;
  });

  // seed treatment (folds into crop protection)
  Object.keys(ROW).filter(k=>ROW[k].kind==='treat').forEach(id=>{
    const cls=getVal(id+'_class');
    if(cls==='Other'){const ai=num(getVal(id+'_oai')),ef=num(getVal(id+'_oef'))||5;S.pest+=ai*ef*area;}
  });

  // crop protection
  Object.keys(ROW).filter(k=>ROW[k].kind==='pest').forEach(id=>{
    const cls=getVal(id+'_class'); const rate=num(getVal(id+'_rate')); if(rate<=0)return;
    const pass=num(getVal(id+'_pass'))||1, ar=num(getVal(id+'_area'))||area;
    let ef=5.0; const p=D.protection.find(x=>x[0]===cls); if(p)ef=p[1];
    if(cls==='Other')ef=num(getVal(id+'_oef'))||5.0;
    S.pest+=rate*pass*ar*ef;
  });

  // irrigation
  const sys=getVal('irrigSys'), info=irrigInfo(sys), iArea=num(getVal('irrigArea'))||area;
  if(info.energy==='electric')S.irrig+=num(getVal('irrigKwh'))*iArea*D.ef.grid;
  else if(info.energy==='diesel')S.irrig+=num(getVal('irrigDiesel'))*iArea*D.ef.diesel;
  else if(info.energy==='petrol')S.irrig+=num(getVal('irrigPetrol'))*iArea*D.ef.petrol;
  else if(info.energy==='solar')S.irrig+=num(getVal('irrigSolar'))*iArea*D.ef.solar;
  else if(info.energy==='mixed')S.irrig+=(num(getVal('irrigKwh'))*iArea*D.ef.grid)+(num(getVal('irrigDiesel'))*iArea*D.ef.diesel);
  // water (reported)
  const vol=num(getVal('irrigVol')); const cnt=num(getVal('irrigCount')); const depth=num(getVal('irrigDepth'));
  if(vol>0) water=vol*iArea; else if(cnt>0&&depth>0) water=cnt*depth*0.0254*4046.86*iArea; // inches->m3/acre approx

  // machinery
  Object.keys(ROW).filter(k=>ROW[k].kind==='mach').forEach(id=>{
    const act=getVal(id+'_act');
    labour+=num(getVal(id+'_lab'));
    let e=0;
    if(ROW[id].base===0){
      const fuel=getVal(id+'_fuel'), q=num(getVal(id+'_qty'));
      if(fuel==='Diesel')e=q*D.ef.diesel; else if(fuel==='Petrol')e=q*D.ef.petrol;
      else if(fuel==='Electricity')e=q*D.ef.grid; else if(fuel==='Solar')e=q*D.ef.solar;
    } else {
      const override=getVal(id+'_diesel'); let litres;
      if(override!=='' && override!=null) litres=num(override);
      else { const hp=hpOf(id),ar=num(getVal(id+'_area')),pass=num(getVal(id+'_pass'))||1; litres=ROW[id].base*(hp/D.refHp)*ar*pass; }
      e=litres*D.ef.diesel;
    }
    if(act==='Land preparation') S.land+=e; else S.irrig+=(act==='Irrigation (machinery run)'?e:0), S.mach+=(act==='Irrigation (machinery run)'?0:e);
  });

  // residue burning
  const rlabel=getVal('residMethod');
  if(residMethodKind(rlabel)==='burn'){
    const q=num(getVal('residQty')), ra=num(getVal('residArea'))||area, share=(num(getVal('residShare'))||100)/100;
    const dm=q*ra*1000*share;
    const factor=D.ef.burn_co2 + D.ef.burn_ch4*D.ef.ch4_gwp + D.ef.burn_n2o*D.ef.n2o_gwp;
    S.resid+=dm*factor;
  }

  // labour from other steps
  labour+=num(getVal('labWeed'))+num(getVal('labFert'))+num(getVal('labOther'));
  Object.keys(ROW).filter(k=>ROW[k].kind==='pick').forEach(id=>labour+=num(getVal(id+'_lab')));

  const total=S.fert+S.irrig+S.land+S.resid+S.mach+S.pest;
  const produced=yieldA*hArea;
  const iSeed=produced>0?total/produced:0;
  const gin=(num(getVal('ginOut'))||35)/100;
  const iLint=produced>0?total/(produced*gin):0;
  const iAcre=hArea>0?total/hArea:0;
  return {S,total,produced,iSeed,iLint,iAcre,water,labour,fertDetail,area,hArea,yieldA};
}

/* ===================================================================
  CALCULATION STATE
   =================================================================== */
let resChart1, resChart2;
function recompute(){
  let R; try{R=computeAll();}catch(e){console.error(e);return;}
  LAST=R;
}

/* ===================================================================
   REVIEW
   =================================================================== */
function buildReview(){
  const R=computeAll();
  const nFert=Object.keys(ROW).filter(k=>ROW[k].kind==='fert').length;
  const nPest=Object.keys(ROW).filter(k=>ROW[k].kind==='pest').length;
  const nMach=Object.keys(ROW).filter(k=>ROW[k].kind==='mach').length;
  const nPick=Object.keys(ROW).filter(k=>ROW[k].kind==='pick').length;
  $('#reviewBody').innerHTML=`
    <div class="grid2">
      <div class="er2"><b>Farmer</b><span>${esc(getVal('farmerName')||'—')}</span></div>
      <div class="er2"><b>Location</b><span>${esc([getVal('tehsil')||getVal('district'),getVal('province'),getVal('country')].filter(Boolean).join(', ')||'—')}</span></div>
      <div class="er2"><b>Area</b><span>${esc(getVal('area')||'—')} acre</span></div>
      <div class="er2"><b>Yield</b><span>${esc(getVal('yield')||'—')} kg/acre</span></div>
      <div class="er2"><b>Fertilisers</b><span>${nFert} product(s)</span></div>
      <div class="er2"><b>Crop protection</b><span>${nPest} product(s)</span></div>
      <div class="er2"><b>Field operations</b><span>${nMach}</span></div>
      <div class="er2"><b>Pickings</b><span>${nPick}</span></div>
      <div class="er2"><b>Irrigation</b><span>${esc(getVal('irrigSys'))}</span></div>
      <div class="er2"><b>Residue</b><span>${esc(getVal('residMethod'))}</span></div>
    </div>
`;
}

/* ===================================================================
   CALCULATE + RESULTS
   =================================================================== */
let RESULT=null, LAST=null;
function validate(){
  const req=['farmerName','area','hArea','yield','season'];
  let bad=null;
  req.forEach(id=>{const el=document.getElementById(id);if(el){const v=(el.value||'').trim();
    if(v===''||(el.closest('.unit-in')&&isNaN(num(v)))){el.closest('.field')&&el.closest('.field').classList.add('err');if(!bad)bad=el;}
    else el.closest('.field')&&el.closest('.field').classList.remove('err');}});
  ['province','district','tehsil'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const field=el.closest('.field');
    const applicable=!el.disabled
      && !(el.tagName==='SELECT' && el.options.length<=1 && !el.value)
      && !(id==='tehsil' && document.getElementById('tehsilField').style.display==='none');
    if(applicable && !getVal(id)){bad=bad||el;field&&field.classList.add('err');}
    else field&&field.classList.remove('err');
  });
  return bad;
}
let CALC_IN_PROGRESS=false;
function calculate(){
  if(CALC_IN_PROGRESS) return; // guard against double-click / double-submit
  const bad=validate();
  if(bad){gotoStep(0);setTimeout(()=>{try{bad.focus();}catch(e){}},80);toast('Please complete the highlighted mandatory fields');return;}
  CALC_IN_PROGRESS=true;
  const btn=document.getElementById('calcBtn');
  if(btn){btn.disabled=true;btn.style.opacity='.65';btn.style.cursor='not-allowed';}
  try{
    RESULT=computeAll();renderResults();showScreen('scResults');showSuccessBurst();
    saveToDb().finally(()=>{
      CALC_IN_PROGRESS=false;
      if(btn){btn.disabled=false;btn.style.opacity='';btn.style.cursor='';}
    });
  }
  catch(e){
    console.error(e);showError('Calculation failed: '+(e.message||'error'));
    CALC_IN_PROGRESS=false;
    if(btn){btn.disabled=false;btn.style.opacity='';btn.style.cursor='';}
  }
}

async function saveToDb(){
  if(!IS_AUTHED) return;
  const R=RESULT;
  const payload={
    farm_id:getVal('farmId'), farmer_name:getVal('farmerName'),
    country:getVal('country'), province:getVal('province'), district:getVal('district'),
    tehsil:getVal('tehsil'), village:getVal('village'),
    area:num(getVal('area')), harvested_area:num(getVal('hArea')||getVal('area')),
    soil_texture:getVal('soilTexture'), soil_organic_matter:getVal('som'), soil_drainage:getVal('drainage'),
    soil_ph:getVal('ph'), climate:getVal('climate'), moisture_regime:getVal('moisture'),
    season:getVal('season'), crop:getVal('crop')||'Cotton', variety:getVal('variety'),
    seed_rate:num(getVal('seedRate')), seed_source:getVal('seedSource'), seed_cotton_yield:num(getVal('yield')),
    fertiliser_data:collectFertData(), irrigation_data:collectIrrigData(), machinery_data:collectMachData(),
    pest_protection_data:collectPestData(), residue_data:collectResidueData(), labour_data:collectLabourData(),
    total_co2_equiv:R.total, intensity_per_kg:R.iSeed, breakdown:R.S||{},
    results:{iSeed:R.iSeed,iLint:R.iLint,iAcre:R.iAcre,water:R.water,labour:R.labour,produced:R.produced,fertDetail:R.fertDetail},
  };
  try{
    const r=await apiJSON('/api/history/save',{method:'POST',body:payload});
    if(r.ok) toast('Saved to your history');
    else toast(r.data.detail||'The result is shown but could not be saved to history.');
  }catch(e){
    toast('The result is shown but could not be saved. Check your connection.');
  }
}

// ── Data collectors: what was entered, saved with each calculation ────────────
function rowsOf(kind){return Object.keys(ROW).filter(k=>ROW[k].kind===kind);}
function nutrientsOf(id){
  const out={}; Object.keys(D.nutrients).forEach(k=>{const el=document.getElementById(id+'_nut_'+k);if(el&&el.value!=='')out[k]=num(el.value);});
  return out;
}
function collectFertData(){
  return {unit:'kg/acre', applications: rowsOf('fert').map(id=>{
    const other=ROW[id].prod==='other';
    return {product: other?(getVal(id+'_oname')||'Other'):(ROW[id].prod||getVal(id+'_prod')||''),
      custom: other, qty_kg_per_acre: num(getVal(id+'_qty')), nutrients_pct: nutrientsOf(id),
      manufacturing_ef: other?num(getVal(id+'_oef')):(ROW[id].prodEF||null)};
  }).filter(a=>a.product||a.qty_kg_per_acre)};
}
function collectIrrigData(){
  return {
    system:getVal('irrigSys')||'', energy:irrigInfo(getVal('irrigSys')).energy,
    area_acre:num(getVal('irrigArea')), count:num(getVal('irrigCount')),
    depth_in:num(getVal('irrigDepth')), vol_m3_per_acre:num(getVal('irrigVol')),
    kwh_per_acre:num(getVal('irrigKwh')), diesel_l_per_acre:num(getVal('irrigDiesel')),
    petrol_l_per_acre:num(getVal('irrigPetrol')), solar_kwh_per_acre:num(getVal('irrigSolar')),
    canal_share_pct:num(getVal('irrigCanalPct')),
  };
}
function collectMachData(){
  return {operations: rowsOf('mach').map(id=>({
    activity:getVal(id+'_act'), implement:getVal(id+'_impl'), cumulative:!!ROW[id].cumulative,
    tractor:getVal(id+'_hp'), area_acre:num(getVal(id+'_area')), passes:num(getVal(id+'_pass')),
    diesel_l:getVal(id+'_diesel')===''?null:num(getVal(id+'_diesel')),
    fuel:getVal(id+'_fuel'), quantity:num(getVal(id+'_qty')), labour_days:num(getVal(id+'_lab')),
  }))};
}
function collectPestData(){
  const treated=!!document.querySelector('#seedTreatToggle .chip.on[data-v="yes"]');
  return {
    applications: rowsOf('pest').map(id=>({class:getVal(id+'_class'),
      product:getVal(id+'_class')==='Other'?(getVal(id+'_oname')||'Other'):getVal(id+'_name'),
      rate_kg_ai_per_acre:num(getVal(id+'_rate')), passes:num(getVal(id+'_pass')),
      area_acre:num(getVal(id+'_area')), method:getVal(id+'_method'),
      footprint_ef:getVal(id+'_class')==='Other'?num(getVal(id+'_oef')):null})),
    seed_treated: treated,
    seed_treatments: treated ? rowsOf('treat').map(id=>({type:getVal(id+'_class'),
      product:getVal(id+'_class')==='Other'?(getVal(id+'_oname')||'Other'):getVal(id+'_name'),
      qty_g_per_kg_seed:num(getVal(id+'_qty')), ai_kg_per_acre:num(getVal(id+'_oai'))})) : [],
  };
}
function collectResidueData(){
  return {method:getVal('residMethod')||'', kind:residMethodKind(getVal('residMethod')),
    qty_t_per_acre:num(getVal('residQty')), area_acre:num(getVal('residArea'))};
}
function collectLabourData(){
  return {
    weeding_days:num(getVal('labWeed')), fertiliser_days:num(getVal('labFert')),
    harvest_method:getVal('harvestMethod')||'', first_picking:getVal('harvestDate')||'',
    picking_mode:getVal('pickingMode')||'rounds',
    pickings: getVal('pickingMode')==='single'
      ? [{date:getVal('singlePickDate'),qty_kg:num(getVal('singlePickQty')),pickers:num(getVal('singlePickPickers')),
          days:num(getVal('singlePickDays')),labour_days:num(getVal('singlePickLab'))}]
      : rowsOf('pick').map(id=>({date:getVal(id+'_date'),qty_kg:num(getVal(id+'_qty')),pickers:num(getVal(id+'_pickers')),
          days:num(getVal(id+'_days')),labour_days:num(getVal(id+'_lab'))})),
  };
}
function renderResults(){
  const R=RESULT||computeAll(); RESULT=R;
  const order=['fert','irrig','land','resid','mach','pest'];
  const rows=order.map(k=>({k,v:R.S[k]})).sort((a,b)=>b.v-a.v);
  const maxv=Math.max(...rows.map(r=>r.v),1);
  const vsNat=R.iSeed>0?(R.iSeed/D.ef.nat_avg-1):0;

  /* Gauge: map iSeed to 0-180 degrees (0=best, 180=worst). nat_avg at 135deg */
  const gaugeMax = D.ef.nat_avg * 2;
  const gaugePct = Math.min(R.iSeed / gaugeMax, 1);
  const needleAngle = -90 + gaugePct * 180; // -90 (left) to +90 (right)
  const gaugeColor = R.iSeed <= D.ef.nat_avg * 0.75 ? '#22c55e'
                   : R.iSeed <= D.ef.nat_avg ? '#f59e0b' : '#ef4444';

  const farmLbl=[getVal('farmerName'),getVal('farmId')].filter(Boolean).map(esc).join(' · ');
  const placeLbl=[getVal('tehsil')||getVal('district'),getVal('province')].filter(Boolean).map(esc).join(', ');
  const pctOf=v=>R.total>0?v/R.total*100:0;
  const pctTxt=v=>{const p=pctOf(v);return p>0&&p<1?'<1%':Math.round(p)+'%';};
  const RI={seed:'<path pathLength="1" d="M7 20h10" /> <path pathLength="1" d="M10 20c5.5-2.5.8-6.4 3-10" /> <path pathLength="1" d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /> <path pathLength="1" d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />',lint:'<path pathLength="1" d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />',acre:'<rect pathLength="1" width="18" height="18" x="3" y="3" rx="2" /> <path pathLength="1" d="M3 9h18" /> <path pathLength="1" d="M3 15h18" /> <path pathLength="1" d="M9 3v18" /> <path pathLength="1" d="M15 3v18" />',water:'<path pathLength="1" d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />',people:'<path pathLength="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <circle pathLength="1" cx="9" cy="7" r="4" /> <path pathLength="1" d="M22 21v-2a4 4 0 0 0-3-3.87" /> <path pathLength="1" d="M16 3.13a4 4 0 0 1 0 7.75" />',boll:'<path pathLength="1" d="M2 22 16 8" /> <path pathLength="1" d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /> <path pathLength="1" d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /> <path pathLength="1" d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /> <path pathLength="1" d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /> <path pathLength="1" d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /> <path pathLength="1" d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /> <path pathLength="1" d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />',ratio:'<path pathLength="1" d="M3 3v16a2 2 0 0 0 2 2h16" /> <path pathLength="1" d="m19 9-5 5-4-4-3 3" />'};
  const svgI=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RI[k]}</svg>`;
  const waterInt=R.produced>0&&R.water>0?(R.water/R.produced*1000):0;
  $('#resInner').innerHTML=`
    <div class="res-top">
      <div><h1>Season results</h1><p>${farmLbl||'Farm'}${placeLbl?' · '+placeLbl:''}${getVal('season')?' · '+esc(getVal('season')):''}</p></div>
      <div class="res-actions">
        <button class="btn btn-outline btn-sm" onclick="editInputs()">&larr; Edit inputs</button>
        <button class="btn btn-outline btn-sm" onclick="startCalc()">New calculation</button>
        <button class="btn btn-primary btn-sm" onclick="openDownload()">${D.icons.dl} Download report</button>
      </div>
    </div>
    <div class="res-hero">
      <div><div class="lbl">Total carbon footprint (farm gate)</div>
        <div class="val" data-count-up="${(R.total/1000).toFixed(1)}" data-decimals="1">0</div>
        <div class="unit">t CO₂e · <span data-count-up="${fmt0(R.total)}" data-decimals="0">0</span> kg · ${fmt0(R.iAcre)} kg per acre</div></div>
      <div class="res-badge"><span>Intensity vs national average</span><b data-count-up="${R.iSeed.toFixed(2)}" data-decimals="2">0</b>
        <div style="font-size:12px;opacity:.8">kg CO₂e per kg seed cotton</div>
        <div style="font-size:12.5px;font-weight:700;color:${vsNat<0?'#9fe3b6':'#fecaca'};margin-top:4px">
          ${vsNat<0?'↓ '+Math.round(-vsNat*100)+'% below':'↑ '+Math.round(vsNat*100)+'% above'} the ${D.ef.nat_avg} national average</div></div>
    </div>
    <div class="res-cards">
      <div class="rcard"><div class="ri">${svgI('seed')}</div><div><div class="v" data-count-up="${R.iSeed.toFixed(2)}" data-decimals="2">0</div><div class="l">kg CO₂e per kg seed cotton</div></div></div>
      <div class="rcard"><div class="ri">${svgI('lint')}</div><div><div class="v" data-count-up="${R.iLint.toFixed(2)}" data-decimals="2">0</div><div class="l">kg CO₂e per kg lint</div></div></div>
      <div class="rcard"><div class="ri">${svgI('acre')}</div><div><div class="v" data-count-up="${fmt0(R.iAcre)}" data-decimals="0">0</div><div class="l">kg CO₂e per acre</div></div></div>
    </div>
    <div class="res-grid">
      <div class="card"><div class="card-title">Emission sources <small>share of total</small></div>
        <div class="dn-wrap">
          <div class="dn-chart"><canvas id="rDonut" width="200" height="200"></canvas>
            <div class="dn-center"><b>${(R.total/1000).toFixed(1)}</b><span>t CO₂e</span></div></div>
          <div class="dn-legend">
            ${rows.map(r=>`<div class="dn-row"><i style="background:${SRC_COLORS[r.k]}"></i><span>${SRC_NAMES[r.k]}</span><b>${pctTxt(r.v)}</b></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card"><div class="card-title">Breakdown <small>kg CO₂e</small></div>
        ${rows.map(r=>`<div class="bd-item"><span class="bd-sw" style="background:${SRC_COLORS[r.k]}"></span>
          <span>${SRC_NAMES[r.k]}</span><span class="bd-bar-wrap"><span class="bd-bar" style="width:${Math.max(r.v>0?2:0,Math.round(r.v/maxv*100))}%;background:${SRC_COLORS[r.k]}"></span></span>
          <span class="bd-pct">${pctTxt(r.v)}</span><span class="bd-kg">${fmt0(r.v)}</span></div>`).join('')}
      </div>
    </div>
    <div class="res-grid">
      <div class="card">
        <div class="card-title">Against the national average <small>kg CO₂e / kg seed cotton</small></div>
        <div class="gauge-wrap">
          <svg class="gauge-svg" viewBox="0 0 200 112">
            <path d="M 15,100 A 85,85 0 0,1 185,100" fill="none" stroke="#e6ece5" stroke-width="14" stroke-linecap="round"/>
            <path id="gaugeArc" d="M 15,100 A 85,85 0 0,1 185,100" fill="none" stroke="${gaugeColor}" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="267" stroke-dashoffset="${267 - 267*gaugePct}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)"/>
            <line x1="100" y1="8" x2="100" y2="26" stroke="#10231a" stroke-width="2" stroke-linecap="round" transform="rotate(${-90 + (D.ef.nat_avg/gaugeMax)*180}, 100, 100)"/>
            <g class="gauge-needle" id="gaugeNeedle" style="transform:rotate(${needleAngle}deg)">
              <line x1="100" y1="103" x2="100" y2="34" stroke="#10231a" stroke-width="3" stroke-linecap="round"/>
              <circle cx="100" cy="100" r="6" fill="#10231a"/><circle cx="100" cy="100" r="2.5" fill="#fff"/>
            </g>
          </svg>
          <div class="gauge-scale"><span>0</span><span>National average ${D.ef.nat_avg}</span><span>${gaugeMax.toFixed(1)}</span></div>
          <div class="gauge-read"><b>${R.iSeed.toFixed(2)}</b><span>kg CO₂e per kg seed cotton</span></div>
          <div class="gauge-tag" style="color:${gaugeColor};background:${gaugeColor}1a">
            ${vsNat<0?'↓ '+Math.round(-vsNat*100)+'% below national average':'↑ '+Math.round(vsNat*100)+'% above national average'}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Beyond carbon</div>
        <div class="xgrid">
          <div class="xcard"><div class="ico">${svgI('water')}</div><div><div class="v" data-count-up="${R.water>0?fmt0(R.water):'0'}" data-decimals="0">${R.water>0?'0':'—'}</div><div class="l">m³ water used</div></div></div>
          <div class="xcard"><div class="ico">${svgI('people')}</div><div><div class="v" data-count-up="${fmt0(R.labour)}" data-decimals="0">0</div><div class="l">person-days of labour</div></div></div>
          <div class="xcard"><div class="ico">${svgI('boll')}</div><div><div class="v" data-count-up="${fmt0(R.produced)}" data-decimals="0">0</div><div class="l">kg seed cotton</div></div></div>
          <div class="xcard"><div class="ico">${svgI('ratio')}</div><div><div class="v" data-count-up="${waterInt?waterInt.toFixed(0):'0'}" data-decimals="0">${waterInt?'0':'—'}</div><div class="l">litres water per kg cotton</div></div></div>
        </div>
      </div>
    </div>`;

  /* Count-up animation */
  document.querySelectorAll('[data-count-up]').forEach(el => {
    const target = parseFloat(el.dataset.countUp.replace(/,/g,''))||0;
    const dec = parseInt(el.dataset.decimals)||0;
    if(!isFinite(target)||target===0){return;}
    const dur = 1200, steps = 48, interval = dur/steps;
    let cur = 0, t = 0;
    const fmt = v => dec===0 ? Math.round(v).toLocaleString() : v.toLocaleString(undefined,{minimumFractionDigits:dec,maximumFractionDigits:dec});
    el.textContent = fmt(0);
    const id = setInterval(()=>{
      t += interval;
      const prog = Math.min(t/dur, 1);
      const ease = 1 - Math.pow(1-prog, 3); // ease-out cubic
      cur = target * ease;
      el.textContent = fmt(cur);
      if(prog >= 1) clearInterval(id);
    }, interval);
  });

  if(typeof Chart!=='undefined'){const c=document.getElementById('rDonut');if(c){if(resChart1)resChart1.destroy();
    resChart1=new Chart(c,{type:'doughnut',data:{labels:rows.map(r=>SRC_NAMES[r.k]),datasets:[{data:rows.map(r=>Math.max(r.v,0)),
      backgroundColor:rows.map(r=>SRC_COLORS[r.k]),borderWidth:3,borderColor:'#fff',borderRadius:4,hoverOffset:6}]},
      options:{responsive:false,maintainAspectRatio:false,cutout:'72%',layout:{padding:6},
        animation:{animateRotate:true,duration:1000,easing:'easeOutQuart'},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:t=>' '+t.label+': '+fmt0(t.raw)+' kg CO₂e'}}}}});}}

  /* Animate gauge needle after paint */
  requestAnimationFrame(()=>{
    const needle = document.getElementById('gaugeNeedle');
    if(needle){
      needle.style.transform = 'rotate(-90deg)';
      needle.style.transition = 'none';
      requestAnimationFrame(()=>{
        needle.style.transition = 'transform 1.2s cubic-bezier(.22,1,.36,1)';
        needle.style.transform = `rotate(${needleAngle}deg)`;
      });
    }
  });
}

/* ===================================================================
   REPORT (Word + PDF)
   =================================================================== */
function openDownload(){closeMenus();document.getElementById('dlOverlay').classList.add('show');}
function closeDownload(){document.getElementById('dlOverlay').classList.remove('show');}
function makePieChartSVG(data, colors, size){
  /* data = [{label, value}], returns inline SVG donut chart */
  const total = data.reduce((s,d)=>s+d.value,0);
  if(!total) return '<svg width="'+size+'" height="'+size+'"></svg>';
  const cx=size/2, cy=size/2, R=size*0.38, r=size*0.22;
  let angle=-Math.PI/2, paths='', legendItems='';
  data.forEach((d,i)=>{
    const pct=d.value/total, sweep=pct*2*Math.PI;
    const x1=cx+R*Math.cos(angle), y1=cy+R*Math.sin(angle);
    const x2=cx+R*Math.cos(angle+sweep), y2=cy+R*Math.sin(angle+sweep);
    const xi1=cx+r*Math.cos(angle), yi1=cy+r*Math.sin(angle);
    const xi2=cx+r*Math.cos(angle+sweep), yi2=cy+r*Math.sin(angle+sweep);
    const lg=sweep>Math.PI?1:0;
    paths+=`<path d="M${xi1},${yi1} L${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${lg},0 ${xi1},${yi1}" fill="${colors[i%colors.length]}" stroke="#fff" stroke-width="1.5"/>`;
    legendItems+=`<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${colors[i%colors.length]};margin-right:5px;"></span>${d.label}</td><td style="text-align:right;padding-left:12px">${Math.round(pct*100)}%</td></tr>`;
    angle+=sweep;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${paths}<circle cx="${cx}" cy="${cy}" r="${r*0.85}" fill="none"/></svg>
  <table style="font-size:11px;margin-top:4px;width:100%;border:none">${legendItems}</table>`;
}

function makeBarChartSVG(labels, values, colors, w, h, unit){
  const max=Math.max(...values)*1.15||1;
  const padL=52, padR=12, padT=18, padB=40;
  const cw=w-padL-padR, ch=h-padT-padB;
  const bw=Math.min(38, cw/labels.length*0.55);
  const gap=cw/labels.length;
  let bars='', xLabels='', yLabels='';
  /* y gridlines */
  [0,0.25,0.5,0.75,1].forEach(f=>{
    const y=padT+ch*(1-f);
    yLabels+=`<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="#d1d5db" stroke-width="1"/>
    <text x="${padL-5}" y="${y+4}" text-anchor="end" font-size="9" fill="#000">${Math.round(max*f)}</text>`;
  });
  labels.forEach((lbl,i)=>{
    const bh=ch*(values[i]/max);
    const x=padL+gap*i+gap/2-bw/2;
    const y=padT+ch-bh;
    bars+=`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${colors[i%colors.length]}" rx="3"/>
    <text x="${x+bw/2}" y="${y-5}" text-anchor="middle" font-size="9" fill="#000" font-weight="700">${values[i].toFixed(2)}</text>`;
    xLabels+=`<text x="${padL+gap*i+gap/2}" y="${h-5}" text-anchor="middle" font-size="9" fill="#000">${lbl}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${yLabels}${bars}${xLabels}
    <text x="${padL}" y="12" font-size="9" fill="#000">${unit||''}</text>
  </svg>`;
}

function makeHBarChartSVG(labels, values, colors, w, h){
  const max=Math.max(...values)*1.15||1;
  const padL=110, padR=55, padT=14, padB=14;
  const cw=w-padL-padR, ch=h-padT-padB;
  const bh=Math.min(22,(ch/labels.length)*0.62);
  const gap=ch/labels.length;
  let bars='', yLabels='';
  labels.forEach((lbl,i)=>{
    const bw=cw*(values[i]/max);
    const y=padT+gap*i+gap/2-bh/2;
    bars+=`<rect x="${padL}" y="${y}" width="${bw}" height="${bh}" fill="${colors[i%colors.length]}" rx="3"/>
    <text x="${padL+bw+5}" y="${y+bh/2+4}" font-size="10" fill="#000" font-weight="700">${values[i].toFixed(2)}</text>`;
    yLabels+=`<text x="${padL-6}" y="${y+bh/2+4}" text-anchor="end" font-size="10" fill="#000">${lbl}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${yLabels}${bars}
  </svg>`;
}

function reportHTML(){
  const R=RESULT||computeAll();
  const order=['fert','irrig','land','resid','mach','pest'];
  const COLORS=order.map(k=>SRC_COLORS[k]);
  const when=new Date().toLocaleString('en-PK',{dateStyle:'long',timeStyle:'short'});
  const farmerName=esc(getVal('farmerName')||'—');
  const farmId=esc(getVal('farmId')||'—');
  const location=esc((getVal('tehsil')||getVal('district')||'—')+', '+(getVal('province')||'—'));
  const season=esc(getVal('season')||'—');
  const area=esc(getVal('area')||'—');
  const yieldV=esc(getVal('yield')||'—');

  /* Pie chart data */
  const pieKeys=order.filter(k=>(R.S[k]||0)>0);
  const pieData=pieKeys.map(k=>({label:SRC_NAMES[k],value:R.S[k]||0}));
  const pieChart=makePieChartSVG(pieData,pieKeys.map(k=>SRC_COLORS[k]),200);

  /* Benchmark bar chart */
  const myVal=R.iSeed||0;
  const benchLabels=['This Farm','Best Practice','Punjab Avg','National Avg','Sindh Avg'];
  const benchVals=[myVal,1.94,4.20,D.ef.nat_avg,5.80];
  const benchColors=benchVals.map((v,i)=>i===0?(v<=1.94?'#178a4c':v<=4.20?'#d9932b':'#d14343'):'#b9c7bd');
  const benchChart=makeBarChartSVG(benchLabels,benchVals,benchColors,440,180,'kg CO₂e / kg seed cotton');

  /* Fertiliser breakdown horizontal bar */
  const fertLabels=['Direct N₂O','Indirect N₂O','Urea CO₂','Manufacturing'];
  const fertVals=[R.fertDetail.dir,R.fertDetail.ind,R.fertDetail.urea,R.fertDetail.mfg].map(v=>Math.round(v)||0);
  const fertChart=makeHBarChartSVG(fertLabels,fertVals,['#0f5132','#22a85b','#8fdcaa','#e0a33b'],440,120);

  /* Emissions rows */
  const rowsHTML=order.map((k,i)=>{
    const pct=R.total>0?Math.round(R.S[k]/R.total*100):0;
    const barW=pct*2.2;
    return `<tr>
      <td style="padding:8px 10px">${SRC_NAMES[k]}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:600">${fmt0(R.S[k])}</td>
      <td style="padding:8px 10px;text-align:right">${pct}%</td>
      <td style="padding:8px 10px"><div style="height:10px;width:${barW}px;background:${COLORS[i]};border-radius:3px;min-width:2px"></div></td>
    </tr>`;
  }).join('');

  /* Performance badge */
  const perfColor=myVal<=1.94?'#178a4c':myVal<=4.20?'#b7791f':'#c53030';
  const perfLabel=myVal<=1.94?'Excellent · below best practice':myVal<=D.ef.nat_avg?'Good · below national average':'Needs improvement · above national average';

  const ORIGIN=window.location.origin;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
  <title>CarbonLens Report — ${farmerName}</title>
  <style>
    @font-face{font-family:'Outfit';font-weight:100 900;src:url('${ORIGIN}/static/fonts/outfit-latin-wght-normal.woff2') format('woff2')}
    @font-face{font-family:'Plus Jakarta Sans';font-weight:200 800;src:url('${ORIGIN}/static/fonts/plus-jakarta-sans-latin-wght-normal.woff2') format('woff2')}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
    body{font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;color:#10231a;background:#fff;font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased}
    h1,.sec-title,.kpi .val,.perf-text{font-family:'Outfit','Plus Jakarta Sans',sans-serif}
    @media print{
      body{font-size:12px}
      .no-print{display:none!important}
      @page{margin:12mm 12mm;size:A4}
      .section{page-break-inside:avoid}
      tr{page-break-inside:avoid}
      .cover{page-break-after:avoid}
    }
    .cover{background:linear-gradient(140deg,#0b3d24 0%,#13693e 60%,#1f9a55 100%);color:#fff;padding:26px 36px 0;position:relative;overflow:hidden;border-radius:0 0 22px 22px}
    .cover::after{content:'';position:absolute;right:-80px;top:-120px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(159,227,182,.35),transparent 65%)}
    .cover-row{display:flex;align-items:center;gap:18px;position:relative;z-index:1}
    .cover-badge{width:50px;height:50px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .cover-badge svg{width:26px;height:26px;stroke:#fff}
    .cover-text .kick{font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#c7eed5}
    .cover-text h1{font-size:26px;font-weight:700;letter-spacing:-.4px;color:#fff;margin-top:2px}
    .cover-brand-mark{margin-left:auto;text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
    .cover-brand-mark .seal{height:78px;width:auto;object-fit:contain;background:#fff;border-radius:16px;padding:6px 8px;box-shadow:0 6px 16px rgba(0,0,0,.22)}
    .cover-brand-mark .pwrby{font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;font-weight:700;color:#fff}
    .cover-meta-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding:14px 0 18px;border-top:1px solid rgba(255,255,255,.25);font-size:11px;color:#c7eed5;position:relative;z-index:1}
    .cover-meta-row b{display:block;font-size:13.5px;color:#fff;font-weight:700;margin-top:2px}
    .report-id{font-size:11px;color:#e5f6eb;font-weight:600;letter-spacing:.3px}
    .body{padding:22px 36px 30px}
    .section{margin-top:24px}
    .sec-title{font-size:15px;font-weight:700;color:#0f5132;letter-spacing:-.1px;border-bottom:2px solid #c7eed5;padding-bottom:6px;margin-bottom:12px}
    .kpi-strip{display:flex;gap:10px}
    .kpi{flex:1;background:#f2fbf5;border:1px solid #c7eed5;border-radius:12px;padding:13px 12px;text-align:center}
    .kpi .val{font-size:24px;font-weight:700;color:#0f5132;line-height:1}
    .kpi .lbl{font-size:10px;color:#26392f;font-weight:600;margin-top:5px;text-transform:uppercase;letter-spacing:.3px}
    .perf-badge{background:${perfColor}12;border:1.5px solid ${perfColor};border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:14px}
    .perf-dot{width:16px;height:16px;border-radius:50%;background:${perfColor};flex-shrink:0}
    .perf-text{font-size:15px;font-weight:700;color:${perfColor}}
    .perf-sub{font-size:11px;color:#26392f;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f2fbf5;color:#0f5132;font-weight:700;padding:8px 10px;text-align:left;border-bottom:2px solid #c7eed5}
    td{padding:7px 10px;border-bottom:1px solid #ebf0ea;color:#10231a}
    tr:last-child td{border-bottom:none}
    .total-row td{font-weight:800;background:#e5f6eb;color:#0f5132}
    .info-table td:first-child{font-weight:600;color:#56685d;width:120px}
    .info-table td{border:none;padding:6px 10px}
    .info-table tr:nth-child(odd) td{background:#f7f9f6}
    .charts-row{display:flex;gap:24px;align-items:flex-start;margin-top:8px}
    .chart-box{flex:1}
    .chart-label{font-size:10.5px;font-weight:700;color:#56685d;text-align:left;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
    .rpt-footer{margin-top:28px;padding-top:12px;border-top:1px solid #e1e8e0;font-size:10px;color:#56685d;display:flex;justify-content:space-between;align-items:center;gap:16px}
    .methodology{background:#fdf3e1;border-left:3px solid #d9932b;padding:10px 14px;border-radius:0 8px 8px 0;font-size:11px;color:#6b4710;margin-top:14px}
    .print-btn{position:fixed;bottom:24px;right:24px;background:#0f5132;color:#fff;border:none;padding:13px 24px;border-radius:999px;font:600 14px 'Outfit',sans-serif;cursor:pointer;box-shadow:0 12px 26px -10px rgba(11,61,36,.7)}
    .print-btn:hover{background:#0b3d24}
  </style>
  </head><body>

  <!-- HEADER COVER -->
  <div class="cover">
    <div class="cover-row">
      <div class="cover-badge">${D.icons.leaf}</div>
      <div class="cover-text">
        <div class="kick">CarbonLens season report</div>
        <h1>Cotton Carbon Footprint Report</h1>
      </div>
      <div class="cover-brand-mark">
        <img class="seal" src="${ORIGIN}/static/img/sawie-logo.png" alt="SAWiE" onerror="this.remove()"/>
        <div class="pwrby">Powered by SAWiE</div>
      </div>
    </div>
    <div class="cover-meta-row">
      <div class="report-id">Report ID: CL-${farmId}-${(new Date()).getFullYear()}</div>
      <div style="display:flex;gap:28px">
        <div>Generated<b>${when}</b></div>
        <div>Farm ID<b>${farmId}</b></div>
      </div>
    </div>
  </div>

  <div class="body">

  <!-- EXECUTIVE SUMMARY -->
  <div class="section" style="margin-top:0">
    <div class="sec-title">Executive Summary</div>
    <p style="font-size:12.5px;color:#334155;line-height:1.7">
      This report presents the cradle-to-farm-gate greenhouse gas footprint for <b>${farmerName}</b>'s
      cotton crop (${season}, ${area} acres) in ${location}. Total emissions are estimated at
      <b>${fmt0(R.total/1000)} t CO₂e</b>, equivalent to <b>${fmt2(R.iSeed)} kg CO₂e per kg of seed cotton</b>
      produced. Based on the Cool Farm Tool methodology, this farm's intensity is rated
      <b style="color:${perfColor}">${perfLabel}</b> when benchmarked against national and best-practice reference values.
      The sections below break down emissions by source, fertiliser pathway, water and labour use, along with
      recommendations to reduce the farm's carbon footprint.
    </p>
  </div>

  <!-- FARM INFO -->
  <div class="section">
    <div class="sec-title">Farm Information</div>
    <table class="info-table">
      <tr><td>Farmer</td><td>${farmerName}</td><td style="font-weight:600;color:#475569;width:120px">Farm ID</td><td>${farmId}</td></tr>
      <tr><td>Location</td><td>${location}</td><td style="font-weight:600;color:#475569">Season</td><td>${season}</td></tr>
      <tr><td>Area</td><td>${area} acres</td><td style="font-weight:600;color:#475569">Yield</td><td>${yieldV} kg/acre</td></tr>
      <tr><td>Seed Cotton</td><td>${fmt0(R.produced)} kg</td><td style="font-weight:600;color:#475569">Labour</td><td>${fmt0(R.labour)} person-days</td></tr>
    </table>
  </div>

  <!-- KPI STRIP -->
  <div class="section">
    <div class="sec-title">Headline Results</div>
    <div class="kpi-strip">
      <div class="kpi"><div class="val">${fmt0(R.total/1000)}</div><div class="lbl">t CO₂e Total</div></div>
      <div class="kpi"><div class="val">${fmt2(R.iSeed)}</div><div class="lbl">kg CO₂e / kg Seed Cotton</div></div>
      <div class="kpi"><div class="val">${fmt2(R.iLint)}</div><div class="lbl">kg CO₂e / kg Lint</div></div>
      <div class="kpi"><div class="val">${fmt0(R.iAcre)}</div><div class="lbl">kg CO₂e / Acre</div></div>
      <div class="kpi"><div class="val">${R.water>0?fmt0(R.water):'—'}</div><div class="lbl">m³ Water Used</div></div>
    </div>
  </div>

  <!-- PERFORMANCE BADGE -->
  <div class="section">
    <div class="sec-title">Performance Rating</div>
    <div class="perf-badge">
      <div class="perf-dot"></div>
      <div><div class="perf-text">${perfLabel}</div>
      <div class="perf-sub">Your intensity: ${fmt2(myVal)} kg CO₂e/kg &nbsp;·&nbsp; National average: ${D.ef.nat_avg} kg CO₂e/kg &nbsp;·&nbsp; Best practice: 1.94 kg CO₂e/kg</div></div>
    </div>
  </div>

  <!-- CHARTS ROW -->
  <div class="section">
    <div class="sec-title">Emissions Breakdown &amp; Benchmark</div>
    <div class="charts-row">
      <div class="chart-box" style="max-width:230px">
        <div class="chart-label">Emissions by Source</div>
        ${pieChart}
      </div>
      <div class="chart-box">
        <div class="chart-label">Benchmark Comparison (kg CO₂e / kg Seed Cotton)</div>
        ${benchChart}
      </div>
    </div>
  </div>

  <!-- EMISSIONS TABLE -->
  <div class="section">
    <div class="sec-title">Emissions by Source — Detail</div>
    <table>
      <tr><th>Source</th><th style="text-align:right">kg CO₂e</th><th style="text-align:right">Share</th><th style="width:230px">Contribution</th></tr>
      ${rowsHTML}
      <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmt0(R.total)}</td><td style="text-align:right">100%</td><td></td></tr>
    </table>
  </div>

  <!-- FERTILISER DETAIL -->
  <div class="section">
    <div class="sec-title">Fertiliser Emissions — Pathway Breakdown</div>
    <div class="chart-label" style="text-align:left;margin-bottom:8px">kg CO₂e by pathway</div>
    ${fertChart}
    <table style="margin-top:10px">
      <tr><th>Pathway</th><th style="text-align:right">kg CO₂e</th><th style="text-align:right">Share of Fertiliser</th></tr>
      <tr><td>Direct N₂O emissions</td><td style="text-align:right">${fmt0(R.fertDetail.dir)}</td><td style="text-align:right">${R.S.fert>0?Math.round(R.fertDetail.dir/R.S.fert*100):0}%</td></tr>
      <tr><td>Indirect N₂O emissions</td><td style="text-align:right">${fmt0(R.fertDetail.ind)}</td><td style="text-align:right">${R.S.fert>0?Math.round(R.fertDetail.ind/R.S.fert*100):0}%</td></tr>
      <tr><td>Urea hydrolysis CO₂</td><td style="text-align:right">${fmt0(R.fertDetail.urea)}</td><td style="text-align:right">${R.S.fert>0?Math.round(R.fertDetail.urea/R.S.fert*100):0}%</td></tr>
      <tr><td>Fertiliser manufacturing</td><td style="text-align:right">${fmt0(R.fertDetail.mfg)}</td><td style="text-align:right">${R.S.fert>0?Math.round(R.fertDetail.mfg/R.S.fert*100):0}%</td></tr>
      <tr class="total-row"><td>Total Fertiliser</td><td style="text-align:right">${fmt0(R.S.fert)}</td><td style="text-align:right">100%</td></tr>
    </table>
  </div>

  <!-- BEYOND CARBON -->
  <div class="section">
    <div class="sec-title">Beyond Carbon</div>
    <table class="info-table">
      <tr><td>Water used</td><td>${R.water>0?fmt0(R.water)+' m³':'Not recorded'}</td><td style="font-weight:600;color:#475569;width:160px">Water intensity</td><td>${R.produced>0&&R.water>0?fmt2(R.water/R.produced*1000)+' L / kg seed cotton':'—'}</td></tr>
      <tr><td>Labour</td><td>${fmt0(R.labour)} person-days</td><td style="font-weight:600;color:#475569">Seed cotton produced</td><td>${fmt0(R.produced)} kg</td></tr>
      <tr><td>Lint produced (est.)</td><td>${fmt0(R.produced*0.35)} kg (35% outturn)</td><td style="font-weight:600;color:#475569">Lint intensity</td><td>${fmt2(R.iLint)} kg CO₂e/kg lint</td></tr>
    </table>
  </div>

  <!-- RECOMMENDATIONS -->
  <div class="section">
    <div class="sec-title">Recommendations to Reduce Emissions</div>
    <table class="info-table">
      <tr><td style="width:26px;font-weight:800;color:#0f5132">1</td><td>Prioritise split, need-based fertiliser application (soil-test guided) to cut direct and indirect N₂O losses from the largest emissions source.</td></tr>
      <tr><td style="width:26px;font-weight:800;color:#0f5132">2</td><td>Where feasible, shift tube-well irrigation from diesel to solar or grid-electric pumping to reduce energy-related emissions.</td></tr>
      <tr><td style="width:26px;font-weight:800;color:#0f5132">3</td><td>Avoid open burning of crop residue; incorporate, mulch, or compost residues on-farm to lower CO₂/CH₄/N₂O release and build soil carbon.</td></tr>
      <tr><td style="width:26px;font-weight:800;color:#0f5132">4</td><td>Calibrate spray/machinery passes and combine field operations where possible to reduce diesel/petrol use per acre.</td></tr>
    </table>
  </div>

  <!-- ENVIRONMENTAL EQUIVALENCIES -->
  <div class="section">
    <div class="sec-title">Environmental Equivalencies</div>
    <p style="font-size:11px;color:#64748b;margin-bottom:10px">Putting ${fmt0(R.total/1000)} t CO₂e into everyday context:</p>
    <div class="kpi-strip">
      <div class="kpi"><div class="val" style="font-size:20px">${fmt0(R.total/2300)}</div><div class="lbl">Cars driven for 1 year*</div></div>
      <div class="kpi"><div class="val" style="font-size:20px">${fmt0(R.total/21.7)}</div><div class="lbl">Trees needed for 1 yr offset*</div></div>
      <div class="kpi"><div class="val" style="font-size:20px">${fmt0(R.total/2.68)}</div><div class="lbl">Litres of diesel burned*</div></div>
      <div class="kpi"><div class="val" style="font-size:20px">${fmt0(R.total/1000*1000/220)}</div><div class="lbl">Households' monthly power use*</div></div>
    </div>
    <p style="font-size:9.5px;color:#94a3b8;margin-top:8px">*Approximate, standard EPA/IPCC-derived reference factors — for illustrative comparison only.</p>
  </div>


  <!-- CERTIFICATION BLOCK -->
  <div class="section" style="margin-top:26px;padding-top:16px;border-top:1px dashed #cbd5e1">
    <div class="sec-title" style="border-bottom:none;padding-bottom:0">Certification</div>
    <p style="font-size:11px;color:#475569;line-height:1.7;margin-bottom:16px">
      This report was generated by the CarbonLens calculation engine using farmer-declared inputs and standard, peer-reviewed
      emission factors referenced above. Figures represent a good-faith estimate and are intended for advisory and benchmarking
      purposes; they do not constitute a third-party audited carbon certificate.
    </p>
    <div style="display:flex;justify-content:space-between;gap:30px;margin-top:6px">
      <div style="flex:1">
        <div style="border-top:1px solid #334155;padding-top:6px;font-size:10.5px;color:#64748b">Prepared by — CarbonLens Engine</div>
      </div>
      <div style="flex:1">
        <div style="border-top:1px solid #334155;padding-top:6px;font-size:10.5px;color:#64748b">Reviewed by — Farm Advisor (signature)</div>
      </div>
      <div style="flex:1">
        <div style="border-top:1px solid #334155;padding-top:6px;font-size:10.5px;color:#64748b">Date — ${when}</div>
      </div>
    </div>
  </div>

  <!-- DATA DISCLAIMER -->
  <div class="section" style="margin-top:26px;padding:12px 14px;border:1px solid #cbd5e1;border-left:3px solid #178a4c;background:#f7f9f6;border-radius:0 10px 10px 0">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px">Data Disclaimer</div>
    <p style="font-size:10.5px;line-height:1.6">
      This report is generated from data provided by the farmer. SAWiE is not responsible for the accuracy or completeness of that data,
      and the results should be treated as estimates based on the information submitted. SAWiE is not liable for decisions, losses or claims
      arising from reliance on this report. Please seek independent technical and agronomic advice before making decisions based on these estimates.
    </p>
  </div>

  <!-- FOOTER -->
  <div class="rpt-footer">
    <span style="display:flex;align-items:center;gap:8px"><img src="${ORIGIN}/static/img/sawie-logo.png" alt="SAWiE" style="height:24px;width:auto;object-fit:contain"/>CarbonLens &nbsp;·&nbsp; SAWiE Ecosystems (Private) Limited &nbsp;·&nbsp; sawie.info@gmail.com</span>
    <span>Confidential &nbsp;·&nbsp; Report ID: CL-${farmId}-${(new Date()).getFullYear()} &nbsp;·&nbsp; ${when}</span>
  </div>

  </div><!-- /body -->

  <button class="print-btn no-print" onclick="window.print()">Print or save as PDF</button>
  </body></html>`;
}
function downloadReport(kind){
  closeDownload();
  const html=reportHTML();
  const farm=(getVal('farmId')||getVal('farmerName')||'CarbonLens').replace(/[^\w-]+/g,'_');
  if(kind==='word'){
    const blob=new Blob(['\ufeff'+html],{type:'application/msword'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=farm+'_carbon_report.doc';
    document.body.appendChild(a);a.click();a.remove();toast('Word report downloaded');
  } else {
    const w=window.open('','_blank');
    if(!w){toast('Allow pop-ups to print the PDF');return;}
    w.document.write(html+'<script>window.onload=function(){window.print();}<\/script>');w.document.close();
  }
}

/* ===================================================================
   SAMPLE + INIT
   =================================================================== */
function setText(id,txt){const el=document.getElementById(id);if(el)el.innerHTML=txt;}

window.addEventListener('load',()=>{
  try{
    renderWizard();
    markFilled('loginUser','userWrap'); markFilled('loginPass','passWrap');
    const onEnter=(ids,fn)=>ids.forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')fn();});});
    onEnter(['loginUser','loginPass'],doLogin);
    onEnter(['regFullName','regUser','regEmail','regPass'],doRegister);
    onEnter(['forgotUsername'],frSendOtp); onEnter(['forgotOtp'],frVerifyOtp);
    onEnter(['forgotNewPw','forgotConfPw'],frResetPassword);
    onEnter(['clearHistOtp'],submitClearHistory);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDownload();closeMenus();closeForgot();closeProfile();}});
    document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#steps'))recompute();
      const f=e.target.closest&&e.target.closest('.field.err'); if(f) f.classList.remove('err');});
    document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#steps'))recompute();});
    /* Home widgets start immediately, in parallel with the session check. */
    loadWeather(); loadNews();
    /* Restore the session from the HttpOnly cookies (refreshes them if needed). */
    api('/api/auth/me').then(r=>r.ok?r.json():null).then(u=>{ if(u) applyUser(u); })
      .catch(()=>{}).finally(()=>{ showScreen('scHome'); });
  }catch(e){console.error(e);showError('The page did not start correctly. Use Refresh to reload it.');}
});

/* debug accessor (used by tests / console) */
window.getResult=()=>RESULT||LAST||computeAll();

/* ===== Profile modal ===== */
function openProfile(){
  closeMenus();
  document.getElementById('profileOverlay').classList.add('show');
  prfSwitch('info');
  prfLoadAccount();
}
function closeProfile(){document.getElementById('profileOverlay').classList.remove('show');}

function prfSwitch(tab){
  ['info','pass','hist'].forEach(t=>{
    const pane=document.getElementById('prfPane-'+t);
    const btn=document.getElementById('prfTabBtn-'+t);
    if(pane) pane.style.display=(t===tab?'block':'none');
    if(btn) btn.classList.toggle('active', t===tab);
  });
  if(tab==='hist') prfLoadHistory();
}

async function prfLoadAccount(){
  try{
    if(!IS_AUTHED) return;
    const res=await api('/api/auth/me');
    if(!res.ok) return;
    const u=await res.json();
    setText2('prfUsername', u.username||'—');
    setText2('prfFullName', u.full_name||'—');
    setText2('prfEmail', u.email||'—');
    setText2('prfSince', u.created_at ? String(u.created_at).split(' ')[0].split('T')[0] : '—');
  }catch(e){console.warn('[Profile] Could not load account info:',e.message);}
}
function setText2(id,txt){const el=document.getElementById(id);if(el)el.textContent=txt;}

async function prfChangePassword(){
  const errEl=document.getElementById('prfPassErr');
  const okEl=document.getElementById('prfPassOk');
  errEl.style.display='none'; okEl.style.display='none';

  const cur=document.getElementById('prfCurPass').value||'';
  const nw=document.getElementById('prfNewPass').value||'';
  const conf=document.getElementById('prfConfPass').value||'';

  if(!cur||!nw||!conf){errEl.textContent='Please fill in all fields.';errEl.style.display='block';return;}
  const pwErr=passwordProblem(nw); if(pwErr){errEl.textContent=pwErr;errEl.style.display='block';return;}
  if(nw!==conf){errEl.textContent='New password and confirmation do not match.';errEl.style.display='block';return;}

  const btn=document.getElementById('prfPassBtn');
  const orig=btn.textContent;
  btn.disabled=true; btn.textContent='Updating…';

  try{
    const res=await api('/api/auth/change-password',{method:'POST',body:{current_password:cur,new_password:nw}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){errEl.textContent=data.detail||'Could not change password.';errEl.style.display='block';}
    else{
      okEl.textContent=data.message||'Password changed successfully.';
      okEl.style.display='block';
      document.getElementById('prfCurPass').value='';
      document.getElementById('prfNewPass').value='';
      document.getElementById('prfConfPass').value='';
    }
  }catch(e){
    errEl.textContent='Could not connect to the server. Please try again.';
    errEl.style.display='block';
  }finally{
    btn.disabled=false; btn.textContent=orig;
  }
}

const HIST={rows:[],open:null};
function fmtDate(iso){ if(!iso) return ''; const d=new Date(iso); return isNaN(d)?String(iso).slice(0,10):
  d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
async function prfLoadHistory(){
  const empty=document.getElementById('prfHistEmpty'), list=document.getElementById('prfHistList');
  empty.style.display='none';
  showHistorySkeleton('prfHistList');
  try{
    const r=await apiJSON('/api/history/');
    if(!r.ok) throw new Error(r.data.detail||'failed');
    HIST.rows=Array.isArray(r.data)?r.data:[];
    const cnt=document.getElementById('prfHistCount'); if(cnt) cnt.textContent=HIST.rows.length?`${HIST.rows.length} saved`:'';
    if(!HIST.rows.length){ showEmptyHistory('prfHistList'); return; }
    list.innerHTML=HIST.rows.map(r=>{
      const loc=[r.district,r.province].filter(Boolean).join(', ');
      return `<article class="prf-hist-card" id="hist_${r.id}">
        <div class="prf-hist-top">
          <div><div class="prf-hist-farm">${esc(r.farmer_name||'Unnamed farm')}</div>
            <div class="prf-hist-sub">${esc(r.farm_id||'')}${loc?' · '+esc(loc):''}</div></div>
          <span class="prf-hist-date">${esc(fmtDate(r.calculated_at))}</span>
        </div>
        <div class="prf-hist-stats">
          <span>Season <b>${esc(r.season||'–')}</b></span>
          <span>Crop <b>${esc(r.crop||'–')}</b></span>
          <span>Total <b>${((r.total_co2_equiv||0)/1000).toFixed(2)} t CO&#8322;e</b></span>
          <span>Intensity <b>${(r.intensity_per_kg||0).toFixed(2)} kg/kg</b></span>
        </div>
        <div class="prf-hist-actions">
          <button class="btn-link" onclick="toggleHistDetail(${r.id})">View breakdown</button>
          <button class="btn-link danger" onclick="deleteHist(${r.id})">Delete</button>
        </div>
        <div class="prf-hist-detail" id="histd_${r.id}" hidden></div>
      </article>`;
    }).join('');
  }catch(e){
    list.innerHTML='';
    empty.style.display='block';
    empty.textContent='Could not load your history. Please try again.';
  }
}
async function toggleHistDetail(id){
  const box=document.getElementById('histd_'+id); if(!box) return;
  if(!box.hidden){ box.hidden=true; return; }
  box.hidden=false; box.innerHTML='<div class="skel skel-line"></div><div class="skel skel-line sm"></div>';
  const r=await apiJSON('/api/history/'+id).catch(()=>({ok:false,data:{}}));
  if(!r.ok){ box.innerHTML='<p class="muted">Could not load this calculation.</p>'; return; }
  const d=r.data, bd=d.breakdown||{}, res=d.results||{}, total=d.total_co2_equiv||0;
  const order=['fert','irrig','land','resid','mach','pest'].sort((a,b)=>(bd[b]||0)-(bd[a]||0));
  const mx=Math.max(1,...order.map(k=>bd[k]||0));
  box.innerHTML=`<div class="hd-bars">${order.map(k=>{const v=bd[k]||0;const pct=total?v/total*100:0;
      return `<div class="hd-row"><span class="hd-sw" style="background:${SRC_COLORS[k]}"></span><span class="hd-name">${SRC_NAMES[k]}</span>
        <span class="hd-bar"><i style="width:${Math.max(v>0?2:0,v/mx*100)}%;background:${SRC_COLORS[k]}"></i></span>
        <span class="hd-val">${fmt0(v)} kg</span><span class="hd-pct">${pct<1&&pct>0?'<1':Math.round(pct)}%</span></div>`;}).join('')}</div>
    <div class="hd-kpis">
      <div><b>${(res.iLint||0).toFixed(2)}</b><span>kg CO&#8322;e / kg lint</span></div>
      <div><b>${fmt0(res.iAcre||0)}</b><span>kg CO&#8322;e / acre</span></div>
      <div><b>${res.water?fmt0(res.water):'–'}</b><span>m³ water</span></div>
      <div><b>${fmt0(res.labour||0)}</b><span>person-days</span></div>
    </div>`;
}
async function deleteHist(id){
  if(!confirm('Delete this saved calculation? This cannot be undone.')) return;
  const r=await apiJSON('/api/history/'+id,{method:'DELETE'}).catch(()=>({ok:false}));
  if(!r.ok){ toast('Could not delete. Please try again.'); return; }
  const el=document.getElementById('hist_'+id); if(el) el.remove();
  HIST.rows=HIST.rows.filter(x=>x.id!==id);
  const cnt=document.getElementById('prfHistCount'); if(cnt) cnt.textContent=HIST.rows.length?`${HIST.rows.length} saved`:'';
  if(!HIST.rows.length) showEmptyHistory('prfHistList');
  toast('Calculation deleted');
}

/* ── Clear History (OTP flow) ─────────────────────────────────────────────── */
async function initClearHistory(){
  const errEl=document.getElementById('clearHistErr');
  const okEl=document.getElementById('clearHistOk');
  const otpWrap=document.getElementById('clearHistOtpWrap');
  errEl.style.display='none'; okEl.style.display='none';

  if(!confirm('This permanently deletes ALL your saved calculations.\n\nWe will email you a code to confirm. Continue?'))return;

  document.getElementById('clearHistBtn').disabled=true;
  document.getElementById('clearHistBtn').textContent='Sending code…';

  try{
    const res=await api('/api/history/request-clear',{method:'POST'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      errEl.textContent=data.detail||'Could not send OTP. Please try again.';
      errEl.style.display='block';
    }else{
      otpWrap.style.display='block';
      okEl.textContent=(data.message||'Code sent.')+' Enter it below to confirm.';
      okEl.style.display='block';
      document.getElementById('clearHistOtp').focus();
    }
  }catch(e){
    errEl.textContent='Network error. Please try again.';
    errEl.style.display='block';
  }finally{
    const btn=document.getElementById('clearHistBtn');
    btn.disabled=false; btn.textContent='Clear history';
  }
}

async function submitClearHistory(){
  const otp=(document.getElementById('clearHistOtp').value||'').trim();
  const errEl=document.getElementById('clearHistErr');
  const okEl=document.getElementById('clearHistOk');
  errEl.style.display='none'; okEl.style.display='none';

  if(!/^\d{6}$/.test(otp)){errEl.textContent='Enter the 6-digit code from the email.';errEl.style.display='block';return;}

  try{
    const res=await api('/api/history/verify-clear',{method:'POST',body:{otp}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      errEl.textContent=data.detail||'Verification failed. Please try again.';
      errEl.style.display='block';
    }else{
      document.getElementById('clearHistOtpWrap').style.display='none';
      okEl.textContent=data.message||'History cleared.';
      okEl.style.display='block';
      document.getElementById('clearHistOtp').value='';
      HIST.rows=[]; showEmptyHistory('prfHistList');
      const cnt=document.getElementById('prfHistCount'); if(cnt) cnt.textContent='';
    }
  }catch(e){
    errEl.textContent='Network error. Please try again.';
    errEl.style.display='block';
  }
}

function cancelClearHistory(){
  document.getElementById('clearHistOtpWrap').style.display='none';
  document.getElementById('clearHistOtp').value='';
  document.getElementById('clearHistErr').style.display='none';
  document.getElementById('clearHistOk').style.display='none';
}

/* ===== CarbonLens Assistant (chatbot) ===== */
let clChatHistory=[];
let clChatOpen=false;
function clTime(){return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
function clFormat(t){
  const e=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  const lines=e.split(/\n+/); let out='', list=false;
  lines.forEach(l=>{
    const m=l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
    if(m){ if(!list){out+='<ul>';list=true;} out+=`<li>${m[1]}</li>`; }
    else { if(list){out+='</ul>';list=false;} if(l.trim()) out+=`<p>${l}</p>`; }
  });
  if(list) out+='</ul>';
  return out||'<p></p>';
}
function clGreet(){
  const body=document.getElementById('clChatBody'); if(!body) return;
  body.innerHTML=`<div class="ch-day">Today</div>`;
  const first=(CURRENT_USER&&(CURRENT_USER.full_name||CURRENT_USER.username)||'').split(' ')[0];
  const s=document.getElementById('clChatSugg');
  if(!IS_AUTHED){
    clAppendMsg('Assalam-o-Alaikum! Please sign in to use the assistant. It answers questions about farm carbon footprints and how to use CarbonLens.','bot',true);
    if(s) s.style.display='none'; return;
  }
  clAppendMsg(`Assalam-o-Alaikum${first?' '+first:''}! Ask me about cotton carbon footprints, emission sources, or how to use CarbonLens.`,'bot',true);
  if(s) s.style.display='flex';
}
function toggleChat(){
  const p=document.getElementById('clChatPanel');
  if(clChatOpen){
    clChatOpen=false; document.body.classList.remove('chat-open');
    const done=()=>{p.classList.remove('open');p.style.opacity='';p.style.transform='';};
    window.chatAnimateClose?window.chatAnimateClose(p,done):done();
    return;
  }
  clChatOpen=true; document.body.classList.add('chat-open');
  if(!document.querySelector('#clChatBody .cl-row')) clGreet();
  p.classList.add('open');
  if(window.chatAnimateOpen) window.chatAnimateOpen(p);
  const inp=document.getElementById('clChatInput'); if(inp) setTimeout(()=>inp.focus(),200);
}
function clearChat(silent){
  clChatHistory=[];
  const body=document.getElementById('clChatBody'); if(body) body.innerHTML='';
  if(!silent) clGreet();
}
function askSuggestion(btn){const inp=document.getElementById('clChatInput');inp.value=btn.textContent;sendChat();}
function clAppendMsg(text,who,quiet){
  const body=document.getElementById('clChatBody');
  const row=document.createElement('div');
  row.className='cl-row '+who;
  const bubble=`<div class="cl-msg ${who}">${who==='bot'?clFormat(text):'<p>'+esc(text)+'</p>'}<span class="tm">${clTime()}</span></div>`;
  row.innerHTML=who==='bot'?`<span class="mini"><img src="/static/img/sawie-logo.png" alt=""></span>${bubble}`:bubble;
  body.appendChild(row);
  body.scrollTop=body.scrollHeight;
  if(!quiet&&window.chatAnimateMsg) window.chatAnimateMsg(row, who==='user');
  return row;
}
function clShowTyping(){
  const body=document.getElementById('clChatBody');
  const row=document.createElement('div');
  row.className='cl-row bot'; row.id='clTypingIndicator';
  row.innerHTML='<span class="mini"><img src="/static/img/sawie-logo.png" alt=""></span><div class="cl-msg bot typing"><span></span><span></span><span></span></div>';
  body.appendChild(row); body.scrollTop=body.scrollHeight;
  if(window.chatAnimateMsg) window.chatAnimateMsg(row,false);
}
function clHideTyping(){const t=document.getElementById('clTypingIndicator'); if(t) t.remove();}
async function sendChat(){
  const inp=document.getElementById('clChatInput');
  const msg=(inp.value||'').trim();
  if(!msg) return;
  inp.value='';
  const s=document.getElementById('clChatSugg'); if(s) s.style.display='none';
  clAppendMsg(msg,'user');
  clChatHistory.push({role:'user',content:msg});
  clShowTyping();
  const btn=document.getElementById('clChatSend'); if(btn) btn.disabled=true;
  try{
    const res=await api('/api/chat/ask',{method:'POST',body:{message:msg,history:clChatHistory.slice(-7,-1)}});
    const data=await res.json().catch(()=>({}));
    clHideTyping();
    const reply=res.status===401?'Please sign in to use the assistant.':(res.status===429?(data.detail||'Please slow down a little.'):(data.reply||'Sorry, I could not answer that just now.'));
    clAppendMsg(reply,'bot');
    clChatHistory.push({role:'assistant',content:reply});
  }catch(e){
    clHideTyping();
    clAppendMsg('I could not reach the server. Check your connection and try again.','bot');
  }finally{ if(btn) btn.disabled=false; inp.focus(); }
}

/* ================================================================
   SUCCESS BURST
   ================================================================ */
function showSuccessBurst(){
  const el = document.createElement('div');
  el.className = 'success-burst-overlay';
  el.innerHTML = '<div class="success-burst-ring"><div class="success-burst-check"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#178a4c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></div></div>';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 900);
}

/* ================================================================
   HISTORY SKELETON + EMPTY STATE
   ================================================================ */
function showHistorySkeleton(containerId){
  const c = document.getElementById(containerId);
  if(!c) return;
  c.innerHTML = [1,2,3].map(()=>`
    <div style="padding:12px 0;border-bottom:1px solid #eef2ee">
      <div class="skel skel-line lg" style="margin-bottom:8px"></div>
      <div class="skel skel-line sm"></div>
    </div>`).join('');
}

function showEmptyHistory(containerId, msg){
  const c = document.getElementById(containerId);
  if(!c) return;
  c.innerHTML = `<div class="empty-state">
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h4"/>
    </svg>
    <strong>No calculations yet</strong>
    <p>${msg||'Your calculation history will appear here once you run your first one.'}</p>
    <button class="btn btn-primary" onclick="startCalc();closeMenus()">Start a calculation</button>
  </div>`;
}

