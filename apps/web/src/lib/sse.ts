import type { NormalizedStreamEvent } from '@forward/shared';

export async function readSseStream(
  response: Response,
  onEvent: (event: NormalizedStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.ok) {
    throw new Error(`request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error('response body was empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      reader.cancel();
      break;
    }

    const { done, value } = await reader.read();

    buffer += decoder.decode(value, { stream: !done });

    let separatorIndex = buffer.indexOf('\n\n');

    while (separatorIndex !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      parseFrame(frame, onEvent);
      separatorIndex = buffer.indexOf('\n\n');
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    parseFrame(buffer, onEvent);
  }
}

function parseFrame(frame: string, onEvent: (event: NormalizedStreamEvent) => void): void {
  const dataLines = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  for (const line of dataLines) {
    onEvent(JSON.parse(line) as NormalizedStreamEvent);
  }
}
