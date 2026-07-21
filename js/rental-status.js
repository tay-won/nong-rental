// 장비 임대 상태 계산
// ═══ 장비 임대 상태 계산 ═══
function getEquipStatus(equipName, siteName) {
  const dk = getDkeys()[curIdx]; // 현재 선택 날짜
  const targetSites = siteName ? [siteName] : (curSite==='전체' ? ['본소','북부'] : [curSite]);

  for(const st of targetSites) {
    const entries = [];
    Object.keys(state).forEach(startDk => {
      if(!state[startDk]||!state[startDk][st]) return;
      state[startDk][st].entries.forEach(e => {
        if(e.equipName === equipName) entries.push({e, startDk});
      });
    });

    for(const {e} of entries) {
      // 입고일 계산 (원래 스케줄 기준)
      const inDate = new Date(e.startDate);
      inDate.setDate(inDate.getDate() + e.days - 1);
      const inDk = toLocalDk(inDate);

      // 정비중: 오늘이 입고일 (실제 입고 여부와 무관)
      if(inDk === dk) return '정비중';

      // 임대중: 출고됐고 입고일이 오늘 이후
      if(e.outDone && inDk > dk) return '임대중';

      // 출고 예정(오늘): 아직 임대 가능 아님
      if(e.startDate === dk && !e.outDone) return '출고예정';
    }
  }
  return null; // 이상 없음
}


