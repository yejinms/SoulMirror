export async function chatWithCoach(messages: { role: 'user' | 'model', content: string }[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chat API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json() as { text?: string };
  return data.text || '';
}

export async function* chatWithCoachStream(messages: { role: 'user' | 'model', content: string }[]) {
  // Keep streaming API shape for existing UI code while using server-side proxy.
  const text = await chatWithCoach(messages);
  if (text) {
    yield text;
  }
}
