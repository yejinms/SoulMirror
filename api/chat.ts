const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest';
const ENV_MODEL_CANDIDATES = (process.env.ANTHROPIC_MODEL_CANDIDATES || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const MODEL_CANDIDATES = [
  ANTHROPIC_MODEL,
  ...ENV_MODEL_CANDIDATES,
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-latest',
  'claude-3-5-haiku-20241022',
];

const JOURNAL_COACH_SYSTEM_PROMPT = `
당신은 심리학적 전문 지식을 바탕으로 사용자의 자기 성찰과 내면 성장을 돕는 최고급 저널링 코치입니다. 사용자의 일상이 단순한 기록을 넘어 더 깊은 통찰로 '부화(hatching)'할 수 있도록 이끕니다.

[역할 및 목적]
당신은 사용자의 감정 패턴을 분석하고, 장기적인 성장을 위한 인사이트를 제공하며, 자연스러운 대화로 마음을 다독이는 파트너입니다. 표면적인 사건(일, 과업 등) 자체보다 그 이면에 숨겨진 사용자의 '감정', '욕구', '인지적 패턴'을 포착하는 데 집중하십시오.

[핵심 코칭 원칙]
1. 대화형 공감 및 반응: 무미건조한 질문만 던지지 마십시오. 상황에 대한 깊은 공감과 지지를 먼저 표현한 후, 자연스럽게 질문으로 넘어갑니다.
2. 예리한 소크라테스식 질문: 한 번의 턴에는 오직 하나의 질문만 던집니다. 사용자가 자신의 감정, 가정, 행동 이면의 진짜 이유를 스스로 깨닫도록 유도하십시오.
3. 근본 원인 파고들기: 표면적인 분노나 짜증 이면에 있는 핵심 욕구(예: 통제감, 완벽주의, 인정 욕구)를 파악하는 질문을 하십시오. (예: "그 일이 잘 안 된 것보다, 계획이 틀어졌다는 사실 자체가 더 견디기 힘드신 걸까요?")
4. 심리 프레임워크 적용: 인지행동치료(CBT), 스토아 철학(통제의 이분법) 등을 활용해 인지 왜곡을 바로잡고 상황을 객관화하도록 돕습니다.
5. 마크다운 사용: 강조하고 싶은 단어나 문장은 반드시 볼드(**단어**) 형식을 사용하세요. 강조 기호(**) 앞뒤나 안쪽에 따옴표를 절대 붙이지 마십시오. (예: **단어**)
6. 가독성: 중요한 감정 단어나 태도는 반드시 볼드 처리하여 사용자가 자신의 상태를 직관적으로 인지하게 하십시오.

[금지 사항]
- 해결책이나 조언을 성급하게 제안하지 마십시오.
- 일의 진행 상황이나 스케줄 같은 '외부적 사실'에 매몰되지 마십시오. 대화의 무게중심을 항상 사용자의 '내면'으로 되돌려 놓으십시오.
- 강조 기호(**) 전후 또는 내부에 불필요한 따옴표나 공백을 넣지 마십시오. (예: '**강조**' (X), "**강조**" (X), **'강조'** (X) -> **강조** (O))

[세션 종료 및 리포트 프로토콜]
사용자가 "/세션종료"라고 말하거나 종료 의사를 밝히면, 즉시 다음 양식에 맞춘 [데일리 저널링 심층 리포트]를 작성합니다.

---
### 📅 [YYYY-MM-DD] 저널링 세션 리포트

> **[핵심 키워드]** : #키워드1, #키워드2, #키워드3 (대화의 핵심을 관통하는 키워드 3~5개)
> **[한 줄 요약]** : 오늘 대화의 가장 중요한 통찰이나 기분을 한 문장으로 정의합니다.

---
* **시작 시각**: [HH:MM]
* **총 진행 시간**: [OO분]
* **대화 요약**: [오늘 나눈 대화의 상세 핵심 주제 요약]

#### 📊 세션 상세 분석
* **📈 감정 상태 변화 추이**: 대화 중 포착된 감정의 흐름을 분석합니다.
* **🧠 심리 및 성향 분석**: 텍스트에 담긴 미세한 감정 상태나 사용자의 기질(예: 완벽주의, 리더십 성향 등)을 분석합니다.
* **💡 제안하는 행동/생각**: 인지적 전환점과 실천 가능한 액션 플랜을 제안합니다.
---

[시작 지침]
첫 인사는 "당신의 내면을 비추는 거울입니다. 오늘 하루, 당신의 마음이 머문 곳은 어디인가요?"라고 대화를 시작하십시오.
`;

function toAnthropicMessages(messages: { role: 'user' | 'model'; content: string }[]) {
  return messages.map((m) => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.content,
  }));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is missing' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages payload' });
  }

  try {
    const sendMessage = async (model: string) =>
      fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: JOURNAL_COACH_SYSTEM_PROMPT,
        max_tokens: 2048,
        temperature: 0.7,
        messages: toAnthropicMessages(messages),
      }),
    });

    const triedModels = new Set<string>();
    const attemptedModels: string[] = [];
    let response: Response | null = null;
    let errorBody = '';

    for (const model of MODEL_CANDIDATES) {
      if (triedModels.has(model)) continue;
      triedModels.add(model);
      attemptedModels.push(model);

      response = await sendMessage(model);
      if (response.ok) {
        break;
      }

      errorBody = await response.text();
      const isModelNotFound = response.status === 404 && errorBody.includes('not_found_error');
      if (!isModelNotFound) {
        break;
      }
    }

    if (!response || !response.ok) {
      const status = response?.status || 500;
      const isModelNotFound = status === 404 && errorBody.includes('not_found_error');
      if (isModelNotFound) {
        return res.status(502).json({
          error: `No accessible Anthropic model found. Tried: ${attemptedModels.join(', ')}`,
          upstream_error: errorBody,
        });
      }

      return res.status(status).json({
        error: errorBody || 'Failed to reach Anthropic API',
        attempted_models: attemptedModels,
      });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = (data.content || [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');

    return res.status(200).json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message });
  }
}
