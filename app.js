/* ═══════════════════════════════════════════════
   ROLE-BASED CATEGORISATION SYSTEM
═══════════════════════════════════════════════ */
const ROLE_HEADS=[
  {id:'site',    label:'Site & Project Engineering',   icon:'🏗', keys:['site engineer','project engineer','project manager','site supervisor','construction engineer','resident engineer','erection engineer','construction manager','civil engineer','civil works']},
  {id:'qs',      label:'Quantity Surveying & Costing', icon:'📐', keys:['quantity surveyor','qs engineer','cost engineer','cost controller','estimation','estimator','billing engineer','commercial engineer','tender engineer','rate analysis','bill of quantities']},
  {id:'planning',label:'Planning & Project Controls',  icon:'📊', keys:['planning engineer','planning manager','project controls','scheduler','planning coordinator','project planner','primavera','ms project','p6 ','schedule engineer']},
  {id:'design',  label:'Design & Structural',          icon:'📏', keys:['design engineer','structural engineer','structural designer','design manager','analysis engineer','detailing engineer','rcc design','steel design','foundation design']},
  {id:'bim',     label:'BIM',                          icon:'💻', keys:['bim ','revit','tekla','navisworks','digital twin','building information','bim engineer','bim coordinator','bim manager']},
  {id:'contracts',label:'Contracts & Procurement',     icon:'📋', keys:['contracts manager','contract engineer','procurement','commercial manager','claims engineer','tendering','bid manager','subcontract']},
  {id:'qaqc',    label:'QA / QC',                      icon:'✅', keys:['quality engineer','qa engineer','qc engineer','quality assurance','quality control','inspection engineer','ndt engineer','quality manager']},
  {id:'hse',     label:'HSE / Safety',                 icon:'🦺', keys:['hse','safety officer','safety engineer','health safety','environment','ehs','fire safety','nebosh','iosh','safety manager']},
  {id:'survey',  label:'Surveying',                    icon:'🔭', keys:['surveyor','survey engineer','geomatics','gis engineer','total station','land survey','topographic survey','quantity survey']},
  {id:'infra',   label:'Infrastructure & Highways',    icon:'🛣', keys:['highway engineer','road engineer','bridge engineer','tunnel engineer','metro','railway','nhai','pavement','transport engineer','infrastructure']},
  {id:'water',   label:'Water & Environment',          icon:'💧', keys:['water supply','sewage','drainage','irrigation','hydraulic','sanitation','wtp','stp','pipeline engineer','water engineer']},
  {id:'govt',    label:'Government / PSU',             icon:'🏛', keys:['psu','municipal corporation','public sector undertaking']},
  {id:'other',   label:'Other / General',              icon:'💼', keys:[]}
];

function classifyJob(j){
  if(j.role_category)return j.role_category;
  const t=((j.role||'')+' '+(j.discipline||'')+' '+(j.description||'')).toLowerCase();
  for(const h of ROLE_HEADS.slice(0,-1))
    if(h.keys.some(k=>t.includes(k)))return h.id;
  return 'other';
}

let activePrivateCategory='';

const $=id=>document.getElementById(id),
$$=s=>[...document.querySelectorAll(s)],
esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

let jobs=[],exams=[],materials=[],route='home',adminKey='',
lang=localStorage.getItem('cc_lang')||'en';

function getSaved(){
  return new Set(JSON.parse(localStorage.getItem('cc_saved')||'[]'))
}

function toggleSave(id){
  const s=getSaved();
  s.has(id)?s.delete(id):s.add(id);
  localStorage.setItem('cc_saved',JSON.stringify([...s]))
}

const pathRoute={
  '/':'home',
  '/private-jobs':'private',
  '/government-jobs':'government',
  '/exams':'exams',
  '/study-materials':'materials',
  '/post-a-job':'post',
  '/submit-resource':'resource',
  '/report':'report',
  '/about':'about',
  '/search':'search',
  '/admin':'admin'
};

const routePath=Object.fromEntries(
  Object.entries(pathRoute).map(([a,b])=>[b,a])
);

