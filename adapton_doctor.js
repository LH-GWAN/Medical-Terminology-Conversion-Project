import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
         sendEmailVerification, sendPasswordResetEmail, onAuthStateChanged, signOut,
         updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, setDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtuiS-ZbN-IYgbU2uaAwq2yHcRWpQs6UY",
  authDomain: "challenge-82d30.firebaseapp.com",
  projectId: "challenge-82d30",
  storageBucket: "challenge-82d30.firebasestorage.app",
  messagingSenderId: "725547008897",
  appId: "1:725547008897:web:beb24f4d6ba46ef7451e80"
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// 환자 앱 URL — 같은 폴더에 있다고 가정
const PATIENT_APP_URL = window.location.href.replace('adapton_doctor.html','adapton_patient.html');

let currentUser = null;
let lastResult = '', lastOriginal = '', lastRecordId = '';
let recognition = null, isRecording = false;
let timerInterval = null;

// ── UTILS
function showAlert(id, type, msg) { const el=document.getElementById(id); if(el) el.innerHTML=`<div class="alert alert-${type}">${msg}</div>`; }
function getInitial(n) { return (n||'?').charAt(0).toUpperCase(); }

// ── PAGES
function showPage(name) {
  document.querySelectorAll('[id^="page-"]').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.querySelectorAll('.sidebar-item[data-page]').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.sidebar-item[data-page="${name}"]`)?.classList.add('active');
  closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='records') renderRecords();
  if(name==='convert') { document.querySelectorAll('#page-convert .screen').forEach(s=>s.classList.remove('active')); document.getElementById('screen-main')?.classList.add('active'); }
  if(name==='mypage') {
    document.getElementById('apiKeyInput').value = localStorage.getItem('adapton_key')||'';
    if(currentUser) {
      document.getElementById('mypageName').textContent = currentUser.displayName||'-';
      document.getElementById('mypageEmail').textContent = currentUser.email||'-';
      loadDoctorProfile();
    }
  }
}
function showConvertScreen(name) {
  document.querySelectorAll('#page-convert .screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── SIDEBAR
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }
document.getElementById('btnHamburger').addEventListener('click', openSidebar);
document.getElementById('btnCloseSidebar').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.querySelectorAll('.sidebar-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>{ showPage(btn.dataset.page); });
});

document.getElementById('homeStartBtn')?.addEventListener('click',()=>showPage('convert'));
document.getElementById('homeAboutBtn')?.addEventListener('click',()=>{ document.getElementById('aboutSection')?.scrollIntoView({behavior:'smooth'}); });
document.getElementById('sidebarLogout').addEventListener('click', doLogout);

// ── DROPDOWN
document.getElementById('userBtn').addEventListener('click',(e)=>{ e.stopPropagation(); document.getElementById('userDropdown').classList.toggle('open'); });
document.addEventListener('click',()=>document.getElementById('userDropdown').classList.remove('open'));
document.getElementById('ddMypage').addEventListener('click',()=>{ document.getElementById('userDropdown').classList.remove('open'); showPage('mypage'); });
document.getElementById('ddLogout').addEventListener('click',()=>{ document.getElementById('userDropdown').classList.remove('open'); doLogout(); });

// ── AUTH
async function enterApp(user) {
  currentUser = user;
  document.getElementById('loginPage').style.display  = 'none';
  document.getElementById('appPage').style.display    = 'flex';
  document.getElementById('appPage').style.flexDirection = 'column';
  document.getElementById('appPage').style.minHeight  = '100vh';
  document.getElementById('userName').textContent     = user.displayName||user.email;
  document.getElementById('userAvatar').textContent   = getInitial(user.displayName||user.email);
  showPage('home');
  // 회원가입 시 저장 못한 병원 정보 지금 저장
  const pendingHospital = localStorage.getItem('pending_hospital');
  if (pendingHospital) {
    try {
      await setDoc(doc(db,'doctors',user.uid), {
        name: user.displayName||'', hospital: pendingHospital,
        email: user.email, role:'doctor', createdAt: Date.now()
      }, {merge:true});
      localStorage.removeItem('pending_hospital');
    } catch(e){ console.error('프로필 저장 실패', e); }
  }
}

async function doLogout() {
  currentUser = null;
  try { await signOut(auth); } catch(e){}
  document.getElementById('appPage').style.display   = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

onAuthStateChanged(auth, user => {
  if (user) {
    if (!user.emailVerified) { signOut(auth); return; }
    enterApp(user);
  }
});

// AUTH TABS
document.getElementById('tabLoginBtn').addEventListener('click',()=>{ document.getElementById('tabLoginBtn').classList.add('active'); document.getElementById('tabSignupBtn').classList.remove('active'); document.getElementById('formLogin').style.display='block'; document.getElementById('formSignup').style.display='none'; });
document.getElementById('tabSignupBtn').addEventListener('click',()=>{ document.getElementById('tabSignupBtn').classList.add('active'); document.getElementById('tabLoginBtn').classList.remove('active'); document.getElementById('formSignup').style.display='block'; document.getElementById('formLogin').style.display='none'; });

document.getElementById('btnLogin').addEventListener('click', async()=>{
  const email=document.getElementById('loginEmail').value.trim();
  const pw=document.getElementById('loginPw').value;
  if(!email||!pw){showAlert('loginAlert','error','이메일과 비밀번호를 입력해주세요.');return;}
  try {
    const cred=await signInWithEmailAndPassword(auth,email,pw);
    if(!cred.user.emailVerified){await signOut(auth);showAlert('loginAlert','error','이메일 인증이 필요해요.');return;}
    enterApp(cred.user);
  } catch(e){ showAlert('loginAlert','error',e.code==='auth/invalid-credential'?'이메일 또는 비밀번호가 틀렸어요.':e.message); }
});

document.getElementById('btnSignup').addEventListener('click', async()=>{
  const name=document.getElementById('signupName').value.trim();
  const hospital=document.getElementById('signupHospital').value.trim();
  const email=document.getElementById('signupEmail').value.trim();
  const pw=document.getElementById('signupPw').value;
  if(!name||!hospital||!email||!pw){showAlert('signupAlert','error','모든 항목을 입력해주세요.');return;}
  if(pw.length<6){showAlert('signupAlert','error','비밀번호는 6자 이상이어야 해요.');return;}
  try {
    const cred=await createUserWithEmailAndPassword(auth,email,pw);
    await updateProfile(cred.user,{displayName:name});
    // 인증 메일 먼저 발송
    await sendEmailVerification(cred.user);
    // 로그아웃
    await signOut(auth);
    // Firestore는 나중에 로그인 후 저장 (임시로 localStorage에 병원 정보 보관)
    localStorage.setItem('pending_hospital', hospital);
    showAlert('signupAlert','success','✅ 가입 완료! 이메일 인증 메일을 확인해주세요.');
    setTimeout(()=>document.getElementById('tabLoginBtn').click(),2000);
  } catch(e){ showAlert('signupAlert','error',e.code==='auth/email-already-in-use'?'이미 사용 중인 이메일이에요.':e.message); }
});

document.getElementById('linkReset').addEventListener('click',async(e)=>{
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  if(!email){showAlert('loginAlert','error','이메일을 먼저 입력해주세요.');return;}
  try{await sendPasswordResetEmail(auth,email);showAlert('loginAlert','success','✅ 재설정 이메일을 보냈어요!');}
  catch(e){showAlert('loginAlert','error','전송 실패.');}
});

// ── 의사 프로필 로드
async function loadDoctorProfile() {
  if(!currentUser) return;
  try {
    const snap=await getDoc(doc(db,'doctors',currentUser.uid));
    if(snap.exists()) {
      const d=snap.data();
      document.getElementById('mypageHospital').textContent = d.hospital||'-';
    }
  } catch(e){}
}

// ── MIC
document.getElementById('micBtn').addEventListener('click',()=>isRecording?stopRecording():startRecording());
function startRecording() {
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert('Chrome 브라우저에서만 지원돼요.');return;}
  recognition=new SR();recognition.lang='ko-KR';recognition.continuous=true;recognition.interimResults=true;
  recognition.onresult=(e)=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;document.getElementById('inputText').value=t;document.getElementById('charCount').textContent=t.length;};
  recognition.onerror=()=>stopRecording();
  recognition.onend=()=>{if(isRecording)recognition.start();};
  recognition.start();isRecording=true;
  document.getElementById('micBtn').className='mic-btn recording';
  document.getElementById('micBtn').textContent='⏹️';
  document.getElementById('micLabel').className='mic-label recording';
  document.getElementById('micLabel').innerHTML='🔴 녹음 중...';
}
function stopRecording() {
  if(recognition){recognition.onend=null;recognition.stop();}
  isRecording=false;
  document.getElementById('micBtn').className='mic-btn idle';
  document.getElementById('micBtn').textContent='🎙️';
  document.getElementById('micLabel').className='mic-label';
  document.getElementById('micLabel').innerHTML='녹음 완료! 변환 버튼을 눌러주세요 👇';
}
document.getElementById('inputText').addEventListener('input',()=>{document.getElementById('charCount').textContent=document.getElementById('inputText').value.length;});

// ── CONVERSION
document.getElementById('btnConvert').addEventListener('click', async()=>{
  const text=document.getElementById('inputText').value.trim();
  if(!text){alert('변환할 내용을 입력해주세요.');return;}
  const apiKey=localStorage.getItem('adapton_key');
  if(!apiKey){if(confirm('API 키가 없어요. 샘플 결과를 보시겠어요?'))useMockData();else showPage('mypage');return;}
  showConvertScreen('loading');
  const prompt=`당신은 의료 커뮤니케이션 전문가입니다.
아래 의사의 진료 설명을 60대 이상 고령 환자가 이해하기 쉬운 한국어로 변환해주세요.

[변환 규칙]
1. 의학적 정확성 유지
2. 어려운 용어는 "쉬운말(원래용어)" 형식으로 표기
3. 경어체, 짧은 문장
4. 아래 형식 그대로 출력:

📋 요약
(핵심 1~2문장)

🔍 자세한 설명
(쉬운말로 변환된 전체 내용)

⚠️ 꼭 기억하세요
(주의사항 2~3가지)

💊 다음 진료까지 할 일
(있으면 기재, 없으면 생략)

[의사 진료 내용]
${text}`;
  try {
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:1024}})});
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const result=data.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!result)throw new Error('응답이 비어있어요.');
    lastOriginal=text;lastResult=result;
    await saveAndShowQR(text,result);
  } catch(e){showConvertScreen('main');alert('오류: '+e.message);}
});

document.getElementById('btnMock').addEventListener('click', useMockData);
async function useMockData() {
  const t=document.getElementById('inputText').value.trim()||'환자분의 소견은 제2형 당뇨병으로, 인슐린 저항성과 췌장 베타세포 기능부전이 병태생리의 핵심입니다. 현재 당화혈색소 수치가 높아 미세혈관합병증 발생 가능성이 상당히 높습니다.';
  const r=`📋 요약\n혈당이 잘 조절되지 않는 당뇨병(제2형)이 있으세요.\n\n🔍 자세한 설명\n몸이 인슐린을 잘 사용하지 못하는 상태예요.\n\n⚠️ 꼭 기억하세요\n• 처방받은 약을 드세요\n• 단 음식을 줄이세요\n• 규칙적으로 운동하세요`;
  lastOriginal=t;lastResult=r;
  await saveAndShowQR(t,r);
}

// ── 저장 + QR 생성
let currentPatientUrl = '';
let currentFileExpiresAt = 0;

async function saveAndShowQR(original, result) {
  const patientName=document.getElementById('patientName').value.trim()||'이름 미입력';
  const fileExpiresAt=Date.now()+(24*60*60*1000); // 파일 24시간
  currentFileExpiresAt=fileExpiresAt;

  let recordId='';
  try {
    const docRef=await addDoc(collection(db,'shared_records'),{
      uid: currentUser?.uid||'guest',
      doctorName: currentUser?.displayName||'의사',
      patientName, original, result,
      createdAt: Date.now(),
      expiresAt: fileExpiresAt,
    });
    recordId=docRef.id;
    lastRecordId=recordId;
  } catch(e){ console.error('저장 실패',e); recordId='preview'; }

  currentPatientUrl=`${PATIENT_APP_URL}?id=${recordId}`;
  document.getElementById('resultDisplay').textContent=result;

  // 링크 복사
  document.getElementById('btnCopyLink').onclick=()=>{
    navigator.clipboard.writeText(currentPatientUrl).then(()=>alert('링크가 복사되었어요!'));
  };

  generateQrCode(currentPatientUrl, fileExpiresAt);
  showConvertScreen('result');
}

function generateQrCode(url, fileExpiresAt) {
  // QR 유효시간 5분
  const qrExpiresAt = Date.now() + (5*60*1000);

  document.getElementById('qrActiveSection').style.display='block';
  document.getElementById('qrExpiredSection').style.display='none';

  document.getElementById('qrcode').innerHTML='';
  new QRCode(document.getElementById('qrcode'),{
    text: url, width:200, height:200,
    colorDark:'#1B4FD8', colorLight:'#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  startQrTimer(qrExpiresAt, fileExpiresAt);
}

// QR 재생성 버튼
document.getElementById('btnRegenerateQr').addEventListener('click',()=>{
  if(currentPatientUrl) generateQrCode(currentPatientUrl, currentFileExpiresAt);
});

// QR 중지 버튼 - 수동으로 QR 종료
document.getElementById('btnStopQr').addEventListener('click',()=>{
  if(!confirm('QR을 중지할까요? 중지하면 환자가 더 이상 스캔할 수 없어요.')) return;
  if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  document.getElementById('qrActiveSection').style.display='none';
  document.getElementById('qrExpiredSection').style.display='block';
});

// ── TIMER: QR 5분 + 파일 24시간 분리
function startQrTimer(qrExpiresAt, fileExpiresAt) {
  if(timerInterval) clearInterval(timerInterval);
  function update() {
    const qrRemaining = qrExpiresAt - Date.now();
    const fileRemaining = fileExpiresAt - Date.now();

    // 파일 타이머
    if(fileRemaining > 0) {
      const fh=Math.floor(fileRemaining/3600000);
      const fm=Math.floor((fileRemaining%3600000)/60000);
      document.getElementById('fileTimerText').textContent=`${fh}시간 ${fm}분`;
    } else {
      document.getElementById('fileTimerText').textContent='만료됨';
    }

    // QR 타이머
    if(qrRemaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById('qrActiveSection').style.display='none';
      document.getElementById('qrExpiredSection').style.display='block';
      return;
    }
    const m=Math.floor(qrRemaining/60000);
    const s=Math.floor((qrRemaining%60000)/1000);
    document.getElementById('qrTimerText').textContent=`${m}:${String(s).padStart(2,'0')}`;
    const pct=(qrRemaining/(5*60*1000))*100;
    document.getElementById('qrTimerFill').style.width=pct+'%';
    document.getElementById('qrTimerFill').style.background=pct>50?'var(--green)':pct>20?'var(--orange)':'var(--red)';
  }
  update();
  timerInterval=setInterval(update,1000);
}

// ── TTS
document.getElementById('btnSpeak').addEventListener('click',()=>{if(!lastResult)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(lastResult);u.lang='ko-KR';u.rate=0.88;speechSynthesis.speak(u);});
document.getElementById('btnStopSpeak').addEventListener('click',()=>speechSynthesis.cancel());
document.getElementById('btnReset').addEventListener('click',()=>{document.getElementById('inputText').value='';document.getElementById('charCount').textContent='0';lastResult='';lastOriginal='';currentPatientUrl='';currentFileExpiresAt=0;if(timerInterval)clearInterval(timerInterval);showConvertScreen('main');});

// ── RECORDS
async function renderRecords() {
  const list=document.getElementById('recordsList');
  list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--muted)">불러오는 중...</div>';
  if(!currentUser){list.innerHTML='<div class="card" style="text-align:center;padding:30px;color:var(--muted)">로그인이 필요해요</div>';return;}
  try {
    const q=query(collection(db,'shared_records'),where('uid','==',currentUser.uid));
    const snap=await getDocs(q);
    const records=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(!records.length){list.innerHTML='<div class="card" style="text-align:center;padding:40px;color:var(--muted)">📭 변환 기록이 없어요</div>';return;}
    const now=Date.now();
    list.innerHTML=records.map(r=>{
      const expired=r.expiresAt&&now>r.expiresAt;
      const patientUrl=`${PATIENT_APP_URL}?id=${r.id}`;
      return `<div class="record-item">
        <div class="record-item-info">
          <div class="record-item-name">👤 ${r.patientName}</div>
          <div class="record-item-date">${new Date(r.createdAt).toLocaleString('ko-KR')}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${expired?'<span class="expired-badge">만료됨</span>':`<span class="active-badge">유효</span><button class="btn btn-outline btn-sm" onclick="copyLink('${patientUrl}')">🔗 링크</button>`}
          <button class="btn btn-danger btn-sm" data-id="${r.id}">🗑️</button>
        </div>
      </div>`;
    }).join('');
    list.addEventListener('click',async(e)=>{
      const btn=e.target.closest('[data-id]');
      if(btn){if(!confirm('삭제할까요?'))return;await deleteDoc(doc(db,'shared_records',btn.dataset.id));renderRecords();}
    });
  } catch(e){list.innerHTML=`<div class="alert alert-error">불러오기 실패: ${e.message}</div>`;}
}
window.copyLink=(url)=>navigator.clipboard.writeText(url).then(()=>alert('링크 복사됨!'));
document.getElementById('btnRefresh').addEventListener('click',renderRecords);

// ── API KEY
document.getElementById('btnSaveKey').addEventListener('click',()=>{
  const key=document.getElementById('apiKeyInput').value.trim();
  if(!key){showAlert('settingsAlert','error','키를 입력해주세요.');return;}
  if(!key.startsWith('AIza')){showAlert('settingsAlert','error','Gemini API 키는 "AIza"로 시작해요.');return;}
  localStorage.setItem('adapton_key',key);showAlert('settingsAlert','success','✅ 저장되었어요!');
});
document.getElementById('btnClearKey').addEventListener('click',()=>{
  localStorage.removeItem('adapton_key');document.getElementById('apiKeyInput').value='';showAlert('settingsAlert','success','삭제되었어요.');
});
