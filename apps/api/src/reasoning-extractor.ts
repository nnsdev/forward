export interface ExtractedPart {
  type: 'reasoning' | 'content';
  text: string;
}

export function createReasoningExtractor(prefix: string, suffix: string) {
  let buffer = '';
  let state: 'before-prefix' | 'in-reasoning' | 'after-suffix' = 'before-prefix';

  function extract(chunk: string): ExtractedPart[] {
    buffer += chunk;
    const parts: ExtractedPart[] = [];

    while (buffer.length > 0) {
      if (state === 'after-suffix') {
        // Once we've seen a complete reasoning block, everything else is content.
        // No need to buffer for prefix detection.
        parts.push({ type: 'content', text: buffer });
        buffer = '';
        break;
      }

      if (state === 'before-prefix') {
        const prefixIndex = buffer.indexOf(prefix);
        if (prefixIndex === -1) {
          // No prefix found. Keep the last (prefix.length - 1) characters
          // in case the prefix spans a chunk boundary.
          const keep = prefix.length - 1;
          if (buffer.length > keep) {
            const emitLen = buffer.length - keep;
            parts.push({ type: 'content', text: buffer.slice(0, emitLen) });
            buffer = buffer.slice(emitLen);
          }
          break;
        }

        // Emit content before the prefix
        if (prefixIndex > 0) {
          parts.push({ type: 'content', text: buffer.slice(0, prefixIndex) });
        }

        buffer = buffer.slice(prefixIndex + prefix.length);
        state = 'in-reasoning';
      } else {
        // state === 'in-reasoning'
        const suffixIndex = buffer.indexOf(suffix);
        if (suffixIndex === -1) {
          // No suffix found. Keep the last (suffix.length - 1) characters
          // in case the suffix spans a chunk boundary.
          const keep = suffix.length - 1;
          if (buffer.length > keep) {
            const emitLen = buffer.length - keep;
            parts.push({ type: 'reasoning', text: buffer.slice(0, emitLen) });
            buffer = buffer.slice(emitLen);
          }
          break;
        }

        // Emit reasoning before the suffix
        if (suffixIndex > 0) {
          parts.push({ type: 'reasoning', text: buffer.slice(0, suffixIndex) });
        }

        buffer = buffer.slice(suffixIndex + suffix.length);
        state = 'after-suffix';
      }
    }

    return parts;
  }

  /**
   * Flush any remaining buffered text. Call once the stream is complete.
   */
  function flush(): ExtractedPart[] {
    const parts: ExtractedPart[] = [];

    if (buffer.length > 0) {
      if (state === 'after-suffix') {
        parts.push({ type: 'content', text: buffer });
      } else {
        parts.push({ type: state === 'in-reasoning' ? 'reasoning' : 'content', text: buffer });
      }
      buffer = '';
    }

    return parts;
  }

  return { extract, flush };
}
