// 3일 임대 목록 렌더
// ═══ 3일 임대 목록 렌더 ═══
function renderTriDayPanel() {
  const panel = document.getElementById('triDayPanel');
  if(!panel) return;


  const dk = getDkeys()[curIdx];
  const d = getDates()[curIdx];
  const DOW2 = ['일','월','화','수','목','금','토'];
  const holidays = getHolidays();
  const targetSites = curSite==='전체' ? ['본소','북부'] : [curSite];

  let colsHtml = '';
  [-1,0,1].forEach(offset => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + offset);
    const colDk = toLocalDk(dd);
    const label = (dd.getMonth()+1)+'/'+ dd.getDate()+'('+DOW2[dd.getDay()]+')';
    const isHol = isHoliday(colDk);
    const isTod = offset===0;
    const hdrColor = isHol?'#ef4444':isTod?'#818cf8':'#94a3b8';
    const hdrBg = isTod?'rgba(99,102,241,.1)':'';

    // entries 수집
    const rows = [];
    Object.keys(state).forEach(startDk => {
      targetSites.forEach(site => {
        if(!state[startDk]||!state[startDk][site]) return;
        state[startDk][site].entries.forEach((e,ei) => {
          const diff = Math.round((new Date(colDk)-new Date(e.startDate))/86400000);
          const inDkD = new Date(e.startDate);
          inDkD.setDate(inDkD.getDate()+e.days-1);
          const inDk = toLocalDk(inDkD);
          const isOut = diff===0;
          const isIn  = inDk===colDk;
          const isPastOut = e.outDone&&!e.inDone&&isIn;
          if(!isOut&&!isIn&&!isPastOut) return;
          let tc = isOut&&e.days===1?'#eab308':(!isOut&&(isIn||isPastOut))?'#64748b':'#22c55e';
          rows.push({e,ei,site,startDk,isOut,isIn:isIn||isPastOut,tc});
        });
      });
    });

    // 정렬: 회색(입고,기간긴순) → 노란(1일,성명순) → 초록(출고,기간짧은순)
    rows.sort((a,b)=>{
      // 1순위: 그룹 (입고→1일→출고)
      const typeOrder = {'#64748b':0,'#eab308':1,'#22c55e':2};
      const ga = typeOrder[a.tc], gb2 = typeOrder[b.tc];
      if(ga !== gb2) return ga - gb2;
      // 2순위: 기간 정렬
      if(a.tc === '#64748b' && a.e.days !== b.e.days) return b.e.days - a.e.days; // 입고: 긴순
      if(a.tc === '#22c55e' && a.e.days !== b.e.days) return a.e.days - b.e.days; // 출고: 짧은순
      // 3순위: 성명 가나다
      return (a.e.personName||'').localeCompare(b.e.personName||'','ko');
    });

    const outN = rows.filter(r=>r.isOut&&!r.e.outDone).length;
    const inN  = rows.filter(r=>r.isIn&&!r.e.inDone).length;

    let rowsHtml = rows.length===0
      ? '<p style="padding:12px;text-align:center;color:#64748b;font-size:11px;margin:0">없음</p>'
      : rows.map(r=>`
        <div style="display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid #1e293b;border-left:3px solid ${r.tc}">
          <span style="font-weight:700;color:#f1f5f9;font-size:11px;min-width:44px;flex-shrink:0">${r.e.personName||''}</span>
          ${r.isOut?`<label style="display:inline-flex;align-items:center;gap:2px;cursor:pointer;flex-shrink:0"><input type="checkbox" ${r.e.outDone?'checked':''} onchange="toggleEntryCheckInline('${r.startDk}','${r.site}',${r.ei},'out',this.checked)" style="width:13px;height:13px"><span style="color:#60a5fa;font-size:10px">출고</span></label>`:'<span style="width:40px"></span>'}
          ${r.isIn?`<label style="display:inline-flex;align-items:center;gap:2px;cursor:pointer;flex-shrink:0"><input type="checkbox" ${r.e.inDone?'checked':''} onchange="toggleEntryCheckInline('${r.startDk}','${r.site}',${r.ei},'in',this.checked)" style="width:13px;height:13px"><span style="color:#34d399;font-size:10px">입고</span></label>`:'<span style="width:40px"></span>'}
          <span style="color:#64748b;font-size:10px;flex-shrink:0">${r.e.days}일</span>
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e2e8f0;font-size:11px">${r.site==='본소'?'<span style="font-size:9px;font-weight:900;color:var(--본소);margin-right:3px">S</span>':'<span style="font-size:9px;font-weight:900;color:var(--북부);margin-right:3px">N</span>'}${r.e.equipName||''}${r.e.delivery?' 🚚':''}</span>
          <span style="color:#64748b;font-size:10px;flex-shrink:0">${calcMinsForDate(r.e,colDk)}분</span>
          <button onclick="openEditModal('${r.startDk}','${r.site}',${r.ei})" style="width:18px;height:18px;background:transparent;border:1px solid #334155;border-radius:4px;color:#94a3b8;font-size:10px;cursor:pointer;flex-shrink:0;padding:0">✏️</button>
          <button onclick="delEntry('${r.site}',${r.ei},'${r.startDk}')" style="width:18px;height:18px;background:transparent;border:1px solid #334155;border-radius:4px;color:#94a3b8;font-size:11px;cursor:pointer;flex-shrink:0;padding:0">✕</button>
        </div>`).join('');

    colsHtml += `
    <div style="background:#1e293b;border:${isTod?'2px solid #818cf8':'1px solid #334155'};border-radius:10px;overflow:hidden;display:flex;flex-direction:column;min-height:200px;${isTod?'box-shadow:0 0 0 2px rgba(129,140,248,.2)':''}">
      <div style="padding:8px 12px;background:${hdrBg};border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:${isTod?'16':'12'}px;font-weight:${isTod?'900':'700'};color:${hdrColor};letter-spacing:${isTod?'-0.3px':'0'}">${label}${isHol?' 🔴':''}</span>
        <span style="font-size:10px;color:#64748b">
          <span style="color:#60a5fa">출${outN}</span>/<span style="color:#34d399">입${inN}</span>${rows.filter(r=>r.e.delivery&&r.isOut&&!r.e.outDone).length||rows.filter(r=>r.e.delivery&&r.isIn&&!r.e.inDone).length?` <span style="color:#f59e0b">🚚${rows.filter(r=>r.e.delivery&&r.isOut&&!r.e.outDone).length}/${rows.filter(r=>r.e.delivery&&r.isIn&&!r.e.inDone).length}</span>`:''}
        </span>
      </div>

      <div style="flex:1;overflow-y:auto">${rowsHtml}</div>
    </div>`;
  });

  panel.innerHTML = colsHtml;
}


