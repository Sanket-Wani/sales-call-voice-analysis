"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  audioSrc: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  targetJumpTime?: number | null;
  onJumpHandled?: () => void;
}

export function AudioPlayerWithEvidence({
  audioSrc,
  currentTime,
  onTimeUpdate,
  targetJumpTime,
  onJumpHandled,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Jump to specific time when targetJumpTime changes
  useEffect(() => {
    if (targetJumpTime !== null && targetJumpTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = targetJumpTime;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      if (onJumpHandled) onJumpHandled();
    }
  }, [targetJumpTime, onJumpHandled]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-3">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Progress & Scrub Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
          <span className="font-semibold text-neutral-900">{formatTime(currentTime)}</span>
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">Audio Timeline</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="relative w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden cursor-pointer">
          <div
            className="absolute left-0 top-0 bottom-0 bg-neutral-900 rounded-full transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Skip Back 5s */}
          <button
            type="button"
            onClick={() => skipSeconds(-5)}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Primary Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white shadow transition transform active:scale-95"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Skip Forward 5s */}
          <button
            type="button"
            onClick={() => skipSeconds(5)}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title="Forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed & Mute */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className="px-2 py-1 rounded text-xs font-mono font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition"
            title="Toggle playback speed"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
