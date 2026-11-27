import { useState } from 'react';
import {
  AudioLines,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  Users,
  User,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import type { TtsClip, VoiceName } from '../types';

const VOICES: Array<{ name: VoiceName; character: string }> = [
  { name: 'Kore', character: 'Warm & poised' },
  { name: 'Puck', character: 'Expressive & bright' },
  { name: 'Charon', character: 'Deep & measured' },
  { name: 'Fenrir', character: 'Resonant & dramatic' },
  { name: 'Zephyr', character: 'Clear & airy' },
];

const STYLE_PRESETS = [
  'Tenang, hangat, namun menyimpan ketegangan psikologis',
  'Dramatic cinematic narrator, measured pacing',
  'Clear, natural conversational Indonesian',
  'Whispered suspenseful storytelling',
];

const DEFAULT_STORY =
  'Robot pengasuh itu tidak pernah salah, dia bangun pagi, dia siapkan susu, dia jaga anakku dengan baik, semua orang bilang, robot ini sempurna, aku pun percaya.';

interface TtsStudioProps {
  onSendToChat?: (text: string) => void;
}

export function TtsStudio({ onSendToChat }: TtsStudioProps) {
  const [ttsMode, setTtsMode] = useState<'single' | 'multi'>('single');
  const [text, setText] = useState(DEFAULT_STORY);
  const [voiceName, setVoiceName] = useState<VoiceName>('Kore');
  const [style, setStyle] = useState(
    'Tenang, hangat, namun menyimpan ketegangan psikologis'
  );

  // Dual-speaker screenplay state
  const [speaker1Name, setSpeaker1Name] = useState('Ibu');
  const [speaker1Voice, setSpeaker1Voice] = useState<VoiceName>('Kore');
  const [speaker1Style, setSpeaker1Style] = useState(
    'Reflektif, tenang, sedikit ragu'
  );
  const [speaker1Line, setSpeaker1Line] = useState(
    'Robot pengasuh itu tidak pernah salah, dia bangun pagi, dia siapkan susu, dia jaga anakku dengan baik.'
  );

  const [speaker2Name, setSpeaker2Name] = useState('Ayah');
  const [speaker2Voice, setSpeaker2Voice] = useState<VoiceName>('Charon');
  const [speaker2Style, setSpeaker2Style] = useState(
    'Meyakinkan namun waspada'
  );
  const [speaker2Line, setSpeaker2Line] = useState(
    '|mhm| Semua orang bilang robot ini sempurna, tapi kenapa anak kita berhenti menangis secepat itu?'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [clips, setClips] = useState<TtsClip[]>([]);

  const insertCue = (cue: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${cue}` : cue));
  };

  const handleGenerate = async () => {
    setError('');
    setIsGenerating(true);

    try {
      const payload =
        ttsMode === 'single'
          ? {
              mode: 'single' as const,
              text: text.trim(),
              voiceName,
              style: style.trim(),
            }
          : {
              mode: 'multi' as const,
              lines: [
                {
                  speaker: speaker1Name.trim() || 'Speaker 1',
                  text: speaker1Line.trim(),
                  voiceName: speaker1Voice,
                  style: speaker1Style.trim(),
                },
                {
                  speaker: speaker2Name.trim() || 'Speaker 2',
                  text: speaker2Line.trim(),
                  voiceName: speaker2Voice,
                  style: speaker2Style.trim(),
                },
              ],
            };

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate speech.');
      }

      const clipText =
        ttsMode === 'single'
          ? text.trim()
          : `${speaker1Name}: ${speaker1Line}\n${speaker2Name}: ${speaker2Line}`;

      const newClip: TtsClip = {
        id: crypto.randomUUID(),
        text: clipText,
        voiceName:
          ttsMode === 'single'
            ? voiceName
            : `${speaker1Name} (${speaker1Voice}) & ${speaker2Name} (${speaker2Voice})`,
        style: ttsMode === 'single' ? style.trim() : 'Dual-speaker screenplay',
        mode: ttsMode,
        audioBase64: data.audioBase64,
        createdAt: Date.now(),
      };

      setClips((prev) => [newClip, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to generate speech.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
            Convert Text to Speech
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Voice design, Indonesian &amp; multilingual narration, and screenplay
            dialogue powered by{' '}
            <span className="font-mono text-xs text-neutral-300">
              gemini-3.8-flash-tts
            </span>
            .
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#131418] border border-white/10 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTtsMode('single')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              ttsMode === 'single'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Single Voice</span>
          </button>
          <button
            type="button"
            onClick={() => setTtsMode('multi')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              ttsMode === 'multi'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dual Speaker</span>
          </button>
        </div>
      </div>

      {ttsMode === 'single' ? (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="tts-text"
                className="text-xs font-medium text-neutral-300"
              >
                Script or Narrative
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['<breath>', '<gasp>', '<laugh>'].map((cue) => (
                  <button
                    key={cue}
                    type="button"
                    onClick={() => insertCue(cue)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-neutral-300 transition-colors whitespace-nowrap shrink-0"
                  >
                    + {cue}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="tts-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to synthesize into speech..."
              className="w-full rounded-xl bg-[#131418] border border-white/10 px-4 py-3 text-[15px] text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#E5A93C]/60 leading-relaxed resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Voice Persona
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {VOICES.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setVoiceName(v.name)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                      voiceName === v.name
                        ? 'border-[#E5A93C]/60 bg-[#E5A93C]/10 text-white'
                        : 'border-white/8 bg-[#131418] text-neutral-300 hover:border-white/20'
                    }`}
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="text-neutral-400">{v.character}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="voice-style"
                  className="block text-xs font-medium text-neutral-300 mb-2"
                >
                  Voice Design &amp; Delivery Style
                </label>
                <textarea
                  id="voice-style"
                  rows={3}
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Describe tone, pacing, emotion..."
                  className="w-full rounded-xl bg-[#131418] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#E5A93C]/60 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-500 block">
                  Quick style presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStyle(preset)}
                      className="text-left px-2.5 py-1 rounded-md border border-white/8 bg-[#131418] hover:border-white/20 text-[11px] text-neutral-300 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-[#131418] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={speaker1Name}
                  onChange={(e) => setSpeaker1Name(e.target.value)}
                  placeholder="Speaker 1"
                  className="bg-transparent border-b border-white/15 pb-1 text-sm font-medium text-white focus:outline-none focus:border-[#E5A93C] w-28"
                />
                <select
                  value={speaker1Voice}
                  onChange={(e) => setSpeaker1Voice(e.target.value as VoiceName)}
                  className="bg-[#0B0C0E] border border-white/10 rounded-md px-2 py-1 text-xs text-neutral-200 focus:outline-none"
                >
                  {VOICES.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={speaker1Style}
                onChange={(e) => setSpeaker1Style(e.target.value)}
                placeholder="Delivery style..."
                className="w-full rounded-lg bg-[#0B0C0E] border border-white/8 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E5A93C]/60"
              />
              <textarea
                rows={3}
                value={speaker1Line}
                onChange={(e) => setSpeaker1Line(e.target.value)}
                className="w-full rounded-lg bg-[#0B0C0E] border border-white/8 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-[#E5A93C]/60 resize-none"
              />
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-[#131418] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={speaker2Name}
                  onChange={(e) => setSpeaker2Name(e.target.value)}
                  placeholder="Speaker 2"
                  className="bg-transparent border-b border-white/15 pb-1 text-sm font-medium text-white focus:outline-none focus:border-[#E5A93C] w-28"
                />
                <select
                  value={speaker2Voice}
                  onChange={(e) => setSpeaker2Voice(e.target.value as VoiceName)}
                  className="bg-[#0B0C0E] border border-white/10 rounded-md px-2 py-1 text-xs text-neutral-200 focus:outline-none"
                >
                  {VOICES.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={speaker2Style}
                onChange={(e) => setSpeaker2Style(e.target.value)}
                placeholder="Delivery style..."
                className="w-full rounded-lg bg-[#0B0C0E] border border-white/8 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-[#E5A93C]/60"
              />
              <textarea
                rows={3}
                value={speaker2Line}
                onChange={(e) => setSpeaker2Line(e.target.value)}
                className="w-full rounded-lg bg-[#0B0C0E] border border-white/8 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-[#E5A93C]/60 resize-none"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            Supports natural backchanneling like{' '}
            <code className="font-mono text-[#E5A93C]">|mhm|</code>,{' '}
            <code className="font-mono text-[#E5A93C]">|yeah|</code> and vocal
            bursts like{' '}
            <code className="font-mono text-[#E5A93C]">&lt;breath&gt;</code>.
          </p>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E5A93C] hover:bg-[#eab85a] disabled:opacity-50 text-[#0B0C0E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AudioLines className="w-4 h-4" />
            )}
            <span>
              {isGenerating ? 'Synthesizing WAV...' : 'Convert Text to Speech'}
            </span>
          </button>

          {onSendToChat && ttsMode === 'single' && text.trim() && (
            <button
              type="button"
              onClick={() => onSendToChat(text.trim())}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#131418] hover:bg-white/5 text-neutral-200 text-sm transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Discuss in Chat</span>
            </button>
          )}
        </div>

        <span className="text-xs text-neutral-500">
          24kHz WAV · Zero server retention
        </span>
      </div>

      {clips.length > 0 && (
        <div className="pt-4 border-t border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E5A93C]" />
              <span>Generated Audio ({clips.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setClips([])}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <div className="space-y-3">
            {clips.map((clip, idx) => (
              <div
                key={clip.id}
                className="p-3.5 rounded-xl border border-white/8 bg-[#101115] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
                  <span className="truncate">
                    {clip.voiceName}
                    {clip.style ? ` · ${clip.style}` : ''}
                  </span>
                  <span className="font-mono tabular-nums shrink-0">
                    {new Date(clip.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-neutral-200 line-clamp-2 leading-relaxed">
                  {clip.text}
                </p>
                <AudioPlayer
                  audioBase64={clip.audioBase64}
                  label="gemini-3.8-flash-tts"
                  autoPlay={idx === 0}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
