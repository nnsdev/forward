import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function highlightQuotes(text: string): string {
  const parts = text.split(/(```[\s\S]*?```|`[^`]*`)/g);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replace(/"([^"]+)"/g, '<span class="rp-quote">"$1"</span>');
    })
    .join('');
}

export function renderMarkdown(text: string): string {
  const highlighted = highlightQuotes(text);
  const raw = marked.parse(highlighted) as string;
  return DOMPurify.sanitize(raw);
}