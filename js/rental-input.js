// 새 입력 시스템
// ══════════════════════════════════════════════
// 새 입력 시스템
// ══════════════════════════════════════════════

// 입력 상태
let selEquip = null;   // {n, s, m}
let selDays  = 1;
let selDelivery = false;
let inputSite = null;  // 현재 입력 사업소

// 입력 패널 타이틀 업데이트
function updateInputTitle() {
  const s = curSite === '전체' ? '전체' : curSite;
  document.getElementById('inputPanelTitle').textContent =
    '임대 기종별 건수 입력' + (curSite !== '전체' ? ' — ' + curSite : '');
}

// ── 드롭다운 ──
function openDD() {
  document.getElementById('dropdown').classList.toggle('open');
  if (document.getElementById('dropdown').classList.contains('open')) {
    document.getElementById('ddFilter').value = '';
    filterDD();
    setTimeout(() => document.getElementById('ddFilter').focus(), 50);
  }
}

function filterDD() {
  const q = (document.getElementById('ddFilter').value || '').toLowerCase().trim();
  const site = curSite === '전체' ? null : curSite;
  let list = [];
  if (!site) {
    ['본소','북부'].forEach(st => EQUIP_LIST[st].forEach(e => list.push({...e, site:st})));
  } else {
    EQUIP_LIST[site].forEach(e => list.push({...e, site}));
  }

  // 공백/하이픈으로 단어 분리해서 모두 포함된 것만
  const terms = q ? q.split(/[\s\-]+/).filter(Boolean) : [];
  const filtered = terms.length === 0 ? list : list.filter(e => {
    const target = (e.n + ' ' + e.s).toLowerCase();
    return terms.every(t => target.includes(t));
  });

  document.getElementById('ddList').innerHTML = filtered.map(e => {
    const status = getEquipStatus(e.n, e.site);
    const statusBadge = status === '정비중'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(245,158,11,.2);color:var(--yellow);font-weight:700">🔧 정비중</span>'
      : status === '임대중'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,.2);color:var(--red);font-weight:700">📤 임대중</span>'
      : status === '출고예정'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(96,165,250,.2);color:var(--blue);font-weight:700">📦 출고예정</span>'
      : '';
    const snBadge = `<span style="font-size:10px;font-weight:900;margin-right:4px;color:${e.site==='본소'?'var(--본소)':'var(--북부)'}">${e.site==='본소'?'S':'N'}</span>`;
    return `<div class="dd-item" onclick='selectEquip(${JSON.stringify(e)})'>
      <span class="dd-name">${snBadge}${e.n} ${statusBadge}</span>
      <span class="dd-mins" style="font-size:10px;color:var(--muted)">${e.s}</span>
    </div>`;
  }).join('') || '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">검색 결과 없음</div>';
}


function selectEquip(e) {
  selEquip = e;
  inputSite = e.site;
  document.getElementById('searchInp').value = e.n + ' / ' + e.s;
  document.getElementById('dropdown').classList.remove('open');
  document.getElementById('inputRow').style.display = 'flex';
  document.getElementById('personNameInp').value = '';
  setDays(1);
  updateHalfInfo();
  showMachineSafetyInfo(e.n);
  setTimeout(() => document.getElementById('personNameInp').focus(), 50);
}

// ── 기간 선택 ──
function setDays(d) {
  selDays = d;
  [1,2,3].forEach(n => {
    document.getElementById('dayBtn'+n).classList.toggle('active', n === d);
  });
  // 직접 버튼 초기화
  const btnX = document.getElementById('dayBtnX');
  if(btnX) { btnX.classList.remove('active'); btnX.textContent = '📅 직접'; }
  const picker = document.getElementById('returnDatePicker');
  if(picker) picker.style.display = 'none';
  updateHalfInfo();
}

function setDaysByDate(returnDate) {
  if(!returnDate) return;
  const dk = getDkeys()[curIdx];
  const start = new Date(dk);
  const end = new Date(returnDate);
  const diff = Math.round((end - start) / 86400000);
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
  tog.classList.toggle('on', selDelivery);
  document.getElementById('deliveryChk').checked = selDelivery;
  updateHalfInfo();
}

function updateInOutLabel() { updateHalfInfo(); }