const kn={
  'Private Jobs':'ಖಾಸಗಿ ಉದ್ಯೋಗಗಳು',
  'Karnataka Govt Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Exams':'ಪರೀಕ್ಷೆಗಳು',
  'Study Materials':'ಅಧ್ಯಯನ ಸಾಮಗ್ರಿಗಳು',
  'Post a Job':'ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಿ',
  'Submit Resource':'ಸಂಪನ್ಮೂಲ ಸಲ್ಲಿಸಿ',
  'About':'ನಮ್ಮ ಬಗ್ಗೆ',
  'Safety:':'ಸುರಕ್ಷತೆ:',
  'Never pay for a job. Always verify the original notification.':'ಉದ್ಯೋಗಕ್ಕಾಗಿ ಎಂದಿಗೂ ಹಣ ಪಾವತಿಸಬೇಡಿ. ಮೂಲ ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಯನ್ನು ಸದಾ ಪರಿಶೀಲಿಸಿ.',
  'Civil Engineering Careers + Karnataka Government Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ವೃತ್ತಿಗಳು + ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Build Your Career.':'ನಿಮ್ಮ ವೃತ್ತಿಜೀವನವನ್ನು ರೂಪಿಸಿಕೊಳ್ಳಿ.',
  'Find Your Opportunity.':'ನಿಮ್ಮ ಅವಕಾಶವನ್ನು ಕಂಡುಕೊಳ್ಳಿ.',
  'Civil engineering jobs across India and beyond. Karnataka government jobs and exams across departments. Trusted resources, organized in one place.':'ಭಾರತ ಮತ್ತು ವಿದೇಶಗಳ ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳು, ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು ಮತ್ತು ಪರೀಕ್ಷೆಗಳು ಹಾಗೂ ವಿಶ್ವಾಸಾರ್ಹ ಅಧ್ಯಯನ ಸಂಪನ್ಮೂಲಗಳು — ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.',
  'Find Civil Engineering Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ',
  'Explore Karnataka Government Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
  'Explore CivilCareer':'CivilCareer ಅನ್ವೇಷಿಸಿ',
  'Focused paths. Reliable starting points.':'ಕೇಂದ್ರೀಕೃತ ಮಾರ್ಗಗಳು. ವಿಶ್ವಾಸಾರ್ಹ ಆರಂಭ.',
  'Civil Engineering Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳು',
  'Karnataka Government Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Government Exams':'ಸರ್ಕಾರಿ ಪರೀಕ್ಷೆಗಳು',
  'Free Study Materials':'ಉಚಿತ ಅಧ್ಯಯನ ಸಾಮಗ್ರಿಗಳು',
  'We Organize.':'ನಾವು ಕ್ರಮಬದ್ಧಗೊಳಿಸುತ್ತೇವೆ.',
  'You Verify.':'ನೀವು ಪರಿಶೀಲಿಸುತ್ತೀರಿ.',
  'We Organize. You Verify.':'ನಾವು ಕ್ರಮಬದ್ಧಗೊಳಿಸುತ್ತೇವೆ. ನೀವು ಪರಿಶೀಲಿಸುತ್ತೀರಿ.',
  'Latest opportunities':'ಇತ್ತೀಚಿನ ಅವಕಾಶಗಳು',
  'Public recruitment':'ಸರ್ಕಾರಿ ನೇಮಕಾತಿ',
  'Important dates':'ಮುಖ್ಯ ದಿನಾಂಕಗಳು',
  'Closing soon':'ಶೀಘ್ರ ಮುಕ್ತಾಯ',
  'Examination updates':'ಪರೀಕ್ಷಾ ಮಾಹಿತಿ',
  'Learning library':'ಅಧ್ಯಯನ ಗ್ರಂಥಾಲಯ',
  'Trust and safety':'ವಿಶ್ವಾಸ ಮತ್ತು ಸುರಕ್ಷತೆ',
  'Never pay for a job':'ಉದ್ಯೋಗಕ್ಕಾಗಿ ಎಂದಿಗೂ ಹಣ ಪಾವತಿಸಬೇಡಿ',
  'Verify the notification':'ಅಧಿಸೂಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ',
  'Protect personal information':'ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ರಕ್ಷಿಸಿ',
  'For employers':'ಉದ್ಯೋಗದಾತರಿಗೆ',
  'Reach civil engineering professionals.':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ವೃತ್ತಿಪರರನ್ನು ತಲುಪಿ.',
  'Post a Civil Engineering Job':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಿ',
  'Private-sector opportunities':'ಖಾಸಗಿ ವಲಯದ ಅವಕಾಶಗಳು',
  'Karnataka public recruitment':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ನೇಮಕಾತಿ',
  'All departments. Multiple qualifications. One place to start.':'ಎಲ್ಲಾ ಇಲಾಖೆಗಳು. ಹಲವು ಅರ್ಹತೆಗಳು. ಒಂದೇ ಆರಂಭಿಕ ಸ್ಥಳ.',
  'Dates, eligibility and official sources':'ದಿನಾಂಕಗಳು, ಅರ್ಹತೆ ಮತ್ತು ಅಧಿಕೃತ ಮೂಲಗಳು',
  'Karnataka Government Exams':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಪರೀಕ್ಷೆಗಳು',
  'Open learning library':'ಮುಕ್ತ ಅಧ್ಯಯನ ಗ್ರಂಥಾಲಯ',
  'Prepare smarter with organized resources for civil engineering and competitive examinations.':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಮತ್ತು ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆಗಳ ಕ್ರಮಬದ್ಧ ಸಂಪನ್ಮೂಲಗಳೊಂದಿಗೆ ಪರಿಣಾಮಕಾರಿಯಾಗಿ ಸಿದ್ಧರಾಗಿ.',
  'Search':'ಹುಡುಕಿ',
  'Location':'ಸ್ಥಳ',
  'Browse Civil Jobs →':'ಸಿವಿಲ್ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ →',
  'Browse Government Jobs →':'ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ →',
  'Explore Exams →':'ಪರೀಕ್ಷೆಗಳನ್ನು ನೋಡಿ →',
  'Start Learning →':'ಅಧ್ಯಯನ ಪ್ರಾರಂಭಿಸಿ →',
  'Report Suspicious Content':'ಶಂಕಿತ ವಿಷಯವನ್ನು ವರದಿ ಮಾಡಿ',
  'Submit for Review':'ಪರಿಶೀಲನೆಗೆ ಸಲ್ಲಿಸಿ',
  'Report a Problem':'ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ',
  'Submit a Study Resource':'ಅಧ್ಯಯನ ಸಂಪನ್ಮೂಲ ಸಲ್ಲಿಸಿ'
};

function translate(root=document){
  root.querySelectorAll('*').forEach(el=>{
    if(el.id==='language'||el.children.length)return;
    if(!el.dataset.en)el.dataset.en=el.textContent.trim();
    if(kn[el.dataset.en])
      el.textContent=lang==='kn'?kn[el.dataset.en]:el.dataset.en;
  });
  $('language').textContent=lang==='kn'?'EN':'KN';
  document.documentElement.lang=lang==='kn'?'kn':'en'
}

function toast(msg){
  const x=$('toast');
  x.textContent=msg;
  x.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>x.classList.remove('show'),2800)
}

function device(){
  const w=innerWidth;
  return w<600?'Mobile':w<1000?'Tablet':'Desktop'
}

function visitor(){
  let id=localStorage.getItem('cc_vid');
  if(!id){
    id=crypto.randomUUID();
    localStorage.setItem('cc_vid',id)
  }
  return id
}

async function api(url,opt={}){
  const r=await fetch(url,{
    ...opt,
    headers:{
      'content-type':'application/json',
      ...(opt.key?{'x-owner-key':opt.key}:{}),
      ...(opt.headers||{})
    }
  });
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok)throw Error(data.error||`Request failed (${r.status})`);
  return data
}

function track(type='pageview',label=''){
  api('/api/analytics',{
    method:'POST',
    body:JSON.stringify({
      visitor_id:visitor(),
      event_type:type,
      event_label:label,
      path:location.pathname,
      referrer:document.referrer,
      device_type:device()
    })
  }).catch(()=>{})
}

