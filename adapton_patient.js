import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         sendEmailVerification, sendPasswordResetEmail, onAuthStateChanged, signOut,
         updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:"AIzaSyCtuiS-ZbN-IYgbU2uaAwq2yHcRWpQs6UY",
  authDomain:"challenge-82d30.firebaseapp.com",
  projectId:"challenge-82d30",
  storageBucket:"challenge-82d30.firebasestorage.app",
  messagingSenderId:"725547008897",
  appId:"1:725547008897:web:beb24f4d6ba46ef7451e80"
};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

let currentUser=null,isGuest=false,currentRecord=null,timerInterval=null;
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
let qrStream=null,qrScanInterval=null;
const urlParams=new URLSearchParams(window.location.search);
const recordId=urlParams.get('id');

function showAlertEl(id,type,msg){const el=document.getElementById(id);if(el)el.innerHTML=`<div class="alert alert-${type}">${msg}</div>`;}
function getInitial(n){return(n||'?').charAt(0).toUpperCase();}

function enterApp(user,guest=false){
  isGuest=guest;currentUser=user;
  document.getElementById('loginPage').style.display='none';
  const ap=document.getElementById('appPage');ap.style.display='flex';ap.style.flexDirection='column';ap.style.minHeight='100vh';
  const name=guest?'게스트':(user?.displayName||user?.email||'');
  document.getElementById('userName').textContent=name;
  document.getElementById('userAvatar').textContent=getInitial(name);
  document.getElementById('saveSection').style.display=guest?'none':'block';
  document.getElementById('guestSaveSection').style.display=guest?'block':'none';
  if(recordId){showPage('view');loadRecord(recordId);}
  else showPage('home');
}

async function doLogout(){
  isGuest=false;currentUser=null;stopQrScan();
  if(timerInterval)clearInterval(timerInterval);
  try{await signOut(auth);}catch(e){}
  document.getElementById('appPage').style.display='none';
  document.getElementById('loginPage').style.display='flex';
}

onAuthStateChanged(auth,user=>{if(user&&!isGuest){if(!user.emailVerified){signOut(auth);return;}enterApp(user,false);}});

document.getElementById('tabLoginBtn').addEventListener('click',()=>{document.getElementById('tabLoginBtn').classList.add('active');document.getElementById('tabSignupBtn').classList.remove('active');document.getElementById('formLogin').style.display='block';document.getElementById('formSignup').style.display='none';});
document.getElementById('tabSignupBtn').addEventListener('click',()=>{document.getElementById('tabSignupBtn').classList.add('active');document.getElementById('tabLoginBtn').classList.remove('active');document.getElementById('formSignup').style.display='block';document.getElementById('formLogin').style.display='none';});

document.getElementById('btnLogin').addEventListener('click',async()=>{
  const email=document.getElementById('loginEmail').value.trim(),pw=document.getElementById('loginPw').value;
  if(!email||!pw){showAlertEl('loginAlert','error','이메일과 비밀번호를 입력해주세요.');return;}
  try{const cred=await signInWithEmailAndPassword(auth,email,pw);if(!cred.user.emailVerified){await signOut(auth);showAlertEl('loginAlert','error','이메일 인증이 필요해요.');return;}enterApp(cred.user,false);}
  catch(e){showAlertEl('loginAlert','error',e.code==='auth/invalid-credential'?'이메일 또는 비밀번호가 틀렸어요.':e.message);}
});

document.getElementById('btnSignup').addEventListener('click',async()=>{
  const name=document.getElementById('signupName').value.trim(),email=document.getElementById('signupEmail').value.trim(),pw=document.getElementById('signupPw').value;
  if(!name||!email||!pw){showAlertEl('signupAlert','error','모든 항목을 입력해주세요.');return;}
  if(pw.length<6){showAlertEl('signupAlert','error','비밀번호는 6자 이상이어야 해요.');return;}
  try{const cred=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(cred.user,{displayName:name});await sendEmailVerification(cred.user);await signOut(auth);showAlertEl('signupAlert','success','✅ 가입 완료! 이메일 인증 메일을 확인해주세요.');setTimeout(()=>document.getElementById('tabLoginBtn').click(),2000);}
  catch(e){showAlertEl('signupAlert','error',e.code==='auth/email-already-in-use'?'이미 사용 중인 이메일이에요.':e.message);}
});

