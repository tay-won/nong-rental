// GitHub(Supabase Edge Function 경유) 데이터 저장/불러오기
// ─── Supabase ───
const SB_URL='https://wddtagovsimavguvlrzr.supabase.co';
const SB_KEY='sb_publishable_7lAcbxdOEZQUGk3ioBMP3w_G7Ejh-uf';
const SB_API=SB_URL+'/rest/v1/nong_rental';
const SB_HDR={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};

function setSyncUI(mode,msg){document.getElementById('sdot').className='sdot '+mode;document.getElementById('stxt').textContent=msg;}

async function loadData(){
  if(!checkToken()) return;
  setSyncUI('saving','불러오는 중…');
  document.getElementById('loadingOverlay').classList.remove('hidden');
  try{
    const res = await fetch(SB_API+'?id=eq.main&select=data,updated_at', {headers:SB_HDR});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const rows = await res.json();
    const raw = rows.length > 0 ? rows[0].data : null;
    
    // 낙관적 잠금: updated_at 저장
    if(rows.length > 0 && rows[0].updated_at) {
      lastUpdatedAt = rows[0].updated_at;
    }
    
    if(!raw || Object.keys(raw).length === 0){
      initState();
      setSyncUI('ok','첫 실행 — 입력 후 자동 저장됩니다');
    } else {
      let decoded, savedHolidays = [];
      if(raw.state && typeof raw.state === 'object'){
        decoded = raw.state;
        savedHolidays = raw.holidays || [];
      } else {
        decoded = raw;
      }
      if(savedHolidays.length > 0) saveHolidays(savedHolidays);
      if(raw.rainy && raw.rainy.length > 0) saveRainy(raw.rainy);
      if(raw.cancelled && Array.isArray(raw.cancelled)) state._cancelled = raw.cancelled;
      initState();
      Object.keys(decoded).forEach(dk => {
        ensureDay(dk);
        ['본소','북부'].forEach(st => {
          if(!decoded[dk]||!decoded[dk][st]) return;
          const src=decoded[dk][st];
          if(src.workers) Object.keys(src.workers).forEach(wid=>{state[dk][st].workers[wid]=src.workers[wid];});
          if(Array.isArray(src.entries)) state[dk][st].entries=src.entries;
          if(src.delivery!==undefined) state[dk][st].delivery=src.delivery;
        });
      });
      setSyncUI('ok','동기화 완료 · '+new Date().toLocaleTimeString('ko-KR'));
    }
  } catch(e){
    setSyncUI('err','불러오기 실패: '+e.message);
  } finally {
    document.getElementById('loadingOverlay').classList.add('hidden');
  }
  await loadChecks();
  initDongSelect();  // 기상청 API - 지역 선택 초기화
  renderAll();
  setTimeout(()=>renderTriDayPanel(),300);
}

let isSaving=false, pendingSave=false;

