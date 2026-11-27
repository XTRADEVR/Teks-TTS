import { Fragment, useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { MermaidBlock } from './MermaidBlock';

interface MessageContentProps {
  content: string;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'mermaid'; value: string }
  | { type: 'code'; lang: string; value: string }
  | { type: 'image_prompt'; value: string };

function splitSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      pushTextWithImageTags(raw.slice(lastIndex, match.index), segments);
    }
    const lang = (match[1] || '').trim().toLowerCase();
    const body = match[2];
    if (lang === 'mermaid') {
      segments.push({ type: 'mermaid', value: body });
    } else {
      segments.push({ type: 'code', lang: lang || 'text', value: body });
    }
    lastIndex = fenceRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    pushTextWithImageTags(raw.slice(lastIndex), segments);
  }

  return segments;
}

function pushTextWithImageTags(chunk: string, segments: Segment[]) {
  const imageTagRegex = /\[Generating image:\s*([^\]]+)\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = imageTagRegex.exec(chunk)) !== null) {
    if (m.index > last) {
      const before = chunk.slice(last, m.index).trim();
      if (before) segments.push({ type: 'text', value: before });
    }
    segments.push({ type: 'image_prompt', value: m[1].trim() });
    last = imageTagRegex.lastIndex;
  }

  if (last < chunk.length) {
    const rest = chunk.slice(last).trim();
    if (rest) segments.push({ type: 'text', value: rest });
  }
}

function renderInlineFormatting(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-white/8 font-mono text-[13px] text-[#E5A93C]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function TextProse({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-[15px] leading-[1.65] text-neutral-200">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-display text-base font-semibold text-white pt-1">
              {renderInlineFormatting(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-display text-lg font-semibold text-white pt-1.5">
              {renderInlineFormatting(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={idx} className="font-display text-xl font-semibold text-white pt-2">
              {renderInlineFormatting(line.slice(2))}
            </h2>
          );
        }

        if (/^[-*]\s+/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="text-neutral-500 select-none mt-0.5">•</span>
              <span>{renderInlineFormatting(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        const numbered = line.match(/^(\d+\.)\s+(.*)$/);
        if (numbered) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="font-mono text-xs text-neutral-400 tabular-nums mt-1 shrink-0">
                {numbered[1]}
              </span>
              <span>{renderInlineFormatting(numbered[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-[#131418] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/8 text-xs text-neutral-400">
        <span className="font-mono text-neutral-300">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/6 text-neutral-300 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ImagePromptCard({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-xl border border-[#E5A93C]/30 bg-[#141519] p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#E5A93C]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Imagen Prompt</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs text-neutral-300 transition-colors whitespace-nowrap shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Prompt' : 'Copy Prompt'}</span>
        </button>
      </div>
      <p className="text-sm text-neutral-100 leading-relaxed font-mono">{prompt}</p>
    </div>
  );
}

export function MessageContent({ content }: MessageContentProps) {
  const segments = splitSegments(content);

  return (
    <div className="space-y-2">
      {segments.map((seg, idx) => {
        if (seg.type === 'mermaid') {
          return <MermaidBlock key={idx} code={seg.value} />;
        }
        if (seg.type === 'code') {
          return <CodeBlock key={idx} lang={seg.lang} code={seg.value} />;
        }
        if (seg.type === 'image_prompt') {
          return <ImagePromptCard key={idx} prompt={seg.value} />;
        }
        return <TextProse key={idx} text={seg.value} />;
      })}
    </div>
  );
}