document.getElementById('linkReset').addEventListener('click',async(e)=>{e.preventDefault();const email=document.getElementById('loginEmail').value.trim();if(!email){showAlertEl('loginAlert','error','이메일을 먼저 입력해주세요.');return;}try{await sendPasswordResetEmail(auth,email);showAlertEl('loginAlert','success','✅ 재설정 이메일을 보냈어요!');}catch(e){showAlertEl('loginAlert','error','전송 실패.');}});
document.getElementById('btnGuest').addEventListener('click',()=>enterApp(null,true));
document.getElementById('btnGuestSignup').addEventListener('click',()=>{isGuest=false;document.getElementById('appPage').style.display='none';document.getElementById('loginPage').style.display='flex';document.getElementById('tabSignupBtn').click();});
document.getElementById('btnGuestLogin2').addEventListener('click',()=>{isGuest=false;document.getElementById('appPage').style.display='none';document.getElementById('loginPage').style.display='flex';});
document.getElementById('btnCalGuestLogin').addEventListener('click',()=>{isGuest=false;document.getElementById('appPage').style.display='none';document.getElementById('loginPage').style.display='flex';});
document.getElementById('btnSavedGuestLogin').addEventListener('click',()=>{isGuest=false;document.getElementById('appPage').style.display='none';document.getElementById('loginPage').style.display='flex';});