function navigate(next,push=true){
  route=next in routePath?next:'home';
  $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route));
  $('mainNav').classList.remove('open');
  $('menuBtn').setAttribute('aria-expanded','false');
  if(push&&location.pathname!==routePath[route])
    history.pushState({},'',routePath[route]);
  setMeta();
  scrollTo({top:0,behavior:'smooth'});
  if(route==='private')renderPrivate();
  if(route==='government')renderGovernment();
  if(route==='exams')renderExams();
  if(route==='materials')renderMaterials();
  if(route==='admin')showAdmin();
  translate();
  track()
}

const metas={
  home:[
    'CivilCareer — Civil Engineering Careers & Karnataka Government Jobs',
    'Civil engineering jobs across India and beyond, Karnataka government jobs, exams and trusted resources.'
  ],
  private:[
    'Civil Engineering Jobs | CivilCareer',
    'Private-sector civil engineering jobs across Karnataka, India, Gulf and international markets.'
  ],
  government:[
    'Karnataka Government Jobs | CivilCareer',
    'Government recruitment across Karnataka departments, organizations and qualifications.'
  ],
  exams:[
    'Karnataka Government Exams | CivilCareer',
    'KPSC, KAS, FDA, SDA, KARTET, GPSTR, HSTR, AE and JE examination updates.'
  ],
  materials:[
    'Free Civil Engineering & Exam Study Materials | CivilCareer',
    'Free organized civil engineering and Karnataka competitive-exam resources.'
  ],
  post:[
    'Post a Civil Engineering Job | CivilCareer',
    'Submit a legitimate civil engineering job for review.'
  ],
  resource:[
    'Submit Study Resource | CivilCareer',
    'Submit a civil engineering or competitive-exam study resource.'
  ],
  report:[
    'Report a Problem | CivilCareer',
    'Report suspicious or incorrect content on CivilCareer.'
  ],
  about:[
    'About CivilCareer',
    'Civil engineering careers, government jobs, exams and learning resources.'
  ],
  search:[
    'Search CivilCareer',
    'Search civil engineering jobs and opportunities.'
  ],
  admin:[
    'Admin | CivilCareer',
    'CivilCareer administration.'
  ]
};

function setMeta(){
  const m=metas[route]||metas.home;
  document.title=m[0];
  const d=document.querySelector('meta[name="description"]');
  if(d)d.content=m[1]
}
/* ═══════════════════════════════════════════════
   ROLE-BASED CATEGORISATION SYSTEM
═══════════════════════════════════════════════ */
const ROLE_HEADS=[
  {id:'site',    label:'Site & Project Engineering',   icon:'🏗', keys:['site engineer','project engineer','project manager','site supervisor','construction engineer','resident engineer','erection engineer','construction manager','civil engineer','civil works']},
  {id:'qs',      label:'Quantity Surveying & Costing', icon:'📐', keys:['quantity surveyor','qs engineer','cost engineer','cost controller','estimation','estimator','billing engineer','commercial engineer','tender engineer','rate analysis','bill of quantities']},
  {id:'planning',label:'Planning & Project Controls',  icon:'📊', keys:['planning engineer','planning manager','project controls','scheduler','planning coordinator','project planner','primavera','ms project','p6 ','schedule engineer']},
  {id:'design',  label:'Design & Structural',          icon:'📏', keys:['design engineer','structural engineer','structural designer','design manager','analysis engineer','detailing engineer','rcc design','steel design','foundation design']},
  {id:'bim',     label:'BIM',                          icon:'💻', keys:['bim ','revit','tekla','navisworks','digital twin','building information','bim engineer','bim coordinator','bim manager']},
  {id:'contracts',label:'Contracts & Procurement',     icon:'📋', keys:['contracts manager','contract engineer','procurement','commercial manager','claims engineer','tendering','bid manager','subcontract']},
  {id:'qaqc',    label:'QA / QC',                      icon:'✅', keys:['quality engineer','qa engineer','qc engineer','quality assurance','quality control','inspection engineer','ndt engineer','quality manager']},
  {id:'hse',     label:'HSE / Safety',                 icon:'🦺', keys:['hse','safety officer','safety engineer','health safety','environment','ehs','fire safety','nebosh','iosh','safety manager']},
  {id:'survey',  label:'Surveying',                    icon:'🔭', keys:['surveyor','survey engineer','geomatics','gis engineer','total station','land survey','topographic survey','quantity survey']},
  {id:'infra',   label:'Infrastructure & Highways',    icon:'🛣', keys:['highway engineer','road engineer','bridge engineer','tunnel engineer','metro','railway','nhai','pavement','transport engineer','infrastructure']},
  {id:'water',   label:'Water & Environment',          icon:'💧', keys:['water supply','sewage','drainage','irrigation','hydraulic','sanitation','wtp','stp','pipeline engineer','water engineer']},
  {id:'govt',    label:'Government / PSU',             icon:'🏛', keys:['psu','municipal corporation','public sector undertaking']},
  {id:'other',   label:'Other / General',              icon:'💼', keys:[]}
];

function classifyJob(j){
  if(j.role_category)return j.role_category;
  const t=((j.role||'')+' '+(j.discipline||'')+' '+(j.description||'')).toLowerCase();
  for(const h of ROLE_HEADS.slice(0,-1))
    if(h.keys.some(k=>t.includes(k)))return h.id;
  return 'other';
}

let activePrivateCategory='';

const $=id=>document.getElementById(id),
$$=s=>[...document.querySelectorAll(s)],
esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]));

let jobs=[],exams=[],materials=[],route='home',adminKey='',
lang=localStorage.getItem('cc_lang')||'en';

function getSaved(){
  return new Set(JSON.parse(localStorage.getItem('cc_saved')||'[]'))
}

function toggleSave(id){
  const s=getSaved();
  s.has(id)?s.delete(id):s.add(id);
  localStorage.setItem('cc_saved',JSON.stringify([...s]))
}

const pathRoute={
  '/':'home',
  '/private-jobs':'private',
  '/government-jobs':'government',
  '/exams':'exams',
  '/study-materials':'materials',
  '/post-a-job':'post',
  '/submit-resource':'resource',
  '/report':'report',
  '/about':'about',
  '/search':'search',
  '/admin':'admin'
};

