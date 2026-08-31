// AI 채팅 함수 (NVIDIA NIM 경유, Edge Function 함수명은 claude-chat 그대로 유지)
// ═══ AI 채팅 함수 ═══
let aiMessages = [];
let attachedAiFile = null; // {name}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_AI_FILE_BYTES = 5 * 1024 * 1024; // 5MB

async function handleAiFileSelect(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  if (file.size > MAX_AI_FILE_BYTES) {
    displayAiMessage('assistant', '❌ 파일이 너무 큽니다 (5MB 이하만 가능). "' + file.name + '"');
    return;
  }

  displayAiMessage('assistant', '📎 "' + file.name + '" 읽는 중...');
  const msgDiv = document.getElementById('aiMessages');
  const loadingDiv = msgDiv.lastChild;

  try {
    const base64 = await readFileAsBase64(file);
    const response = await fetch(CLAUDE_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractFile: { name: file.name, base64 }
      })
    });
    const data = await response.json();
    loadingDiv.remove();

    if (data.error) {
      displayAiMessage('assistant', '❌ 파일 처리 오류: ' + data.error.message);
      return;
    }

    // 첨부 파일 내용을 대화 맥락에 심어둠 (화면에는 요약만 표시)
    aiMessages.push({ role: 'user', content: '[첨부파일: ' + file.name + ']\n\n' + data.text });
    aiMessages.push({ role: 'assistant', content: '첨부하신 "' + file.name + '" 내용을 확인했습니다. 궁금하신 점을 질문해주세요.' });

    attachedAiFile = { name: file.name };
    document.getElementById('aiFileName').textContent = file.name;
    document.getElementById('aiFileChip').style.display = 'flex';
    displayAiMessage('assistant', '✅ "' + file.name + '" 내용을 확인했습니다. 궁금하신 점을 질문해주세요.');
  } catch (error) {
    loadingDiv.remove();
    displayAiMessage('assistant', '❌ 파일 처리 오류: ' + error.message);
  }
}

function removeAiFile() {
  attachedAiFile = null;
  document.getElementById('aiFileChip').style.display = 'none';
}

async function sendAiMessage() {
  const input = document.getElementById('aiInput');
  const userMsg = input.value.trim();
  
  if (!userMsg) return;
  
  // 사용자 메시지 표시
  aiMessages.push({ role: 'user', content: userMsg });
  displayAiMessage('user', userMsg);
  input.value = '';
  
  // 로딩 표시
  displayAiMessage('assistant', '⏳ 생각 중...');
  
  try {
    // Edge Function으로 호출 (API 키는 서버에서 관리)
    const response = await fetch(CLAUDE_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: aiMessages
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      displayAiMessage('assistant', '❌ 오류: ' + data.error.message);
      aiMessages.pop(); // 마지막 로딩 메시지 제거
      return;
    }
    
    const assistantMsg = data.content[0].text;
    aiMessages[aiMessages.length - 1] = { role: 'assistant', content: assistantMsg };
    
    // 로딩 메시지 제거하고 실제 응답 표시
    const msgDiv = document.getElementById('aiMessages');
    const loadingDiv = msgDiv.lastChild;
    if (loadingDiv && loadingDiv.textContent.includes('⏳')) {
      loadingDiv.remove();
    }
    displayAiMessage('assistant', assistantMsg);
    
  } catch (error) {
    console.error('AI 채팅 오류:', error);
    displayAiMessage('assistant', '❌ 통신 오류: ' + error.message);
  }
}

function displayAiMessage(role, text) {
  const msgDiv = document.getElementById('aiMessages');
  const msgEl = document.createElement('div');
  msgEl.style.marginBottom = '6px';
  msgEl.style.whiteSpace = 'pre-wrap';

  if (role === 'user') {
    msgEl.style.textAlign = 'right';
    msgEl.style.color = 'var(--accent)';
    msgEl.textContent = '나: ' + text;
  } else {
    msgEl.style.textAlign = 'left';
    msgEl.style.color = '#333';
    msgEl.textContent = '🤖: ' + text;
  }
  
  msgDiv.appendChild(msgEl);
  msgDiv.scrollTop = msgDiv.scrollHeight;
}