function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('sidebarOverlay').classList.add('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('open');}
document.getElementById('btnHamburger').addEventListener('click',openSidebar);
document.getElementById('btnCloseSidebar').addEventListener('click',closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click',closeSidebar);
document.querySelectorAll('.sidebar-item[data-page]').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
document.getElementById('sidebarLogout').addEventListener('click',doLogout);

document.getElementById('userBtn').addEventListener('click',(e)=>{e.stopPropagation();document.getElementById('userDropdown').classList.toggle('open');});
document.addEventListener('click',()=>document.getElementById('userDropdown').classList.remove('open'));
document.getElementById('ddHome').addEventListener('click',()=>{document.getElementById('userDropdown').classList.remove('open');showPage('home');});
document.getElementById('ddSaved').addEventListener('click',()=>{document.getElementById('userDropdown').classList.remove('open');showPage('saved');});
document.getElementById('ddCal').addEventListener('click',()=>{document.getElementById('userDropdown').classList.remove('open');showPage('calendar');});
document.getElementById('ddSettings').addEventListener('click',()=>{document.getElementById('userDropdown').classList.remove('open');showPage('settings');});
document.getElementById('ddLogout').addEventListener('click',()=>{document.getElementById('userDropdown').classList.remove('open');doLogout();});

window.showPage=function(name){
  document.querySelectorAll('[id^="page-"]').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.querySelectorAll('.sidebar-item[data-page]').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.sidebar-item[data-page="${name}"]`)?.classList.add('active');
  closeSidebar();window.scrollTo({top:0,behavior:'smooth'});
  if(name==='saved'){
    if(isGuest){
      document.getElementById('savedGuestBlock').style.display='block';
      document.getElementById('savedContent').style.display='none';
    } else {
      document.getElementById('savedGuestBlock').style.display='none';
      document.getElementById('savedContent').style.display='block';
      renderSavedRecords();
    }
  }
  if(name==='calendar'){
    if(isGuest){
      document.getElementById('calGuestBlock').style.display='block';
      document.getElementById('calContent').style.display='none';
    } else {
      document.getElementById('calGuestBlock').style.display='none';
      document.getElementById('calContent').style.display='block';
      renderCalendar();
    }
  }
  if(name==='settings'){
    document.getElementById('translateApiKeyInput').value = localStorage.getItem('adapton_translate_key')||'';
  }
  if(name!=='qrscan')stopQrScan();
};

document.getElementById('homeQrBtn').addEventListener('click',()=>showPage('qrscan'));
document.getElementById('homeSavedBtn').addEventListener('click',()=>showPage('saved'));

// QR 스캔
async function startQrScan(){
  if(qrStream)return;
  document.getElementById('qrScanBox').style.display='none';
  document.getElementById('qrVideoWrap').style.display='block';
  document.getElementById('qrBtns').style.display='block';
  showAlertEl('qrScanResult','info','QR 코드를 화면 중앙에 맞춰주세요');
  try{
    qrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video=document.getElementById('qrVideo');video.srcObject=qrStream;await video.play();
    const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
    qrScanInterval=setInterval(()=>{
      if(video.readyState!==video.HAVE_ENOUGH_DATA)return;
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const code=window.jsQR?window.jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:'dontInvert'}):null;
      if(code&&code.data){stopQrScan();processQrData(code.data);}
    },300);
  }catch(e){stopQrScan();showAlertEl('qrScanResult','error','카메라 접근이 거부됐어요. 브라우저에서 카메라 권한을 허용해주세요.');}
}

document.getElementById('qrScanBox').addEventListener('click',startQrScan);
document.getElementById('btnStopScan').addEventListener('click',stopQrScan);

function stopQrScan(){
  if(qrScanInterval){clearInterval(qrScanInterval);qrScanInterval=null;}
  if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null;}
  document.getElementById('qrVideoWrap').style.display='none';
  document.getElementById('qrScanBox').style.display='block';
  document.getElementById('qrBtns').style.display='none';
}

function processQrData(data){
  try{const url=new URL(data);const id=url.searchParams.get('id');if(id){showPage('view');loadRecord(id);return;}}catch(e){}
  if(data&&data.length>5){showPage('view');loadRecord(data);return;}
  showAlertEl('qrScanResult','error','유효하지 않은 QR 코드예요.');
}

document.getElementById('btnManualLink').addEventListener('click',()=>{
  const val=document.getElementById('manualLinkInput').value.trim();
  if(!val){showAlertEl('manualLinkAlert','error','링크 또는 ID를 입력해주세요.');return;}
  processQrData(val);
});

async function loadRecord(id){
  ['view-loading','view-expired','view-notfound','view-content'].forEach(i=>{const el=document.getElementById(i);if(el)el.style.display='none';});
  document.getElementById('view-loading').style.display='block';
  try{
    const snap=await getDoc(doc(db,'shared_records',id));
    if(!snap.exists()){document.getElementById('view-loading').style.display='none';document.getElementById('view-notfound').style.display='block';return;}
    const data={id:snap.id,...snap.data()};
    if(data.expiresAt&&Date.now()>data.expiresAt){document.getElementById('view-loading').style.display='none';document.getElementById('view-expired').style.display='block';return;}
    currentRecord=data;
    document.getElementById('view-loading').style.display='none';
    document.getElementById('view-content').style.display='block';
    document.getElementById('viewDoctorInfo').textContent=`담당: ${data.doctorName||'-'} | 환자: ${data.patientName||'-'}`;
    document.getElementById('viewResult').textContent=data.result||'';
    // 번역 영역 초기화
    document.getElementById('translateArea').style.display='none';
    document.getElementById('translateResult').textContent='';
    document.getElementById('translateAlert').innerHTML='';
    startViewTimer(data.expiresAt);
  }catch(e){document.getElementById('view-loading').style.display='none';document.getElementById('view-notfound').style.display='block';}
}

// ── 번역 기능
const LANG_NAMES = { English:'영어', Chinese:'중국어', Vietnamese:'베트남어', Japanese:'일본어' };
const LANG_FLAGS = { English:'🇺🇸', Chinese:'🇨🇳', Vietnamese:'🇻🇳', Japanese:'🇯🇵' };

document.getElementById('btnTranslate').addEventListener('click', async () => {
  const text = document.getElementById('viewResult').textContent;
  if (!text) return;
  const apiKey = localStorage.getItem('adapton_translate_key');
  if (!apiKey) {
    if (confirm('번역을 사용하려면 API 키가 필요해요. 설정 페이지로 이동할까요?')) {
      showPage('settings');
    }
    return;
  }
  const targetLang = document.getElementById('translateLang').value;
  const btn = document.getElementById('btnTranslate');
  const originalText = btn.textContent;
  btn.textContent = '번역 중...';
  btn.disabled = true;
  showAlertEl('translateAlert', 'info', '번역을 요청하고 있어요...');

  const prompt = `Translate the following Korean medical explanation into ${targetLang}.
Keep the same structure and emojis (📋 🔍 ⚠️ 💊) as in the original.
Keep it simple and easy to understand for a patient, medically accurate.

${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.3, maxOutputTokens:1024} }) }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translated) throw new Error('번역 결과가 비어있어요.');

    document.getElementById('translateResult').textContent = translated;
    document.getElementById('translateLangBadge').textContent = `${LANG_FLAGS[targetLang]} ${LANG_NAMES[targetLang]} 번역`;
    document.getElementById('translateArea').style.display = 'block';
    document.getElementById('translateAlert').innerHTML = '';
    document.getElementById('translateArea').scrollIntoView({behavior:'smooth', block:'nearest'});
  } catch(e) {
    showAlertEl('translateAlert', 'error', '번역 실패: ' + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

document.getElementById('btnTranslateClose').addEventListener('click', () => {
  document.getElementById('translateArea').style.display = 'none';
});

// ── 번역용 API 키 설정
document.getElementById('btnSaveTranslateKey').addEventListener('click', () => {
  const key = document.getElementById('translateApiKeyInput').value.trim();
  if (!key) { showAlertEl('translateSettingsAlert','error','키를 입력해주세요.'); return; }
  if (!key.startsWith('AIza')) { showAlertEl('translateSettingsAlert','error','Gemini API 키는 "AIza"로 시작해요.'); return; }
  localStorage.setItem('adapton_translate_key', key);
  showAlertEl('translateSettingsAlert','success','✅ 저장되었어요!');
});
document.getElementById('btnClearTranslateKey').addEventListener('click', () => {
  localStorage.removeItem('adapton_translate_key');
  document.getElementById('translateApiKeyInput').value='';
  showAlertEl('translateSettingsAlert','success','키가 삭제되었어요.');
});

function startViewTimer(expiresAt){
  if(timerInterval)clearInterval(timerInterval);
  function update(){const r=expiresAt-Date.now();if(r<=0){clearInterval(timerInterval);document.getElementById('viewTimerText').textContent='만료됨';document.getElementById('viewTimerFill').style.width='0%';return;}const h=Math.floor(r/3600000),m=Math.floor((r%3600000)/60000);document.getElementById('viewTimerText').textContent=`${h}시간 ${m}분`;const pct=(r/(24*60*60*1000))*100;document.getElementById('viewTimerFill').style.width=pct+'%';document.getElementById('viewTimerFill').style.background=pct>50?'var(--green)':pct>20?'var(--orange)':'var(--red)';}
  update();timerInterval=setInterval(update,30000);
}

document.getElementById('btnSpeak').addEventListener('click',()=>{const t=document.getElementById('viewResult').textContent;if(!t)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=0.85;speechSynthesis.speak(u);});
document.getElementById('btnStop').addEventListener('click',()=>speechSynthesis.cancel());
document.getElementById('btnCopy').addEventListener('click',()=>{const t=document.getElementById('viewResult').textContent;if(!t)return;navigator.clipboard.writeText(t).then(()=>alert('복사되었어요!'));});
document.getElementById('btnDownload').addEventListener('click',()=>{if(!currentRecord)return;const content=`[진료 내용]\n담당: ${currentRecord.doctorName||'-'}\n환자: ${currentRecord.patientName||'-'}\n\n[변환 결과]\n${currentRecord.result}`;const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='진료내용.txt';a.click();});

document.getElementById('btnSaveRecord').addEventListener('click',async()=>{
  if(!currentUser||isGuest){alert('로그인이 필요해요.');return;}
  if(!currentRecord){alert('저장할 기록이 없어요.');return;}
  const revisitDate=document.getElementById('revisitDate').value;
  const revisitMemo=document.getElementById('revisitMemo').value.trim();
  try{
    await addDoc(collection(db,'patient_records'),{uid:currentUser.uid,sharedRecordId:currentRecord.id,doctorName:currentRecord.doctorName||'-',patientName:currentRecord.patientName||'-',original:currentRecord.original||'',result:currentRecord.result||'',revisitDate,revisitMemo,savedAt:Date.now(),originalCreatedAt:currentRecord.createdAt});
    showAlertEl('saveAlert','success','✅ 저장되었어요!');
    document.getElementById('btnSaveRecord').disabled=true;document.getElementById('btnSaveRecord').textContent='✅ 저장 완료';
    if(revisitDate)renderCalendar();
  }catch(e){showAlertEl('saveAlert','error','저장 실패: '+e.message);}
});

async function getSavedRecords(){if(!currentUser||isGuest)return[];try{const q=query(collection(db,'patient_records'),where('uid','==',currentUser.uid));const snap=await getDocs(q);return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}catch(e){return[];}}

async function renderSavedRecords(){
  const list=document.getElementById('savedList');
  if(!currentUser||isGuest){list.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--muted)">로그인이 필요해요</div>';return;}
  list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--muted)">불러오는 중...</div>';
  const records=await getSavedRecords();
  if(!records.length){list.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--muted)">📭 저장된 기록이 없어요<br><small style="display:block;margin-top:6px">QR 스캔 후 저장하면 여기에 나타나요</small></div>';return;}
  list.innerHTML=records.map((r,i)=>`
    <div class="saved-item" data-idx="${i}">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:14px;font-weight:500">👤 ${r.patientName}</span>
        <span style="font-size:12px;color:var(--muted)">${new Date(r.savedAt).toLocaleDateString('ko-KR')}</span>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:4px">담당: ${r.doctorName}</p>
      ${r.revisitDate?`<span class="badge badge-orange" style="margin-bottom:6px">🔔 재진 ${r.revisitDate}</span>`:''}
      <div style="font-size:13px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(r.result||'').substring(0,60)}...</div>
      <div class="saved-detail" id="saved-${i}">
        <hr style="margin:10px 0;border:none;border-top:1px solid var(--border)">
        <div class="result-box" style="font-size:14px;margin-bottom:10px">${r.result||''}</div>
        ${r.revisitMemo?`<p style="font-size:13px;color:var(--muted);margin-bottom:8px">📝 ${r.revisitMemo}</p>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="speakText('${encodeURIComponent(r.result||'')}')">🔊 읽기</button>
          <button class="btn btn-danger btn-sm" data-id="${r.id}">🗑️ 삭제</button>
        </div>
      </div>
    </div>`).join('');
  list.addEventListener('click',async(e)=>{
    const delBtn=e.target.closest('[data-id]');
    if(delBtn){e.stopPropagation();if(!confirm('삭제할까요?'))return;await deleteDoc(doc(db,'patient_records',delBtn.dataset.id));renderSavedRecords();renderCalendar();return;}
    const item=e.target.closest('.saved-item');if(item)document.getElementById('saved-'+item.dataset.idx)?.classList.toggle('open');
  });
}
document.getElementById('btnRefreshSaved').addEventListener('click',renderSavedRecords);

window.speakText=(encoded)=>{const text=decodeURIComponent(encoded);speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=0.85;speechSynthesis.speak(u);};

document.getElementById('btnPrevMonth').addEventListener('click',()=>{calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();});
document.getElementById('btnNextMonth').addEventListener('click',()=>{calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();});

async function renderCalendar(){
  if(isGuest){
    document.getElementById('calGrid').innerHTML='';
    document.getElementById('calEvents').innerHTML='';
    document.getElementById('calTitle').textContent='';
    return;
  }
  const records=await getSavedRecords();const events={};
  records.forEach(r=>{if(r.revisitDate){if(!events[r.revisitDate])events[r.revisitDate]=[];events[r.revisitDate].push(r);}});
  document.getElementById('calTitle').textContent=`${calYear}년 ${calMonth+1}월`;
  const first=new Date(calYear,calMonth,1).getDay(),last=new Date(calYear,calMonth+1,0).getDate();
  const today=new Date().toISOString().split('T')[0];
  let cells='';
  for(let i=0;i<first;i++)cells+=`<div class="cal-cell other-month"></div>`;
  for(let d=1;d<=last;d++){const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells+=`<div class="cal-cell${ds===today?' today':''}${events[ds]?' has-event':''}" data-date="${ds}">${d}</div>`;}
  document.getElementById('calGrid').innerHTML=cells;
  const calGridEl = document.getElementById('calGrid');
  calGridEl.replaceWith(calGridEl.cloneNode(true)); // 이벤트 초기화
  document.getElementById('calGrid').addEventListener('click',(e)=>{
    const cell=e.target.closest('.cal-cell[data-date]');
    if(!cell)return;
    const recs=events[cell.dataset.date]||[];
    if(!recs.length)return;
    alert(`📅 ${cell.dataset.date} 재진 예정:\n`+recs.map(r=>`• ${r.sharedRecordId==='manual'?(r.revisitMemo||'메모 없음'):(r.doctorName+(r.revisitMemo?'\n  메모 내용: '+r.revisitMemo:''))}`).join('\n'));
  });
  const mk=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;const me=Object.entries(events).filter(([k])=>k.startsWith(mk));
  const ev=document.getElementById('calEvents');
  if(!me.length){ev.innerHTML='<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px">이번 달 예정된 재진이 없어요</div>';return;}
  ev.innerHTML='<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">🔔 이번 달 재진 예정</h3>'+me.map(([date,rs])=>rs.map(r=>`<div class="card" style="padding:12px 16px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span style="font-size:14px;font-weight:500">🩺 ${r.doctorName}</span><span class="badge badge-orange">${date}</span></div>${r.revisitMemo?`<p style="font-size:12px;color:var(--muted);margin-top:4px">📝 ${r.revisitMemo}</p>`:''}</div>`).join('')).join('');
}

document.getElementById('btnAddRevisit').addEventListener('click',async()=>{
  if(!currentUser||isGuest){showAlertEl('addRevisitAlert','error','로그인이 필요해요.');return;}
  const date=document.getElementById('addRevisitDate').value,memo=document.getElementById('addRevisitMemo').value.trim();
  if(!date){showAlertEl('addRevisitAlert','error','날짜를 선택해주세요.');return;}
  try{
    await addDoc(collection(db,'patient_records'),{uid:currentUser.uid,sharedRecordId:'manual',doctorName:'직접 입력',patientName:currentUser.displayName||'',original:'',result:'',revisitDate:date,revisitMemo:memo,savedAt:Date.now()});
    showAlertEl('addRevisitAlert','success','✅ 일정이 추가되었어요!');
    document.getElementById('addRevisitDate').value='';document.getElementById('addRevisitMemo').value='';
    renderCalendar();
  }catch(e){showAlertEl('addRevisitAlert','error','추가 실패: '+e.message);}
});