const routePath=Object.fromEntries(
  Object.entries(pathRoute).map(([a,b])=>[b,a])
);

const kn={
  'Private Jobs':'ಖಾಸಗಿ ಉದ್ಯೋಗಗಳು',
  'Karnataka Govt Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Exams':'ಪರೀಕ್ಷೆಗಳು',
  'Study Materials':'ಅಧ್ಯಯನ ಸಾಮಗ್ರಿಗಳು',
  'Post a Job':'ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಿ',
  'Submit Resource':'ಸಂಪನ್ಮೂಲ ಸಲ್ಲಿಸಿ',
  'About':'ನಮ್ಮ ಬಗ್ಗೆ',
  'Safety:':'ಸುರಕ್ಷತೆ:',
  'Never pay for a job. Always verify the original notification.':'ಉದ್ಯೋಗಕ್ಕಾಗಿ ಎಂದಿಗೂ ಹಣ ಪಾವತಿಸಬೇಡಿ. ಮೂಲ ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಯನ್ನು ಸದಾ ಪರಿಶೀಲಿಸಿ.',
  'Civil Engineering Careers + Karnataka Government Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ವೃತ್ತಿಗಳು + ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Build Your Career.':'ನಿಮ್ಮ ವೃತ್ತಿಜೀವನವನ್ನು ರೂಪಿಸಿಕೊಳ್ಳಿ.',
  'Find Your Opportunity.':'ನಿಮ್ಮ ಅವಕಾಶವನ್ನು ಕಂಡುಕೊಳ್ಳಿ.',
  'Civil engineering jobs across India and beyond. Karnataka government jobs and exams across departments. Trusted resources, organized in one place.':'ಭಾರತ ಮತ್ತು ವಿದೇಶಗಳ ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳು, ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು ಮತ್ತು ಪರೀಕ್ಷೆಗಳು ಹಾಗೂ ವಿಶ್ವಾಸಾರ್ಹ ಅಧ್ಯಯನ ಸಂಪನ್ಮೂಲಗಳು — ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.',
  'Find Civil Engineering Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳನ್ನು ಹುಡುಕಿ',
  'Explore Karnataka Government Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
  'Explore CivilCareer':'CivilCareer ಅನ್ವೇಷಿಸಿ',
  'Focused paths. Reliable starting points.':'ಕೇಂದ್ರೀಕೃತ ಮಾರ್ಗಗಳು. ವಿಶ್ವಾಸಾರ್ಹ ಆರಂಭ.',
  'Civil Engineering Jobs':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗಗಳು',
  'Karnataka Government Jobs':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳು',
  'Government Exams':'ಸರ್ಕಾರಿ ಪರೀಕ್ಷೆಗಳು',
  'Free Study Materials':'ಉಚಿತ ಅಧ್ಯಯನ ಸಾಮಗ್ರಿಗಳು',
  'We Organize.':'ನಾವು ಕ್ರಮಬದ್ಧಗೊಳಿಸುತ್ತೇವೆ.',
  'You Verify.':'ನೀವು ಪರಿಶೀಲಿಸುತ್ತೀರಿ.',
  'We Organize. You Verify.':'ನಾವು ಕ್ರಮಬದ್ಧಗೊಳಿಸುತ್ತೇವೆ. ನೀವು ಪರಿಶೀಲಿಸುತ್ತೀರಿ.',
  'Latest opportunities':'ಇತ್ತೀಚಿನ ಅವಕಾಶಗಳು',
  'Public recruitment':'ಸರ್ಕಾರಿ ನೇಮಕಾತಿ',
  'Important dates':'ಮುಖ್ಯ ದಿನಾಂಕಗಳು',
  'Closing soon':'ಶೀಘ್ರ ಮುಕ್ತಾಯ',
  'Examination updates':'ಪರೀಕ್ಷಾ ಮಾಹಿತಿ',
  'Learning library':'ಅಧ್ಯಯನ ಗ್ರಂಥಾಲಯ',
  'Trust and safety':'ವಿಶ್ವಾಸ ಮತ್ತು ಸುರಕ್ಷತೆ',
  'Never pay for a job':'ಉದ್ಯೋಗಕ್ಕಾಗಿ ಎಂದಿಗೂ ಹಣ ಪಾವತಿಸಬೇಡಿ',
  'Verify the notification':'ಅಧಿಸೂಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ',
  'Protect personal information':'ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ರಕ್ಷಿಸಿ',
  'For employers':'ಉದ್ಯೋಗದಾತರಿಗೆ',
  'Reach civil engineering professionals.':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ವೃತ್ತಿಪರರನ್ನು ತಲುಪಿ.',
  'Post a Civil Engineering Job':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಉದ್ಯೋಗ ಪ್ರಕಟಿಸಿ',
  'Private-sector opportunities':'ಖಾಸಗಿ ವಲಯದ ಅವಕಾಶಗಳು',
  'Karnataka public recruitment':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ನೇಮಕಾತಿ',
  'All departments. Multiple qualifications. One place to start.':'ಎಲ್ಲಾ ಇಲಾಖೆಗಳು. ಹಲವು ಅರ್ಹತೆಗಳು. ಒಂದೇ ಆರಂಭಿಕ ಸ್ಥಳ.',
  'Dates, eligibility and official sources':'ದಿನಾಂಕಗಳು, ಅರ್ಹತೆ ಮತ್ತು ಅಧಿಕೃತ ಮೂಲಗಳು',
  'Karnataka Government Exams':'ಕರ್ನಾಟಕ ಸರ್ಕಾರಿ ಪರೀಕ್ಷೆಗಳು',
  'Open learning library':'ಮುಕ್ತ ಅಧ್ಯಯನ ಗ್ರಂಥಾಲಯ',
  'Prepare smarter with organized resources for civil engineering and competitive examinations.':'ಸಿವಿಲ್ ಎಂಜಿನಿಯರಿಂಗ್ ಮತ್ತು ಸ್ಪರ್ಧಾತ್ಮಕ ಪರೀಕ್ಷೆಗಳ ಕ್ರಮಬದ್ಧ ಸಂಪನ್ಮೂಲಗಳೊಂದಿಗೆ ಪರಿಣಾಮಕಾರಿಯಾಗಿ ಸಿದ್ಧರಾಗಿ.',
  'Search':'ಹುಡುಕಿ',
  'Location':'ಸ್ಥಳ',
  'Browse Civil Jobs →':'ಸಿವಿಲ್ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ →',
  'Browse Government Jobs →':'ಸರ್ಕಾರಿ ಉದ್ಯೋಗಗಳನ್ನು ನೋಡಿ →',
  'Explore Exams →':'ಪರೀಕ್ಷೆಗಳನ್ನು ನೋಡಿ →',
  'Start Learning →':'ಅಧ್ಯಯನ ಪ್ರಾರಂಭಿಸಿ →',
  'Report Suspicious Content':'ಶಂಕಿತ ವಿಷಯವನ್ನು ವರದಿ ಮಾಡಿ',
  'Submit for Review':'ಪರಿಶೀಲನೆಗೆ ಸಲ್ಲಿಸಿ',
  'Report a Problem':'ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ',
  'Submit a Study Resource':'ಅಧ್ಯಯನ ಸಂಪನ್ಮೂಲ ಸಲ್ಲಿಸಿ'
};

