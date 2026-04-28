import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, 
  Sparkles, 
  Send, 
  Play, 
  Pause, 
  Download, 
  Settings, 
  Layers, 
  Wand2, 
  Mic2,
  Image as ImageIcon,
  Heart,
  Zap,
  Flame,
  Ghost,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeLyrics, generateSceneImage, generateVoice } from './services/geminiService';
import { cn } from './lib/utils';
import { Scene, VisualStyle, VideoProject } from './types';
import confetti from 'canvas-confetti';

import { audioService } from './services/audioService';

const STYLES: { id: VisualStyle; label: string; icon: any; color: string }[] = [
  { id: 'trap', label: 'Trap', icon: Flame, color: 'text-purple-500' },
  { id: 'romantic', label: 'Romântico', icon: Heart, color: 'text-pink-500' },
  { id: 'motivational', label: 'Epic', icon: Zap, color: 'text-yellow-500' },
  { id: 'anime', label: 'Anime', icon: Ghost, color: 'text-blue-500' },
  { id: 'minimalist', label: 'Minimal', icon: Palette, color: 'text-gray-400' },
];

export default function App() {
  const [lyrics, setLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<VisualStyle>('trap');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    setAudioBuffer(buffer);
    
    // Auto-fill lyrics placeholder if empty
    if (!lyrics) setLyrics("Instrumental Track Detected. Generating abstract visuals...");
  };

  const startPlayback = () => {
    if (!audioBuffer) {
      setIsPlaying(true);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createBufferSource();
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 256;
    source.buffer = audioBuffer;
    source.connect(analyzer);
    analyzer.connect(audioCtx.destination);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioSourceRef.current = source;
    analyzerRef.current = analyzer;
    dataArrayRef.current = dataArray;

    source.start(0, currentTime);
    setIsPlaying(true);
    
    const updateBeat = () => {
      if (analyzerRef.current && dataArrayRef.current) {
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < 10; i++) sum += dataArrayRef.current[i];
        setBeatIntensity(sum / 10 / 255);
      }
      animationRef.current = requestAnimationFrame(updateBeat);
    };
    updateBeat();
  };

  const stopPlayback = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const startGeneration = async () => {
    if (!lyrics.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const analysis = await analyzeLyrics(lyrics, currentStyle);
      
      const newScenes: Scene[] = await Promise.all(
        analysis.scenes.map(async (s, i) => ({
          id: Math.random().toString(36).substring(2, 9),
          text: s.text || '',
          startTime: s.startTime || i * 10,
          endTime: s.endTime || (i + 1) * 10,
          visualPrompt: s.visualPrompt || '',
          imageUrl: await generateSceneImage(s.visualPrompt || '', currentStyle),
          emotion: s.emotion || 'neutral',
          keywords: s.keywords || [],
        }))
      );

      let finalAudioUrl = null;
      if (!audioBuffer) {
        try {
          finalAudioUrl = await generateVoice(lyrics);
          const response = await fetch(finalAudioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = await audioCtx.decodeAudioData(arrayBuffer);
          setAudioBuffer(buffer);
        } catch (e) {
          console.warn("Auto-voice generation fallback failed:", e);
        }
      }

      setProject({
        id: Date.now().toString(),
        title: 'Nova Música',
        lyrics,
        audioUrl: finalAudioUrl,
        style: currentStyle,
        scenes: newScenes,
        bpm: analysis.bpm,
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff4e00', '#ff8700', '#3B82F6']
      });
    } catch (error: any) {
      console.error('Falha ao gerar:', error);
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        setErrorMessage("Limite de IA excedido (Quota). Por favor, aguarde um momento ou tente uma letra mais curta.");
      } else {
        setErrorMessage("Ocorreu um erro ao gerar o vídeo. Verifique sua conexão.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      const link = document.createElement('a');
      link.href = '#'; // Mock link
      link.download = 'video-lyricflow.mp4';
      // In a real app, we would use MediaRecorder here
      alert("Vídeo preparado e pronto para download! (Simulação de exportação)");
    }, 3000);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          if (project && next >= (project.scenes[project.scenes.length - 1]?.endTime || 0)) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, project]);

  useEffect(() => {
    if (project) {
      const index = project.scenes.findIndex(s => currentTime >= s.startTime && currentTime < s.endTime);
      if (index !== -1 && index !== activeSceneIndex) {
        setActiveSceneIndex(index);
      }
    }
  }, [currentTime, project, activeSceneIndex]);

  const activeScene = project?.scenes[activeSceneIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-hidden flex flex-col">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-[60px] border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif italic text-xl tracking-tight text-white">Lyric.AI</h1>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-[1.5px] font-bold text-white/50">
            <span className="cursor-pointer hover:text-white transition-colors">Studio</span>
            <span className="cursor-pointer hover:text-white transition-colors">Projects</span>
            <span className="cursor-pointer hover:text-white transition-colors">Styles</span>
            <span className="cursor-pointer hover:text-white transition-colors">Account</span>
          </div>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <button 
            disabled={!project || isCapturing}
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-br from-[#ff4e00] to-[#ff8700] hover:scale-105 active:scale-95 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:grayscale text-white"
          >
            {isCapturing ? <Sparkles className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {isCapturing ? 'Rendeziando...' : 'Exportar'}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr_280px] gap-5 p-5 overflow-hidden">
        {/* Left Side: Input Panel */}
        <section className="bg-panel-bg border border-white/5 rounded-2xl p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar relative">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mb-4">Lyrics Source</h2>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste lyrics here..."
              className="w-full h-40 bg-black/20 border border-white/10 rounded-xl p-4 text-sm font-serif leading-relaxed focus:outline-none focus:border-accent/40 transition-all resize-none placeholder:text-white/20"
            />
          </div>

          <div>
             <h2 className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mb-4">Musical Vibe</h2>
             <div className="flex flex-col gap-2">
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleAudioUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all bg-white/5 text-[11px] uppercase tracking-wider font-semibold",
                    audioBuffer ? "border-accent bg-accent/5 text-accent" : "border-white/10 group-hover:border-white/20 text-white/60"
                  )}>
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5" />
                      <span>{audioBuffer ? 'Audio Loaded' : 'Upload MP3'}</span>
                    </div>
                    {audioBuffer && <span>✓</span>}
                  </div>
                </div>
             </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mb-4">Visual Aesthetic</h2>
            <div className="flex flex-col gap-2">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCurrentStyle(style.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all text-[11px] uppercase tracking-wider font-semibold",
                    currentStyle === style.id 
                      ? "bg-accent text-black border-accent" 
                      : "bg-white/5 border-white/10 hover:border-white/20 text-white/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <style.icon className="w-3.5 h-3.5 opacity-70" />
                    <span>{style.label}</span>
                  </div>
                  {currentStyle === style.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400 font-bold uppercase tracking-wider">
                {errorMessage}
              </div>
            )}
            <button
              disabled={isGenerating || !lyrics.trim()}
              onClick={startGeneration}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#ff4e00] to-[#ff8700] p-px transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/20"
            >
              <div className="flex items-center justify-center gap-2 py-4 bg-black/10 rounded-[11px] text-white text-xs font-bold uppercase tracking-widest">
                {isGenerating ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Synthesizing...' : 'Generate Magic'}</span>
              </div>
            </button>
          </div>
        </section>

        {/* Center: Preview Area */}
        <section className="relative bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,#050505_100%)] rounded-3xl flex items-center justify-center overflow-hidden border border-white/5 p-8">
          {/* Ambient light for video */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent/5 blur-[120px] transition-opacity duration-1000",
              isPlaying ? "opacity-100" : "opacity-0"
            )} />
          </div>

          <div 
            ref={videoRef}
            className="relative aspect-[9/16] h-full bg-black rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 group cursor-none"
          >
            <AnimatePresence mode="wait">
              {activeScene?.imageUrl ? (
                <motion.div
                  key={activeScene.imageUrl}
                  className="absolute inset-0"
                  style={{ 
                    scale: 1 + (beatIntensity * 0.05),
                    filter: `brightness(${1 + beatIntensity * 0.2}) contrast(${1 + beatIntensity * 0.1})`
                  }}
                >
                  <motion.img
                    src={activeScene.imageUrl}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Cinematic Effects */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                  {beatIntensity > 0.7 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white mix-blend-overlay"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30 mix-blend-multiply" />
                </motion.div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Play className="w-12 h-12 text-white/5" />
                </div>
              )}
            </AnimatePresence>

            {/* Lyrics Overlay */}
            <div className="absolute inset-x-0 bottom-16 flex flex-col justify-center items-center pointer-events-none p-10 text-center">
              <AnimatePresence mode="wait">
                {activeScene && (
                  <motion.div
                    key={activeScene.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ 
                      y: 0, 
                      opacity: 1,
                      scale: 1 + (beatIntensity * 0.1),
                    }}
                    exit={{ y: -20, opacity: 0 }}
                    className="space-y-4"
                  >
                    <h3 
                      className="text-3xl font-black tracking-tighter uppercase"
                      style={{ 
                        color: beatIntensity > 0.6 ? '#ff4e00' : 'white',
                        textShadow: beatIntensity > 0.6 
                          ? `0 0 ${30 * beatIntensity}px rgba(255,78,0,0.6)` 
                          : '0 0 20px rgba(0,0,0,0.5)'
                      }}
                    >
                      {activeScene.text}
                    </h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Vertical Progress */}
            <div 
              className="absolute left-0 bottom-0 w-1 bg-accent transition-all duration-100 shadow-[0_0_15px_rgba(255,78,0,0.5)]"
              style={{ height: `${(currentTime / (project?.scenes[project.scenes.length-1]?.endTime || 1)) * 100}%` }}
            />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
              <button 
                onClick={togglePlayback}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center backdrop-blur-md"
              >
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 translate-x-0.5 text-white" />}
              </button>
            </div>
          </div>
        </section>

        {/* Right Side: Analysis Panel */}
        <section className="hidden md:flex flex-col gap-6">
          <div className="bg-panel-bg border border-white/5 rounded-2xl p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mb-5">AI Analysis</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-white/50">Emotion</span>
                <span className="font-mono text-accent uppercase">{project ? (activeScene?.emotion || 'STABLE') : '---'}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-white/50">Intensity</span>
                <span className="font-mono text-accent">{project ? `${Math.round(beatIntensity * 100)}%` : '0%'}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-white/50">Tempo</span>
                <span className="font-mono text-accent">{project ? `${project.bpm} BPM` : '---'}</span>
              </div>
            </div>
          </div>

          <div className="bg-panel-bg border border-white/5 rounded-2xl p-5 flex flex-col flex-1">
             <h2 className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mb-5">Media Track</h2>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
               {project?.scenes.map((scene, idx) => (
                 <div 
                  key={scene.id}
                  onClick={() => setCurrentTime(scene.startTime)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    activeSceneIndex === idx ? "bg-accent/10 border-accent/40" : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                 >
                   <div className="flex items-center justify-between mb-1">
                     <span className="text-[10px] font-mono text-white/40">SCENE {idx + 1}</span>
                     <span className="text-[10px] font-mono text-white/40">{Math.floor(scene.startTime)}s</span>
                   </div>
                   <p className="text-[11px] font-medium truncate opacity-60 italic">"{scene.text}"</p>
                 </div>
               ))}
             </div>

             <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                   <div className="flex items-end gap-[3px] h-6 flex-1">
                     {[40, 70, 90, 100, 80, 50, 30, 60, 95, 70, 40].map((h, i) => (
                       <div 
                         key={i} 
                         className={cn(
                           "flex-1 rounded-sm min-h-[4px] bg-accent",
                           isPlaying && "animate-pulse"
                         )} 
                         style={{ height: isPlaying ? `${Math.random() * 80 + 20}%` : `${h}%` }} 
                       />
                     ))}
                   </div>
                </div>
             </div>
          </div>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