async function saveData(){
  if(!GH_TOKEN){setSyncUI('idle','로그인 필요');return;}
  if(isSaving){pendingSave=true;return;}
  isSaving=true;
  setSyncUI('saving','저장 중…');
  
  const payload={
    state:JSON.parse(JSON.stringify(state)),
    holidays:getHolidays(),
    rainy:getRainy(),
    cancelled:state._cancelled||[]
  };
  
  let retries = 3;
  let success = false;
  
  while(retries > 0 && !success) {
    try{
      // 낙관적 잠금: 조건부 업데이트
      const condition = lastUpdatedAt 
        ? `?id=eq.main&updated_at=eq.${encodeURIComponent(lastUpdatedAt)}`
        : '?id=eq.main';
      
      const newUpdatedAt = new Date().toISOString();
      const res = await fetch(SB_API + condition, {
        method:'PATCH',
        headers:{...SB_HDR,'Prefer':'return=representation'},
        body:JSON.stringify({data:payload, updated_at:newUpdatedAt})
      });
      
      if(!res.ok) {
        // 406 = 조건부 업데이트 실패 (동시 수정 감지)
        if(res.status === 406 || res.status === 412) {
          addDebugLog(`⚠️ 동시 수정 감지 (시도 ${4-retries}/3)`);
          
          // 최신 데이터 다시 로드
          const reloadRes = await fetch(SB_API+'?id=eq.main&select=data,updated_at', {headers:SB_HDR});
          if(!reloadRes.ok) throw new Error('재로드 실패: HTTP '+reloadRes.status);
          
          const rows = await reloadRes.json();
          if(rows.length > 0) {
            const serverData = rows[0].data;
            const serverUpdatedAt = rows[0].updated_at;
            
            const serverDates = Object.keys(serverData.state || {});
            const localDates = Object.keys(state);
            addDebugLog(`[병합] 서버: ${serverDates.length}개, 로컬: ${localDates.length}개 날짜`);
            
            // 서버 데이터와 로컬 변경사항 병합 (양방향)
            if(serverData && serverData.state) {
              const mergedState = JSON.parse(JSON.stringify(serverData.state));
              
              // 1. 서버에 있는 모든 날짜 확인
              Object.keys(serverData.state).forEach(dk => {
                if(!mergedState[dk]) mergedState[dk] = {};
                ['본소','북부'].forEach(site => {
                  if(serverData.state[dk][site]) {
                    if(!mergedState[dk][site]) {
                      mergedState[dk][site] = serverData.state[dk][site];
                    }
                  }
                });
              });
              
              // 2. 로컬에 있는 모든 날짜 확인 및 병합
              Object.keys(state).forEach(dk => {
                if(!mergedState[dk]) {
                  mergedState[dk] = state[dk];
                } else {
                  ['본소','북부'].forEach(site => {
                    if(state[dk][site] && state[dk][site].entries) {
                      if(!mergedState[dk][site]) {
                        // 서버에 없고 로컬에만 있음 → 로컬 것 사용
                        mergedState[dk][site] = state[dk][site];
                      } else {
                        // 양쪽 모두 있음 → entries 병합 (ID 기반 중복 제거)
                        const serverIds = new Set((mergedState[dk][site].entries || []).map(e => e.id));
                        const localNew = (state[dk][site].entries || []).filter(e => !serverIds.has(e.id));
                        mergedState[dk][site].entries = [
                          ...(mergedState[dk][site].entries || []),
                          ...localNew
                        ];
                        // workers, delivery도 로컬 것으로 업데이트
                        if(state[dk][site].workers) {
                          mergedState[dk][site].workers = state[dk][site].workers;
                        }
                        if(state[dk][site].delivery !== undefined) {
                          mergedState[dk][site].delivery = state[dk][site].delivery;
                        }
                      }
                    }
                  });
                }
              });
              
              state = mergedState;
              state._cancelled = serverData.cancelled || state._cancelled || [];
              
              addDebugLog(`✅ 병합 완료: ${Object.keys(state).length}개 날짜 보존`);
            }
            
            lastUpdatedAt = serverUpdatedAt;
            payload.state = JSON.parse(JSON.stringify(state));
            payload.cancelled = state._cancelled || [];
          }
          
          retries--;
          if(retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 짧은 대기
            continue;
          } else {
            throw new Error('동시 수정 충돌 (최대 재시도 초과)');
          }
        } else {
          throw new Error('HTTP '+res.status);
        }
      } else {
        // 성공: 새 updated_at 저장
        const result = await res.json();
        if(result && result[0] && result[0].updated_at) {
          lastUpdatedAt = result[0].updated_at;
        } else {
          lastUpdatedAt = newUpdatedAt;
        }
        addDebugLog(`💾 저장 성공: ${Object.keys(payload.state).length}개 날짜`);
        setSyncUI('ok','저장 완료 · '+new Date().toLocaleTimeString('ko-KR'));
        success = true;
      }
      
    } catch(e){
      if(retries === 1) {
        setSyncUI('err','❌ 저장 실패: '+e.message);
        success = false;
        break;
      }
      retries--;
    }
  }
  
  isSaving=false;
  if(pendingSave){pendingSave=false;saveData();}
}