function translate(root=document){
  root.querySelectorAll('*').forEach(el=>{
    if(el.id==='language'||el.children.length)return;
    if(!el.dataset.en)el.dataset.en=el.textContent.trim();
    if(kn[el.dataset.en])
      el.textContent=lang==='kn'?kn[el.dataset.en]:el.dataset.en;
  });
  $('language').textContent=lang==='kn'?'EN':'KN';
  document.documentElement.lang=lang==='kn'?'kn':'en'
}

function toast(msg){
  const x=$('toast');
  x.textContent=msg;
  x.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>x.classList.remove('show'),2800)
}

function device(){
  const w=innerWidth;
  return w<600?'Mobile':w<1000?'Tablet':'Desktop'
}

function visitor(){
  let id=localStorage.getItem('cc_vid');
  if(!id){
    id=crypto.randomUUID();
    localStorage.setItem('cc_vid',id)
  }
  return id
}

async function api(url,opt={}){
  const r=await fetch(url,{
    ...opt,
    headers:{
      'content-type':'application/json',
      ...(opt.key?{'x-owner-key':opt.key}:{}),
      ...(opt.headers||{})
    }
  });
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok)throw Error(data.error||`Request failed (${r.status})`);
  return data
}

function track(type='pageview',label=''){
  api('/api/analytics',{
    method:'POST',
    body:JSON.stringify({
      visitor_id:visitor(),
      event_type:type,
      event_label:label,
      path:location.pathname,
      referrer:document.referrer,
      device_type:device()
    })
  }).catch(()=>{})
}

function navigate(next,push=true){
  route=next in routePath?next:'home';
  $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===route));
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route));
  $('mainNav').classList.remove('open');
  $('menuBtn').setAttribute('aria-expanded','false');
  if(push&&location.pathname!==routePath[route])
    history.pushState({},'',routePath[route]);
  setMeta();
  scrollTo({top:0,behavior:'smooth'});
  if(route==='private')renderPrivate();
  if(route==='government')renderGovernment();
  if(route==='exams')renderExams();
  if(route==='materials')renderMaterials();
  if(route==='admin')showAdmin();
  translate();
  track()
}

const metas={
  home:[
    'CivilCareer — Civil Engineering Careers & Karnataka Government Jobs',
    'Civil engineering jobs across India and beyond, Karnataka government jobs, exams and trusted resources.'
  ],
  private:[
    'Civil Engineering Jobs | CivilCareer',
    'Private-sector civil engineering jobs across Karnataka, India, Gulf and international markets.'
  ],
  government:[
    'Karnataka Government Jobs | CivilCareer',
    'Government recruitment across Karnataka departments, organizations and qualifications.'
  ],
  exams:[
    'Karnataka Government Exams | CivilCareer',
    'KPSC, KAS, FDA, SDA, KARTET, GPSTR, HSTR, AE and JE examination updates.'
  ],
  materials:[
    'Free Civil Engineering & Exam Study Materials | CivilCareer',
    'Free organized civil engineering and Karnataka competitive-exam resources.'
  ],
  post:[
    'Post a Civil Engineering Job | CivilCareer',
    'Submit a legitimate civil engineering job for review.'
  ],
  resource:[
    'Submit Study Resource | CivilCareer',
    'Submit a civil engineering or competitive-exam study resource.'
  ],
  report:[
    'Report a Problem | CivilCareer',
    'Report suspicious or incorrect content on CivilCareer.'
  ],
  about:[
    'About CivilCareer',
    'Civil engineering careers, government jobs, exams and learning resources.'
  ],
  search:[
    'Search CivilCareer',
    'Search civil engineering jobs and opportunities.'
  ],
  admin:[
    'Admin | CivilCareer',
    'CivilCareer administration.'
  ]
};

