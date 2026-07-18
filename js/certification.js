// 친환경/GAP 인증 조회
// ═══ 친환경/GAP 인증 조회 (파일 기반) ═══
async function queryCertification() {
  const query = document.getElementById('certFarmName').value.trim();
  
  if (!query) {
    alert('농가명, 인증번호, 대표자를 입력하세요.');
    return;
  }
  
  const searchTerm = query.replace(/\s+/g, '');
  console.log(`🔍 검색: "${query}"`);
  
  // 친환경 검색 (생산자 + 인증번호 모두)
  const ecoResults = CERT_DATABASE.eco.filter(item => {
    const producer = (item.생산자 || '').trim();
    const certNo = (item.인증번호 || '').trim();
    
    // 생산자 검색
    if (producer === query || producer.includes(query)) return true;
    if (producer.replace(/\s+/g, '').includes(searchTerm)) return true;
    
    // 인증번호 검색
    if (certNo === query || certNo.includes(query)) return true;
    if (certNo.replace(/\s+/g, '').includes(searchTerm)) return true;
    
    return false;
  });
  
  // GAP 검색 (생산자 + 인증번호 + 대표자 모두)
  const gapResults = CERT_DATABASE.gap.filter(item => {
    const producer = (item.생산자 || '').trim();
    const certNo = (item.인증번호 || '').trim();
    const representative = (item.대표자 || '').trim();
    
    // 생산자 검색
    if (producer === query || producer.includes(query)) return true;
    if (producer.replace(/\s+/g, '').includes(searchTerm)) return true;
    
    // 인증번호 검색
    if (certNo === query || certNo.includes(query)) return true;
    if (certNo.replace(/\s+/g, '').includes(searchTerm)) return true;
    
    // 대표자 검색
    if (representative === query || representative.includes(query)) return true;
    if (representative.replace(/\s+/g, '').includes(searchTerm)) return true;
    
    return false;
  });
  
  console.log(`✅ 친환경: ${ecoResults.length}건, GAP: ${gapResults.length}건`);
  
  // 결과 표시
  displayCertResults(query, ecoResults, gapResults);
  
  // 통계 업데이트
  updateCertStats(ecoResults, gapResults);
}

function filterPajuData(data, addressField) {
  if (!data || !Array.isArray(data)) return [];
  return data;  // 이미 파주시 데이터만 있음
}

function parseXml(xmlStr) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length) return [];
    
    const rows = xmlDoc.querySelectorAll('row');
    const result = [];
    rows.forEach(row => {
      result.push({
        apprNo: row.querySelector('APPR_NO')?.textContent || '',
        apprKnd: row.querySelector('APPR_KND_NM')?.textContent || '',
        farmhs: row.querySelector('APPR_FRMHS')?.textContent || '',
        prdlst: row.querySelector('APPR_PRDLST_NM')?.textContent || '',
        bgnde: row.querySelector('APPR_BGNDE')?.textContent || '',
        endde: row.querySelector('APPR_ENDDE')?.textContent || '',
        orgnNatNm: row.querySelector('CTVT_WRKSHP_AR_BRD_CO')?.textContent || '',
        area: row.querySelector('CTVT_WRKSHP_AR_BRD_CO')?.textContent || '',
        qty: row.querySelector('PRDCTN_INCME_PLAN_QY')?.textContent || ''
      });
    });
    return result;
  } catch (e) {
    console.error('XML 파싱 오류:', e);
    return [];
  }
}

function displayCertResults(farmName, ecoData, gapData) {
  const resultDiv = document.getElementById('certResult');
  const today = new Date();
  const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
  
  let html = '<div style="line-height:1.6;font-size:9px">';
  
  // 친환경 인증 결과
  if (ecoData && ecoData.length > 0) {
    html += `<div style="margin-bottom:6px">
      <div style="font-weight:700;color:#fff;margin-bottom:4px;font-size:10px">🌾 친환경 (${ecoData.length}건)</div>`;
    ecoData.forEach(e => {
      const endDate = e.만료일 || '미정';
      html += `<div style="background:rgba(34,197,94,.1);border-left:2px solid #22c55e;padding:6px;margin-bottom:3px;border-radius:2px;font-size:9px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
        <strong>${e.생산자}</strong> • ${e.품목} • ${e.분류} • 만료: ${endDate}
      </div>`;
    });
    html += '</div>';
  }
  
  // GAP 인증 결과
  if (gapData && gapData.length > 0) {
    html += `<div>
      <div style="font-weight:700;color:#fff;margin-bottom:4px;font-size:10px">🏆 GAP (${gapData.length}건)</div>`;
    gapData.forEach(g => {
      html += `<div style="background:rgba(59,130,246,.1);border-left:2px solid #3b82f6;padding:6px;margin-bottom:3px;border-radius:2px;font-size:9px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
        <strong>${g.생산자}</strong> • ${g.품목} • 인증: ${g.인증일} • 대표: ${g.대표자 || '-'}
      </div>`;
    });
    html += '</div>';
  }
  
  if (ecoData.length === 0 && gapData.length === 0) {
    html += '<div style="color:var(--muted);font-size:9px">🔍 검색 결과가 없습니다.</div>';
  }
  
  html += '</div>';
  resultDiv.innerHTML = html;
}

function updateCertStats(ecoData, gapData) {
  const today = new Date();
  const todayStr = today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0');
  const after30 = new Date(today.getTime() + 30 * 86400000);
  const after30Str = after30.getFullYear() + String(after30.getMonth()+1).padStart(2,'0') + String(after30.getDate()).padStart(2,'0');
  
  let ecoValid = 0, gapValid = 0, expiring = 0;
  
  if (ecoData && Array.isArray(ecoData)) {
    ecoValid = ecoData.length;
    expiring += ecoData.filter(e => {
      const endStr = (e.만료일 || '').replace(/\./g, '');
      return endStr >= todayStr && endStr <= after30Str;
    }).length;
  }
  
  if (gapData && Array.isArray(gapData)) {
    gapValid = gapData.length;
  }
  
  document.getElementById('ecoCount').textContent = ecoValid + '건';
  document.getElementById('gapCount').textContent = gapValid + '건';
  document.getElementById('expiringCount').textContent = `만료예정: ${expiring} 건`;
}

