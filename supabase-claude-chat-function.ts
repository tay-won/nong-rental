// Supabase Edge Function: claude-chat
// NVIDIA NIM(nemotron-3-nano-30b-a3b)을 호출하도록 교체한 버전.
// 함수 이름/URL은 그대로 두고, 내부 구현만 Anthropic → NVIDIA NIM으로 변경.
// 응답 형식은 기존 클라이언트(js/claude-chat.js)가 기대하는 { content: [{ text }] } 그대로 맞춤.
//
// 모델 선정 근거: 이 계정 카탈로그에서 실측한 결과
//   - moonshotai/kimi-k3: 한국어 품질은 좋으나 응답 90초+ (실사용 불가)
//   - nvidia/nemotron-3-nano-30b-a3b: 응답 1~2초, 한국어 답변 양호, reasoning_content가
//     content와 분리되어 나와서 화면에 추론 과정이 섞여 나오지 않음 → 채택
//
// 파일 첨부 지원: hwpx/docx/xlsx(zip+XML 구조) + pdf + txt.
// 클라이언트가 { extractFile: { name, base64 } }를 보내면 텍스트만 추출해서 { text } 반환하고
// (LLM 호출 없음, 빠르고 저렴), 이후 그 텍스트를 대화 맥락에 넣어 일반 채팅({messages})으로 이어감.
// 구버전 .hwp(이진 포맷)는 지원하지 않음 — hwpx/pdf로 변환 안내.

import { unzipSync, strFromU8 } from 'npm:fflate@0.8.2';
import { extractText, getDocumentProxy } from 'npm:unpdf@1.4.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NVIDIA_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_FILE_TEXT_CHARS = 20000;

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// zip 안 XML에서 텍스트 태그(예: <w:t>, <hp:t>)만 뽑아서 문단(</w:p>, </hp:p>) 단위로 줄바꿈
function extractRunText(xml: string, textTagLocal: string, paraTagLocal: string): string {
  const textTagRe = new RegExp(`<(?:\\w+:)?${textTagLocal}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${textTagLocal}>`, 'g');

  function textInBlock(block: string): string {
    let line = '';
    let m: RegExpExecArray | null;
    textTagRe.lastIndex = 0;
    while ((m = textTagRe.exec(block))) line += decodeXmlEntities(m[1]);
    return line;
  }

  const paraTagRe = new RegExp(`<(?:\\w+:)?${paraTagLocal}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${paraTagLocal}>`, 'g');
  const lines: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = paraTagRe.exec(xml))) {
    const line = textInBlock(pm[1]);
    if (line.trim()) lines.push(line);
  }
  // 문단 태그를 못 찾은 문서 구조라면(드문 경우) 전체에서 텍스트 태그만 이어붙임
  return lines.length ? lines.join('\n') : textInBlock(xml);
}

function extractDocxText(zip: Record<string, Uint8Array>): string {
  const doc = zip['word/document.xml'];
  if (!doc) throw new Error('docx 문서 구조를 찾을 수 없습니다');
  const xml = strFromU8(doc);
  return extractRunText(xml, 't', 'p');
}

function extractHwpxText(zip: Record<string, Uint8Array>): string {
  const sectionFiles = Object.keys(zip)
    .filter((k) => /^Contents\/section\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)![1], 10);
      const nb = parseInt(b.match(/(\d+)/)![1], 10);
      return na - nb;
    });
  if (sectionFiles.length === 0) throw new Error('hwpx 문서 구조를 찾을 수 없습니다');
  return sectionFiles
    .map((f) => extractRunText(strFromU8(zip[f]), 't', 'p'))
    .join('\n\n');
}