function setMeta(){
  const m=metas[route]||metas.home;
  document.title=m[0];
  const d=document.querySelector('meta[name="description"]');
  if(d)d.content=m[1]
}
function renderPrivate(){
  let a=jobs.filter(j=>(j.sector||'Private')==='Private');

  const role=($('privateRole')&&$('privateRole').value||'').toLowerCase();
  const loc=($('privateLocation')&&$('privateLocation').value||'').toLowerCase();
  const exp=($('privateExperience')&&$('privateExperience').value||'').toLowerCase();
  const qual=($('privateQualification')&&$('privateQualification').value||'').toLowerCase();
  const timePeriod=$('privateSort')&&$('privateSort').value||'';
  const now=Date.now();

  /*
    IMPORTANT:
    Private Jobs time filters now use the ORIGINAL
    vacancy posting date instead of CivilCareer created_at.
  */
  if(['24h','3d','7d','14d','30d','week','month'].includes(timePeriod)){
    const days={
      '24h':1,
      '3d':3,
      '7d':7,
      '14d':14,
      '30d':30,
      'week':7,
      'month':30
    };

    const cut=now-days[timePeriod]*86400000;

    a=a.filter(j=>{
      const posted=getPostedTime(j);
      return posted>0&&posted>=cut;
    });

  }else if(timePeriod==='closing_soon'){

    a=a.filter(j=>j.deadline&&!isClosed(j));

    a.sort((x,y)=>
      (x.deadline||'9999').localeCompare(y.deadline||'9999')
    );

  }else if(timePeriod==='oldest'){

    a.sort((x,y)=>{
      const px=getPostedTime(x);
      const py=getPostedTime(y);

      // Jobs with a known original posting date come first.
      // Unknown dates go to the end.
      if(px===0&&py===0)return 0;
      if(px===0)return 1;
      if(py===0)return-1;

      return px-py;
    });

  }else{

    a.sort((x,y)=>{
      const px=getPostedTime(x);
      const py=getPostedTime(y);

      // Jobs with known original posting dates come first.
      if(px===0&&py===0)return 0;
      if(px===0)return 1;
      if(py===0)return-1;

      return py-px;
    });
  }

  a=a
    .filter(j=>!role||String(j.role).toLowerCase().includes(role))
    .filter(j=>!loc||String(j.location).toLowerCase().includes(loc))
    .filter(j=>!exp||String(j.experience_level).toLowerCase()===exp)
    .filter(j=>!qual||String(j.qualification).toLowerCase().includes(qual));

  if($('privateType')&&$('privateType').value)
    a=a.filter(j=>j.employment_type===$('privateType').value);

  // Category view
  if(!activePrivateCategory){

    const counts={};

    jobs
      .filter(j=>(j.sector||'Private')==='Private')
      .forEach(j=>{
        const c=classifyJob(j);
        counts[c]=(counts[c]||0)+1;
      });

    const tiles=ROLE_HEADS
      .filter(h=>counts[h.id])
      .map(h=>`
        <button
          class="role-tile"
          onclick="activePrivateCategory='${h.id}';renderPrivate()"
        >
          <span class="role-tile-icon">${h.icon}</span>
          <span class="role-tile-label">${h.label}</span>
          <span class="role-tile-count">
            ${counts[h.id]} job${counts[h.id]>1?'s':''}
          </span>
        </button>
      `).join('');

    $('privateJobs').innerHTML=
      `<div class="role-heads-grid">
        ${tiles||empty(
          'No civil engineering jobs yet',
          'Verified opportunities will appear here.'
        )}
      </div>`;

    $('privateCount').textContent='Select a category to browse jobs';

    bindCards();
    return;
  }

  // Filter by selected category
  const head=
    ROLE_HEADS.find(h=>h.id===activePrivateCategory)||
    ROLE_HEADS.at(-1);

  a=a.filter(j=>classifyJob(j)===activePrivateCategory);

  $('privateCount').textContent=
    `${a.length} ${head.label} job${a.length===1?'':'s'}`;

  const backBtn=
    `<button
      class="category-back"
      onclick="activePrivateCategory='';renderPrivate()"
    >← All Categories</button>`;

  $('privateJobs').innerHTML=
    backBtn+
    (
      a.length
      ?a.map(x=>jobCard(x)).join('')
      :empty(
        'No jobs in this category',
        'Check back soon or browse another category.'
      )
    );

  bindCards();
}

function renderGovernment(){
  let a=jobs.filter(j=>['Government','Public Sector'].includes(j.sector));

  const dep=($('govDepartment')&&$('govDepartment').value||'').toLowerCase();
  const loc=($('govLocation')&&$('govLocation').value||'').toLowerCase();
  const qual=($('govQualification')&&$('govQualification').value||'').toLowerCase();
  const dist=($('govDistrict')&&$('govDistrict').value||'').toLowerCase();
  const edu=($('govEdu')&&$('govEdu').value||'').toLowerCase();

  const org=
    (
      $('govOrgChips')&&
      $('govOrgChips').querySelector('.active:not([data-org=""])')||
      {dataset:{org:''}}
    ).dataset.org||'';

  a=a
    .filter(j=>
      !dep||
      [j.company,j.discipline,j.description]
        .join(' ')
        .toLowerCase()
        .includes(dep)
    )
    .filter(j=>
      !loc||
      String(j.location).toLowerCase().includes(loc)
    )
    .filter(j=>
      !dist||
      String(j.location).toLowerCase().includes(dist)
    )
    .filter(j=>
      !qual||
      String(j.qualification).toLowerCase().includes(qual)
    )
    .filter(j=>
      !edu||
      String(j.qualification).toLowerCase().includes(edu)
    )
    .filter(j=>
      !org||
      [j.company,j.recruitment_authority,j.description]
        .join(' ')
        .toLowerCase()
        .includes(org)
    );

  if($('govStatus')&&$('govStatus').value)
    a=a.filter(j=>
      $('govStatus').value==='closed'
        ?isClosed(j)
        :!isClosed(j)
    );

  a.sort(
    $('govSort')&&$('govSort').value==='deadline'
      ?(x,y)=>
        (x.deadline||'9999').localeCompare(y.deadline||'9999')
      :(x,y)=>{
        const px=getPostedTime(x);
        const py=getPostedTime(y);

        if(px===0&&py===0)return 0;
        if(px===0)return 1;
        if(py===0)return-1;

        return py-px;
      }
  );

  $('governmentCount').textContent=
    `${a.length} Karnataka government opportunit${a.length===1?'y':'ies'}`;

  const groups={};

  a.forEach(j=>{
    const auth=j.recruitment_authority||j.company||'Other';
    if(!groups[auth])groups[auth]=[];
    groups[auth].push(j);
  });

  if(Object.keys(groups).length===0){

    $('governmentJobs').innerHTML=
      empty(
        'No matching government recruitment',
        'Verified Karnataka government opportunities will appear here as they are published.'
      );

  }else if(
    Object.keys(groups).length===1||
    dist||dep||edu||org||loc||qual
  ){

    $('governmentJobs').innerHTML=
      a.map(x=>jobCard(x,true)).join('');

  }else{

    $('governmentJobs').innerHTML=
      Object.entries(groups).map(([auth,list])=>`
        <div class="auth-group">
          <div class="auth-group-header">
            <span class="auth-badge">${esc(auth)}</span>
            <span>
              ${list.length}
              notification${list.length>1?'s':''}
            </span>
          </div>
          <div class="auth-group-jobs">
            ${list.map(x=>jobCard(x,true)).join('')}
          </div>
        </div>
      `).join('');
  }

  bindCards();
}