function updateHalfInfo() {
  if (!selEquip) return;
  const info = document.getElementById('halfInfo');
  const base = selEquip.m;
  const delivery = selDelivery ? 240 : 0;

  let msgs = [];
  if (selDays === 1) {
    const total = base + delivery;
    msgs.push('전타임 ' + base + '분' + (selDelivery ? ' + 배송 240분 = ' + total + '분' : ''));
  } else {
    const outMins = (base/2) + (selDelivery ? 120 : 0);
    const inMins  = (base/2) + (selDelivery ? 120 : 0);
    msgs.push('출고일: ' + outMins + '분' + (selDelivery ? ' (반타임+'+'배송120)' : ''));
    msgs.push('입고일: ' + inMins  + '분' + (selDelivery ? ' (반타임+'+'배송120)' : ''));
  }
  info.textContent = msgs.join(' / ');
  info.classList.add('show');
}

// ── 입력 추가 ──
async function addEntry() {
  if (!selEquip) return;
  const person = document.getElementById('personNameInp').value.trim();
  if (!person) {
    document.getElementById('personNameInp').style.borderColor = 'var(--red)';
    document.getElementById('personNameInp').focus();
    return;
  }
  document.getElementById('personNameInp').style.borderColor = '';

  const dk = getDkeys()[curIdx];
  const startDate = dk;

  const okToProceed = await checkWeatherBeforeEntry(startDate);
  if (!okToProceed) return;

  const site = inputSite || (curSite === '전체' ? '본소' : curSite);
  const outDone = false;
  const inDone  = false;

  // 배송 포함 시 baseMins에 가산
  const deliveryMins = selDelivery ? 240 : 0;
  const totalBaseMins = selEquip.m + deliveryMins;

  const entry = {
    id: Date.now() + Math.random(),
    equipName: selEquip.n,
    equipSpec: selEquip.s,
    personName: person,
    days: selDays,
    startDate: startDate,
    outDone: outDone,
    inDone: inDone,
    site: site,
    baseMins: totalBaseMins,
    delivery: selDelivery,
  };

  ensureDay(dk);
  state[dk][site].entries.push(entry);

  // 기간에 걸친 날짜들도 ensure
  for (let i = 1; i < selDays; i++) {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const dki = toLocalDk(d);
    ensureDay(dki);
  }

  if (saveTimer) clearTimeout(saveTimer);
  saveData();

  // 입력창 초기화
  selEquip = null; selDays = 1; selDelivery = false;
  document.getElementById('searchInp').value = '';
  document.getElementById('inputRow').style.display = 'none';
  document.getElementById('halfInfo').classList.remove('show');
  hideMachineSafetyInfo();
  [1,2,3].forEach(n => document.getElementById('dayBtn'+n).classList.remove('active'));
  const btnXr = document.getElementById('dayBtnX');
  if(btnXr) { btnXr.classList.remove('active'); btnXr.textContent = '📅 직접'; }
  const pickerR = document.getElementById('returnDatePicker');
  if(pickerR) pickerR.style.display = 'none';
  document.getElementById('deliveryToggle').classList.remove('on');

  renderAll();
}

// ── 정비시간 계산 재정의 ──
function getUsedSite(dk, site) {
  // 부하율: calcMinsForLoad (effective 날짜 기준, 휴무일 반영)
  let total = 0;
  Object.keys(state).forEach(startDk => {
    if(!state[startDk] || !state[startDk][site]) return;
    state[startDk][site].entries.forEach(e => {
      total += calcMinsForLoad(e, dk);
    });
    // 배송 소요시간
    if(state[startDk][site].delivery) {
      const holidays = getHolidays();
      const isHol = isHoliday(startDk);
      if(isHol) {
        // 휴무일 배송: 전날 120분 + 다음날 120분
        let prevDay = new Date(startDk);
        prevDay.setDate(prevDay.getDate() - 1);
        while(isHoliday(toLocalDk(prevDay)))
          prevDay.setDate(prevDay.getDate() - 1);
        let nextDay = new Date(startDk);
        nextDay.setDate(nextDay.getDate() + 1);
        while(isHoliday(toLocalDk(nextDay)))
          nextDay.setDate(nextDay.getDate() + 1);
        if(toLocalDk(prevDay) === dk) total += 120;
        if(toLocalDk(nextDay) === dk) total += 120;
      } else {
        // 일반 배송: 해당일 240분
        if(startDk === dk) total += 240;
      }
    }
  });
  return total;
}

