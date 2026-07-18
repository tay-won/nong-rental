// 기상청 API 연동 (금일 기상상황 포함)
// ═══ 금일 기상상황 함수 ═══
function openWeatherBriefing() {
  const popup = document.getElementById('weatherBriefingPopup');
  const select = document.getElementById('weatherTownSelect');
  
  // 드롭다운 초기화
  select.innerHTML = '<option value="">📍 읍면동 선택</option>';
  PAJU_DONG_COORDS.forEach((town, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = town.name;
    select.appendChild(opt);
  });
  
  popup.classList.remove('hidden');
  document.getElementById('weatherContent').innerHTML = '📍 읍면동을 선택해주세요.';
}

function closeWeatherBriefing() {
  document.getElementById('weatherBriefingPopup').classList.add('hidden');
}

// 날씨 드롭다운 변경 이벤트
document.addEventListener('change', (e) => {
  if (e.target.id === 'weatherTownSelect') {
    const idx = e.target.value;
    if (idx !== '') {
      const town = PAJU_DONG_COORDS[idx];
      loadWeatherBriefing(town.nx, town.ny, town.name);
    }
  }
});

// 외부 클릭 닫기 (기상상황)
document.addEventListener('click', e => {
  const popup = document.getElementById('weatherBriefingPopup');
  if (!popup.classList.contains('hidden') && e.target === popup) closeWeatherBriefing();
});

async function loadWeatherBriefing(nx, ny, townName) {
  const contentDiv = document.getElementById('weatherContent');
  contentDiv.innerHTML = '🔄 기상정보 불러오는 중…';
  
  try {
    // 당일 날씨 가져오기
    const today = new Date();
    const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
    
    // 1주일 예보 가져오기
    let html = `<div style="padding:16px">`;
    html += `<h3 style="color:#fff;margin-bottom:16px;font-size:16px">📍 ${townName}</h3>`;
    
    // 금일 날씨
    const todayData = await fetchWeatherForDate(nx, ny, todayStr);
    if (todayData) {
      const temp = todayData.tmp || '–';
      const pty = ptyLabel(todayData.pty);
      const rn1 = (todayData.rn1 && todayData.rn1 !== '강수없음') ? todayData.rn1 : '0';
      const hmd = todayData.reh || '–';
      const wsd = todayData.wsd || '–';
      
      html += `<div style="background:rgba(59,130,246,.1);border-left:3px solid #3b82f6;padding:12px;margin-bottom:16px;border-radius:8px">
        <div style="font-weight:700;color:#fff;margin-bottom:8px;font-size:14px">📊 금일 기상</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
          <div><span style="color:var(--muted)">기온</span>: <strong style="color:#fff">${temp}°C</strong></div>
          <div><span style="color:var(--muted)">강수형태</span>: <strong style="color:#fff">${pty}</strong></div>
          <div><span style="color:var(--muted)">시간강수량</span>: <strong style="color:#fff">${rn1}mm</strong></div>
          <div><span style="color:var(--muted)">습도</span>: <strong style="color:#fff">${hmd}%</strong></div>
          <div><span style="color:var(--muted)">풍속</span>: <strong style="color:#fff">${wsd}m/s</strong></div>
        </div>
      </div>`;
    } else {
      html += `<div style="color:var(--muted);padding:8px 0;font-size:12px">금일 예보 정보를 가져올 수 없습니다.</div>`;
    }
    
    // 1주일 예보
    html += `<div style="font-weight:700;color:#fff;margin-bottom:12px;font-size:14px">📅 1주일 예보</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:10px">`;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + String(date.getDate()).padStart(2,'0');
      const dateLabel = i === 0 ? '오늘' : i === 1 ? '내일' : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      
      const dayData = await fetchWeatherForDate(nx, ny, dateStr);
      if (dayData) {
        const tMax = dayData.tmx || dayData.tmp || '–';
        const tMin = dayData.tmn || '';
        const tempLabel = tMin ? `${tMin}° / ${tMax}°` : `${tMax}°`;
        const p = ptyLabel(dayData.pty);
        
        html += `<div style="background:var(--surface);border:1px solid var(--border);padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${dateLabel}</div>
          <div style="font-weight:700;color:#fff;margin-bottom:4px">${tempLabel}</div>
          <div style="font-size:10px;color:var(--muted)">${p}</div>
        </div>`;
      } else {
        html += `<div style="background:var(--surface);border:1px solid var(--border);padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${dateLabel}</div>
          <div style="font-size:10px;color:var(--muted)">예보 범위 밖</div>
        </div>`;
      }
    }
    
    html += `</div></div>`;
    contentDiv.innerHTML = html;
  } catch (err) {
    console.error('기상정보 조회 실패:', err);
    contentDiv.innerHTML = `<div style="color:var(--red);padding:16px">기상정보를 불러올 수 없습니다.</div>`;
  }
}