function renderExams(code=''){
  let a=[...exams];

  if(code)
    a=a.filter(x=>
      String(x.code||'').toLowerCase()===String(code).toLowerCase()
    );

  a=a.filter(x=>{
    if(x.application_end){
      const d=safeDateOnly(x.application_end);
      if(d){
        d.setHours(23,59,59,999);
        return d>=new Date();
      }
    }
    return true;
  });

  $('examCount').textContent=
    `${a.length} examination${a.length===1?'':'s'}`;

  $('examList').innerHTML=
    a.length
      ?a.map(examCard).join('')
      :empty(
        'No examination updates',
        'Official examination notifications will appear here.'
      );

  bindCards();
}

function renderMaterials(type=''){
  let a=[...materials];

  if(type)
    a=a.filter(x=>
      String(x.material_type||x.category||'')
        .toLowerCase()===String(type).toLowerCase()
    );

  $('materialCount').textContent=
    `${a.length} resource${a.length===1?'':'s'}`;

  $('materialsList').innerHTML=
    a.length
      ?a.map(materialCard).join('')
      :empty(
        'No resources available',
        'Free study materials will appear here.'
      );

  bindCards();
}

function examCard(x){
  return `
    <article class="exam-card" data-exam="${esc(x.id)}">
      <div class="exam-card-top">
        <span class="pill">
          ${esc(x.code||'Exam')}
        </span>
        ${
          x.application_end
          ?`<span class="verified-date">
              Last date ${esc(date(x.application_end))}
            </span>`
          :''
        }
      </div>

      <h3>${esc(
        lang==='kn'&&x.title_kn
          ?x.title_kn
          :x.title_en||'Examination'
      )}</h3>

      <p>${esc(x.authority||'Examination update')}</p>

      ${
        x.description_en
        ?`<div class="exam-description">
            ${esc(String(x.description_en).slice(0,350))}
          </div>`
        :''
      }

      <div class="card-actions">
        <button
          class="view-exam"
          data-exam="${esc(x.id)}"
        >View Details</button>
      </div>
    </article>
  `;
}

function materialCard(m){
  return `
    <article class="material-card" data-material="${esc(m.id)}">
      <div class="material-type">
        ${esc(m.material_type||m.category||'Study Material')}
      </div>

      <h3>${esc(
        lang==='kn'&&m.title_kn
          ?m.title_kn
          :m.title_en||'Study Resource'
      )}</h3>

      <p>${esc(
        String(m.description_en||'')
          .slice(0,280)
      )}</p>

      <div class="card-actions">
        <button
          class="view-material"
          data-material="${esc(m.id)}"
        >View Resource</button>
      </div>
    </article>
  `;
}
function empty(title,sub=''){
  return `<div class="empty"><strong>${esc(title)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>`
}

function safeDateOnly(v){
  if(!v)return null;
  const s=String(v).trim();
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const d=new Date(
      Number(m[1]),
      Number(m[2])-1,
      Number(m[3])
    );
    return isNaN(d)?null:d
  }
  const d=new Date(s);
  return isNaN(d)?null:d
}

function date(v){
  if(!v)return'Check official notification';
  const d=safeDateOnly(v);
  if(!d)return String(v);
  return d.toLocaleDateString(
    lang==='kn'?'kn-IN':'en-IN',
    {day:'numeric',month:'short',year:'numeric'}
  )
}

/* ═══════════════════════════════════════════════
   POSTING DATE / TIME
   IMPORTANT:
   created_at = when CivilCareer added the job.
   posted_date / posted_at / published_at = when
   the original vacancy was posted.
═══════════════════════════════════════════════ */

function postingRaw(j){
  return j?.posted_at ||
         j?.posted_date ||
         j?.published_at ||
         j?.date_posted ||
         j?.datePosted ||
         '';
}

function parsePostingDate(v){
  if(!v)return null;

  const s=String(v).trim();
  if(!s)return null;

  // YYYY-MM-DD must be interpreted as a local calendar date,
  // not UTC, otherwise India can shift it to the previous day.
  const isoDate=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(isoDate){
    const d=new Date(
      Number(isoDate[1]),
      Number(isoDate[2])-1,
      Number(isoDate[3])
    );
    return isNaN(d)?null:d
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(.+))?$/);
  if(dmy){
    const d=new Date(
      Number(dmy[3]),
      Number(dmy[2])-1,
      Number(dmy[1])
    );
    if(!isNaN(d)){
      if(dmy[4]){
        const t=new Date(`${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')} ${dmy[4]}`);
        if(!isNaN(t))return t
      }
      return d
    }
  }

  // Natural-language dates such as:
  // Sep 7, 2026
  // September 7, 2026
  // Sep 7 2026
  const natural=s.match(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\.?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})(.*)$/i
  );
  if(natural){
    const monthMap={
      jan:0,january:0,
      feb:1,february:1,
      mar:2,march:2,
      apr:3,april:3,
      may:4,
      jun:5,june:5,
      jul:6,july:6,
      aug:7,august:7,
      sep:8,sept:8,september:8,
      oct:9,october:9,
      nov:10,november:10,
      dec:11,december:11
    };
    const month=monthMap[natural[1].toLowerCase()];
    const day=Number(natural[2]);
    const year=Number(natural[3]);
    const rest=(natural[4]||'').trim();

    let d=new Date(year,month,day);

    if(rest){
      const timeMatch=rest.match(
        /(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?/i
      );
      if(timeMatch){
        let h=Number(timeMatch[1]);
        const min=Number(timeMatch[2]||0);
        const sec=Number(timeMatch[3]||0);
        const ap=(timeMatch[4]||'').toUpperCase();

        if(ap==='PM'&&h<12)h+=12;
        if(ap==='AM'&&h===12)h=0;

        d=new Date(year,month,day,h,min,sec)
      }
    }

    return isNaN(d)?null:d
  }

  // ISO timestamp / normal timestamp
  const parsed=new Date(s);
  if(!isNaN(parsed))return parsed;

  // Last attempt for text containing a recognizable date.
  const extracted=s.match(
    /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/
  );
  if(extracted){
    const d=new Date(
      Number(extracted[3]),
      Number(extracted[2])-1,
      Number(extracted[1])
    );
    return isNaN(d)?null:d
  }

  return null
}

