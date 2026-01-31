'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2, Play, Download, Trash2, Volume2, AlertCircle,
  Mic, Square, UserPlus, CheckCircle2, ChevronRight,
  Info, Settings2, FileText, Sparkles, Wand2, Music
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Skeleton Loading Component (Clean Tool Aesthetic)
const GenerationSkeleton = () => (
  <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 animate-in fade-in">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-slate-200 rounded animate-skeleton"></div>
      <div className="w-20 h-4 bg-slate-200 rounded animate-skeleton"></div>
    </div>
    <div className="w-full h-12 bg-slate-200 rounded-xl animate-skeleton"></div>
    <div className="w-full h-12 bg-slate-200 rounded-xl animate-skeleton opacity-50"></div>
  </div>
);

export default function MyVoiceClone() {
  // Navigation State
  const [currentStep, setCurrentStep] = useState(1);

  // TTS States
  const [text, setText] = useState('「大家好！很高興今天見到你們。讓我們一起探索語言的魔力，享受學習英語的美好時光。準備好了嗎？」');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [lastProcessedVoice, setLastProcessedVoice] = useState('');

  // Voice Controls (Defaults maintained, but UI removed)
  const stability = 0.5;
  const similarityBoost = 0.75;
  const style = 0;
  const speakerBoost = true;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice States
  const [voices, setVoices] = useState<{ id: string, name: string }[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');

  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const characterLimit = 500;
  const isOverLimit = text.length > characterLimit;

  // Fetch Voices on Mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/voices');
        const data = await response.json();
        if (data.voices) {
          setVoices(data.voices);
          if (data.voices.length > 0 && !selectedVoice) {
            setSelectedVoice(data.voices[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
      }
    };
    fetchVoices();
  }, [selectedVoice]);

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [audioUrl, recordedUrl]);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleGenerate = async () => {
    if (!text.trim() || isOverLimit || isLoading) return;

    if (text === lastProcessedText && selectedVoice === lastProcessedVoice && audioUrl) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: speakerBoost
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失敗');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
      setLastProcessedText(text);
      setLastProcessedVoice(selectedVoice);

      setTimeout(() => { if (audioRef.current) audioRef.current.play(); }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      setRecordingTime(0);
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setCloneSuccess(null);

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('無法存取麥克風，請檢查權限設定。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCloneVoice = async () => {
    if (!recordedBlob || isCloning || !voiceName.trim()) {
      if (!voiceName.trim()) setError('請先輸入聲音名稱');
      return;
    }
    setIsCloning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', voiceName.trim());
      formData.append('file', recordedBlob);
      formData.append('description', 'User recorded voice clone');

      const response = await fetch('/api/clone', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || '克隆失敗');

      const newVoice = { id: data.voice_id, name: `${data.name} (我的克隆)` };
      setVoices((prev) => [newVoice, ...prev]);
      setSelectedVoice(newVoice.id);
      setCloneSuccess('語音克隆成功！正在前往生成頁面...');
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setVoiceName('');

      setTimeout(() => setCurrentStep(2), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCloning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Step Progress Indicator (Updated to 2 Steps)
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-10 px-2 max-w-sm mx-auto">
      {[1, 2].map((num) => (
        <React.Fragment key={num}>
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={() => num < currentStep && setCurrentStep(num)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all cursor-pointer border-2",
                currentStep === num ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105" :
                  currentStep > num ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-400"
              )}
            >
              {currentStep > num ? <CheckCircle2 size={20} /> : num}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              currentStep === num ? "text-indigo-600" : "text-slate-400"
            )}>
              {num === 1 ? "錄製聲音" : "文本生成"}
            </span>
          </div>
          {num < 2 && <div className={cn("flex-1 h-[2px] mx-8 rounded-full", currentStep > num ? "bg-indigo-600" : "bg-slate-200")}></div>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-6 px-4 selection:bg-indigo-100">
      <div className="w-full max-w-2xl">
        <header className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-500 text-[10px] font-bold uppercase tracking-widest shadow-sm">
            <Sparkles size={12} className="text-indigo-500" />
            ElevenLabs AI Voice Technology
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MyVoice Clone</h1>
          <p className="text-slate-500 max-w-sm mx-auto text-xs">極簡專業的語音克隆工具</p>
        </header>

        <StepIndicator />

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* STEP 1: RECORDING */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center text-xs">1</span>
                  錄製您的原始音色
                </h2>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    <FileText size={12} className="text-indigo-500" />
                    建議讀稿 (維持一分鐘錄音最佳)
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed text-sm antialiased italic">
                    「大家好！很高興今天見到你們。讓我們一起探索語言的魔力，享受學習英語的美好時光。準備好了嗎？<br /><br />
                    現在我正在讀一段測試稿，目的是為了讓 AI 學習我的音色、語氣和說話的節奏。在接下來的一分鐘內，我會保持自然、平穩的語速。錄音時，建議在安靜的環境下進行，避免背景雜音，這樣克隆出來的效果才會最接近原聲。謝謝大家。」
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">新聲音名稱</label>
                  <input
                    type="text"
                    placeholder="例如：我的專屬男聲"
                    className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all outline-none text-sm"
                    value={voiceName}
                    onChange={(e) => { setVoiceName(e.target.value); setError(null); }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative">
                  {isRecording && (
                    <div className="absolute inset-0 bg-red-400 rounded-full blur-xl animate-breathing opacity-30"></div>
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                      isRecording ? "bg-red-600 border-red-200 shadow-xl scale-105" : "bg-slate-50 border-slate-100 hover:border-indigo-100 hover:bg-white text-slate-400 hover:text-indigo-600 shadow-inner"
                    )}
                  >
                    {isRecording ? <Square fill="currentColor" size={24} className="text-white" /> : <Mic size={32} />}
                  </button>
                </div>

                <div className="text-center">
                  <p className={cn("text-3xl font-mono font-bold tracking-tighter", isRecording ? "text-red-500" : "text-slate-300")}>
                    {formatTime(recordingTime)}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">
                    {isRecording ? "正在錄製錄音檔" : "點擊圖示開始錄音"}
                  </p>
                </div>
              </div>

              {recordedUrl && !isRecording && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in slide-in-from-top-2">
                  <audio src={recordedUrl} controls className="w-full h-10" />
                  <button
                    onClick={handleCloneVoice}
                    disabled={isCloning}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isCloning ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                    {isCloning ? '正在克隆建模...' : '克隆我的聲音'}
                  </button>
                </div>
              )}

              {cloneSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                  <CheckCircle2 size={18} />
                  {cloneSuccess}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  前往文本生成 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GENERATION (Simplified) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center text-xs">2</span>
                選擇角色並生成語音
              </h2>

              <div className="space-y-4">
                {/* Voice Selection moved here */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">發聲者選擇</label>
                  <div className="relative">
                    <select
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm appearance-none cursor-pointer outline-none text-slate-700 text-sm font-medium"
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                    >
                      {voices.length === 0 ? <option>正在從雲端載入清單...</option> : voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">輸入預轉出的文本</label>
                    <span className={cn(
                      "font-mono text-[10px] px-2 py-0.5 rounded",
                      isOverLimit ? "text-red-600 bg-red-50" : "text-slate-400 bg-slate-50"
                    )}>
                      {text.length} / {characterLimit}
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={5}
                      className={cn(
                        "w-full p-4 bg-white border outline-none transition-all duration-300 text-lg leading-relaxed placeholder:text-slate-300 shadow-sm",
                        isOverLimit ? "border-red-400 focus:ring-red-50" : "border-[#CBD5E1] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50",
                        "rounded-[8px]"
                      )}
                      placeholder="請輸入文字內容..."
                      value={text}
                      onChange={(e) => { setText(e.target.value); setError(null); }}
                    />
                    {text.length > 0 && (
                      <button
                        onClick={() => setText('')}
                        className="absolute right-4 bottom-4 p-2 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg border border-slate-200 transition-all font-bold"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || !text.trim() || isOverLimit}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-xl text-white transition-all flex items-center justify-center gap-3 shadow-md",
                  isLoading || !text.trim() || isOverLimit
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-[#4F46E5] hover:bg-[#4338CA] hover:shadow-lg active:scale-[0.99]"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    正在為您生成語音...
                  </>
                ) : (
                  <>
                    <Play fill="currentColor" size={20} />
                    立即生成 AI 語音
                  </>
                )}
              </button>

              {isLoading && <GenerationSkeleton />}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              {audioUrl && !error && !isLoading && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest px-1">
                    <Music size={14} />
                    生成語音結果
                  </div>
                  <audio ref={audioRef} src={audioUrl} controls className="w-full h-10" />
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = audioUrl;
                      a.download = `voice-output-${Date.now()}.mp3`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-all font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download size={18} />
                    下載 MP3 錄音
                  </button>
                </div>
              )}

              <div className="flex justify-start">
                <button onClick={() => setCurrentStep(1)} className="text-slate-400 font-bold text-sm hover:text-indigo-600 transition-colors flex items-center gap-1">← 返回錄音步驟</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-20 text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] flex items-center gap-4">
        <span>Productivity Tool</span>
        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
        <span>MyVoice Clone v2.1</span>
        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
        <span>Taiwan Edition</span>
      </footer>
    </main>
  );
}
