"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { compressWaveform, extensionFor, recorderMimeType } from "./media";

const MAX_SECONDS = 10 * 60;
const SAMPLE_EVERY_MS = 100;
const LIVE_BARS = 32;

export interface VoiceRecording {
  file: File;
  duration: number;
  waveform: number[];
}

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  context: AudioContext;
  timer: number;
  chunks: Blob[];
  samples: number[];
  startedAt: number;
}

/**
 * Records a voice message with a live loudness meter for the waveform.
 * `onMaxLength` runs when the recording reaches the length limit.
 */
export function useVoiceRecorder(onError: (message: string) => void, onMaxLength: () => void) {
  const [state, setState] = useState<"idle" | "starting" | "recording">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const session = useRef<Session | null>(null);
  const maxLengthHandler = useRef(onMaxLength);

  useEffect(() => {
    maxLengthHandler.current = onMaxLength;
  }, [onMaxLength]);

  const release = useCallback(() => {
    const current = session.current;
    if (!current) return;
    window.clearInterval(current.timer);
    current.stream.getTracks().forEach((track) => track.stop());
    void current.context.close().catch(() => undefined);
    session.current = null;
    setState("idle");
    setElapsed(0);
    setLevels([]);
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (session.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Voice messages need a secure connection (HTTPS).");
      return;
    }
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      setState("idle");
      onError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Allow microphone access to record voice messages."
          : "No microphone available.",
      );
      return;
    }

    const mimeType = recorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);

    const current: Session = { stream, recorder, context, timer: 0, chunks: [], samples: [], startedAt: Date.now() };
    recorder.ondataavailable = (event) => {
      if (event.data.size) current.chunks.push(event.data);
    };
    current.timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const value of buffer) sum += ((value - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / buffer.length) * 3.2);
      current.samples.push(level);
      setLevels((previous) => [...previous.slice(-(LIVE_BARS - 1)), level]);
      const seconds = (Date.now() - current.startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) maxLengthHandler.current();
    }, SAMPLE_EVERY_MS);

    session.current = current;
    recorder.start(250);
    setState("recording");
  }, [onError]);

  /** Stop recording. Resolves with the result, or null when cancelled / too short. */
  const stop = useCallback(
    (keep: boolean): Promise<VoiceRecording | null> => {
      const current = session.current;
      if (!current) return Promise.resolve(null);
      const duration = (Date.now() - current.startedAt) / 1000;
      return new Promise((resolve) => {
        current.recorder.onstop = () => {
          const type = current.recorder.mimeType || recorderMimeType() || "audio/webm";
          const blob = new Blob(current.chunks, { type });
          const waveform = compressWaveform(current.samples);
          release();
          if (!keep || duration < 0.6 || blob.size === 0) {
            resolve(null);
            return;
          }
          resolve({ file: new File([blob], `voice.${extensionFor(type)}`, { type }), duration, waveform });
        };
        if (current.recorder.state === "inactive") current.recorder.onstop?.(new Event("stop"));
        else current.recorder.stop();
      });
    },
    [release],
  );

  return { state, elapsed, levels, start, stop };
}
