// 기본 설정 / 상수 / 인증 관련


// 인증 관리 (로그인 여부 플래그 — 실제 GitHub API 호출에는 사용되지 않음)
let GH_TOKEN = '';
const GH_REPO = 'tay-won/nong-rental'; // localStorage 키 접두사로만 사용됨
localStorage.removeItem('gh_real_token'); // 과거 버전에서 남은 평문 토큰 정리

// ─── 기상청 API 연동 (저장 없이 매번 실시간 조회) ───
const KMA_SERVICE_KEY = 'fa1dc4686eaa2f9073a1274c6bd23dd65421b4e68dd07357f0c83c6feaf94242';
const KMA_BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
const SITE_COORDS = { '본소': { nx: 56, ny: 131 }, '북부': { nx: 56, ny: 133 } };
const PAJU_DONG_COORDS = [
  { name: '문산읍', nx: 56, ny: 133 }, { name: '파주읍', nx: 57, ny: 132 },
  { name: '법원읍', nx: 58, ny: 133 }, { name: '조리읍', nx: 57, ny: 130 },
  { name: '월롱면', nx: 57, ny: 132 }, { name: '탄현면', nx: 55, ny: 132 },
  { name: '광탄면', nx: 58, ny: 131 }, { name: '파평면', nx: 57, ny: 134 },
  { name: '적성면', nx: 59, ny: 135 }, { name: '장단면', nx: 55, ny: 133 },
  { name: '금촌동', nx: 56, ny: 131 }, { name: '교하동', nx: 56, ny: 131 },
  { name: '운정동(1~4)', nx: 56, ny: 130 }, { name: '운정동(5~6)', nx: 55, ny: 130 },
];

// ─── Claude API 설정 (Supabase Edge Function) ───
const CLAUDE_EDGE_FUNCTION_URL = 'https://wddtagovsimavguvlrzr.supabase.co/functions/v1/claude-chat';
const REQUIRED_PASSWORD = '5260';
let isAuthenticated = false;

// AI 패널: 비밀번호 검증 제거 (항상 활성화)

// ─── 친환경/GAP 인증 데이터 (정제 완료) ───

// ── 휴무일 관리 ──
function getHolidays() {
  return JSON.parse(localStorage.getItem('holidays_' + GH_REPO) || '[]');
}
function saveHolidays(arr) {
  localStorage.setItem('holidays_' + GH_REPO, JSON.stringify(arr));
}
function toggleHoliday(dk) {
  const holidays = getHolidays();
  const idx = holidays.indexOf(dk);
  if (idx === -1) holidays.push(dk);
  else holidays.splice(idx, 1);
  saveHolidays(holidays);
  saveData();
  renderAll();
}


function checkToken() {
  if (!GH_TOKEN) {
    document.getElementById('tokenModal').classList.remove('hidden');
    return false;
  }
  return true;
}
// GH_TOKEN은 더 이상 실제 GitHub API 호출에 쓰이지 않고, 로그인 여부를 나타내는 플래그로만 사용됨
// (실제 데이터 저장/불러오기는 Supabase 공개용 키(SB_KEY, js/github-sync.js)로 처리됨)
const APP_PASSWORD = '5269';

function saveToken() {
  const pw  = document.getElementById('tokenInp').value.trim();
  const err = document.getElementById('loginError');
  if(pw !== APP_PASSWORD) {
    err.textContent = '비밀번호가 틀렸습니다';
    err.style.display = 'block';
    document.getElementById('tokenInp').value = '';
    return;
  }
  GH_TOKEN = 'ok';
  localStorage.setItem('gh_auth', 'ok');
  document.getElementById('tokenModal').classList.add('hidden');
  document.getElementById('loadingOverlay').classList.remove('hidden');
  err.style.display = 'none';
  loadData();
}
function clearToken() {
  localStorage.removeItem('gh_auth');
  GH_TOKEN = '';
  document.getElementById('tokenInp').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('tokenModal').classList.remove('hidden');
}

