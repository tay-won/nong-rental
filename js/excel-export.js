// 엑셀 리포트 다운로드
// ═══ 엑셀 리포트 다운로드 (필터링 포함) ═══
function downloadReport(){
  // 필터링 모달 표시
  showExportFilterModal();
}

function showExportFilterModal(){
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000`;
  
  const today = new Date();
  const [currentY, currentM] = [today.getFullYear(), today.getMonth() + 1];
  
  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,.3)">
      <h3 style="margin-bottom:16px;color:#fff;font-size:16px">📊 엑셀 다운로드 범위 선택</h3>
      
      <div style="margin-bottom:16px">
        <label style="display:block;margin-bottom:8px;color:var(--dim);font-size:12px">다운로드 범위</label>
        <select id="exportRange" style="width:100%;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:#fff;font-family:'Noto Sans KR',sans-serif">
          <option value="all">📅 전체 데이터 (모든 기간)</option>
          <option value="3months">최근 3개월</option>
          <option value="6months">최근 6개월</option>
          <option value="1year">최근 1년</option>
          <option value="custom">📆 특정 월 선택</option>
        </select>
      </div>
      
      <div id="customMonthDiv" style="display:none;margin-bottom:16px">
        <label style="display:block;margin-bottom:8px;color:var(--dim);font-size:12px">시작 연월</label>
        <input type="month" id="exportStartMonth" value="${currentY}-${String(currentM).padStart(2,'0')}" style="width:100%;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:#fff;font-family:'Noto Sans KR',sans-serif">
        <label style="display:block;margin-top:8px;margin-bottom:8px;color:var(--dim);font-size:12px">종료 연월</label>
        <input type="month" id="exportEndMonth" value="${currentY}-${String(currentM).padStart(2,'0')}" style="width:100%;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:#fff;font-family:'Noto Sans KR',sans-serif">
      </div>
      
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="this.closest('div').parentElement.parentElement.remove()" style="padding:8px 16px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--dim);cursor:pointer;font-family:'Noto Sans KR',sans-serif">취소</button>
        <button onclick="executeExportReport()" style="padding:8px 16px;background:var(--accent);border:none;border-radius:6px;color:#fff;cursor:pointer;font-family:'Noto Sans KR',sans-serif;font-weight:700">다운로드</button>
      </div>
    </div>
  `;
  
  const rangeSelect = modal.querySelector('#exportRange');
  const customDiv = modal.querySelector('#customMonthDiv');
  
  rangeSelect.addEventListener('change', (e) => {
    customDiv.style.display = e.target.value === 'custom' ? 'block' : 'none';
  });
  
  document.body.appendChild(modal);
}

function executeExportReport(){
  const range = document.querySelector('#exportRange')?.value || 'all';
  let startDk, endDk;
  const today = new Date();
  endDk = toLocalDk(today);
  
  // 범위 결정
  switch(range) {
    case '3months':
      startDk = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      break;
    case '6months':
      startDk = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      break;
    case '1year':
      startDk = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      break;
    case 'custom':
      const startM = document.querySelector('#exportStartMonth')?.value;
      const endM = document.querySelector('#exportEndMonth')?.value;
      startDk = startM + '-01';
      endDk = endM ? new Date(endM + '-01') : today;
      endDk = toLocalDk(endDk);
      break;
    default: // all
      startDk = '2000-01-01'; // 모든 데이터
  }
  
  if(typeof startDk !== 'string') startDk = toLocalDk(startDk);
  
  // 모달 닫기
  document.querySelector('div[style*="position:fixed"]')?.remove();
  
  // 실제 다운로드 실행
  performExport(startDk, endDk);
}

