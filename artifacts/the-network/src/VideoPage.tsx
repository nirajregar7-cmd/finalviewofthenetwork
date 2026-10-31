import React, { useState, useRef, useEffect } from 'react';
import VideoTemplate from './components/video/VideoTemplate';

const TOTAL_DURATION_MS = 7000 + 8500 + 8500 + 9000 + 8000;

type ExportState = 'idle' | 'waiting' | 'recording' | 'done' | 'error';

export default function VideoPage() {
  useEffect(() => {
    document.body.classList.add('video-page');
    return () => document.body.classList.remove('video-page');
  }, []);

  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  async function handleExport() {
    if (exportState === 'recording' || exportState === 'waiting') return;

    setErrorMsg('');
    setExportState('waiting');

    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
        preferCurrentTab: true,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (progressRef.current) clearInterval(progressRef.current);
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.href = url;
        a.download = `the-network-video.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setProgress(100);
        setExportState('done');
        setTimeout(() => { setExportState('idle'); setProgress(0); }, 4000);
      };

      recorder.onerror = () => {
        if (progressRef.current) clearInterval(progressRef.current);
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setExportState('error');
        setErrorMsg('Recording failed. Please try again.');
        setTimeout(() => setExportState('idle'), 3000);
      };

      stream.getVideoTracks()[0].onended = () => {
        if (progressRef.current) clearInterval(progressRef.current);
        if (recorder.state === 'recording') recorder.stop();
        setExportState('idle');
        setProgress(0);
      };

      setExportState('recording');
      setProgress(0);
      recorder.start(500);

      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min(99, Math.round((elapsed / TOTAL_DURATION_MS) * 100)));
      }, 200);

      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, TOTAL_DURATION_MS);

    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        setExportState('error');
        setErrorMsg('Could not start recording. Try Chrome or Edge.');
        setTimeout(() => setExportState('idle'), 3000);
      } else {
        setExportState('idle');
      }
    }
  }

  function handleCancel() {
    if (progressRef.current) clearInterval(progressRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    setExportState('idle');
    setProgress(0);
  }

  const secsLeft = Math.ceil(((100 - progress) / 100) * (TOTAL_DURATION_MS / 1000));

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <VideoTemplate />

      <div className="absolute top-5 left-5 z-50">
        <a
          href="/"
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 1L3 7L9 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to App
        </a>
      </div>

      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {exportState === 'error' && errorMsg && (
          <div className="bg-red-500/90 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
            {errorMsg}
          </div>
        )}

        {exportState === 'done' && (
          <div className="flex items-center gap-2 bg-green-500/90 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm" style={{ fontFamily: 'var(--font-body)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download started!
          </div>
        )}

        {(exportState === 'recording' || exportState === 'waiting') && (
          <div className="flex flex-col items-end gap-2 bg-black/70 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-3" style={{ minWidth: '220px' }}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-white text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                  {exportState === 'waiting' ? 'Starting…' : `Recording — ${secsLeft}s left`}
                </span>
              </div>
              <button onClick={handleCancel} className="text-white/40 hover:text-white/80 text-xs transition-colors ml-3">✕</button>
            </div>
            {exportState === 'recording' && (
              <div className="w-full bg-white/10 rounded-full h-1">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    transition: 'width 0.2s linear',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {(exportState === 'idle' || exportState === 'done' || exportState === 'error') && (
          <button
            onClick={handleExport}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ fontFamily: 'var(--font-body)', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 24px rgba(99,102,241,0.45)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:translate-y-0.5 transition-transform">
              <path d="M7 1V9M7 9L4 6M7 9L10 6M2 12H12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export Video
          </button>
        )}
      </div>

      {exportState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-black/80 border border-white/10 backdrop-blur-xl rounded-2xl px-8 py-6 text-center" style={{ maxWidth: 340 }}>
            <div className="text-3xl mb-3">🎬</div>
            <p className="text-white font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Select this tab to record</p>
            <p className="text-white/50 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
              In the sharing dialog, choose <strong className="text-white/70">This Tab</strong>, then click Share.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