function setIdxByDk(dk) {
  const i = getDkeys().indexOf(dk);
  if(i >= 0) { curIdx = i; renderAll(); }
  // 입력창 장비검색 포커스
  setTimeout(() => {
    const si = document.getElementById('searchInp');
    if(si) { si.click(); si.focus(); }
  }, 100);
}


function openInputForDate(dk) {
  // 입력 패널은 항상 표시 - 날짜만 설정
  const i2 = getDkeys().indexOf(dk);
  if(i2 >= 0) { curIdx = i2; renderAll(); }
}


function closeInlineInput() {
  const panel = document.getElementById('inlineInputPanel');
  panel.style.display = 'none';
  panel.dataset.dk = '';
  selEquip = null;
}


function openInoutPopupSite(site) {
  // 팝업 탭 활성화
  ['전체','본소','북부'].forEach(s => {
    const map = {'전체':'popupTabAll','본소':'popupTabBonso','북부':'popupTabBukbu'};
    const btn = document.getElementById(map[s]);
    if(!btn) return;
    if(s === site) {
      btn.style.background = 'var(--accent)';
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'var(--border)';
      btn.style.color = 'var(--muted)';
    }
  });
  // curSite 임시 변경 후 팝업 갱신
  const prevSite = curSite;
  curSite = site;
  openInoutPopup();
  curSite = prevSite;
}


