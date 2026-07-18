// Claude AI 채팅 함수
// ═══ Claude AI 채팅 함수 ═══
let aiMessages = [];

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


