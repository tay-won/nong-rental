// 디버그 모드 / 계산 / 드롭다운 유틸
// ─── 디버그 모드 ───
function toggleDebugMode() {
  debugMode = !debugMode;
  const panel = document.getElementById('debugPanel');
  const btn = document.getElementById('debugBtn');
  
  if(debugMode) {
    panel.style.display = 'block';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
    addDebugLog('🟢 디버그 모드 활성화');
  } else {
    panel.style.display = 'none';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
  }
}

function addDebugLog(msg) {
  const now = new Date().toLocaleTimeString('ko-KR');
  const log = `[${now}] ${msg}`;
  debugLogs.push(log);
  
  // 최근 50개만 유지
  if(debugLogs.length > 50) debugLogs.shift();
  
  // 화면 업데이트
  const logDiv = document.getElementById('debugLog');
  if(logDiv && debugMode) {
    logDiv.innerHTML = debugLogs.map(l => `<div>${l}</div>`).join('');
    logDiv.scrollTop = logDiv.scrollHeight; // 맨 아래로 스크롤
  }
  
  // 콘솔에도 출력 (개발자 모드 사용 가능할 때 용)
  console.log(log);
}

// ─── 계산 ───
function getAvailSite(dk,st){return Object.values(state[dk][st].workers).reduce((a,b)=>a+b,0);}
function getAvail(dk,st){if(st==='전체')return SITES.reduce((s,x)=>s+getAvailSite(dk,x),0);return getAvailSite(dk,st);}
function getUsed(dk,st){if(st==='전체')return SITES.reduce((s,x)=>s+getUsedSite(dk,x),0);return getUsedSite(dk,st);}
function getPct(dk,st){const a=getAvail(dk,st);return a?Math.round(getUsed(dk,st)/a*100):0;}
function getStatus(p){return p>=100?'마감':p>=80?'주의':'정상';}

// ─── 드롭다운 ───
function toggleHalf(){
  selHalf=!selHalf;
  const tog=document.getElementById('halfToggle');
  tog.classList.toggle('on',selHalf);
  document.getElementById('halfCheck').checked=selHalf;
  updateHalfLabel();
}
function updateHalfLabel(){
  if(!selMachine)return;
  const base=MMAP[selMachine]||0;
  const mins=selHalf?base/2:base;
  const lbl=document.getElementById('halfMinsLabel');
  lbl.textContent=mins+'분'+(selHalf?' (반타임)':'');
  lbl.className='half-mins'+(selHalf?' on':'');
}
function changeQty(d){
  selQty=Math.max(1,selQty+d);
  document.getElementById('qtyVal').textContent=selQty;
}




function setSite(s){
  curSite=s;
  document.querySelectorAll('.stab').forEach(t=>{t.className='stab';if(t.textContent===s)t.classList.add('a-'+s);});
  renderAll();
}
function setIdx(i){curIdx=i;renderAll();}


// ── 배송 체크 ──
function openDatePicker() {
  const dk = getDkeys()[curIdx];
  const picker = document.getElementById('returnDatePicker');
  // 문자열 파싱으로 타임존 오류 해결
  const [y, m, d] = dk.split('-').map(Number);
  // 최소 날짜: 시작일 + 1일
  const minDate = new Date(y, m - 1, d + 1);
  picker.min = toLocalDk(minDate);
  // 최대 날짜: 시작일 + 30일
  const maxDate = new Date(y, m - 1, d + 30);
  picker.max = toLocalDk(maxDate);
  picker.value = '';
  
  // 원래 위치에서 보이게 설정
  picker.style.display = 'block';
  picker.style.position = 'relative';
  picker.style.width = 'auto';
  picker.style.opacity = '1';
  picker.style.visibility = 'visible';
  picker.style.pointerEvents = 'auto';
  
  // 포커스 주기
  setTimeout(() => picker.focus(), 50);
  
  // 여러 방식으로 달력 띄우기 시도
  setTimeout(() => {
    try {
      picker.showPicker();
    } catch(e1) {
      try {
        picker.click();
      } catch(e2) {
        // 마지막 시도: 직접 입력 유도
        picker.focus();
      }
    }
  }, 100);
}

function setDaysByDate(returnDate) {
  if(!returnDate) return;
  const dk = getDkeys()[curIdx];
  // 문자열 파싱으로 타임존 오류 해결
  const [sy, sm, sd] = dk.split('-').map(Number);
  const [ey, em, ed] = returnDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diff = Math.round((end - start) / 86400000) + 1;  // +1 추가: 시작일 포함
  if(diff < 1) return;
  selDays = diff;
  // 모든 버튼 비활성화 후 직접 버튼 활성화
  [1,2,3].forEach(n => document.getElementById('dayBtn'+n).classList.remove('active'));
  const btnX = document.getElementById('dayBtnX');
  btnX.classList.add('active');
  btnX.textContent = diff + '일';
  document.getElementById('returnDatePicker').style.display = 'none';
  updateHalfInfo();
}

function toggleDelivery() {
  selDelivery = !selDelivery;
  const tog = document.getElementById('deliveryToggle');
  const sq  = document.getElementById('deliveryChkSq');
  const chk = document.getElementById('deliveryChk');
  tog.classList.toggle('on', selDelivery);
  chk.checked = selDelivery;
  updateHalfInfo();
}


function updateDeliveryUI() {
  const dk = getDkeys()[curIdx];
  const site = curSite === '전체' ? '본소' : curSite;
  ensureDay(dk);
  const on = state[dk][site].delivery || false;
  const bar = document.getElementById('deliveryBar');
  const box = document.getElementById('deliveryChkBox');
  const mins = document.getElementById('deliveryMins');
  if(!bar) return;
  bar.classList.toggle('on', on);
  box.style.color = on ? '#000' : 'transparent';
  box.style.background = on ? 'var(--yellow)' : 'var(--bg)';
  box.style.borderColor = on ? 'var(--yellow)' : 'var(--border)';
  mins.textContent = '240분';
}


function shiftDates(delta) {
  dateOffset += delta;
  // 과거 1년 ~ 미래 90일까지 이동 가능
  dateOffset = Math.max(-365, Math.min(90, dateOffset));
  // curIdx 재조정: 오늘이 범위 내에 있으면 오늘로, 아니면 0
  const dkeys = getDkeys();
  const todayDk = toLocalDk(today());
  const todayIdx = dkeys.indexOf(todayDk);
  curIdx = todayIdx >= 0 ? todayIdx : 0;
  renderAll();
}

function resetDates() {
  dateOffset = 0;
  curIdx = 0;
  renderAll();
}

function shiftMonth(delta) {
  // 월 단위로 이동 (약 30일씩)
  dateOffset += (delta * 30);
  dateOffset = Math.max(-365, Math.min(90, dateOffset));
  const dkeys = getDkeys();
  const todayDk = toLocalDk(today());
  const todayIdx = dkeys.indexOf(todayDk);
  curIdx = todayIdx >= 0 ? todayIdx : 0;
  renderAll();
}