function openInoutPopup() {
  const DATES = getDates();
  const DKEYS = getDkeys();
  const idx   = curIdx;
  const holidays = getHolidays();
  const DOW2  = ['일','월','화','수','목','금','토'];

  // 선택된 날짜 기준 전날/오늘/다음날 (날짜 탭 범위와 무관하게 계산)
  const selDk = DKEYS[idx];
  const selD  = DATES[idx];
  const cols = [-1, 0, 1].map(offset => {
    const d = new Date(selD);
    d.setDate(d.getDate() + offset);
    const dk = toLocalDk(d);
    return { dk, d: new Date(d), offset };
  });

  const todayD = selD;
  const colDks = cols.map(c => c.dk); // 3일 범위 날짜

  document.getElementById('popupDateLabel').textContent =
    todayD.getFullYear() + '년 ' + (todayD.getMonth()+1) + '월 ' + todayD.getDate() + '일 기준'
    + (curSite !== '전체' ? ' [' + curSite + ']' : ' [전체]');

  // ── 3일 범위 내 미완결 작업 수집 ──
  // entry별로 이 3일 범위에서 해야 할 일 정리
  const taskMap = {}; // key → {entry, site, startDk, outDk, inDk}

  Object.keys(state).forEach(startDk => {
    // 현재 선택된 사업소만 필터
    const targetSites = curSite === '전체' ? ['본소','북부'] : [curSite];
    targetSites.forEach(site => {
      if(!state[startDk]||!state[startDk][site]) return;
      state[startDk][site].entries.forEach(e => {
        const start   = new Date(e.startDate);
        const outDk   = e.startDate; // 출고일 = 시작일
        const inDate  = new Date(e.startDate);
        inDate.setDate(inDate.getDate() + e.days - 1);
        const inDk    = toLocalDk(inDate); // 입고일

        // 이 entry가 3일 범위와 관련 있는지 판단
        const outInRange = colDks.includes(outDk);
        const inInRange  = colDks.includes(inDk);

        // 할 일이 있는지 (미완결)
        const needOut = outInRange && !e.outDone;
        const needIn  = inInRange  && !e.inDone;

        // 1일 임대 특수처리: 출고 완료됐는데 입고 미완 → 입고만
        const needInOnly = (e.days === 1 && e.outDone && !e.inDone && inInRange);

        if(!needOut && !needIn && !needInOnly) return;

        const key = e.id;
        taskMap[key] = {
          entry: e, site, startDk, outDk, inDk,
          showOut: needOut,
          showIn:  needIn || needInOnly,
        };
      });
    });
  });

  const tasks = Object.values(taskMap);

  // 총 건수 계산
  const totalOut = tasks.filter(t => t.showOut).length;
  const totalIn  = tasks.filter(t => t.showIn).length;

  // ── 컬럼 헤더 ──
  let colHeaderHtml = '';
  cols.forEach(col => {
    const isToday2 = col.offset === 0;
    const isHol = isHoliday(col.dk);
    const color = isToday2 ? 'var(--accent)' : (isHol ? 'var(--red)' : 'var(--muted)');
    const dateStr = (col.d.getMonth()+1)+'/'+col.d.getDate()+'('+DOW2[col.d.getDay()]+')';
    // 이 날짜의 미완결 건수
    const colOut = tasks.filter(t => t.showOut && t.outDk === col.dk).length;
    const colIn  = tasks.filter(t => t.showIn  && t.inDk  === col.dk).length;
    let sub = '';
    if(col.offset === -1) sub = colIn  ? `입고(${colIn}건)` : '없음';
    else if(col.offset === 0) sub = [colOut?`출고(${colOut}건)`:'', colIn?`입고(${colIn}건)`:''].filter(Boolean).join(' ') || '없음';
    else if(col.offset === 1) sub = colOut ? `출고(${colOut}건)` : '없음';
    colHeaderHtml += `<th style="padding:6px 8px;border:1px solid var(--border);color:${color};font-weight:700;text-align:center;min-width:100px">
      ${dateStr}${isHol?' 🔴':''}<br>
      <span style="font-size:10px;font-weight:400;color:var(--muted)">${sub}</span>
    </th>`;
  });

  // ── 행 정렬 ──
  // 날짜 → [입고(2일↑)] → [출입고(1일)] → [출고(2일↑)] → 성명그룹 → 장비명
  function getTaskGroup(t) {
    // 0: 다일임대 입고, 1: 1일임대 출입고, 2: 다일임대 출고
    if(t.showIn  && t.entry.days >= 2) return 0;
    if(t.showOut && t.entry.days === 1) return 1;
    if(t.showOut && t.entry.days >= 2) return 2;
    return 1;
  }
  function getTaskDate(t) {
    // 그룹별 기준 날짜
    if(getTaskGroup(t) === 0) return t.inDk;   // 입고일
    if(getTaskGroup(t) === 2) return t.outDk;  // 출고일
    return t.outDk; // 1일임대
  }
  tasks.sort((a,b) => {
    const aDate = getTaskDate(a);
    const bDate = getTaskDate(b);
    // 1순위: 날짜
    if(aDate !== bDate) return aDate < bDate ? -1 : 1;
    // 2순위: 그룹 (입고→1일→출고)
    const ag = getTaskGroup(a), bg2 = getTaskGroup(b);
    if(ag !== bg2) return ag - bg2;
    // 3순위: 성명 그룹
    const aName = a.entry.personName || '';
    const bName = b.entry.personName || '';
    if(aName !== bName) return aName.localeCompare(bName, 'ko');
    // 4순위: 장비명
    return a.entry.equipName.localeCompare(b.entry.equipName, 'ko');
  });

  // ── 행 생성 ──
  let rowsHtml = '';
  if(tasks.length === 0) {
    rowsHtml = `<tr><td colspan="${cols.length+3}" style="padding:20px;text-align:center;color:var(--muted);border:1px solid var(--border)">미완결 작업 없음 ✅</td></tr>`;
  } else {
    tasks.forEach((t, ri) => {
      const e = t.entry;
      const bg = ri%2===0 ? 'var(--surface)' : 'var(--card)';

      let colCells = '';
      cols.forEach(col => {
        let cell = '';
        let cellStyle = `padding:7px 8px;border:1px solid var(--border);text-align:center`;

        // 출고 표시
        if(t.showOut && t.outDk === col.dk) {
          cell += `<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;margin:2px">
            <input type="checkbox" ${e.outDone?'checked':''} 
              onchange="toggleEntryCheckPopup('${e.startDate}','${t.site}','${e.id}','out',this.checked)" style="cursor:pointer">
            <span style="font-size:11px;color:var(--blue)">출고 →</span>
          </label>`;
        }
        // 입고 표시
        if(t.showIn && t.inDk === col.dk) {
          cell += `<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;margin:2px">
            <input type="checkbox" ${e.inDone?'checked':''}
              onchange="toggleEntryCheckPopup('${e.startDate}','${t.site}','${e.id}','in',this.checked)" style="cursor:pointer">
            <span style="font-size:11px;color:var(--green)">← 입고</span>
          </label>`;
        }
        // 임대 중간 기간 표시 (출고됐고 아직 입고 안 된 기간)
        if(!cell && e.outDone && !e.inDone) {
          const colDate = new Date(col.dk);
          const outDate = new Date(t.outDk);
          const inDate  = new Date(t.inDk);
          if(colDate > outDate && colDate <= inDate) {
            cell = `<span style="color:var(--blue);font-size:14px">→</span>`;
            cellStyle += ';background:rgba(96,165,250,.05)';
          }
        }

        colCells += `<td style="${cellStyle}">${cell}</td>`;
      });

      const daysLabel = e.days + '일';
      // 같은 날짜+성명이 이전 행과 같으면 성명 흐리게 표시
      const prevTask = ri > 0 ? tasks[ri-1] : null;
      const prevDate = prevTask ? getTaskDate(prevTask) : '';
      const curDate  = getTaskDate(t);
      const samePerson = prevTask &&
        prevDate === curDate &&
        getTaskGroup(prevTask) === getTaskGroup(t) &&
        prevTask.entry.personName === e.personName;
      const nameStyle = samePerson
        ? 'padding:7px 10px;border:1px solid var(--border);color:var(--muted);font-size:11px'
        : 'padding:7px 10px;border:1px solid var(--border);color:var(--dim);font-weight:600';
      const nameDisplay = samePerson ? '〃' : e.personName;
      rowsHtml += `<tr style="background:${bg}">
        <td style="padding:7px 10px;border:1px solid var(--border);color:var(--text);font-weight:600">${e.equipName}${e.delivery?"<span style=\"margin-left:5px;font-size:10px;color:var(--yellow)\">🚚</span>":""}</td>
        <td style="${nameStyle}">${nameDisplay}</td>
        ${colCells}
        <td style="padding:7px 10px;border:1px solid var(--border);color:var(--muted);font-size:10px">${daysLabel}</td>
      </tr>`;
    });
  }

  const tableHtml = `
  <div style="margin-bottom:12px;text-align:center">
    <span style="font-size:14px;font-weight:900;color:#fff">
      ${(todayD.getMonth()+1)}월 ${todayD.getDate()}일 입출고 작업 목록 (${curSite === '전체' ? '전체' : curSite})
    </span>
    <span style="font-size:12px;color:var(--blue);margin-left:10px">출고 ${totalOut}건</span>
    <span style="font-size:12px;color:var(--green);margin-left:6px">입고 ${totalIn}건</span>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead>
      <tr style="background:var(--bg)">
        <th style="padding:8px 10px;border:1px solid var(--border);color:var(--muted);font-weight:700;min-width:130px">장비명</th>
        <th style="padding:8px 10px;border:1px solid var(--border);color:var(--muted);font-weight:700;min-width:70px">성명</th>
        ${colHeaderHtml}
        <th style="padding:8px 10px;border:1px solid var(--border);color:var(--muted);font-weight:700">기간</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;

  document.getElementById('popupCols').innerHTML = tableHtml;
  document.getElementById('inoutPopup').classList.remove('hidden');
  // 현재 탭 활성화
  openInoutPopupSite(curSite);
}


function toggleEntryCheckPopup(startDk, site, entryId, 입력, val) {
  if(!state[startDk] || !state[startDk][site]) return;
  const entry = state[startDk][site].entries.find(e => String(e.id) === String(entryId));
  if(!entry) return;
  if(입력 === 'out') entry.outDone = val;
  else entry.inDone = val;
  saveCheck(entry.id, entry.outDone, entry.inDone);
  renderAll();
  openInoutPopup();
}


// ═══ 임대 내역 수정 ═══
let editTarget = null; // {startDk, site, idx}
let editEquip  = null;
let editDays   = 1;
let editDelivery = false;

function formatLocalDate(dateStr) {
  if(!dateStr) return '날짜 선택';
  const [y,m,d] = dateStr.split('-');
  return y+'년 '+parseInt(m)+'월 '+parseInt(d)+'일';
}


function openEditModal(startDk, site, idx) {
  const e = state[startDk][site].entries[idx];
  if(!e) return;
  editTarget = {startDk, site, idx};

  // 장비명
  document.getElementById('editSearchInp').value = e.equipName + (e.equipSpec ? ' / '+e.equipSpec : '');
  editEquip = {n: e.equipName, s: e.equipSpec||'', m: e.baseMins - (e.delivery?240:0)};

  // 성명
  document.getElementById('editPersonInp').value = e.personName || '';

  // 시작일 - 문자열 직접 설정 (YYYY-MM-DD 그대로)
  const startDkStr = (e.startDate || editTarget.startDk).slice(0, 10);
  const [_ey,_em,_ed] = startDkStr.split('-').map(Number);
  const _dispDate = new Date(_ey, _em-1, _ed);
  const _dispStr = _dispDate.getFullYear()+'-'+String(_dispDate.getMonth()+1).padStart(2,'0')+'-'+String(_dispDate.getDate()).padStart(2,'0');
  document.getElementById('editStartDate').value = _dispStr;
  document.getElementById('editStartDateDisplay').textContent = _dispDate.getFullYear()+'년 '+(_dispDate.getMonth()+1)+'월 '+_dispDate.getDate()+'일';

  // 임대기간
  editDays = e.days;
  editDelivery = e.delivery || false;
  [1,2,3].forEach(n => document.getElementById('editDayBtn'+n).classList.toggle('active', n===editDays));
  const btnX = document.getElementById('editDayBtnX');
  if(editDays > 3) { btnX.classList.add('active'); btnX.textContent = editDays+'일'; }
  else { btnX.classList.remove('active'); btnX.textContent = '📅 직접'; }
  document.getElementById('editDeliveryToggle').classList.toggle('on', editDelivery);
  document.getElementById('editDeliveryChkSq').style.background = editDelivery ? 'var(--yellow)' : '';
  updateEditHalfInfo();
  document.getElementById('editModal').classList.remove('hidden');
}

function saveRainy(arr) {
  localStorage.setItem('rainy_' + GH_REPO, JSON.stringify(arr));
}

