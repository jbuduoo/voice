'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Play, Download, Trash2, Volume2, AlertCircle, Mic, Square, UserPlus, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function MyVoiceClone() {
  // TTS States
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastProcessedText, setLastProcessedText] = useState('');
  const [lastProcessedVoice, setLastProcessedVoice] = useState('');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0);
  const [speakerBoost, setSpeakerBoost] = useState(true);
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const characterLimit = 500;
  const isOverLimit = text.length > characterLimit;

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [audioUrl, recordedUrl]);

  // Fetch Voices on Mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/voices');
        const data = await response.json();
        if (data.voices) {
          setVoices(data.voices);
          // Auto-select first voice if none selected
          if (data.voices.length > 0 && !selectedVoice) {
            setSelectedVoice(data.voices[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
      }
    };
    fetchVoices();
  }, []);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (error) setError(null);
  };

  const handleClear = () => {
    setText('');
    setError(null);
  };

  // TTS Generation
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

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Recording Logic
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
      console.error('Mic access error:', err);
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
    if (!recordedBlob || isCloning) return;

    setIsCloning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', `MyVoice-${Date.now()}`);
      formData.append('file', recordedBlob);
      formData.append('description', 'User recorded voice clone via MVP site');

      const response = await fetch('/api/clone', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '克隆失敗');
      }

      const newVoice = { id: data.voice_id, name: `我的聲音 (${data.voice_id.slice(0, 4)})` };
      setVoices((prev) => [newVoice, ...prev]);
      setSelectedVoice(newVoice.id);
      setCloneSuccess('語音克隆成功！已為您切換至新聲音。');
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
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

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 space-y-8 border border-slate-100">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 mb-2">
            <Volume2 size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">MyVoice Clone</h1>
          <p className="text-lg text-slate-500 font-medium">錄製與克隆您的聲音，瞬間打造 AI 分身</p>
        </header>

        {/* Recording Section */}
        <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Mic className="text-red-500" size={20} />
              現場錄製您的聲音
            </h2>
            {isRecording && (
              <span className="flex items-center gap-2 text-red-600 font-mono font-bold animate-pulse">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                {formatTime(recordingTime)}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-500">
            請點擊下方按鈕錄製一段話（建議 1 分鐘以上，效果更佳）。錄製完成後點擊「克隆我的聲音」。
          </p>

          {/* Reading Script Section */}
          <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">建議讀稿（約一分鐘）</p>
            <p className="text-slate-700 leading-relaxed text-sm">
              「大家好，歡迎來到我的語音克隆實驗室。現在我正在讀一段測試稿，目的是為了讓 AI 學習我的音色、語氣和說話的節奏。在接下來的一分鐘內，我會保持自然、平穩的語速。<br /><br />
              人工智能技術正在快速改變我們的生活，從智慧家居到自動駕駛，再到現在我們正在體驗的個性化語音合成。這項技術不僅能幫助創意工作者更有效率地產出內容，也能為許多需要輔助溝通的人帶來希望。<br /><br />
              錄音時，建議在安靜的環境下進行，避免背景雜音，這樣克隆出來的效果才會最接近原聲。謝謝大家陪我完成這次測試，我非常期待看到 AI 生成的成果。我們開始吧！」
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isCloning}
                className="flex-1 min-w-[140px] py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2"
              >
                <Mic size={18} />
                開始錄音
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 min-w-[140px] py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100"
              >
                <Square size={18} />
                停止錄音
              </button>
            )}

            {recordedUrl && !isRecording && (
              <button
                onClick={handleCloneVoice}
                disabled={isCloning}
                className="flex-1 min-w-[140px] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:bg-slate-300"
              >
                {isCloning ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isCloning ? '克隆中...' : '克隆我的聲音'}
              </button>
            )}
          </div>

          {recordedUrl && !isRecording && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-slate-400 mb-2">試聽錄製結果：</p>
              <audio src={recordedUrl} controls className="w-full h-10" />
            </div>
          )}

          {cloneSuccess && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-2 border border-green-100 animate-in zoom-in-95 duration-300">
              <CheckCircle2 size={18} />
              <p className="text-sm font-medium">{cloneSuccess}</p>
            </div>
          )}
        </section>

        <div className="h-px bg-slate-100"></div>

        {/* TTS Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="voice-select" className="block text-sm font-bold text-slate-700">
              選擇發聲者
            </label>
            <select
              id="voice-select"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Voice Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>穩定性 (Stability)</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Math.round(stability * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-slate-400">越高越平穩一致，越低越有感情變化</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>相似度 (Similarity)</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Math.round(similarityBoost * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={similarityBoost}
                onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-slate-400">越高越像原音，但設得太高可能有雜音</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>風格誇張度 (Style)</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Math.round(style * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={style}
                onChange={(e) => setStyle(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-2">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">語者增強 (Boost)</p>
                <p className="text-[10px] text-slate-400">提升聲音清晰度</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={speakerBoost} onChange={(e) => setSpeakerBoost(e.target.checked)} />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label htmlFor="text-input" className="font-bold text-slate-700">
                想要說出的話
              </label>
              <span className={cn(
                "font-mono font-bold px-2 py-0.5 rounded-md",
                isOverLimit ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
              )}>
                {text.length}/{characterLimit}
              </span>
            </div>

            <div className="relative">
              <textarea
                id="text-input"
                rows={5}
                className={cn(
                  "w-full p-5 bg-slate-50 border rounded-2xl transition-all duration-200 outline-none resize-none text-lg",
                  isOverLimit
                    ? "border-red-300 focus:ring-4 focus:ring-red-50"
                    : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                )}
                placeholder="請輸入文字，系統將用所選聲音念給您聽..."
                value={text}
                onChange={handleTextChange}
              />

              {text.length > 0 && (
                <button
                  onClick={handleClear}
                  className="absolute right-4 bottom-4 p-2.5 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md active:scale-95"
                  title="清空文字"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {isOverLimit && (
              <p className="text-red-500 text-sm flex items-center gap-1 font-medium animate-pulse">
                <AlertCircle size={14} />
                哎呀！文字太長了，超過 {characterLimit} 字限制
              </p>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !text.trim() || isOverLimit}
            className={cn(
              "w-full py-5 rounded-2xl font-bold text-lg text-white transition-all flex items-center justify-center gap-3 shadow-xl",
              isLoading || !text.trim() || isOverLimit
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 shadow-blue-200 active:shadow-lg"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                AI 正在發聲中...
              </>
            ) : (
              <>
                <Play fill="currentColor" size={20} />
                開始生成語音
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-4 duration-300">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {audioUrl && !error && (
            <div className="pt-6 border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-blue-50 p-6 rounded-2xl space-y-5 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                  <Volume2 size={16} />
                  生成結果
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full"
                />
                <button
                  onClick={handleGenerate} // Re-play if clicked again
                  className="hidden" // Just for re-play logic
                />
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = audioUrl;
                    a.download = `voice-clone-${Date.now()}.mp3`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="w-full py-4 bg-white border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download size={20} />
                  下載 MP3 錄音
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-sm font-medium flex items-center gap-4">
        <span>© 2026 MyVoice Clone</span>
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        <span>Based on ElevenLabs API</span>
      </footer>
    </main>
  );
}
