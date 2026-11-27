import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Film,
  GitBranch,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { AudioPlayer } from './components/AudioPlayer';
import { MessageContent } from './components/MessageContent';
import { TtsStudio } from './components/TtsStudio';
import type { CapabilityMode, ChatMessage, ModelLabel } from './types';

const MODELS: ModelLabel[] = [
  'Kimi K2.5 - Private + Anon',
  'DeepSeek V4.1 Flash (Uncensored) - Private',
];

const FEATURED_NARRATIVE =
  'Robot pengasuh itu tidak pernah salah, dia bangun pagi, dia siapkan susu, dia jaga anakku dengan baik, semua orang bilang, robot ini sempurna, aku pun percaya.';

const CAPABILITIES: Array<{
  id: CapabilityMode;
  label: string;
  icon: typeof Globe;
  hint: string;
}> = [
  {
    id: 'research',
    label: 'Learn about the World',
    icon: Globe,
    hint: 'Deep agentic research with web grounding',
  },
  {
    id: 'image',
    label: 'Generate any image',
    icon: ImageIcon,
    hint: 'Ultra-detailed 8k Imagen prompt generation',
  },
  {
    id: 'video',
    label: 'Create AI Video',
    icon: Film,
    hint: 'Scene-by-scene storyboard & motion prompts',
  },
  {
    id: 'diagram',
    label: 'Create a Flowchart or Diagram',
    icon: GitBranch,
    hint: 'Live Mermaid.js diagram rendering',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<'chat' | 'tts'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<CapabilityMode>('default');
  const [modelLabel, setModelLabel] = useState<ModelLabel>(
    'Kimi K2.5 - Private + Anon'
  );
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [draftAudio, setDraftAudio] = useState<{
    text: string;
    base64: string;
  } | null>(null);
  const [isSpeakingDraft, setIsSpeakingDraft] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node)
      ) {
        setModelMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const sendMessage = async (
    overrideText?: string,
    overrideMode?: CapabilityMode
  ) => {
    const content = (overrideText ?? input).trim();
    if (!content || isSending) return;

    const chosenMode = overrideMode ?? activeMode;
    setChatError('');
    setActiveView('chat');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      mode: chosenMode,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (overrideText === undefined) {
      setInput('');
    }
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: chosenMode,
          modelLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from Venice.');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.text || 'No response generated.',
        mode: chosenMode,
        modelLabel,
        sources: data.sources || [],
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'Unable to reach Venice server.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSpeakMessage = async (msg: ChatMessage) => {
    if (msg.audioBase64 || speakingId === msg.id) return;
    setSpeakingId(msg.id);
    setChatError('');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          text: msg.content,
          voiceName: 'Kore',
          style: 'Clear, natural, expressive delivery matching the text language',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'TTS conversion failed.');
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, audioBase64: data.audioBase64 } : m
        )
      );
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'Text-to-speech request failed.'
      );
    } finally {
      setSpeakingId(null);
    }
  };

  const handleSpeakTextDirect = async (targetText: string) => {
    const clean = targetText.trim();
    if (!clean || isSpeakingDraft) return;
    setIsSpeakingDraft(true);
    setChatError('');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          text: clean,
          voiceName: 'Kore',
          style: 'Tenang, hangat, ekspresif dan jernih',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'TTS conversion failed.');
      }
      setDraftAudio({ text: clean, base64: data.audioBase64 });
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'Text-to-speech request failed.'
      );
    } finally {
      setIsSpeakingDraft(false);
    }
  };

  const handleRegenerate = async () => {
    if (isSending || messages.length === 0) return;
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const targetIdx = messages.length - 1 - lastUserIdx;
    const historyUpToUser = messages.slice(0, targetIdx + 1);
    const lastUser = historyUpToUser[historyUpToUser.length - 1];

    setMessages(historyUpToUser);
    setIsSending(true);
    setChatError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyUpToUser.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: lastUser.mode ?? activeMode,
          modelLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Regeneration failed.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.text || 'No response generated.',
          mode: lastUser.mode ?? activeMode,
          modelLabel,
          sources: data.sources || [],
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Regeneration failed.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleClearChat = () => {
    setMessages([]);
    setDraftAudio(null);
    setChatError('');
    setActiveView('chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C0E] text-[#F4F4F6]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0B0C0E]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('chat')}
            className="inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <KeyRound className="w-4 h-4 text-[#E5A93C]" />
            <span>Venice</span>
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="flex items-center gap-6 text-sm text-neutral-400">
            <button
              type="button"
              onClick={() => setActiveView('chat')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                activeView === 'chat'
                  ? 'text-white underline underline-offset-8 decoration-[#E5A93C]'
                  : ''
              }`}
            >
              Agent Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tts')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                activeView === 'tts'
                  ? 'text-white underline underline-offset-8 decoration-[#E5A93C]'
                  : ''
              }`}
            >
              Text to Speech
            </button>
          </nav>

          {/* Zone 3: Tier metadata + single primary action */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs text-neutral-400 font-mono tabular-nums whitespace-nowrap">
              XTRADE VR PRO · 0 Credits
            </span>
            <button
              type="button"
              onClick={handleClearChat}
              className="px-3.5 py-1.5 rounded-lg border border-white/12 bg-[#131418] hover:bg-white/6 text-xs font-medium text-neutral-200 transition-colors whitespace-nowrap shrink-0"
            >
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      {activeView === 'tts' ? (
        <main className="flex-1 overflow-y-auto">
          <TtsStudio
            onSendToChat={(scriptText) => {
              setInput(scriptText);
              setActiveView('chat');
            }}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto px-4">
          {messages.length === 0 ? (
            /* Empty / Centered Venice Think Freely Hero */
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-[#131418] flex items-center justify-center mb-5">
                <KeyRound className="w-5 h-5 text-[#E5A93C]" />
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance">
                Think Freely
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-neutral-400 max-w-lg">
                Private, anonymous intelligence. No stored history. Ask
                anything, render Mermaid diagrams, or convert text to speech.
              </p>

              {/* Featured Indonesian Narrative + Instant TTS & Chat Actions */}
              <div className="mt-8 w-full max-w-2xl text-left rounded-2xl border border-white/10 bg-[#131418] p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
                  <span>Featured Prompt · Indonesia</span>
                  <span className="font-mono text-neutral-500">
                    gemini-3.8-flash-tts
                  </span>
                </div>
                <p className="text-[15px] text-neutral-100 leading-relaxed">
                  “{FEATURED_NARRATIVE}”
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isSpeakingDraft}
                    onClick={() => handleSpeakTextDirect(FEATURED_NARRATIVE)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#eab85a] disabled:opacity-50 text-[#0B0C0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSpeakingDraft ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSpeakingDraft
                        ? 'Converting to Speech...'
                        : 'Convert to Speech'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendMessage(FEATURED_NARRATIVE, 'default')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/4 hover:bg-white/8 text-neutral-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Lanjutkan Cerita di Venice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendMessage(
                        `Buatkan flowchart alur cerita ini dalam Mermaid: ${FEATURED_NARRATIVE}`,
                        'diagram'
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/4 hover:bg-white/8 text-neutral-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Visualisasikan Diagram</span>
                  </button>
                </div>

                {draftAudio && (
                  <div className="pt-2">
                    <AudioPlayer
                      audioBase64={draftAudio.base64}
                      label="gemini-3.8-flash-tts · Kore"
                      autoPlay
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active Conversation Thread */
            <div className="flex-1 py-6 space-y-6">
              {messages.map((msg, idx) => {
                const isLastAssistant =
                  msg.role === 'assistant' && idx === messages.length - 1;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl bg-[#181A20] border border-white/8 px-4 py-3 text-[15px] text-neutral-100 leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full space-y-3 py-1">
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <KeyRound className="w-3.5 h-3.5 text-[#E5A93C]" />
                          <span className="font-medium text-neutral-200">
                            Venice
                          </span>
                          {msg.modelLabel && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{msg.modelLabel}</span>
                            </>
                          )}
                        </div>

                        <MessageContent content={msg.content} />

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="pt-2 border-t border-white/8 space-y-1.5">
                            <span className="text-xs font-medium text-neutral-400 block">
                              Sources
                            </span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {msg.sources.map((src, sIdx) => (
                                <a
                                  key={`${src.uri}-${sIdx}`}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-[#E5A93C] hover:underline max-w-xs truncate"
                                >
                                  <span className="truncate">{src.title}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {msg.audioBase64 && (
                          <div className="pt-1 max-w-md">
                            <AudioPlayer
                              audioBase64={msg.audioBase64}
                              label="gemini-3.8-flash-tts"
                              autoPlay
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 pt-1 text-xs text-neutral-400">
                          <button
                            type="button"
                            disabled={speakingId === msg.id}
                            onClick={() => handleSpeakMessage(msg)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 hover:text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                          >
                            {speakingId === msg.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5A93C]" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {speakingId === msg.id
                                ? 'Generating Voice...'
                                : msg.audioBase64
                                  ? 'Voice Ready'
                                  : 'Listen (TTS)'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 hover:text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {isLastAssistant && (
                            <button
                              type="button"
                              onClick={handleRegenerate}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/6 hover:text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-center gap-2.5 text-sm text-neutral-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E5A93C]" />
                  <span>Venice is thinking privately...</span>
                </div>
              )}

              {draftAudio && messages.length > 0 && (
                <div className="max-w-md">
                  <AudioPlayer
                    audioBase64={draftAudio.base64}
                    label="Draft TTS · gemini-3.8-flash-tts"
                    autoPlay
                  />
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* Error Banner */}
          {chatError && (
            <div className="mb-3 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 flex items-center justify-between gap-3">
              <span>{chatError}</span>
              <button
                type="button"
                onClick={() => setChatError('')}
                className="text-red-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Dock: 4 Capability Buttons + Input Bar + Model Selector + Footer */}
          <div className="sticky bottom-0 bg-[#0B0C0E]/95 backdrop-blur-md pt-2 pb-4 space-y-2.5">
            {/* Horizontally Scrollable Capability Strip (Never Overlaps) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                const isSelected = activeMode === cap.id;
                return (
                  <button
                    key={cap.id}
                    type="button"
                    title={cap.hint}
                    onClick={() =>
                      setActiveMode((prev) =>
                        prev === cap.id ? 'default' : cap.id
                      )
                    }
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'border-[#E5A93C]/70 bg-[#E5A93C]/12 text-[#F4F4F6]'
                        : 'border-white/10 bg-[#131418] text-neutral-300 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-[#E5A93C]' : 'text-neutral-400'
                      }`}
                    />
                    <span>{cap.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveView('tts')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-[#131418] text-neutral-300 hover:border-white/20 hover:text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <AudioLines className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                <span>Convert Text to Speech</span>
              </button>
            </div>

            {/* Main Input Box */}
            <div className="rounded-2xl border border-white/12 bg-[#131418] focus-within:border-white/25 transition-colors">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Venice a question... / Create flowcharts and diagrams..."
                className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none"
              />

              <div className="flex items-center justify-between gap-3 px-3.5 pb-3 pt-1">
                {/* Bottom-Left: Model Selector */}
                <div className="relative" ref={modelMenuRef}>
                  <button
                    type="button"
                    onClick={() => setModelMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/6 text-xs text-neutral-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span className="truncate max-w-[230px] sm:max-w-none">
                      {modelLabel}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  </button>

                  {modelMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-white/12 bg-[#16181E] shadow-xl p-1.5 z-40">
                      {MODELS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setModelLabel(m);
                            setModelMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                            modelLabel === m
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-neutral-300 hover:bg-white/5'
                          }`}
                        >
                          <span>{m}</span>
                          {modelLabel === m && (
                            <Check className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom-Right: Speak Draft + Send */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!input.trim() || isSpeakingDraft}
                    onClick={() => handleSpeakTextDirect(input)}
                    title="Convert draft text to speech (gemini-3.8-flash-tts)"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/6 disabled:opacity-40 text-xs text-neutral-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSpeakingDraft ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Speak</span>
                  </button>

                  <button
                    type="button"
                    disabled={!input.trim() || isSending}
                    onClick={() => sendMessage()}
                    aria-label="Send message"
                    className="w-8 h-8 rounded-lg bg-[#E5A93C] hover:bg-[#eab85a] disabled:opacity-40 text-[#0B0C0E] flex items-center justify-center transition-colors shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Required Footer Text */}
            <p className="text-center text-[11px] text-neutral-500">
              By using Venice, you agree to our{' '}
              <button
                type="button"
                onClick={() => setLegalModal('terms')}
                className="underline hover:text-neutral-300 transition-colors"
              >
                Terms
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegalModal('privacy')}
                className="underline hover:text-neutral-300 transition-colors"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </main>
      )}

      {/* Terms / Privacy Modal */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/12 bg-[#131418] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                {legalModal === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/6"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {legalModal === 'terms'
                ? 'Venice provides private, ephemeral AI chat, Mermaid diagram generation, research grounding, and Gemini 3.8 Flash Text-to-Speech synthesis directly in your browser session.'
                : 'Your conversations and generated audio clips remain strictly in your active browser session memory. Nothing is saved to a persistent user database or profile.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
