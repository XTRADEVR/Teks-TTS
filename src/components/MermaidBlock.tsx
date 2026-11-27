import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { Check, Code2, Copy, Download, Eye } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  themeVariables: {
    background: '#131418',
    primaryColor: '#1E2028',
    primaryTextColor: '#F4F4F6',
    primaryBorderColor: '#3A3D4A',
    lineColor: '#9CA3AF',
    secondaryColor: '#181A20',
    tertiaryColor: '#131418',
    fontFamily: 'DM Sans, sans-serif',
  },
});

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const uniqueId = useId().replace(/:/g, '_');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function renderDiagram() {
      try {
        setError('');
        const { svg: renderedSvg } = await mermaid.render(
          `mermaid_${uniqueId}`,
          code.trim()
        );
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to render Mermaid syntax.'
          );
        }
      }
    }
    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, uniqueId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venice-diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-[#131418] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/8 text-xs text-neutral-400">
        <span className="font-medium text-neutral-300">Mermaid Diagram</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSource((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 text-neutral-300 transition-colors whitespace-nowrap shrink-0"
          >
            {showSource ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            <span>{showSource ? 'Preview' : 'Code'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 text-neutral-300 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {svg && (
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 text-neutral-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </button>
          )}
        </div>
      </div>

      {showSource || error ? (
        <div className="p-3.5">
          {error && (
            <p className="mb-2 text-xs text-amber-400">
              Diagram syntax preview note: {error}
            </p>
          )}
          <pre className="text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      ) : svg ? (
        <div
          className="p-4 overflow-x-auto flex justify-center bg-[#0F1014]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="p-6 text-xs text-neutral-500 text-center">
          Rendering diagram...
        </div>
      )}
    </div>
  );
}
