import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';

interface AudioPlayerProps {
  audioBase64: string;
  label?: string;
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({
  audioBase64,
  label = 'Gemini 3.8 Flash TTS',
  autoPlay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const objectUrl = useMemo(() => {
    const byteChars = atob(audioBase64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }, [audioBase64]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !autoPlay) return;
    el.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [objectUrl, autoPlay]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      await el.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Number(e.target.value);
    el.currentTime = next;
    setCurrentTime(next);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.15, 1.25, 0.85];
    const idx = speeds.indexOf(playbackRate);
    setPlaybackRate(speeds[(idx + 1) % speeds.length]);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `venice-tts-${Date.now()}.wav`;
    a.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#131418]">
      <audio
        ref={audioRef}
        src={objectUrl}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        className="w-8 h-8 rounded-lg bg-[#E5A93C] text-[#0B0C0E] flex items-center justify-center hover:bg-[#eab85a] transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-[160px] flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="truncate font-medium text-neutral-300">{label}</span>
          <span className="font-mono tabular-nums shrink-0 ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0.01}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 accent-[#E5A93C] bg-white/10 rounded-full cursor-pointer"
        />
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        className="px-2 py-1 rounded-md text-xs font-mono tabular-nums text-neutral-300 hover:bg-white/6 transition-colors whitespace-nowrap shrink-0"
        title="Playback speed"
      >
        {playbackRate}x
      </button>

      <button
        type="button"
        onClick={handleDownload}
        aria-label="Download WAV"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-neutral-300 hover:bg-white/6 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        <span>WAV</span>
      </button>
    </div>
  );
}
