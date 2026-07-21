// 임대 내역 수정 / 우천 관리 / 취소 이력
// ═══ 우천 관리 ═══
function getRainy() {
  try { return JSON.parse(localStorage.getItem('rainy_' + GH_REPO) || '[]'); } catch(e) { return []; }
}
function saveRainy(arr) {
  localStorage.setItem('rainy_' + GH_REPO, JSON.stringify(arr));
}
function toggleRainy(dk) {
  const rainy = getRainy();
  const idx2 = rainy.indexOf(dk);
  if(idx2 === -1) rainy.push(dk); else rainy.splice(idx2, 1);
  saveRainy(rainy);
  saveData();
  renderAll();
}

function toggleRainy(dk) {
  const rainy = getRainy();
  const idx = rainy.indexOf(dk);
  if(idx === -1) rainy.push(dk); else rainy.splice(idx, 1);
  saveRainy(rainy);
  saveData(); // data.json에도 저장
  renderAll();
}

// ═══ 취소 이력 관리 ═══
let cancelTarget = null; // {site, idx, startDk}

function delEntry(site, idx, startDk) {
  const dk2 = startDk || getDkeys()[curIdx];
  if(!state[dk2] || !state[dk2][site]) return;
  const e = state[dk2][site].entries[idx];
  if(!e) return;
  // 취소 모달 표시
  cancelTarget = {site, idx, startDk: dk2};
  document.getElementById('cancelEquipName').textContent = e.equipName + ' / ' + e.personName + ' (' + e.days + '일)';
  document.getElementById('cancelModal').classList.remove('hidden');
}

function confirmCancel(reason) {
  if(!cancelTarget) return;
  const {site, idx, startDk} = cancelTarget;
  if(!state[startDk] || !state[startDk][site]) return;
  const e = state[startDk][site].entries[idx];
  if(!e) return;
  // 취소 이력 저장 - 배열 확인
  if(!Array.isArray(state._cancelled)) state._cancelled = [];
  state._cancelled.push({
    cancelledAt: new Date().toISOString(),
    reason: reason,
    equipName: e.equipName,
    equipSpec: e.equipSpec || '',
    personName: e.personName,
    days: e.days,
    startDate: e.startDate,
    site: site,
    baseMins: e.baseMins,
    delivery: e.delivery || false
  });
  // 실제 삭제
  state[startDk][site].entries.splice(idx, 1);
  cancelTarget = null;
  document.getElementById('cancelModal').classList.add('hidden');
  if(saveTimer) clearTimeout(saveTimer);
  saveData();
  renderAll();
}

function closeCancelModal() {
  cancelTarget = null;
  document.getElementById('cancelModal').classList.add('hidden');
}



function applyEditDate(val) {
  if(!val || val.length !== 10) return;
  // val은 YYYY-MM-DD 문자열 - Date 객체 사용 안 함
  const parts = val.split('-');
  const y = parts[0], m = parseInt(parts[1]), d = parseInt(parts[2]);
  document.getElementById('editStartDate').value = val;
  document.getElementById('editStartDateDisplay').textContent = y+'년 '+m+'월 '+d+'일';
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editStartDatePicker').value = '';
  editTarget = null;
}

function setEditDays(d) {
  editDays = d;
  [1,2,3].forEach(n => document.getElementById('editDayBtn'+n).classList.toggle('active', n===d));
  const btnX = document.getElementById('editDayBtnX');
  btnX.classList.remove('active');
  btnX.textContent = '📅 직접';
  document.getElementById('editReturnDatePicker').style.display = 'none';
  updateEditHalfInfo();
}