function renderInoutCols() {
  const DATES = getDates();
  const DKEYS = getDkeys();
  const idx   = curIdx;
  const holidays = getHolidays();
  const DOW2  = ['일','월','화','수','목','금','토'];
  const targetSites = curSite==='전체' ? ['본소','북부'] : [curSite];

  [-1, 0, 1].forEach((offset, ci) => {
    const i = idx + offset;
    const col = document.getElementById('inoutCol'+ci);
    if(!col) return;

    // 날짜 계산 (탭 범위 밖이어도 실제 날짜 사용)
    const d = new Date(DATES[idx]);
    d.setDate(d.getDate() + offset);
    const dk = toLocalDk(d);

    const isToday2 = dk === toLocalDk(today());
    const isHol = isHoliday(dk);
    const dateStr = (d.getMonth()+1)+'/'+d.getDate()+'('+DOW2[d.getDay()]+')';
    const hdrColor = isToday2 ? 'var(--accent)' : (isHol ? 'var(--red)' : 'var(--muted)');

    // 이 날짜 미완결 작업 수집
    const tasks = [];
    Object.keys(state).forEach(startDk => {
      targetSites.forEach(site => {
        if(!state[startDk]||!state[startDk][site]) return;
        state[startDk][site].entries.forEach(e => {
          const inDate = new Date(e.startDate);
          inDate.setDate(inDate.getDate() + e.days - 1);
          const inDk  = toLocalDk(inDate);
          const outDk = e.startDate;

          const needOut = outDk === dk && !e.outDone;
          const needIn  = inDk  === dk && !e.inDone;
          const needInPastOut = inDk === dk && e.outDone && !e.inDone;

          if(!needOut && !needIn && !needInPastOut) return;

          // 타입
          let type = 'type-out';
          if(needIn || needInPastOut) type = (e.days===1 && needOut) ? 'type-1day' : 'type-in';

          tasks.push({e, site, startDk, outDk, inDk, needOut, needIn: needIn||needInPastOut, type});
        });
      });
    });

    // 정렬
    const order = {'type-in':0,'type-1day':1,'type-out':2};
    tasks.sort((a,b) => {
      if(order[a.type]!==order[b.type]) return order[a.type]-order[b.type];
      if(a.type==='type-in' && a.e.days!==b.e.days) return b.e.days-a.e.days;
      if(a.type==='type-out' && a.e.days!==b.e.days) return a.e.days-b.e.days;
      return (a.e.personName||'').localeCompare(b.e.personName||'','ko');
    });

    const outCnt = tasks.filter(t=>t.needOut).length;
    const inCnt  = tasks.filter(t=>t.needIn).length;

    let rowsHtml = tasks.map(t => {
      const e = t.entry || t.e;
      const bgMap = {'type-in':'rgba(100,116,139,.1)','type-1day':'rgba(234,179,8,.07)','type-out':'rgba(34,197,94,.07)'};
      const borderMap = {'type-in':'#64748b','type-1day':'#eab308','type-out':'#22c55e'};
      return `<div style="padding:5px 8px;border-bottom:1px solid var(--border);border-left:2px solid ${borderMap[t.type]};background:${bgMap[t.type]};font-size:11px">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
          <span style="font-weight:700;color:#fff;font-size:11px">${e.personName}</span>
          <span style="font-size:9px;color:var(--muted)">${e.days}일</span>
          ${curSite==='전체'?`<span style="font-size:9px;padding:0 3px;border-radius:3px;background:rgba(100,116,139,.2);color:var(--muted)">${t.site}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap">
          <span style="color:var(--dim);font-size:10px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.site==='본소'?'<span style="font-size:9px;font-weight:900;color:var(--본소);margin-right:3px">S</span>':'<span style="font-size:9px;font-weight:900;color:var(--북부);margin-right:3px">N</span>'}${e.equipName}${e.delivery?' 🚚':''}</span>
        </div>
        <div style="display:flex;gap:4px;margin-top:3px">
          ${t.needOut?`<label style="display:inline-flex;align-items:center;gap:2px;cursor:pointer;font-size:10px">
            <input type="checkbox" ${e.outDone?'checked':''} onchange="toggleEntryCheckInline('${t.startDk}','${t.site}',${state[t.startDk][t.site].entries.indexOf(e)},'out',this.checked)" style="cursor:pointer">
            <span style="color:var(--blue)">출고</span></label>`:''}
          ${t.needIn?`<label style="display:inline-flex;align-items:center;gap:2px;cursor:pointer;font-size:10px">
            <input type="checkbox" ${e.inDone?'checked':''} onchange="toggleEntryCheckInline('${t.startDk}','${t.site}',${state[t.startDk][t.site].entries.indexOf(e)},'in',this.checked)" style="cursor:pointer">
            <span style="color:var(--green)">입고</span></label>`:''}
        </div>
      </div>`;
    }).join('');

    col.innerHTML = `
      <div style="padding:6px 8px;background:var(--bg);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1">
        <div style="font-size:11px;font-weight:700;color:${hdrColor}">${dateStr}${isHol?' 🔴':''}</div>
        <div style="font-size:9px;color:var(--muted)">출고 ${outCnt} / 입고 ${inCnt}</div>
      </div>
      ${rowsHtml || '<div style="padding:12px 8px;text-align:center;color:var(--muted);font-size:11px">없음</div>'}`;
  });
}


function openInputPanel() {
  // 입력 패널이 있는 col-right 스크롤
  const searchWrap = document.getElementById('searchWrap');
  if(searchWrap) {
    searchWrap.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => openDD(), 300);
  }
}


function renderDateTabs(){
  const DATES=getDates(), DKEYS=getDkeys();
  const holidays = getHolidays();
  const rainyDays = getRainy();
  document.getElementById('dateTabs').innerHTML = DATES.map((d,i) => {
    const dk = DKEYS[i];
    const pct = getPct(dk, curSite);
    const st = getStatus(pct);
    const isHol = isHoliday(dk);
    const isRain = rainyDays.includes(dk);
    const isYesterday = dk === toLocalDk(new Date(today().getTime()-86400000));
    let s = {outTotal:0,inTotal:0,delOut:0,delIn:0,outRemain:0,inRemain:0,delOutRemain:0,delInRemain:0};
    try { s = getDayStats(dk, curSite); } catch(e) {}
    const countHtml = '<div style="font-size:10px;color:var(--muted);margin-top:3px;line-height:1.5">'
      +'<span style="color:#60a5fa">출'+s.outTotal+'</span> <span style="color:#34d399">입'+s.inTotal+'</span>'
      +(s.delOut||s.delIn ? '<br><span style="color:#f59e0b">🚚'+s.delOut+'/'+s.delIn+'</span>' : '')
      +'</div>';
    return '<div class="dtab'+(i===curIdx?' active':'')+(isHol?' holiday':isRain?' rainy':'')
      +'" onclick="setIdx('+i+')" style="position:relative">'
      +(isToday(d)?'<div class="tl">TODAY</div>':isYesterday?'<div class="tl" style="color:var(--muted)">어제</div>':'')
      +'<div class="day">'+d.getDate()+'</div>'
      +'<div class="dow">'+DOW[d.getDay()]+'</div>'
      +(isHol
        ? '<div class="holiday-badge">휴무</div>'
        : isRain
        ? '<div class="holiday-badge" style="background:rgba(96,165,250,.15);color:#60a5fa;border-color:rgba(96,165,250,.4)">🌧️</div>'
        : '<div class="chip chip-'+st+'">'+pct+'%</div>')
      +countHtml
      +'</div>';
  }).join('');
}

function renderAll(){
  const DATES=getDates(),DKEYS=getDkeys();
  DKEYS.forEach(dk=>ensureDay(dk));
  renderDateTabs();
  const d=DATES[curIdx],dk=DKEYS[curIdx];
  const _dkCur = getDkeys()[curIdx];
  const _isHolCur = isHoliday(_dkCur);
  const _holBtnStyle = 'margin-left:8px;padding:2px 8px;background:transparent;border:1px solid ' + (_isHolCur ? '#ef4444' : '#2e3350') + ';border-radius:8px;color:' + (_isHolCur ? '#ef4444' : '#64748b') + ';font-size:10px;cursor:pointer';
  document.getElementById('dateBar').innerHTML =
    '📅 ' + d.getFullYear() + '년 ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + '요일)' + (isToday(d) ? ' — 오늘' : (dk === toLocalDk(new Date(today().getTime()-86400000)) ? ' — 어제' : ''))
    + (_isHolCur ? ' <span style="color:#ef4444;font-size:11px">🔴 휴무일</span>' : '')
    + ' <button onclick="toggleHoliday(\'' + _dkCur + '\')" style="' + _holBtnStyle + '">' + (_isHolCur ? '휴무 해제' : '휴무 지정') + '</button>'
    + (!isToday(d) ? ' <button onclick="resetDates()" style="margin-left:6px;padding:2px 8px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:8px;color:var(--accent);font-size:10px;cursor:pointer">오늘로</button>' : '')
    + (() => { const isRainy = getRainy().includes(_dkCur); return ' <button onclick="toggleRainy(\'' + _dkCur + '\')" style="margin-left:4px;padding:2px 8px;background:' + (isRainy?'rgba(96,165,250,.2)':'transparent') + ';border:1px solid ' + (isRainy?'#60a5fa':'#2e3350') + ';border-radius:8px;color:' + (isRainy?'#60a5fa':'#64748b') + ';font-size:10px;cursor:pointer">' + (isRainy?'🌧️ 우천 해제':'🌧️ 우천') + '</button>'; })();
  renderWorkers();renderGauge();renderSelList();renderTriDayPanel();renderSafetyChecklist();}



function renderWorkers(){
  const dk=getDkeys()[curIdx];
  const showSites=curSite==='전체'?SITES:[curSite];
  document.getElementById('workerBlocks').innerHTML=showSites.map(st=>{
    const av=getAvailSite(dk,st);
    const workers=WDEF[st].map(w=>'<div class="worker-item"><div class="wname type-'+w.type+'">'+w.name+' <span style="font-size:9px;opacity:.5">'+w.type+'</span></div><select onchange="state[\''+dk+'\'][\''+st+'\'].workers[\''+w.id+'\']=+this.value;scheduleSave();renderAll()">'+SCHED.map(o=>'<option value="'+o.value+'"'+(state[dk][st].workers[w.id]===o.value?' selected':'')+'>'+o.label+'</option>').join('')+'</select></div>').join('');
    return '<div class="site-block"><div class="site-hdr"><span class="site-lbl '+st+'">'+st+'</span><span class="site-avail">'+av+'분 ('+(av/60).toFixed(1)+'h)</span></div><div class="worker-grid">'+workers+'</div></div>';
  }).join('');
  const avail=getAvail(dk,curSite);
  const active=showSites.reduce((s,st)=>s+Object.values(state[dk][st].workers).filter(v=>v>0).length,0);
  document.getElementById('availVal')&&(document.getElementById('availVal').textContent=(avail/60).toFixed(1));
  document.getElementById('availDetail')&&(document.getElementById('availDetail').textContent=avail);
  document.getElementById('availDetail').textContent='근무 '+active+'명 합계';
}

function renderGauge(){
  const dk=getDkeys()[curIdx];
  const avail=getAvail(dk,curSite),used=getUsed(dk,curSite),pct=getPct(dk,curSite),remain=avail-used,st=getStatus(pct);
  const col=st==='마감'?'var(--red)':st==='주의'?'var(--yellow)':'var(--green)';
  const bar=document.getElementById('gaugeBar');
  if(bar){bar.style.width=Math.min(pct,100)+'%';bar.style.background=col;}
  const badge=document.getElementById('statusBadge');
  if(badge){
    badge.className='status-badge status-'+st;
    badge.textContent={정상:'✅ 정상 — 접수 가능',주의:'⚠ 주의 — 신중 검토 필요',마감:'🚫 신청 마감 — 금일 접수 불가'}[st]||st;
  }
  const sp=document.getElementById('statPct');if(sp)sp.textContent=pct+'%';
  const su=document.getElementById('statUsed');if(su)su.textContent=used;
  const sr=document.getElementById('statRemain');if(sr)sr.textContent=remain;
}

function renderSelList(){
  const el = document.getElementById('selList');
  if(!el) return; // selList 없는 레이아웃에서는 스킵
  const dk = getDkeys()[curIdx];
  const showSites = curSite==='전체' ? SITES : [curSite];
  const holidays = getHolidays();

  // 전체 entries 수집 + 타입 분류
  const items = [];
  showSites.forEach(st => {
    Object.keys(state).forEach(startDk => {
      if(!state[startDk]||!state[startDk][st]) return;
      state[startDk][st].entries.forEach((e, idx2) => {
        const start   = new Date(e.startDate);
        const target  = new Date(dk);
        const diff    = Math.round((target - start) / 86400000);
        const lastDay = e.days - 1;

        const canOut = diff === 0;
        const canIn  = (e.days===1 && diff===0) || (e.days>1 && diff===lastDay);
        if(!canOut && !canIn) return;

        // 타입 분류
        let type;
        if(e.days===1 && canOut && canIn) type = 'type-1day';  // 1일 임대 (노란)
        else if(canIn && !canOut)          type = 'type-in';    // 입고 (회색)
        else                               type = 'type-out';   // 출고 (초록)

        items.push({e, st, startDk, idx: idx2, canOut, canIn, type});
      });
    });
  });

  // 정렬
  items.sort((a, b) => {
    // 그룹 순서: 입고(0) → 1일(1) → 출고(2)
    const order = {'type-in':0,'type-1day':1,'type-out':2};
    if(order[a.입력] !== order[b.입력]) return order[a.입력] - order[b.입력];

    // 입고: 기간 긴 순
    if(a.입력==='type-in') {
      if(a.e.days !== b.e.days) return b.e.days - a.e.days;
    }
    // 출고: 기간 짧은 순
    if(a.입력==='type-out') {
      if(a.e.days !== b.e.days) return a.e.days - b.e.days;
    }
    // 성명 가나다
    return (a.e.personName||'').localeCompare(b.e.personName||'', 'ko');
  });

  // 렌더링
  let h = '';
  items.forEach(({e, st, startDk, idx: idx2, canOut, canIn, 입력}) => {
    const entries = state[startDk][st].entries;
    const isFirst = idx2===0, isLast = idx2===entries.length-1;
    const totalMins = calcMinsForDate(e, dk);
    const daysLabel = e.days+'일';

    h += `<div class="sel-item ${입력} ${e.outDone&&e.inDone?'done':''}"
      draggable="true" data-site="${st}" data-startdk="${startDk}" data-idx="${idx2}"
      ondragstart="dragStart(event)" ondragover="dragOver(event)"
      ondrop="dragDrop(event)" ondragend="dragEnd(event)">
      <div style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
        <button class="move-btn" onclick="moveEntry('${st}',${idx2},-1,'${startDk}')"
          ${isFirst?'disabled style="opacity:.25;pointer-events:none"':''}>&#9650;</button>
        <button class="move-btn" onclick="moveEntry('${st}',${idx2},+1,'${startDk}')"
          ${isLast?'disabled style="opacity:.25;pointer-events:none"':''}>&#9660;</button>
      </div>
      <span class="sel-person" style="min-width:52px;flex-shrink:0;font-weight:700;color:#fff">👤 ${e.personName}</span>
      ${canOut ? `<label class="sel-chk out-chk">
        <input type="checkbox" ${e.outDone?'checked':''} onchange="toggleEntryCheckInline('${startDk}','${st}',${idx2},'out',this.checked)">
        <span class="sel-cb">출고</span>
      </label>` : `<span style="min-width:38px"></span>`}
      ${canIn ? `<label class="sel-chk in-chk">
        <input type="checkbox" ${e.inDone?'checked':''} onchange="toggleEntryCheckInline('${startDk}','${st}',${idx2},'in',this.checked)">
        <span class="sel-cb">입고</span>
      </label>` : `<span style="min-width:38px"></span>`}
      <span class="sel-days" style="flex-shrink:0">${daysLabel}</span>
      <span class="sel-equip" style="flex:1">${st==='본소'?'<span style="font-size:9px;font-weight:900;color:var(--본소);margin-right:3px">S</span>':'<span style="font-size:9px;font-weight:900;color:var(--북부);margin-right:3px">N</span>'}${e.equipName}${e.delivery?' 🚚':''}</span>
      ${curSite==='전체'?`<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(100,116,139,.2);color:var(--muted);flex-shrink:0">${st}</span>`:''}
      <span class="sel-mins">${totalMins}분</span>
      <button class="btn-edit" onclick="openEditModal('${startDk}','${st}',${idx2})" title="수정">✏️</button>
      <button class="btn-del" onclick="delEntry('${st}',${idx2},'${startDk}')" title="삭제">&#10005;</button>
    </div>`;
  });

  el.innerHTML = h || '<div class="empty-msg">장비를 선택 후 입력하세요</div>';
}


function toggleEntryCheckInline(startDk, site, idx, 입력, val) {
  if(!state[startDk] || !state[startDk][site]) return;
  const entry = state[startDk][site].entries[idx];
  if(!entry) return;
  if(입력 === 'out') entry.outDone = val;
  else entry.inDone = val;
  // 체크는 개별 저장 (전체 state 덮어쓰기 방지)
  saveCheck(entry.id, entry.outDone, entry.inDone);
  renderSelList();
  renderGauge();
  renderDateTabs();
  renderTriDayPanel();
}

async function saveCheck(entryId, outDone, inDone) {
  const SB_CHK = SB_URL+'/rest/v1/nong_rental_checks';
  // entry_id를 문자열로 변환 (Number 정밀도 문제 해결)
  const entryIdStr = String(entryId);
  try {
    // 먼저 있는지 확인
    const chk = await fetch(SB_CHK+'?entry_id=eq.'+entryIdStr, {headers: SB_HDR});
    const existing = await chk.json();
    if(existing.length > 0) {
      // update
      await fetch(SB_CHK+'?entry_id=eq.'+entryIdStr, {
        method: 'PATCH',
        headers: {...SB_HDR, 'Prefer': 'return=minimal'},
        body: JSON.stringify({out_done: outDone, in_done: inDone, updated_at: new Date().toISOString()})
      });
    } else {
      // insert
      await fetch(SB_CHK, {
        method: 'POST',
        headers: {...SB_HDR, 'Prefer': 'return=minimal'},
        body: JSON.stringify({entry_id: entryIdStr, out_done: outDone, in_done: inDone, updated_at: new Date().toISOString()})
      });
    }
  } catch(e) {
    console.error('saveCheck error:', e);
  }
}


// 날짜별 출고/입고/배송 카운트 계산
function getDayStats(dk, site) {
  const targetSites = site === '전체' ? ['본소','북부'] : [site];
  let outTotal=0, inTotal=0, delOut=0, delIn=0;
  let outRemain=0, inRemain=0, delOutRemain=0, delInRemain=0;

  Object.keys(state).forEach(startDk => {
    targetSites.forEach(st => {
      if(!state[startDk]||!state[startDk][st]) return;
      state[startDk][st].entries.forEach(e => {
        // 출고일: startDate (보정 없음)
        const outDk = e.startDate;
        // 입고일: startDate + (days-1) 
        // 문자열 '2024-06-02'를 파싱해서 Date 생성 (타임존 문제 해결)
        const [yr, mo, da] = (e.startDate || '').split('-').map(Number);
        const inDkD = new Date(yr, mo - 1, da + e.days - 1);
        const inDk = toLocalDk(inDkD);
        const isOut = outDk === dk;
        const isIn  = inDk === dk;
        if(!isOut && !isIn) return;

        // 총 접수 건수
        if(isOut) outTotal++;
        if(isIn)  inTotal++;
        if(isOut && e.delivery) delOut++;
        if(isIn  && e.delivery) delIn++;

        // 잔여 건수
        if(isOut && !e.outDone) outRemain++;
        if(isIn  && !e.inDone)  inRemain++;
        if(isOut && e.delivery && !e.outDone) delOutRemain++;
        if(isIn  && e.delivery && !e.inDone)  delInRemain++;
      });
    });
  });
  return {outTotal, inTotal, delOut, delIn, outRemain, inRemain, delOutRemain, delInRemain};
}
async function loadChecks() {
  const SB_CHK = SB_URL+'/rest/v1/nong_rental_checks?select=entry_id,out_done,in_done';
  try {
    const res = await fetch(SB_CHK, {headers: SB_HDR});
    if(!res.ok) return;
    const rows = await res.json();
    // 체크 데이터를 state에 반영 (문자열 매칭으로 정밀도 문제 해결)
    const checkMap = {};
    rows.forEach(r => { checkMap[String(r.entry_id)] = r; });
    Object.keys(state).forEach(dk => {
      ['본소','북부'].forEach(st => {
        if(!state[dk]||!state[dk][st]) return;
        state[dk][st].entries.forEach(e => {
          const key = String(e.id);
          if(checkMap[key]) {
            e.outDone = checkMap[key].out_done;
            e.inDone  = checkMap[key].in_done;
          }
        });
      });
    });
  } catch(e) {
    console.error('loadChecks error:', e);
  }
}


// ── 상하 이동 ──
function moveEntry(site, idx, dir, startDk) {
  const dk2 = startDk || getDkeys()[curIdx];
  if(!state[dk2] || !state[dk2][site]) return;
  const entries = state[dk2][site].entries;
  const ni = idx + dir;
  if(ni < 0 || ni >= entries.length) return;
  [entries[idx], entries[ni]] = [entries[ni], entries[idx]];
  if(saveTimer) clearTimeout(saveTimer);
  saveData();
  renderSelList();
}


// ── 드래그 앤 드롭 ──
let _dSite=null,_dIdx=null;
function dragStart(e){
  _dSite=e.currentTarget.dataset.site;
  _dIdx=parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
}
function dragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  document.querySelectorAll('.sel-item').forEach(el=>el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}
function dragDrop(e){
  e.preventDefault();
  const tSite=e.currentTarget.dataset.site;
  const tIdx=parseInt(e.currentTarget.dataset.idx);
  if(_dSite===null||_dIdx===tIdx) return;
  const dk=getDkeys()[curIdx];
  const entries=state[dk][_dSite].entries;
  const moved=entries.splice(_dIdx,1)[0];
  entries.splice(tIdx,0,moved);
  if(saveTimer) clearTimeout(saveTimer);
  saveData();
  renderSelList();
}
function dragEnd(e){
  document.querySelectorAll('.sel-item').forEach(el=>{
    el.classList.remove('dragging');
    el.classList.remove('drag-over');
  });
  _dSite=null; _dIdx=null;
}


function renderMiniTable(){
  const DATES=getDates(),DKEYS=getDkeys();
  const _mb=document.getElementById('miniBody');if(_mb)_mb.innerHTML=DKEYS.map((k,i)=>{
    const dd=DATES[i],pa=getPct(k,'전체'),pb=getPct(k,'본소'),pn=getPct(k,'북부'),sa=getStatus(pa),tod=isToday(dd);
    return '<tr class="'+(i===curIdx?'cur-row':'')+'" onclick="setIdx('+i+')"><td class="d-col'+(tod?' today-col':'')+'">'+fmtDate(dd)+(tod?' ★':'')+'</td><td style="color:var(--muted)">'+DOW[dd.getDay()]+'</td><td><span class="chip chip-'+sa+'" style="padding:1px 5px">'+pa+'%</span></td><td><span class="chip chip-'+getStatus(pb)+'" style="padding:1px 5px">'+pb+'%</span></td><td><span class="chip chip-'+getStatus(pn)+'" style="padding:1px 5px">'+pn+'%</span></td><td><span class="chip chip-'+sa+'" style="padding:1px 5px">'+sa+'</span></td></tr>';
  }).join('');
}

function resetDay(){
  const dk=getDkeys()[curIdx];
  const showSites=curSite==='전체'?SITES:[curSite];
  showSites.forEach(st=>state[dk][st].entries=[]);
  scheduleSave();renderAll();
}

// 드롭다운 외부 클릭 닫기
document.addEventListener('click',e=>{
  if(!document.getElementById('searchWrap').contains(e.target)){
    document.getElementById('dropdown').classList.remove('open');
  }
});