// 팝업 외부 클릭 닫기
document.addEventListener('click', e => {
  const popup = document.getElementById('inoutPopup');
  if (!popup.classList.contains('hidden') && e.target === popup) closePopup();
});


// 로그인 버튼 이벤트
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('loginBtn');
  if(btn) btn.addEventListener('click', saveToken);
  
  var inp1 = document.getElementById('tokenInp');
  var inp2 = document.getElementById('ghTokenInp');
  if(inp1) inp1.addEventListener('keydown', function(e){ if(e.key==='Enter') saveToken(); });
  if(inp2) inp2.addEventListener('keydown', function(e){ if(e.key==='Enter') saveToken(); });
});
window.addEventListener('resize', () => {
  clearTimeout(window._resizeTimer);
  window._resizeTimer = setTimeout(() => renderTriDayPanel(), 150);
});

async function saveCheck(entryId, outDone, inDone) {
  const SB_CHK = SB_URL+'/rest/v1/nong_rental_checks';
  const entryIdStr = String(entryId);
  try {
    const chk = await fetch(SB_CHK+'?entry_id=eq.'+entryIdStr, {headers: SB_HDR});
    const existing = await chk.json();
    if(existing.length > 0) {
      await fetch(SB_CHK+'?entry_id=eq.'+entryIdStr, {
        method: 'PATCH',
        headers: {...SB_HDR, 'Prefer': 'return=minimal'},
        body: JSON.stringify({out_done: outDone, in_done: inDone, updated_at: new Date().toISOString()})
      });
    } else {
      await fetch(SB_CHK, {
        method: 'POST',
        headers: {...SB_HDR, 'Prefer': 'return=minimal'},
        body: JSON.stringify({entry_id: entryIdStr, out_done: outDone, in_done: inDone, updated_at: new Date().toISOString()})
      });
    }
  } catch(e) { console.error('saveCheck error:', e); }
}

async function loadChecks() {
  const SB_CHK = SB_URL+'/rest/v1/nong_rental_checks?select=entry_id,out_done,in_done';
  try {
    const res = await fetch(SB_CHK, {headers: SB_HDR});
    if(!res.ok) return;
    const rows = await res.json();
    const checkMap = {};
    rows.forEach(r => { checkMap[String(r.entry_id)] = r; });
    Object.keys(state).forEach(dk => {
      ['본소','북부'].forEach(st => {
        if(!state[dk]||!state[dk][st]) return;
        state[dk][st].entries.forEach(e => {
          if(checkMap[String(e.id)]) {
            e.outDone = checkMap[String(e.id)].out_done;
            e.inDone  = checkMap[String(e.id)].in_done;
          }
        });
      });
    });
  } catch(e) { console.error('loadChecks error:', e); }
}