function postingHasTime(v){
  if(!v)return false;
  const s=String(v).trim();

  // A plain calendar date has no posting time.
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  if(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s))return false;

  // Explicit AM/PM or a time component.
  if(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/i.test(s))return true;
  if(/\b(?:AM|PM)\b/i.test(s))return true;
  if(/[T ]\d{1,2}:\d{2}/.test(s))return true;

  return false
}

function dayKey(d){
  if(!d)return'';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function todayKey(){
  const d=new Date();
  return dayKey(d)
}

function yesterdayKey(){
  const d=new Date();
  d.setDate(d.getDate()-1);
  return dayKey(d)
}

function postingDisplay(j){
  const raw=postingRaw(j);
  if(!raw){
    return {
      label:'Posting date not available',
      isNew:false,
      time:null,
      date:null
    }
  }

  const d=parsePostingDate(raw);
  if(!d){
    return {
      label:String(raw),
      isNew:false,
      time:null,
      date:null
    }
  }

  const today=todayKey();
  const yesterday=yesterdayKey();
  const key=dayKey(d);

  const hasTime=postingHasTime(raw);

  if(key===today){
    let label='Posted today';

    if(hasTime){
      label+=` · ${d.toLocaleTimeString(
        'en-IN',
        {
          hour:'numeric',
          minute:'2-digit',
          hour12:true
        }
      )}`
    }

    return {
      label,
      isNew:true,
      time:d,
      date:d
    }
  }

  if(key===yesterday){
    let label='Posted yesterday';

    if(hasTime){
      label+=` · ${d.toLocaleTimeString(
        'en-IN',
        {
          hour:'numeric',
          minute:'2-digit',
          hour12:true
        }
      )}`
    }

    return {
      label,
      isNew:true,
      time:d,
      date:d
    }
  }

  return {
    label:`Posted ${d.toLocaleDateString(
      'en-IN',
      {
        day:'numeric',
        month:'short',
        year:'numeric'
      }
    )}${hasTime?' · '+d.toLocaleTimeString(
      'en-IN',
      {
        hour:'numeric',
        minute:'2-digit',
        hour12:true
      }
    ):''}`,
    isNew:false,
    time:d,
    date:d
  }
}

function getPostedTime(j){
  const raw=postingRaw(j);
  const d=parsePostingDate(raw);
  if(d&&!isNaN(d))return d.getTime();

  // If original posting date is unavailable, return 0.
  // Never use created_at as a fake posting date.
  return 0
}

function timeAgo(v){
  if(!v)return'';
  const d=new Date(v);
  if(isNaN(d))return'';

  const diff=Math.max(0,Date.now()-d.getTime());
  const mins=Math.floor(diff/60000);

  if(mins<1)return'Just now';
  if(mins<60)return`${mins}m ago`;

  const hrs=Math.floor(mins/60);
  if(hrs<24)return`${hrs}h ago`;

  const days=Math.floor(hrs/24);
  if(days<7)return`${days}d ago`;

  return d.toLocaleDateString(
    'en-IN',
    {day:'numeric',month:'short',year:'numeric'}
  )
}

function isClosed(j){
  if(!j?.deadline)return false;
  const d=safeDateOnly(j.deadline);
  if(!d)return false;

  d.setHours(23,59,59,999);
  return d.getTime()<Date.now()
}

function jobCard(j,gov=false){
  const closed=isClosed(j);
  const verified=j.last_verified&&!closed;
  const saved=getSaved().has(j.id);
  const posted=postingDisplay(j);
  const isNew=posted.isNew;

  return `<article class="job-card ${closed?'closed':''}" data-job="${esc(j.id)}">
    <div class="job-top">
      <div>
        <h3>${esc(j.role||'Opportunity')}</h3>
        <div class="organization">
          ${esc(j.company||'Organization')}
          <span class="post-age">${esc(posted.label)}</span>
        </div>
      </div>

      <button
        class="save-btn ${saved?'saved':''}"
        data-save="${esc(j.id)}"
        aria-label="${saved?'Unsave':'Save'} job"
        title="${saved?'Unsave':'Save'}"
      >${saved?'★':'☆'}</button>
    </div>

    <div class="job-meta">
      ${j.location?`<span>📍 ${esc(j.location)}</span>`:''}
      ${j.experience_level?`<span>💼 ${esc(j.experience_level)}</span>`:''}
      ${j.employment_type?`<span>🕒 ${esc(j.employment_type)}</span>`:''}
      ${j.work_mode?`<span>🏠 ${esc(j.work_mode)}</span>`:''}
    </div>

    ${isNew?'<span class="new-badge">NEW</span>':''}

    ${verified?'<span class="verified-badge">✓ Verified</span>':''}

    ${j.salary?`<div class="job-salary">💰 ${esc(j.salary)}</div>`:''}

    ${j.qualification?`
      <div class="job-qualification">
        <b>Qualification:</b> ${esc(j.qualification)}
      </div>
    `:''}

    ${j.deadline?`
      <div class="job-deadline ${closed?'expired':''}">
        <b>Last date:</b> ${esc(date(j.deadline))}
      </div>
    `:''}

    ${j.description?`
      <p class="job-description">
        ${esc(String(j.description).slice(0,420))}
        ${String(j.description).length>420?'…':''}
      </p>
    `:''}

    <div class="job-actions">
      <button class="view-job" data-job="${esc(j.id)}">View Details</button>
      ${j.application_url||j.source_url?`
        <a
          class="apply-btn"
          href="${esc(j.application_url||j.source_url)}"
          target="_blank"
          rel="noopener noreferrer"
        >APPLY NOW</a>
      `:''}
    </div>
  </article>`
}