function getEffectiveOutDate(entry, holidays) {
  // 출고일(시작일)이 휴무면 전날 근무일로
  let d = new Date(entry.startDate);
  while(isHoliday(toLocalDk(d))) {
    d.setDate(d.getDate() - 1);
  }
  return toLocalDk(d);
}

function getEffectiveInDate(entry, holidays) {
  // 입고일 = 시작일 + (days-1), 휴무면 다음 근무일로
  let d = new Date(entry.startDate);
  d.setDate(d.getDate() + entry.days - 1);
  while(isHoliday(toLocalDk(d))) {
    d.setDate(d.getDate() + 1);
  }
  return toLocalDk(d);
}

// 목록 소요시간 표시용 (원래 날짜 기준)
function calcMinsForDate(entry, targetDk) {
  const start = new Date(entry.startDate);
  const target = new Date(targetDk);
  const diff = Math.round((target - start) / 86400000);
  const lastDay = entry.days - 1;

  const isOriginalOut = diff === 0;
  const isOriginalIn  = (entry.days === 1 && diff === 0) || (entry.days > 1 && diff === lastDay);

  if(entry.days === 1) {
    if(isOriginalOut) return entry.baseMins;
  } else {
    let mins = 0;
    if(isOriginalOut) mins += entry.baseMins / 2;
    if(isOriginalIn)  mins += entry.baseMins / 2;
    return mins;
  }
  return 0;
}

// 부하율 전용 (effective 날짜 기준, 휴무일 반영)
function calcMinsForLoad(entry, targetDk) {
  const holidays = getHolidays();
  const startDk = entry.startDate;
  const isStartHoliday = isHoliday(startDk);

  // 마지막날 계산 (입고일)
  let lastDate = new Date(startDk);
  lastDate.setDate(lastDate.getDate() + entry.days - 1);
  const lastDk = toLocalDk(lastDate);
  const isLastHoliday = isHoliday(lastDk);

  // 출고 effective 날짜 (시작일이 휴무면 전날)
  const effectiveOut = getEffectiveOutDate(entry, holidays);
  // 입고 effective 날짜 (입고일이 휴무면 다음날)
  const effectiveIn  = getEffectiveInDate(entry, holidays);

  let mins = 0;

  if(entry.days === 1) {
    if(isStartHoliday) {
      // 1일 임대인데 휴무일 → 출고는 전날(반타임), 입고는 다음날(반타임)
      if(effectiveOut === targetDk) mins += entry.baseMins / 2;
      if(effectiveIn  === targetDk) mins += entry.baseMins / 2;
    } else {
      // 일반 1일 임대 → 당일 전타임
      if(effectiveOut === targetDk) mins += entry.baseMins;
    }
  } else {
    // 2~3일 임대
    if(effectiveOut === targetDk) mins += entry.baseMins / 2;
    if(effectiveIn  === targetDk) mins += entry.baseMins / 2;
  }
  return mins;
}


function collectInoutForDate(dk) {
  const results = [];
  Object.keys(state).forEach(startDk => {
    // 현재 선택된 사업소만 필터
    const targetSites = curSite === '전체' ? ['본소','북부'] : [curSite];
    targetSites.forEach(site => {
      if(!state[startDk] || !state[startDk][site]) return;
      state[startDk][site].entries.forEach(e => {
        const start = new Date(e.startDate);
        const target = new Date(dk);
        const diff = Math.round((target - start) / 86400000);
        const lastDay = e.days - 1;
        if(diff === 0 && !e.outDone) {
          results.push({ entry: e, type: 'out', dayNum: 1 });
        }
        if(e.days === 1 && diff === 0 && e.outDone && !e.inDone) {
          results.push({ entry: e, type: 'in', dayNum: 1 });
        }
        if(e.days > 1 && diff === lastDay && !e.inDone) {
          results.push({ entry: e, type: 'in', dayNum: e.days });
        }
      });
    });
  });
  return results;
}