function openEditDatePicker() {
  const dkStr = editTarget ? editTarget.startDk : getDkeys()[curIdx];
  const picker = document.getElementById('editReturnDatePicker');
  // 문자열 파싱으로 타임존 오류 해결
  const [y, m, d] = dkStr.split('-').map(Number);
  const minDate = new Date(y, m - 1, d + 1);
  picker.min = toLocalDk(minDate);
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

function setEditDaysByDate(returnDate) {
  if(!returnDate || !editTarget) return;
  // 문자열 파싱으로 타임존 오류 해결
  const [sy, sm, sd] = editTarget.startDk.split('-').map(Number);
  const [ey, em, ed] = returnDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  const diff  = Math.round((end - start) / 86400000) + 1;  // +1 추가: 시작일 포함
  if(diff < 1) return;
  editDays = diff;
  [1,2,3].forEach(n => document.getElementById('editDayBtn'+n).classList.remove('active'));
  const btnX = document.getElementById('editDayBtnX');
  btnX.classList.add('active');
  btnX.textContent = editDays+'일';
  document.getElementById('editReturnDatePicker').style.display = 'none';
  updateEditHalfInfo();
}

function toggleEditDelivery() {
  editDelivery = !editDelivery;
  document.getElementById('editDeliveryToggle').classList.toggle('on', editDelivery);
  document.getElementById('editDeliveryChkSq').style.background = editDelivery ? 'var(--yellow)' : 'var(--bg)';
  updateEditHalfInfo();
}

function updateEditHalfInfo() {
  if(!editEquip) return;
  const base = editEquip.m;
  const info = document.getElementById('editHalfInfo');
  const del  = editDelivery ? 240 : 0;
  if(editDays === 1) {
    info.textContent = '전타임 ' + (base+del) + '분' + (editDelivery?' (배송포함)':'');
  } else {
    info.textContent = '출고: ' + (base/2+(editDelivery?120:0)) + '분 / 입고: ' + (base/2+(editDelivery?120:0)) + '분';
  }
}

function openEditDD() {
  document.getElementById('editDropdown').classList.toggle('open');
  if(document.getElementById('editDropdown').classList.contains('open')) {
    document.getElementById('editDdFilter').value = '';
    filterEditDD();
    setTimeout(()=>document.getElementById('editDdFilter').focus(), 50);
  }
}

function filterEditDD() {
  const q = (document.getElementById('editDdFilter').value||'').toLowerCase().trim();
  const site = editTarget ? editTarget.site : (curSite==='전체'?null:curSite);
  let list = [];
  if(!site) {
    ['본소','북부'].forEach(st => EQUIP_LIST[st].forEach(e => list.push({...e,site:st})));
  } else {
    EQUIP_LIST[site].forEach(e => list.push({...e,site}));
  }
  const terms = q ? q.split(/[\s\-]+/).filter(Boolean) : [];
  const filtered = terms.length===0 ? list : list.filter(e => {
    const t = (e.n+' '+e.s).toLowerCase();
    return terms.every(w => t.includes(w));
  });
  document.getElementById('editDdList').innerHTML = filtered.map(e => {
    const status = getEquipStatus(e.n, e.site);
    const statusBadge = status === '정비중'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(245,158,11,.2);color:var(--yellow);font-weight:700">🔧 정비중</span>'
      : status === '임대중'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(239,68,68,.2);color:var(--red);font-weight:700">📤 임대중</span>'
      : status === '출고예정'
      ? '<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(96,165,250,.2);color:var(--blue);font-weight:700">📦 출고예정</span>'
      : '';
    const snBadge2 = `<span style="font-size:10px;font-weight:900;margin-right:4px;color:${e.site==='본소'?'var(--본소)':'var(--북부)'}">${e.site==='본소'?'S':'N'}</span>`;
    return `<div class="dd-item" onclick='selectEditEquip(${JSON.stringify(e)})'>
      <span class="dd-name">${snBadge2}${e.n} ${statusBadge}</span>
      <span class="dd-mins" style="font-size:10px;color:var(--muted)">${e.s}</span>
    </div>`;
  }).join('') || '<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">검색 결과 없음</div>';
}

function selectEditEquip(e) {
  editEquip = e;
  document.getElementById('editSearchInp').value = e.n + (e.s?' / '+e.s:'');
  document.getElementById('editDropdown').classList.remove('open');
  updateEditHalfInfo();
}

function saveEdit() {
  if(!editTarget || !editEquip) return;
  const person = document.getElementById('editPersonInp').value.trim();
  if(!person) {
    document.getElementById('editPersonInp').style.borderColor='var(--red)';
    document.getElementById('editPersonInp').focus();
    return;
  }
  const {startDk, site, idx} = editTarget;
  const entry = state[startDk][site].entries[idx];
  if(!entry) return;

  const deliveryMins = editDelivery ? 240 : 0;
  const sdEl2 = document.getElementById('editStartDate');
  const sdVal = sdEl2 ? sdEl2.value : '';
  let newStartDate = sdVal && sdVal.length === 10 ? sdVal : startDk;

  entry.equipName  = editEquip.n;
  entry.equipSpec  = editEquip.s || '';
  entry.personName = person;
  entry.days       = editDays;
  entry.baseMins   = editEquip.m + deliveryMins;
  entry.delivery   = editDelivery;
  entry.startDate  = newStartDate;

  // 시작일이 바뀌면 다른 날짜 키로 이동
  if(newStartDate !== startDk) {
    // 원래 위치에서 먼저 제거
    state[startDk][site].entries.splice(idx, 1);
    // 새 날짜로 이동
    ensureDay(newStartDate);
    state[newStartDate][site].entries.push(entry);
  }

  if(saveTimer) clearTimeout(saveTimer);
  saveData();
  closeEditModal();
  renderAll();
  setTimeout(()=>renderTriDayPanel(), 100);
}

// 드롭다운 외부 클릭 닫기 (수정 모달)
document.addEventListener('click', e => {
  if(!document.getElementById('editSearchWrap').contains(e.target)) {
    document.getElementById('editDropdown').classList.remove('open');
  }
});


function closePopup() {
  document.getElementById('inoutPopup').classList.add('hidden');
}

