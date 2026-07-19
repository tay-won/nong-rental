// 농기계 안전정보 (농사로 machineVod API, Supabase Edge Function 경유)
const NONGSARO_PROXY_URL = 'https://wddtagovsimavguvlrzr.supabase.co/functions/v1/nongsaro-proxy';

let _machineSafetyCache = null; // 전체 32건 캐시 (한 번만 불러옴)
let _machineSafetyLoading = null;

async function loadMachineSafetyData() {
  if (_machineSafetyCache) return _machineSafetyCache;
  if (_machineSafetyLoading) return _machineSafetyLoading;
  _machineSafetyLoading = fetch(NONGSARO_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: 'machineVod',
      operationName: 'machineVodAniLst',
      params: { numOfRows: '50', pageNo: '1' },
    }),
  })
    .then(res => res.json())
    .then(data => {
      _machineSafetyCache = (data && data.items) || [];
      return _machineSafetyCache;
    })
    .catch(err => {
      console.warn('농기계 안전정보 로드 실패:', err.message);
      _machineSafetyCache = [];
      return _machineSafetyCache;
    });
  return _machineSafetyLoading;
}

function findMachineSafetyCases(equipName) {
  if (!_machineSafetyCache || !equipName) return [];
  return _machineSafetyCache.filter(item => item.knmcNm && equipName.includes(item.knmcNm));
}

async function showMachineSafetyInfo(equipName) {
  const panel = document.getElementById('machineSafetyPanel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.innerHTML = '';

  await loadMachineSafetyData();
  const cases = findMachineSafetyCases(equipName).slice(0, 2);
  if (cases.length === 0) return;

  panel.innerHTML = cases.map(c => `
    <div style="margin-bottom:6px">
      <div style="font-weight:700;color:var(--yellow)">⚠️ ${c.cntntsSj || ''}</div>
      ${c.atpnCn ? `<div style="color:var(--text);margin-top:2px;white-space:pre-line">${c.atpnCn}</div>` : ''}
    </div>
  `).join('');
  panel.style.display = 'block';
}

function hideMachineSafetyInfo() {
  const panel = document.getElementById('machineSafetyPanel');
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}
