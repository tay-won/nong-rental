// Supabase Edge Function: claude-chat
// NVIDIA NIM(nemotron-3-nano-30b-a3b)을 호출하도록 교체한 버전.
// 함수 이름/URL은 그대로 두고, 내부 구현만 Anthropic → NVIDIA NIM으로 변경.
// 응답 형식은 기존 클라이언트(js/claude-chat.js)가 기대하는 { content: [{ text }] } 그대로 맞춤.
//
// 모델 선정 근거: 이 계정 카탈로그에서 실측한 결과
//   - moonshotai/kimi-k3: 한국어 품질은 좋으나 응답 90초+ (실사용 불가)
//   - nvidia/nemotron-3-nano-30b-a3b: 응답 1~2초, 한국어 답변 양호, reasoning_content가
//     content와 분리되어 나와서 화면에 추론 과정이 섞여 나오지 않음 → 채택

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NVIDIA_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { messages } = await req.json();

    const apiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!apiKey) {
      throw new Error('NVIDIA_API_KEY 시크릿이 설정되지 않았습니다');
    }

    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: '너는 파주시 농업기계임대사업소 직원을 돕는 한국어 AI 비서다. 간결하고 실용적으로 답하라.' },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.5,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || `NVIDIA API 오류 (HTTP ${res.status})`);
    }

    const text = data?.choices?.[0]?.message?.content ?? '';

    return new Response(
      JSON.stringify({ content: [{ type: 'text', text }] }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: e instanceof Error ? e.message : String(e) } }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
