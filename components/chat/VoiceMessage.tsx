"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { ChatMessage } from "@/lib/store/chat";

import { ProgressRing } from "./UploadOverlay";

const BARS = 40;
const SPEEDS = [1, 1.5, 2];

// Only one voice message plays at a time.
let playing: HTMLAudioElement | null = null;

function normalisedBars(waveform: number[] | null): number[] {
  if (!waveform?.length) return Array.from({ length: BARS }, (_, index) => 0.25 + 0.2 * Math.abs(Math.sin(index * 1.7)));
  return Array.from({ length: BARS }, (_, index) => waveform[Math.floor((index / BARS) * waveform.length)] ?? 0);
}

export function VoiceMessage({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const attachment = message.attachment;
  const src = message.localUrl ?? attachment?.url;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const duration = attachment?.duration ?? mediaDuration ?? 0;
  const progress = duration ? Math.min(1, current / duration) : 0;
  const bars = normalisedBars(attachment?.waveform ?? null);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (playing === audio) playing = null;
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (playing && playing !== audio) playing.pause();
    playing = audio;
    audio.playbackRate = speed;
    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const seek = (event: React.PointerEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    audio.currentTime = fraction * duration;
    setCurrent(audio.currentTime);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className="flex w-[min(272px,68vw)] items-center gap-3 px-2 pb-5 pt-1.5">
      {message.delivery ? (
        <ProgressRing message={message} size={44} dark={mine} />
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={(event) => {
            event.stopPropagation();
            void toggle();
          }}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            mine ? "bg-white text-accent" : "bg-accent text-accent-fg",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isPlaying ? "pause" : "play"}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
            >
              {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.stopPropagation();
            seek(event);
          }}
          className="flex h-8 cursor-pointer items-center gap-[2px]"
        >
          {bars.map((height, index) => {
            const played = (index + 0.5) / BARS <= progress;
            return (
              <span
                key={index}
                className={cn(
                  "w-[3px] flex-1 rounded-full transition-colors duration-150",
                  mine ? (played ? "bg-white" : "bg-white/45") : played ? "bg-accent" : "bg-fg-3/45",
                )}
                style={{ height: `${Math.max(12, height * 100)}%` }}
              />
            );
          })}
        </div>
        <div className={cn("mt-1 flex items-center gap-2 text-[12px] tabular-nums", mine ? "text-white/80" : "text-fg-2")}>
          <span>{formatDuration(isPlaying || current > 0 ? current : duration)}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              cycleSpeed();
            }}
            className={cn("rounded-full px-1.5 font-semibold", mine ? "bg-white/20" : "bg-accent-soft text-accent")}
            aria-label="Playback speed"
          >
            {speed}×
          </button>
        </div>
      </div>

      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={(event) => {
            setIsPlaying(false);
            setCurrent(0);
            event.currentTarget.currentTime = 0;
          }}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value)) setMediaDuration(value);
          }}
        />
      )}
    </div>
  );
}