// ═══ 기상청 API 연동 — 함수 (저장하지 않고 매번 실시간 조회) ═══
function initDongSelect() {
  const sel = document.getElementById('dongSelect');
  if (!sel) return;
  PAJU_DONG_COORDS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name; opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

function getKmaBaseDateTime() {
  const now = new Date();
  const times = [2, 5, 8, 11, 14, 17, 20, 23];
  let h = now.getHours(); let m = now.getMinutes();
  let candidates = times.filter(t => t < h || (t === h && m >= 10));
  let baseDate = new Date(now); let baseHour;
  if (candidates.length === 0) { baseDate.setDate(baseDate.getDate() - 1); baseHour = 23; }
  else { baseHour = candidates[candidates.length - 1]; }
  const y = baseDate.getFullYear();
  const mo = String(baseDate.getMonth() + 1).padStart(2, '0');
  const da = String(baseDate.getDate()).padStart(2, '0');
  return { base_date: `${y}${mo}${da}`, base_time: String(baseHour).padStart(2, '0') + '00' };
}

async function fetchWeatherForDate(nx, ny, targetDateStr) {
  try {
    const { base_date, base_time } = getKmaBaseDateTime();
    const url = `${KMA_BASE_URL}?serviceKey=${encodeURIComponent(KMA_SERVICE_KEY)}`
      + `&numOfRows=1000&pageNo=1&dataType=JSON`
      + `&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const items = json?.response?.body?.items?.item || [];
    const targetItems = items.filter(it => it.fcstDate === targetDateStr);
    if (targetItems.length === 0) return null;
    const pick = (cat) => {
      const arr = targetItems.filter(it => it.category === cat);
      if (arr.length === 0) return null;
      const noon = arr.find(it => it.fcstTime === '1200');
      return (noon || arr[0]).fcstValue;
    };
    return { pty: pick('PTY'), sky: pick('SKY'), tmx: pick('TMX'), tmn: pick('TMN'), wsd: pick('WSD'), tmp: pick('TMP'), reh: pick('REH'), rn1: pick('RN1') };
  } catch (e) { console.error('날씨 조회 실패:', e); return null; }
}

function ptyLabel(pty) {
  const map = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
  return map[String(pty)] || '정보없음';
}

async function checkWeatherBeforeEntry(startDateStr) {
  const dongSel = document.getElementById('dongSelect');
  const dongName = dongSel ? dongSel.value : '';
  const coord = PAJU_DONG_COORDS.find(d => d.name === dongName) || SITE_COORDS['본소'];
  const targetDateStr = startDateStr.replace(/-/g, '');
  const w = await fetchWeatherForDate(coord.nx, coord.ny, targetDateStr);
  if (!w) return true;
  const isRainOrSnow = w.pty && w.pty !== '0';
  const isWindy = w.wsd && parseFloat(w.wsd) >= 8;
  if (isRainOrSnow || isWindy) {
    const reasons = [];
    if (isRainOrSnow) reasons.push(`강수(${ptyLabel(w.pty)})`);
    if (isWindy) reasons.push(`강풍(풍속 ${w.wsd}m/s)`);
    const msg = `⚠️ 임대일 예보: ${reasons.join(', ')}\n\n`
      + `해당 지역(${dongName || '기본 지역'})의 작업 조건이 좋지 않을 수 있습니다.\n`
      + `그래도 이 날짜로 임대를 진행하시겠습니까?\n`
      + `(취소를 누르면 다른 날짜로 다시 선택해주세요)`;
    return window.confirm(msg);
  }
  return true;
}

async function renderSafetyChecklist() {
  const body = document.getElementById('safetyChecklistBody');
  if (!body) return;
  const site = (curSite === '전체') ? '본소' : curSite;
  const coord = SITE_COORDS[site];
  const dk = getDkeys()[curIdx];
  const targetDateStr = dk.replace(/-/g, '');
  body.textContent = '날씨 정보를 불러오는 중…';
  const w = await fetchWeatherForDate(coord.nx, coord.ny, targetDateStr);
  if (!w) { body.innerHTML = `<span style="color:#1a1a1a">이 날짜는 예보 범위를 벗어나 날씨 정보를 제공할 수 없습니다.</span>`; return; }
  const items = [];
  const isRainOrSnow = w.pty && w.pty !== '0';
  const isWindy = w.wsd && parseFloat(w.wsd) >= 8;
  const isHot = w.tmx && parseFloat(w.tmx) >= 33;
  const isCold = w.tmn && parseFloat(w.tmn) <= -10;
  if (isRainOrSnow) {
    items.push(`🌧️ 강수(${ptyLabel(w.pty)}) 예보 — 출고 대상 농기계 덮개(우비) 준비 확인`);
  }
  if (isWindy) items.push(`💨 강풍(풍속 ${w.wsd}m/s) 예보 — 적재·고정 상태 재확인, 대형 장비 상하차 시 주의`);
  if (isHot) items.push(`🥵 폭염 예보(최고 ${w.tmx}℃) — 정비인력 온열질환 예방(수분 섭취, 휴식시간 확보) 안내`);
  if (isCold) items.push(`🥶 한파 예보(최저 ${w.tmn}℃) — 배터리·유압라인 결빙 여부 사전 점검`);
  if (items.length === 0) items.push(`✅ 특이 기상 조건 없음 — 정상 출고 절차 진행`);
  body.innerHTML = `
    <div style="margin-bottom:8px;padding:8px;background:#ffffff;border-radius:6px;font-size:11px;color:#000;border:1px solid #cbd5e1;font-weight:500">
      <strong>${site}</strong> · 하늘상태 ${w.sky==='1'?'맑음':w.sky==='3'?'구름많음':w.sky==='4'?'흐림':'-'} · 기온 ${w.tmn||'-'}~${w.tmx||'-'}℃ · 풍속 ${w.wsd||'-'}m/s
    </div>
    <ul style="margin:0;padding-left:16px;color:#000">${items.map(t => `<li style="margin-bottom:4px;font-weight:500">${t}</li>`).join('')}</ul>
  `;
}

