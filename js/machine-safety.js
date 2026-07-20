// 농기계 안전정보 (농사로 agriAccident + machineSafety API, Supabase Edge Function 경유)
const NONGSARO_PROXY_URL = 'https://wddtagovsimavguvlrzr.supabase.co/functions/v1/nongsaro-proxy';

let _accidentCache = null;   // 농업기계 사고사례 (183건, 사고 제목+경위)
let _accidentLoading = null;
let _guideCache = null;      // 농기계 안전이용 지침 (56건, 안전수칙)
let _guideLoading = null;

async function fetchNongsaro(serviceName, operationName, numOfRows) {
  const res = await fetch(NONGSARO_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName, operationName, params: { numOfRows: String(numOfRows), pageNo: '1' } }),
  });
  const data = await res.json();
  return (data && data.items) || [];
}

async function loadAccidentData() {
  if (_accidentCache) return _accidentCache;
  if (_accidentLoading) return _accidentLoading;
  _accidentLoading = fetchNongsaro('agriAccident', 'agriAccidentLst', 200)
    .then(items => { _accidentCache = items; return items; })
    .catch(err => { console.warn('농업기계 사고사례 로드 실패:', err.message); _accidentCache = []; return []; });
  return _accidentLoading;
}

async function loadGuideData() {
  if (_guideCache) return _guideCache;
  if (_guideLoading) return _guideLoading;
  _guideLoading = fetchNongsaro('machineSafety', 'machineSafetyLst', 100)
    .then(items => { _guideCache = items; return items; })
    .catch(err => { console.warn('농기계 안전이용 지침 로드 실패:', err.message); _guideCache = []; return []; });
  return _guideLoading;
}

function findAccidentCases(equipName) {
  if (!_accidentCache || !equipName) return [];
  return _accidentCache.filter(item => item.knmcCodeNm && equipName.includes(item.knmcCodeNm));
}

function findSafetyGuides(equipName) {
  if (!_guideCache || !equipName) return [];
  // knmcNm이 "경운기 또는 관리기"처럼 복수 기종을 "또는"으로 묶어둔 경우가 있어 분리해서 매칭
  return _guideCache.filter(item => {
    if (!item.knmcNm || item.knmcNm === '공통사항') return false;
    return item.knmcNm.split('또는').some(k => equipName.includes(k.trim()));
  });
}

async function showMachineSafetyInfo(equipName) {
  const panel = document.getElementById('machineSafetyPanel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.innerHTML = '';

  await Promise.all([loadAccidentData(), loadGuideData()]);
  const accidents = findAccidentCases(equipName).slice(0, 2);
  const guides = findSafetyGuides(equipName).slice(0, 1);
  if (accidents.length === 0 && guides.length === 0) return;

  const accidentHtml = accidents.map(c => `
    <div style="margin-bottom:6px">
      <div style="font-weight:700;color:var(--yellow)">⚠️ ${c.cntntsSj || ''}</div>
      ${c.smmInfo ? `<div style="color:var(--text);margin-top:2px">${c.smmInfo}</div>` : ''}
    </div>
  `).join('');
  const guideHtml = guides.map(g => `
    <div style="margin-bottom:6px">
      <div style="font-weight:700;color:var(--blue)">📋 안전수칙 — ${g.cntntsSj || ''}</div>
      ${g.cn ? `<div style="color:var(--text);margin-top:2px;white-space:pre-line">${g.cn}</div>` : ''}
    </div>
  `).join('');

  panel.innerHTML = accidentHtml + guideHtml;
  panel.style.display = 'block';
}

function hideMachineSafetyInfo() {
  const panel = document.getElementById('machineSafetyPanel');
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}