function extractXlsxText(zip: Record<string, Uint8Array>): string {
  const sharedStringsFile = zip['xl/sharedStrings.xml'];
  let sharedStrings: string[] = [];
  if (sharedStringsFile) {
    const xml = strFromU8(sharedStringsFile);
    const siRe = /<si[^>]*>([\s\S]*?)<\/si>/g;
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let m: RegExpExecArray | null;
    while ((m = siRe.exec(xml))) {
      let text = '';
      let tm: RegExpExecArray | null;
      tRe.lastIndex = 0;
      while ((tm = tRe.exec(m[1]))) text += decodeXmlEntities(tm[1]);
      sharedStrings.push(text);
    }
  }

  const sheetFiles = Object.keys(zip)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)![1], 10);
      const nb = parseInt(b.match(/(\d+)/)![1], 10);
      return na - nb;
    })
    .slice(0, 3); // 시트 최대 3개까지만

  if (sheetFiles.length === 0) throw new Error('xlsx 문서 구조를 찾을 수 없습니다');

  const sheetTexts = sheetFiles.map((f) => {
    const xml = strFromU8(zip[f]);
    const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
    const cellRe = /<c[^>]*?(?:\st="([^"]*)")?[^>]*>(?:<f>[\s\S]*?<\/f>)?(?:<v>([\s\S]*?)<\/v>)?(?:<is>([\s\S]*?)<\/is>)?<\/c>/g;
    const lines: string[] = [];
    let rm: RegExpExecArray | null;
    let rowCount = 0;
    while ((rm = rowRe.exec(xml)) && rowCount < 500) {
      const cells: string[] = [];
      let cm: RegExpExecArray | null;
      cellRe.lastIndex = 0;
      while ((cm = cellRe.exec(rm[1]))) {
        const type = cm[1];
        const v = cm[2];
        const isBlock = cm[3];
        if (isBlock) {
          const tRe2 = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
          let inline = '';
          let tm2: RegExpExecArray | null;
          while ((tm2 = tRe2.exec(isBlock))) inline += decodeXmlEntities(tm2[1]);
          cells.push(inline);
        } else if (v === undefined) {
          cells.push('');
        } else if (type === 's') {
          const idx = parseInt(v, 10);
          cells.push(sharedStrings[idx] ?? '');
        } else {
          cells.push(decodeXmlEntities(v));
        }
      }
      if (cells.some((c) => c.trim())) lines.push(cells.join('\t'));
      rowCount++;
    }
    return lines.join('\n');
  });

  return sheetTexts.join('\n\n---\n\n');
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractFileText(name: string, bytes: Uint8Array): Promise<string> {
  const ext = name.toLowerCase().split('.').pop() ?? '';

  if (ext === 'txt') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (ext === 'pdf') {
    return await extractPdfText(bytes);
  }
  if (ext === 'docx' || ext === 'hwpx' || ext === 'xlsx') {
    const zip = unzipSync(bytes);
    if (ext === 'docx') return extractDocxText(zip);
    if (ext === 'hwpx') return extractHwpxText(zip);
    return extractXlsxText(zip);
  }
  if (ext === 'hwp') {
    throw new Error('구버전 .hwp 파일은 지원하지 않습니다. hwpx나 pdf로 저장해서 다시 올려주세요.');
  }
  throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();

    // ── 파일 텍스트 추출 요청 (LLM 호출 없이 텍스트만 반환) ──
    if (body.extractFile) {
      try {
        const { name, base64 } = body.extractFile;
        const bytes = base64ToBytes(base64);
        let text = await extractFileText(name, bytes);
        text = text.trim();
        if (!text) throw new Error('파일에서 텍스트를 찾지 못했습니다');
        if (text.length > MAX_FILE_TEXT_CHARS) {
          text = text.slice(0, MAX_FILE_TEXT_CHARS) + '\n\n[... 문서가 길어 일부만 표시됨 ...]';
        }
        return new Response(
          JSON.stringify({ text }),
          { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: { message: e instanceof Error ? e.message : String(e) } }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── 일반 채팅 요청 ──
    const { messages } = body;

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
          { role: 'system', content: '너는 파주시 농업기계임대사업소 직원을 돕는 한국어 AI 비서다. 간결하고 실용적으로 답하라. 사용자가 문서를 첨부한 경우, 그 문서 내용을 근거로 답하라.' },
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