const SITES=['본소','북부'];
const MACHINES=[
  {n:"배송(입출고 1회)",m:240},{n:"고속쟁기(평탄쟁기)",m:60},{n:"고심경쟁기-5련",m:60},
  {n:"고심경쟁기-5련(유압식)",m:60},{n:"고심경쟁기-7련(유압식)",m:60},{n:"굴착기(1T/2T)",m:80},
  {n:"논두렁조성기(大/中/小)",m:90},{n:"농산물선별기(마늘선별기)",m:40},{n:"농산물세척기(고추)",m:40},
  {n:"돌수집기 1400",m:90},{n:"돌파쇄기",m:60},{n:"동력살분무기(입제/액제)",m:40},
  {n:"동력운반차",m:80},{n:"동력제초기(보행-덩굴파쇄기)",m:60},{n:"동력제초기(승용)",m:80},
  {n:"동력파종기(전기종)",m:80},{n:"땅속작물수확기(전기종)",m:60},{n:"로타베이터(1550-1950)",m:90},
  {n:"로타베이터(2150-2350)",m:120},{n:"마늘파종기 6조-경운기",m:50},{n:"마늘파종기-트랙터부착용",m:60},
  {n:"못자리성형기 1750",m:90},{n:"못자리성형기 2150",m:110},{n:"무논정지기(220/240)",m:90},
  {n:"발근기",m:50},{n:"배토기(175/195)",m:90},{n:"보통쟁기 3련",m:60},
  {n:"보행관리기(전기종/덩굴파쇄기 포함)",m:50},{n:"분무기(배낭식)",m:40},{n:"분무기(엔진식 밀차형)",m:50},
  {n:"붐스프레이어",m:150},{n:"비닐수거기",m:40},{n:"비료살포기",m:60},
  {n:"석회살포기 500kg",m:70},{n:"소형트랙터 18HP 감자비닐피복파종기",m:50},
  {n:"소형트랙터 25HP+(로터베이터 1150/쟁기2련)",m:90},{n:"소형트랙터 18HP",m:70},
  {n:"수확기(마늘/고구마)",m:50},{n:"승용관리기 20HP",m:140},{n:"심토파쇄기(전기종)",m:130},
  {n:"양용쟁(3련/4련)",m:80},{n:"옥수수파종기",m:90},{n:"원판쟁기(4련/6련)",m:60},
  {n:"원판쟁기(8련/10련)",m:90},{n:"육묘상자 정렬기",m:60},{n:"육묘적재이송기",m:80},
  {n:"잔가지파쇄기(궤도형)",m:80},{n:"잡곡예취기",m:80},{n:"잡곡정선기",m:50},
  {n:"줄기절단기",m:70},{n:"중경제초기(1500/1800)",m:60},{n:"채소이식기(반자동)",m:60},
  {n:"채소이식기(자동)",m:60},{n:"콩선별기",m:50},{n:"콩예취기",m:70},
  {n:"콩적심기",m:40},{n:"콩정선기",m:50},{n:"탈곡기(궤도형)",m:110},
  {n:"탈곡기(모터형-220V)",m:60},{n:"탈곡기(트랙터부착용-大)",m:150},{n:"탈곡기(트랙터부착용-小)",m:90},
  {n:"탈곡기(트랙터부착용-中)",m:120},{n:"퇴비살포기 500H",m:90},{n:"퇴비살포기 900H",m:90},
  {n:"퇴비살포기 HM-3000",m:150},{n:"퇴비살포기 TS-45H",m:150},{n:"퇴비살포기(승용)",m:140},
  {n:"파종기-인력",m:30},{n:"피복기-인력 8자(240cm)",m:40},{n:"휴립복토기",m:60},
  {n:"휴립복토파종기",m:80},{n:"휴립피복기(1조/2조)",m:60},
];
const MMAP={};MACHINES.forEach(m=>MMAP[m.n]=m.m);

const WDEF={
  '본소':[{id:'bs1',name:'임기제 1',type:'임기제'},{id:'bs2',name:'임기제 2',type:'임기제'},{id:'bs3',name:'기간제 1',type:'기간제'},{id:'bs4',name:'기간제 2',type:'기간제'}],
  '북부':[{id:'nb1',name:'임기제 1',type:'임기제'},{id:'nb2',name:'임기제 2',type:'임기제'},{id:'nb3',name:'기간제 1',type:'기간제'},{id:'nb4',name:'기간제 2',type:'기간제'}],
};
const SCHED=[
  {label:'정상근무 (7h)',value:420},
  {label:'반일 (3.5h)',value:210},
  {label:'1시간',value:60},
  {label:'2시간',value:120},
  {label:'3시간',value:180},
  {label:'4시간',value:240},
  {label:'5시간',value:300},
  {label:'6시간',value:360},
  {label:'휴가/결근 (0h)',value:0}
];
const DOW=['일','월','화','수','목','금','토'];

// ─── 상태 ───
let curIdx=0, curSite='전체', dateOffset=0, ghSha=null, saveTimer=null, state={};
let lastUpdatedAt = null; // 낙관적 잠금을 위한 버전 추적
let debugMode = false; // 디버그 모드
let debugLogs = []; // 디버그 로그 저장소
// 입력 패널 상태
let selMachine=null, selHalf=false, selQty=1;

function today(){const d=new Date();d.setHours(0,0,0,0);return d;}
function getDates(){return Array.from({length:22},(_,i)=>{const d=new Date(today());d.setDate(today().getDate()+dateOffset+i);return d;});}
function toLocalDk(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function getDkeys(){return getDates().map(d=>toLocalDk(d));}
function isToday(d){return d.toISOString().slice(0,10)===today().toISOString().slice(0,10);}
function fmtDate(d){return (d.getMonth()+1)+'/'+d.getDate();}

// state[dk][site] = { workers:{}, entries:[{name,half,qty,mins}] }
function emptyDay(){
  const s={};
  SITES.forEach(st=>{
    s[st]={workers:{},entries:[],delivery:false};
    WDEF[st].forEach(w=>s[st].workers[w.id]=420);
  });
  return s;
}
function ensureDay(dk){if(!state[dk])state[dk]=emptyDay();}
function initState(){getDkeys().forEach(dk=>ensureDay(dk));  state._cancelled = [];
}