function performExport(startDk, endDk){
  // 날짜 범위 필터링
  const allDates = Object.keys(state).sort();
  const filteredDates = allDates.filter(dk => dk >= startDk && dk <= endDk);
  
  const DOW2 = ['일','월','화','수','목','금','토'];

  // ── 시트1: 일자별 부하 현황 ──
  let s1 = '날짜,요일,전체부하율(%),전체상태,본소부하율(%),본소상태,북부부하율(%),북부상태,전체소요(분),본소소요(분),북부소요(분),전체가용(분),본소가용(분),북부가용(분)\n';
  filteredDates.forEach(dk => {
    ensureDay(dk);
    const d = new Date(dk);
    const pa = getPct(dk,'전체'), pb = getPct(dk,'본소'), pn = getPct(dk,'북부');
    const ua = getUsed(dk,'전체'), ub = getUsedSite(dk,'본소'), un = getUsedSite(dk,'북부');
    const aa = getAvail(dk,'전체'), ab = getAvailSite(dk,'본소'), an = getAvailSite(dk,'북부');
    s1 += [
      (d.getMonth()+1)+'/'+d.getDate(),
      DOW2[d.getDay()]+'요일',
      pa, getStatus(pa),
      pb, getStatus(pb),
      pn, getStatus(pn),
      ua, ub, un,
      aa, ab, an
    ].join(',') + '\n';
  });

  // ── 시트2: 임대 건수 상세 ──
  let s2 = '날짜,사업소,장비명,성명,임대기간(일),시작일,소요시간(분),출고완료,입고완료\n';
  filteredDates.forEach(startDk => {
    ['본소','북부'].forEach(st => {
      if(!state[startDk] || !state[startDk][st]) return;
      const d2 = new Date(startDk);
      state[startDk][st].entries.forEach(e => {
        s2 += [
          (d2.getMonth()+1)+'/'+d2.getDate(),
          st,
          '"'+(e.equipName||'')+ '"',
          e.personName||'',
          e.days||1,
          e.startDate||startDk,
          e.baseMins||0,
          e.outDone?'완료':'미완',
          e.inDone?'완료':'미완'
        ].join(',') + '\n';
      });
    });
  });

  // ── 시트3: 기종별 집계 ──
  const typeMap = {};
  filteredDates.forEach(startDk => {
    ['본소','북부'].forEach(st => {
      if(!state[startDk] || !state[startDk][st]) return;
      state[startDk][st].entries.forEach(e => {
        const key = (e.equipName||'') + '|' + st;
        if(!typeMap[key]) typeMap[key] = {name:e.equipName||'', site:st, cnt:0, totalMins:0};
        typeMap[key].cnt += 1;
        typeMap[key].totalMins += e.baseMins||0;
      });
    });
  });
  let s3 = '기종명,사업소,총건수,총정비시간(분),총정비시간(h)\n';
  Object.values(typeMap).sort((a,b)=>b.cnt-a.cnt).forEach(r => {
    s3 += ['"'+r.name+'"', r.site, r.cnt, r.totalMins, (r.totalMins/60).toFixed(1)].join(',') + '\n';
  });

  // ── 시트4: 취소 이력 ──
  let s4b = '취소일시,취소사유,장비명,성명,임대기간(일),시작일,사업소,소요시간(분),배송\n';
  (state._cancelled || []).forEach(c => {
    const dt = new Date(c.cancelledAt);
    const dtStr = (dt.getMonth()+1)+'/'+dt.getDate()+' '+ dt.getHours()+':'+String(dt.getMinutes()).padStart(2,'0');
    s4b += [dtStr, c.reason, '"'+(c.equipName||'')+'"', c.personName||'', c.days||1, c.startDate||'', c.site||'', c.baseMins||0, c.delivery?'배송':''].join(',') + '\n';
  });

  // 우천일 시트
  let s5 = '우천일\n' + getRainy().sort().join('\n');

  // ── 파일 다운로드 ──
  const dateStr = toLocalDk(new Date());
  const files = [
    {name: `농기계임대현황_일자별부하_${dateStr}.csv`, content: '\uFEFF'+s1},
    {name: `농기계임대현황_임대상세_${dateStr}.csv`,   content: '\uFEFF'+s2},
    {name: `농기계임대현황_기종별집계_${dateStr}.csv`, content: '\uFEFF'+s3},
    {name: `농기계임대현황_취소이력_${dateStr}.csv`,   content: '\uFEFF'+s4b},
    {name: `농기계임대현황_우천일_${dateStr}.csv`,     content: '\uFEFF'+s5},
  ];

  files.forEach(f => {
    const blob = new Blob([f.content], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = f.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}


function scheduleSave(){
  if(!GH_TOKEN) return;if(saveTimer)clearTimeout(saveTimer);setSyncUI('saving','변경됨…');saveTimer=setTimeout(saveData,1000);}

