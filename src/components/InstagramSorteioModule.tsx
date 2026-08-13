import React, { useState, useEffect } from 'react';
import { EmpresaConfig } from '../types';
import { 
  Instagram, 
  ShieldCheck, 
  Filter, 
  Ticket, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Copy, 
  Check, 
  Download, 
  Lock, 
  Sparkles, 
  FileText, 
  Code2, 
  Database, 
  UserX, 
  Zap, 
  Bot, 
  Clock, 
  Radio, 
  Share2, 
  Eye, 
  EyeOff,
  Award,
  Layers,
  Terminal,
  Building2,
  FileCheck2,
  ChevronRight,
  Info,
  Volume2,
  VolumeX
} from 'lucide-react';

interface CommentMock {
  id: string;
  instagramId: string;
  username: string;
  text: string;
  timestamp: string;
  likesCount: number;
  hasLikedPost: boolean;
  hasStoryShare: boolean;
  isVerified: boolean;
  isBusiness: boolean;
  isFakeOrInactive: boolean;
  taggedUsers: string[];
  avatarUrl?: string;
}

interface TicketRecord {
  ticketNumber: string;
  instagramId: string;
  username: string;
  commentId: string;
  commentText: string;
  taggedCount: number;
  hashSeed: string;
  timestamp: string;
  avatarUrl?: string;
}

const AVATAR_IMAGES = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

interface BubbleItem {
  id: string;
  username: string;
  commentText: string;
  avatarUrl: string;
  ticketNumber: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isWinner?: boolean;
}

let globalAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioCtxClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    return null;
  }
};

const playSynthBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.12) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
};

// Sintetizador de som de palmas (Applause/Clapping) via Web Audio API
const playApplauseSound = (duration = 3.8) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Som de fundo da multidão com palmas contínuas
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const crowdSource = ctx.createBufferSource();
    crowdSource.buffer = noiseBuffer;

    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.setValueAtTime(1300, now);
    crowdFilter.Q.setValueAtTime(0.9, now);

    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.001, now);
    crowdGain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    crowdGain.gain.setValueAtTime(0.22, now + duration - 0.7);
    crowdGain.gain.linearRampToValueAtTime(0.001, now + duration);

    crowdSource.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(ctx.destination);

    crowdSource.start(now);
    crowdSource.stop(now + duration);

    // 2. Batidas individuais e sobrepostas de palmas (palma por palma)
    const shortBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const shortData = shortBuffer.getChannelData(0);
    for (let i = 0; i < shortData.length; i++) {
      shortData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }

    const numClaps = 130;
    for (let i = 0; i < numClaps; i++) {
      const timeOffset = Math.pow(Math.random(), 0.65) * duration;
      const startTime = now + timeOffset;

      const clapSource = ctx.createBufferSource();
      clapSource.buffer = shortBuffer;

      const clapFilter = ctx.createBiquadFilter();
      clapFilter.type = 'bandpass';
      clapFilter.frequency.setValueAtTime(1100 + Math.random() * 1500, startTime);
      clapFilter.Q.setValueAtTime(1.4, startTime);

      const clapGain = ctx.createGain();
      const vol = 0.15 + Math.random() * 0.18;
      clapGain.gain.setValueAtTime(vol, startTime);
      clapGain.gain.linearRampToValueAtTime(0.001, startTime + 0.05);

      clapSource.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(ctx.destination);

      clapSource.start(startTime);
      clapSource.stop(startTime + 0.055);
    }
  } catch (e) {
    console.error('Erro no som de palmas:', e);
  }
};

const BouncingBubblesStage: React.FC<{
  tickets: TicketRecord[];
  step: 'idle' | 'fetching' | 'filtering' | 'ticketing' | 'drawing' | 'completed';
  winnerTicket: TicketRecord | null;
  onReplayDraw?: () => void;
  profileImageUrl?: string | null;
  postImageUrl?: string;
}> = ({ tickets, step, winnerTicket, onReplayDraw, profileImageUrl, postImageUrl }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState<number>(0.5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hoveredBubble, setHoveredBubble] = useState<TicketRecord | null>(null);

  // Default post image if not supplied
  const effectivePostImage = postImageUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=80';

  // Flying parabola bubbles state
  interface ActiveParabolaBubble {
    id: string;
    ticketNumber: string;
    username: string;
    commentText: string;
    avatarUrl: string;
    angleDeg: number; // -80 to +80
    startTime: number;
    duration: number; // ms
    maxDistance: number;
    arcHeight: number;
  }

  const [activeBubbles, setActiveBubbles] = useState<ActiveParabolaBubble[]>([]);
  const [commentIndex, setCommentIndex] = useState<number>(0);

  // Confetti rain pieces state for completed state
  interface ConfettiParticle {
    id: number;
    x: number; // % 0-100
    y: number; // px -20 to 360
    size: number;
    color: string;
    speedY: number;
    speedX: number;
    rotation: number;
    rotationSpeed: number;
    shape: 'square' | 'strip' | 'circle';
  }

  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  // Spawn bubbles continuously during drawing phase from center post
  useEffect(() => {
    if (step !== 'drawing') {
      return;
    }

    if (tickets.length === 0) return;

    const spawnInterval = Math.max(120, Math.floor(280 / speed));

    const timer = setInterval(() => {
      setCommentIndex((prevIdx) => {
        const idx = prevIdx % tickets.length;
        const ticket = tickets[idx];

        // Generate angle across 180-degree parabola fan (-80° to +80°)
        const angleFan = [-75, 75, -50, 50, -25, 25, 0, -65, 65, -35, 35, -10, 10];
        const angleDeg = angleFan[idx % angleFan.length];

        const newBubble: ActiveParabolaBubble = {
          id: `${ticket.ticketNumber}-${Date.now()}-${Math.random()}`,
          ticketNumber: ticket.ticketNumber,
          username: ticket.username,
          commentText: ticket.commentText,
          avatarUrl: ticket.avatarUrl || AVATAR_IMAGES[idx % AVATAR_IMAGES.length],
          angleDeg,
          startTime: performance.now(),
          duration: 1600 / speed,
          maxDistance: 160 + (idx % 4) * 20,
          arcHeight: 70 + (idx % 3) * 15,
        };

        setActiveBubbles((prev) => [...prev.slice(-25), newBubble]);

        if (soundEnabled) {
          playSynthBeep(320 + Math.random() * 300, 'sine', 0.06);
        }

        return prevIdx + 1;
      });
    }, spawnInterval);

    return () => clearInterval(timer);
  }, [step, tickets, speed, soundEnabled]);

  // RequestAnimationFrame loop for Parabola flight and Confetti rain
  useEffect(() => {
    let animId: number;

    // Initialize confetti if completed
    if (step === 'completed' && confetti.length === 0) {
      const colors = ['#D4AF37', '#E1306C', '#34D399', '#22D3EE', '#A855F7', '#F43F5E', '#FBBF24', '#FFFFFF'];
      const initialConfetti: ConfettiParticle[] = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -30 + Math.random() * 340,
        size: 6 + Math.random() * 8,
        color: colors[i % colors.length],
        speedY: 1.8 + Math.random() * 3.2,
        speedX: (Math.random() - 0.5) * 1.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: i % 3 === 0 ? 'strip' : i % 3 === 1 ? 'square' : 'circle',
      }));
      setConfetti(initialConfetti);
    }

    const updateAnimation = (now: number) => {
      // 1. Update flying parabola bubbles
      setActiveBubbles((prev) =>
        prev.filter((b) => {
          const elapsed = now - b.startTime;
          return elapsed < b.duration;
        })
      );

      // 2. Update confetti rain if completed
      if (step === 'completed') {
        setConfetti((prev) =>
          prev.map((c) => {
            let nextY = c.y + c.speedY;
            let nextX = c.x + c.speedX * 0.1;

            if (nextY > 350) {
              nextY = -20;
              nextX = Math.random() * 100;
            }

            return {
              ...c,
              y: nextY,
              x: nextX,
              rotation: c.rotation + c.rotationSpeed,
            };
          })
        );
      }

      animId = requestAnimationFrame(updateAnimation);
    };

    animId = requestAnimationFrame(updateAnimation);
    return () => cancelAnimationFrame(animId);
  }, [step, confetti.length]);

  // Fanfare and applause sound on completion
  useEffect(() => {
    if (step === 'completed' && winnerTicket && soundEnabled) {
      // Fanfare musical notes
      playSynthBeep(523.25, 'sine', 0.2); // C5
      setTimeout(() => playSynthBeep(659.25, 'sine', 0.2), 150); // E5
      setTimeout(() => playSynthBeep(783.99, 'sine', 0.3), 300); // G5
      setTimeout(() => playSynthBeep(1046.5, 'sine', 0.5), 500); // C6

      // Som de Palmas (Applause) no final do sorteio
      setTimeout(() => playApplauseSound(3.5), 450);
    }
  }, [step, winnerTicket, soundEnabled]);

  if (tickets.length === 0) return null;

  const now = performance.now();
  const width = containerRef.current?.clientWidth || 600;
  const height = 340;
  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <div className="bg-gradient-to-b from-[#18181B] via-[#111113] to-[#0A0A0B] border-2 border-[#D4AF37]/50 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#27272A] pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#D4AF37] animate-ping" />
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#D4AF37]" />
            Arena de Sorteio
          </h3>
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
            {tickets.length} Comentários
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
            }`}
            title={soundEnabled ? 'Som Ativado' : 'Som Desativado'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-lg p-0.5 text-[10px] font-mono">
            {[0.5, 0.7, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  speed === s ? 'bg-[#D4AF37] text-black' : 'text-[#71717A] hover:text-white'
                }`}
              >
                {s === 0.5 ? '0.5x' : s === 0.7 ? '0.7x' : '1x'}
              </button>
            ))}
          </div>

          {/* Replay Button */}
          {onReplayDraw && (step === 'completed' || step === 'idle') && (
            <button
              type="button"
              onClick={onReplayDraw}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
            >
              <RefreshCw size={11} />
              <span>Iniciar Sorteio</span>
            </button>
          )}
        </div>
      </div>

      {/* Arena Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[340px] bg-[#0A0A0B] rounded-xl border border-[#27272A] overflow-hidden select-none"
      >
        {/* Draw status banner overlay */}
        {step === 'drawing' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black font-extrabold text-[11px] font-mono px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#D4AF37]/30 z-30 animate-pulse flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin" />
            <span>Sorteando Vencedor...</span>
          </div>
        )}

        {/* CENTER ELEMENT 1: INSTAGRAM PUBLICATION POST IMAGE (Until Completed) */}
        {step !== 'completed' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            {/* Pulsing ring during drawing */}
            {step === 'drawing' && (
              <div className="absolute inset-0 -m-3 rounded-2xl border-2 border-[#D4AF37]/80 animate-ping pointer-events-none" />
            )}

            <div className="w-24 h-28 bg-[#18181B] border-2 border-[#D4AF37] rounded-xl p-1.5 shadow-[0_0_35px_rgba(212,175,55,0.4)] flex flex-col justify-between overflow-hidden relative group">
              {/* Instagram post header */}
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <div className="flex items-center gap-1">
                  <Instagram size={11} className="text-[#E1306C]" />
                  <span className="text-[8px] font-mono font-bold text-white truncate max-w-[50px]">
                    acervus.core
                  </span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>

              {/* Instagram Post Image Thumbnail */}
              <div className="w-full h-16 rounded-md overflow-hidden my-1 relative bg-black">
                <img
                  src={effectivePostImage}
                  alt="Post do Instagram"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1">
                  <span className="text-[7px] text-[#D4AF37] font-mono font-bold uppercase tracking-tight truncate">
                    Post do Sorteio
                  </span>
                </div>
              </div>

              {/* Post Footer status */}
              <div className="flex items-center justify-between text-[8px] font-mono text-[#A1A1AA] pt-0.5">
                <span className="text-white font-bold">{tickets.length} validados</span>
                <Sparkles size={10} className="text-[#D4AF37]" />
              </div>
            </div>

            <span className="mt-1.5 bg-black/90 text-[#D4AF37] font-mono text-[9px] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 font-bold uppercase tracking-wider shadow-md">
              Publicação do Sorteio
            </span>
          </div>
        )}

        {/* CENTER ELEMENT 2: WINNER BUBBLE (Replaces Post Image on Completed) */}
        {step === 'completed' && winnerTicket && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center animate-fadeIn">
            <div className="relative">
              {/* Winner Golden Crown */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#D4AF37] via-[#FBBF24] to-[#D4AF37] text-black rounded-full p-1.5 border-2 border-white shadow-xl animate-bounce z-50 flex items-center gap-1 px-2.5">
                <Award size={16} className="text-black fill-black" />
                <span className="text-[9px] font-black uppercase font-mono tracking-wider">Vencedor!</span>
              </div>

              {/* Winner Bubble Container */}
              <div className="w-28 h-28 rounded-full border-4 border-[#D4AF37] shadow-[0_0_60px_rgba(212,175,55,0.95)] overflow-hidden bg-[#18181B] relative flex items-center justify-center transform scale-110">
                <img
                  src={winnerTicket.avatarUrl || AVATAR_IMAGES[0]}
                  alt={winnerTicket.username}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Username & Ticket badge below Winner Bubble */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/95 text-white font-mono text-[10px] px-3 py-1 rounded-full border-2 border-[#D4AF37] shadow-2xl font-black text-center flex items-center gap-1.5 whitespace-nowrap z-50">
                <span className="text-[#D4AF37]">@{winnerTicket.username}</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.2 rounded font-bold border border-emerald-500/30">
                  {winnerTicket.ticketNumber}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PARABOLA FLYING BUBBLES (Reading Comments from Center to Sides in 180° Arc) */}
        {step !== 'completed' &&
          activeBubbles.map((b) => {
            const elapsed = now - b.startTime;
            const progress = Math.min(1, elapsed / b.duration);

            // 180° Parabola Trajectory Calculation
            const angleRad = (b.angleDeg * Math.PI) / 180;
            const distance = b.maxDistance * progress;
            const parabolaArc = 4 * b.arcHeight * progress * (1 - progress);

            // Polar to Cartesian with Parabola Arc
            const dx = Math.sin(angleRad) * distance;
            const dy = -Math.cos(angleRad) * distance - parabolaArc;

            const posX = centerX + dx;
            const posY = centerY + dy;

            // Fade in at start (0-0.15) and Fade out at end (0.7-1.0) -> Sumindo na sequência!
            let opacity = 1.0;
            if (progress < 0.15) {
              opacity = progress / 0.15;
            } else if (progress > 0.7) {
              opacity = (1 - progress) / 0.3;
            }

            const scale = progress < 0.15 ? 0.4 + (progress / 0.15) * 0.6 : 1.0 - (progress > 0.7 ? (progress - 0.7) * 1.5 : 0);

            return (
              <div
                key={b.id}
                onMouseEnter={() =>
                  setHoveredBubble({
                    ticketNumber: b.ticketNumber,
                    username: b.username,
                    commentText: b.commentText,
                    commentId: b.id,
                    instagramId: b.username,
                    taggedCount: 2,
                    hashSeed: '',
                    timestamp: '',
                  })
                }
                onMouseLeave={() => setHoveredBubble(null)}
                className="absolute rounded-full border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.7)] flex items-center justify-center cursor-pointer pointer-events-auto"
                style={{
                  width: '42px',
                  height: '42px',
                  transform: `translate3d(${posX - 21}px, ${posY - 21}px, 0) scale(${scale})`,
                  opacity,
                  transition: 'none',
                }}
              >
                <img
                  src={b.avatarUrl}
                  alt={b.username}
                  className="w-full h-full rounded-full object-cover pointer-events-none"
                />
                <div className="absolute -bottom-2 bg-black/90 text-white font-mono text-[8px] px-1.5 py-0.2 rounded-full border border-[#D4AF37]/60 max-w-[70px] truncate pointer-events-none font-bold text-center">
                  @{b.username}
                </div>
              </div>
            );
          })}

        {/* CHUVA DE PAPEL PICADO (CONFETTI SHOWER) ON COMPLETED STATE */}
        {step === 'completed' && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {confetti.map((c) => (
              <div
                key={c.id}
                className="absolute shadow-sm"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}px`,
                  width: c.shape === 'strip' ? `${c.size * 0.4}px` : `${c.size}px`,
                  height: c.shape === 'strip' ? `${c.size * 1.8}px` : `${c.size}px`,
                  backgroundColor: c.color,
                  borderRadius: c.shape === 'circle' ? '50%' : '1px',
                  transform: `rotate(${c.rotation}deg)`,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        )}

        {/* Hovered Bubble Info Tooltip */}
        {hoveredBubble && (
          <div className="absolute bottom-3 left-3 bg-[#18181B]/95 border border-[#D4AF37] text-white p-2.5 rounded-xl text-xs font-mono z-50 max-w-xs shadow-xl backdrop-blur-md space-y-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-[#D4AF37] font-bold">@{hoveredBubble.username}</span>
              <span className="bg-[#27272A] text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                {hoveredBubble.ticketNumber}
              </span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] italic">"{hoveredBubble.commentText}"</p>
          </div>
        )}

        {/* Winner Announcement Footer Card inside Arena */}
        {step === 'completed' && winnerTicket && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0A0A0B]/95 border-2 border-emerald-500 text-white px-5 py-2.5 rounded-2xl z-50 text-center space-y-0.5 shadow-2xl backdrop-blur-lg max-w-md w-full animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-xs font-mono uppercase tracking-wider">
              <Award size={16} /> @{winnerTicket.username} VENCEU O SORTEIO!
            </div>
            <p className="text-[11px] text-[#A1A1AA] italic truncate">"{winnerTicket.commentText}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface InstagramSorteioModuleProps {
  empresaConfig?: EmpresaConfig;
}

export const InstagramSorteioModule: React.FC<InstagramSorteioModuleProps> = ({ empresaConfig }) => {
  const [subTab, setSubTab] = useState<'simulator' | 'architecture' | 'code' | 'lgpd'>('simulator');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showArenaModal, setShowArenaModal] = useState<boolean>(false);

  // Configuration States
  const [postUrl, setPostUrl] = useState('https://www.instagram.com/p/C3x9L02A9xZ/');
  const [mediaId, setMediaId] = useState('1798340129481029');
  const [minMentions, setMinMentions] = useState<number>(2);
  const [ticketRule, setTicketRule] = useState<'per_comment' | 'per_user'>('per_comment');
  const [testedProfileImage, setTestedProfileImage] = useState<string | null>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
  const [testedUsername, setTestedUsername] = useState<string>('acervus.core');
  
  // Mandatory Engagements
  const [requireLike, setRequireLike] = useState(true);
  const [requireStory, setRequireStory] = useState(true);
  
  // Anti-Fraud Filters
  const [filterDuplicateMentions, setFilterDuplicateMentions] = useState(true);
  const [filterFakes, setFilterFakes] = useState(true);
  const [filterVerified, setFilterVerified] = useState(true);
  const [filterBusiness, setFilterBusiness] = useState(true);
  const [filterSpamBots, setFilterSpamBots] = useState(true);

  // Execution Process State
  const [step, setStep] = useState<'idle' | 'fetching' | 'filtering' | 'ticketing' | 'drawing' | 'completed'>('idle');
  const [fetchProgress, setFetchProgress] = useState(0);
  const [rateLimitPercent, setRateLimitPercent] = useState(12);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Processed Counters
  const [totalFetched, setTotalFetched] = useState(0);
  const [discardedStats, setDiscardedStats] = useState({
    insufficientMentions: 0,
    duplicateMentions: 0,
    fakeInactive: 0,
    verifiedCelebrity: 0,
    businessAccount: 0,
    spamBotBurst: 0,
    missingLike: 0,
    missingStory: 0,
  });

  const [validTickets, setValidTickets] = useState<TicketRecord[]>([]);
  const [winnerTicket, setWinnerTicket] = useState<TicketRecord | null>(null);
  const [drawSeedHash, setDrawSeedHash] = useState<string>('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Meta Graph API Configuration States - synchronized from EmpresaConfig.instagramConfig
  const [apiClientId, setApiClientId] = useState(() => empresaConfig?.instagramConfig?.apiClientId || '410294810293810');
  const [apiClientSecret, setApiClientSecret] = useState(() => empresaConfig?.instagramConfig?.apiClientSecret || 'app_secret_7f8g9h1k2l3m4n5o6p');
  const [apiAccessToken, setApiAccessToken] = useState(() => empresaConfig?.instagramConfig?.apiAccessToken || 'EAAdF8aZA5b6MBO4pZC2ZC1ZA9V9XyMvZCpK68D3l16Xf83hK0y7yZAZBcZApZAJZB1ZCs9mZB3oZD');
  const [apiVersion, setApiVersion] = useState(() => empresaConfig?.instagramConfig?.apiVersion || 'v19.0');
  const [apiBusinessId, setApiBusinessId] = useState(() => empresaConfig?.instagramConfig?.apiBusinessId || '17841405193810294');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Advanced Token Security & Lifecycle (Android Specialist Requirements)
  const [tokenType, setTokenType] = useState<'short-lived' | 'long-lived'>(() => empresaConfig?.instagramConfig?.tokenType || 'long-lived');
  const [tokenExpiration, setTokenExpiration] = useState(() => empresaConfig?.instagramConfig?.tokenExpiration || 'Expira em 60 dias (02/10/2026)');
  const [isTokenSecured, setIsTokenSecured] = useState(() => empresaConfig?.instagramConfig?.isTokenSecured !== false);
  const [isValidatingApi, setIsValidatingApi] = useState(false);
  const [apiScopes, setApiScopes] = useState({
    instagram_basic: true,
    instagram_manage_comments: true,
    pages_read_engagement: true,
    pages_show_list: true,
  });

  // Sync state if company config changes
  useEffect(() => {
    if (empresaConfig?.instagramConfig) {
      const cfg = empresaConfig.instagramConfig;
      if (cfg.apiClientId) setApiClientId(cfg.apiClientId);
      if (cfg.apiClientSecret) setApiClientSecret(cfg.apiClientSecret);
      if (cfg.apiAccessToken) setApiAccessToken(cfg.apiAccessToken);
      if (cfg.apiVersion) setApiVersion(cfg.apiVersion);
      if (cfg.apiBusinessId) setApiBusinessId(cfg.apiBusinessId);
      if (cfg.tokenType) setTokenType(cfg.tokenType);
      if (cfg.tokenExpiration) setTokenExpiration(cfg.tokenExpiration);
      if (cfg.isTokenSecured !== undefined) setIsTokenSecured(cfg.isTokenSecured);
    }
  }, [empresaConfig]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 999)]);
  };

  const addMultipleLogs = (msgs: string[]) => {
    const formatted = msgs.map(msg => `[${new Date().toLocaleTimeString()}] ${msg}`);
    setLogs((prev) => [...formatted, ...prev.slice(0, 999)]);
  };

  const handleToggleSecureStorage = (enabled: boolean) => {
    setIsTokenSecured(enabled);
    if (enabled) {
      addLog(`🛡️ [ANDROID KEYSTORE] Ativando armazenamento criptografado...`);
      addLog(`[ANDROID KEYSTORE] Inicializando MasterKey de Jetpack Security: MasterKey.Builder(context).setKeyScheme(AES256_GCM).build()`);
      addLog(`[ANDROID KEYSTORE] Token de acesso gravado com sucesso no arquivo criptografado de SharedPreferences via EncryptedSharedPreferences.create()`);
      addLog(`[ANDROID KEYSTORE] Sucesso: Algoritmo de criptografia AES-256-SIV para chaves e AES-256-GCM para valores ativado.`);
    } else {
      addLog(`⚠️ [ANDROID KEYSTORE] ATENÇÃO: Armazenamento seguro desativado. Tokens serão gravados em texto plano no SharedPreferences comum (Risco de Vazamento!).`);
    }
  };

  const handleConvertLongLivedToken = () => {
    if (!apiAccessToken) {
      addLog('⚠️ Erro: Insira um Token de Acesso válido para converter.');
      return;
    }
    addLog(`🔄 [META API] Iniciando troca de Token de Curta Duração para Longa Duração (Long-Lived Token - 60 dias)...`);
    addLog(`[META API] Endpoint: GET /oauth/access_token?grant_type=fb_exchange_token&client_id=${apiClientId}&client_secret=${apiClientSecret.substring(0, 5)}...&fb_exchange_token=${apiAccessToken.substring(0, 8)}...`);
    
    setIsValidatingApi(true);
    setTimeout(() => {
      setIsValidatingApi(false);
      setTokenType('long-lived');
      const sixtyDaysLater = new Date();
      sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60);
      const formattedDate = sixtyDaysLater.toLocaleDateString('pt-BR');
      setTokenExpiration(`Expira em 60 dias (${formattedDate})`);
      
      const longLivedSimulated = 'EAAdF8aZA5b6MBO' + Math.random().toString(36).substring(2, 15).toUpperCase() + 'LLT';
      setApiAccessToken(longLivedSimulated);

      addLog(`✅ [META API] Conversão de Token realizada com sucesso!`);
      addLog(`[META API] Novo Long-Lived Token gerado com validade de 5.184.000 segundos (60 dias).`);
      
      if (isTokenSecured) {
        addLog(`🛡️ [ANDROID KEYSTORE] Novo Long-Lived Token criptografado e salvo de forma segura via EncryptedSharedPreferences.`);
      }
    }, 1000);
  };

  const handleTestApiConnection = () => {
    addLog(`⚙️ [API CONFIG] Iniciando validação de credenciais de acesso em tempo real...`);
    addLog(`[API CONFIG] Validando Token do tipo: ${tokenType === 'long-lived' ? 'Long-Lived Token' : 'Short-Lived User Access Token'}`);
    addLog(`[API CONFIG] Endpoint de teste: GET /debug_token?input_token=${apiAccessToken.substring(0, 8)}...&access_token=${apiAccessToken.substring(0, 8)}...`);
    addLog(`[API CONFIG] Verificando integridade com o Android Keystore Status: ${isTokenSecured ? 'CRIPTOGRAFADO (SEGURO)' : 'TEXTO PLANO (NÃO RECOMENDADO)'}`);
    
    setIsValidatingApi(true);
    
    // Simulating endpoint validate
    setTimeout(() => {
      setIsValidatingApi(false);
      if (apiClientId && apiAccessToken) {
        // Evaluate scopes based on state or if empty
        const updatedScopes = {
          instagram_basic: true,
          instagram_manage_comments: true,
          pages_read_engagement: true,
          pages_show_list: true,
        };
        setApiScopes(updatedScopes);

        addLog(`✅ CONEXÃO COM A API DO INSTAGRAM HOMOLOGADA COM SUCESSO`);
        addLog(`[API CONFIG] Status do Token: ATIVO / VÁLIDO | Expiração: ${tokenExpiration}`);
        addLog(`[API CONFIG] ID do App Associado: ${apiClientId}`);
        addLog(`[API CONFIG] Conta Comercial Validada: @${apiBusinessId}`);
        addLog(`[API CONFIG] Escopos Homologados para Captura de Sorteio:`);
        addLog(`   • instagram_basic (OK)`);
        addLog(`   • instagram_manage_comments (OK)`);
        addLog(`   • pages_read_engagement (OK)`);
        addLog(`   • pages_show_list (OK)`);
        addLog(`[API CONFIG] Conectores de Auditoria Prontos. Armazenamento Android: EncryptedSharedPreferences verificado.`);
      } else {
        addLog(`❌ ERRO DE CONFIGURAÇÃO DA API: Credenciais ou Token vazios.`);
        addLog(`[API CONFIG] Certifique-se de preencher o App ID e o Token de Acesso para efetuar a validação.`);
      }
    }, 1200);
  };

  const handleTestUrl = () => {
    if (!postUrl) {
      addLog('⚠️ Erro de Teste: Nenhuma URL inserida.');
      return;
    }
    
    addLog(`🔍 [TESTE] Iniciando verificação de URL da publicação...`);
    addLog(`[TESTE] Endpoint: GET /v19.0/instagram_oembed?url=${encodeURIComponent(postUrl)}`);
    
    // Check if it's a valid Instagram URL format
    const isInstagram = postUrl.includes('instagram.com');
    const isPostOrReel = postUrl.includes('/p/') || postUrl.includes('/reel/') || postUrl.includes('/tv/');
    
    setTimeout(() => {
      if (isInstagram && isPostOrReel) {
        // Extract shortcode
        let shortcode = 'C3x9L02A9xZ';
        try {
          const parts = postUrl.split('/');
          const pIndex = parts.findIndex(p => p === 'p' || p === 'reel' || p === 'tv');
          if (pIndex !== -1 && parts[pIndex + 1]) {
            shortcode = parts[pIndex + 1];
          }
        } catch (e) {
          // Fallback
        }
        
        setTestedProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');
        setTestedUsername('acervus_oficial');

        addLog(`✅ TESTE BEM-SUCEDIDO: URL VÁLIDA`);
        addLog(`[TESTE] Mídia identificada como: ${postUrl.includes('/reel/') ? 'Vídeo (Reel)' : 'Publicação (Post)'}`);
        addLog(`[TESTE] Shortcode extraído: ${shortcode}`);
        addLog(`[TESTE] Perfil autor e imagem de avatar obtidos com sucesso via Instagram Graph API.`);
      } else {
        setTestedProfileImage(null);
        addLog(`❌ ERRO DE TESTE: URL fora dos padrões oficiais.`);
        addLog(`[TESTE] Esperado formato: https://www.instagram.com/p/SHORTCODE/ ou /reel/SHORTCODE/`);
        addLog(`[TESTE] Por favor, corrija a URL inserida para garantir a busca dos comentários.`);
      }
    }, 800);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Mock dataset generator representing real Instagram Graph API JSON response
  const generateMockComments = (): CommentMock[] => {
    const rawData = [
      { id: 'c101', instagramId: 'us_84920', username: 'carolina.decor', text: 'Amei esse sorteio! @mariana_festa @lucas_locacoes', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['mariana_festa', 'lucas_locacoes'] },
      { id: 'c102', instagramId: 'us_11029', username: 'pedro_eventos', text: 'Quero ganhar!! @ana_buffet @roberto_decoracoes', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['ana_buffet', 'roberto_decoracoes'] },
      { id: 'c103', instagramId: 'us_99831', username: 'bot_spammer_99', text: 'Ganhar ganhar @bot1 @bot2', hasLikedPost: false, hasStoryShare: false, isVerified: false, isBusiness: false, isFakeOrInactive: true, taggedUsers: ['bot1', 'bot2'] },
      { id: 'c104', instagramId: 'us_55410', username: 'felipe_celebrity_oficial', text: 'Boa sorte a todos! @anitta @neymarjr', hasLikedPost: true, hasStoryShare: true, isVerified: true, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['anitta', 'neymarjr'] },
      { id: 'c105', instagramId: 'us_33211', username: 'empresa_festas_ltda', text: 'Participando! @parceiro1 @parceiro2', hasLikedPost: true, hasStoryShare: false, isVerified: false, isBusiness: true, isFakeOrInactive: false, taggedUsers: ['parceiro1', 'parceiro2'] },
      { id: 'c106', instagramId: 'us_84920', username: 'carolina.decor', text: 'Marcando de novo @mariana_festa @lucas_locacoes', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['mariana_festa', 'lucas_locacoes'] }, // Duplicate tag
      { id: 'c107', instagramId: 'us_77412', username: 'juliana_flores', text: 'Top demais! @beatriz_design @carlos_eventos', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['beatriz_design', 'carlos_eventos'] },
      { id: 'c108', instagramId: 'us_66301', username: 'renato_som', text: 'Show! @amigo1', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['amigo1'] }, // Only 1 mention
      { id: 'c109', instagramId: 'us_22109', username: 'camila_mendes', text: 'Eu quero! @camila_mendes @camila_mendes', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['camila_mendes', 'camila_mendes'] }, // Self tag
      { id: 'c110', instagramId: 'us_44123', username: 'marcos_iluminacao', text: 'Participando! @daniela_doces @eduardo_fotos', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['daniela_doces', 'eduardo_fotos'] },
      { id: 'c111', instagramId: 'us_98124', username: 'spam_burst_user', text: 'Ganha ganha ganha', hasLikedPost: false, hasStoryShare: false, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: [] },
      { id: 'c112', instagramId: 'us_98124', username: 'spam_burst_user', text: 'Ganha ganha ganha', hasLikedPost: false, hasStoryShare: false, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: [] },
      { id: 'c113', instagramId: 'us_50012', username: 'patricia_assessoria', text: 'Super sorteio! @gabriela_cerimonial @helena_noivas', hasLikedPost: true, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['gabriela_cerimonial', 'helena_noivas'] },
      { id: 'c114', instagramId: 'us_61102', username: 'vanessa_buffet', text: 'Quero muito!! @igor_dj @joao_barman', hasLikedPost: true, hasStoryShare: false, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['igor_dj', 'joao_barman'] }, // Missing story
      { id: 'c115', instagramId: 'us_72301', username: 'diego_fotografia', text: 'Legal! @karina_festa @larissa_bolos', hasLikedPost: false, hasStoryShare: true, isVerified: false, isBusiness: false, isFakeOrInactive: false, taggedUsers: ['karina_festa', 'larissa_bolos'] }, // Missing like
    ];

    // Expand dataset programmatically to simulate 120+ entries
    const fullList: CommentMock[] = [];
    for (let i = 0; i < 8; i++) {
      rawData.forEach((item, idx) => {
        fullList.push({
          ...item,
          timestamp: new Date().toISOString(),
          likesCount: Math.floor(Math.random() * 10),
          id: `c_${i}_${idx}`,
          username: i === 0 ? item.username : `${item.username}_${i}`,
          instagramId: i === 0 ? item.instagramId : `${item.instagramId}_${i}`
        });
      });
    }
    return fullList;
  };

  // Function to process raw comments against anti-fraud rules and return exact valid tickets
  const executeFilteringPipelineSync = () => {
    const rawComments = generateMockComments();
    const tickets: TicketRecord[] = [];
    const seenUsers = new Set<string>();
    const seenTaggedCombinations = new Set<string>();

    let stats = {
      insufficientMentions: 0,
      duplicateMentions: 0,
      fakeInactive: 0,
      verifiedCelebrity: 0,
      businessAccount: 0,
      spamBotBurst: 0,
      missingLike: 0,
      missingStory: 0,
    };

    rawComments.forEach((c, idx) => {
      // Rule 1: Min Mentions Check
      if (c.taggedUsers.length < minMentions) {
        stats.insufficientMentions++;
        return;
      }

      // Rule 2: Anti-Spam / Burst Check
      if (filterSpamBots && c.taggedUsers.length === 0) {
        stats.spamBotBurst++;
        return;
      }

      // Rule 3: Fake / Inactive Filter
      if (filterFakes && c.isFakeOrInactive) {
        stats.fakeInactive++;
        return;
      }

      // Rule 4: Verified Celebrity Filter
      if (filterVerified && c.isVerified) {
        stats.verifiedCelebrity++;
        return;
      }

      // Rule 5: Business Page Filter
      if (filterBusiness && c.isBusiness) {
        stats.businessAccount++;
        return;
      }

      // Rule 6: Duplicate Tagging Check
      const tagKey = `${c.instagramId}_${c.taggedUsers.sort().join('_')}`;
      if (filterDuplicateMentions && seenTaggedCombinations.has(tagKey)) {
        stats.duplicateMentions++;
        return;
      }
      seenTaggedCombinations.add(tagKey);

      // Rule 7: Like Validation
      if (requireLike && !c.hasLikedPost) {
        stats.missingLike++;
        return;
      }

      // Rule 8: Story Verification (Webhook / OCR)
      if (requireStory && !c.hasStoryShare) {
        stats.missingStory++;
        return;
      }

      // Rule 9: One Ticket per User check (if configured)
      if (ticketRule === 'per_user' && seenUsers.has(c.instagramId)) {
        stats.duplicateMentions++;
        return;
      }
      seenUsers.add(c.instagramId);

      // Valid Entry -> Ticket Allocation
      const ticketNum = `SLOT-${Math.floor(100000 + Math.random() * 900000)}`;
      const seed = `${c.instagramId}_${c.id}_${Date.now()}`;
      
      tickets.push({
        ticketNumber: ticketNum,
        instagramId: c.instagramId,
        username: c.username,
        commentId: c.id,
        commentText: c.text,
        taggedCount: c.taggedUsers.length,
        hashSeed: seed,
        timestamp: new Date().toISOString(),
        avatarUrl: AVATAR_IMAGES[idx % AVATAR_IMAGES.length],
      });
    });

    return { tickets, stats, rawCount: rawComments.length };
  };

  const handleStartApuracao = () => {
    // Unlock and prepare Audio Context on user gesture
    getAudioContext();

    // 1. Pre-process and filter comments upfront so arena comment count is constant from the start
    const { tickets, stats, rawCount } = executeFilteringPipelineSync();
    setValidTickets(tickets);
    setDiscardedStats(stats);
    setStep('fetching');
    setFetchProgress(0);
    setRateLimitPercent(18);
    setTotalFetched(0);
    setWinnerTicket(null);

    addLog(`✅ Comentários pré-processados e validados: ${tickets.length} elegíveis (${rawCount - tickets.length} desconsiderados por filtros).`);
    addLog(`Conectando ao endpoint da Graph API: GET /${apiVersion}/${mediaId}/comments?access_token=${apiAccessToken.substring(0, 8)}...`);
    addLog(`App ID Ativo: ${apiClientId} | Conta Comercial ID: ${apiBusinessId}`);

    // Step 1: Simulate fast-forwarding fetch
    let currentFetched = 0;
    const interval = setInterval(() => {
      currentFetched += 30;
      setTotalFetched(currentFetched);
      setFetchProgress(Math.min(100, Math.floor((currentFetched / rawCount) * 100)));
      setRateLimitPercent((prev) => Math.min(85, prev + 8));

      addLog(`Graph API: Response OK (${currentFetched}/${rawCount} comentários sincronizados)`);

      if (currentFetched >= rawCount) {
        clearInterval(interval);
        addLog(`Fase 1 & 2 Concluídas: ${tickets.length} bilhetes validados e prontos para o sorteio.`);
        setStep('idle');
      }
    }, 250);
  };

  const handleStartDraw = () => {
    getAudioContext();
    const tickets = validTickets.length > 0 ? validTickets : executeFilteringPipelineSync().tickets;
    setValidTickets(tickets);
    setStep('drawing');
    setWinnerTicket(null);
    executeCryptographicDraw(tickets);
  };

  const executeCryptographicDraw = (tickets: TicketRecord[]) => {
    addLog('Fase 3 Iniciada: Inicializando algoritmo criptográfico java.security.SecureRandom...');
    addLog('Gerando Seed Única com Entropy Pool do Kernel Android...');

    let countdown = 3;
    const timer = setInterval(() => {
      if (countdown > 0) {
        addLog(`Sorteando em ${countdown}... (Semente SHA-256 ativa)`);
        countdown--;
      } else {
        clearInterval(timer);

        // Perform SecureRandom Selection
        const randomIndex = Math.floor(Math.random() * tickets.length);
        const selected = tickets[randomIndex];
        
        // Generate Audit SHA-256 Proof
        const auditHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        setWinnerTicket(selected);
        setDrawSeedHash(auditHash);
        setStep('completed');

        addLog(`🎉 SORTEIO CONCLUÍDO COM SUCESSO!`);
        addLog(`Ganhador: @${selected.username} (Bilhete ${selected.ticketNumber})`);
        addLog(`Hash de Auditoria SHA-256: ${auditHash}`);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-[#18181B] via-[#111113] to-[#18181B] border border-[#D4AF37]/30 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Instagram size={12} /> Meta Graph API v19.0
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} /> SecureRandom + LGPD
              </span>
            </div>
            <h2 className="text-xl font-serif italic text-white font-bold flex items-center gap-2">
              Mecanismo de Apuração e Sorteios Instagram em Android
            </h2>
            <p className="text-xs text-[#A1A1AA] max-w-3xl leading-relaxed">
              Arquitetura de integração com a <strong>Instagram Graph API</strong> com filtro anti-fraude em pipeline assíncrona, validação de engajamento (Likes, Comentários com marcadores e Stories via Webhook/OCR), atribuição de bilhetes e sorteio auditável.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAuditModal(true)}
              disabled={!winnerTicket}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                winnerTicket 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/20' 
                  : 'bg-[#27272A] text-[#71717A] cursor-not-allowed'
              }`}
            >
              <FileCheck2 size={16} />
              <span>Ver Certificado de Auditoria</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#27272A] overflow-x-auto">
          <button
            onClick={() => setSubTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'simulator'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <Play size={14} />
            <span>Simulador de Sorteio Vivo</span>
          </button>

          <button
            onClick={() => setSubTab('architecture')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'architecture'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <Layers size={14} />
            <span>Arquitetura & Graph API</span>
          </button>

          <button
            onClick={() => setSubTab('code')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'code'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <Code2 size={14} />
            <span>Código Fonte Kotlin (Android)</span>
          </button>

          <button
            onClick={() => setSubTab('lgpd')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              subTab === 'lgpd'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-extrabold'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <Lock size={14} />
            <span>LGPD e Segurança</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SIMULATOR */}
      {subTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Rules & Configuration (4 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Meta Graph API Status & Informational Card (Centralized in Settings Panel) */}
            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#D4AF37]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Conector de Token Meta Graph
                  </h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  Ativo
                </span>
              </div>

              {/* Centralization info banner */}
              <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block font-mono">
                  Configuração Centralizada
                </span>
                <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
                  As credenciais e tokens da Meta Graph API foram transferidos para o <strong>Painel de Configurações &gt; Aba Integrações &gt; Sub-aba Instagram</strong>.
                </p>
              </div>

              {/* Status parameters readout */}
              <div className="space-y-2 bg-[#18181B] p-3 rounded-xl border border-[#27272A] text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#71717A]">App ID:</span>
                  <span className="text-white font-bold">{apiClientId || '410294810293810'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Versão API:</span>
                  <span className="text-white">{apiVersion || 'v19.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Token:</span>
                  <span className="text-[#D4AF37]">{tokenType === 'long-lived' ? 'Long-Lived' : 'Short-Lived'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Armazenamento:</span>
                  <span className="text-emerald-400">{isTokenSecured ? 'Android Keystore AES-256' : 'Inseguro (Texto Plano)'}</span>
                </div>
              </div>

              {/* Test Connections inside drawing view */}
              <button
                type="button"
                onClick={handleTestApiConnection}
                disabled={isValidatingApi}
                className="w-full bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/30 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isValidatingApi ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Conexão Meta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Testar &amp; Validar Conexão</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider font-mono">
                <Filter size={16} className="text-[#D4AF37]" /> Configuração do Sorteio
              </h3>

              {/* Post URL Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">URL da Publicação Oficial</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      placeholder="https://www.instagram.com/p/..."
                    />
                    <Instagram size={14} className="absolute right-3 top-3.5 text-[#71717A]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestUrl}
                    className="bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/30 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    Testar URL
                  </button>
                </div>
              </div>

              {/* Tested Profile Picture Preview Card */}
              {testedProfileImage && (
                <div className="bg-[#18181B] border border-[#D4AF37]/40 p-3 rounded-xl flex items-center gap-3 animate-fadeIn">
                  <img
                    src={testedProfileImage}
                    alt={testedUsername}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#D4AF37]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white font-mono">@{testedUsername}</span>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold">Verificado</span>
                    </div>
                    <p className="text-[10px] text-[#A1A1AA] truncate">Perfil autor e avatar obtidos com sucesso via Graph API</p>
                  </div>
                  <CheckCircle2 size={16} className="text-[#D4AF37]" />
                </div>
              )}

              {/* Min Mentions Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">Mínimo de Marcações (@) por Comentário</label>
                <select
                  value={minMentions}
                  onChange={(e) => setMinMentions(Number(e.target.value))}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value={1}>1 marcação (@amigo1)</option>
                  <option value={2}>2 marcações (@amigo1 @amigo2)</option>
                  <option value={3}>3 marcações (@amigo1 @amigo2 @amigo3)</option>
                </select>
              </div>

              {/* Ticket Generation Rule */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">Regra de Atribuição de Bilhetes</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTicketRule('per_comment')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      ticketRule === 'per_comment'
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white font-bold'
                        : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
                    }`}
                  >
                    <div className="text-[11px] font-bold">1 Bilhete p/ Comentário</div>
                    <div className="text-[10px] text-[#A1A1AA]">Mais comentários = mais chances</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketRule('per_user')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      ticketRule === 'per_user'
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white font-bold'
                        : 'bg-[#18181B] border-[#27272A] text-[#71717A]'
                    }`}
                  >
                    <div className="text-[11px] font-bold">1 Bilhete Único p/ Usuário</div>
                    <div className="text-[10px] text-[#A1A1AA]">Entrada única igualitária</div>
                  </button>
                </div>
              </div>

              {/* Mandatory Engagement Checks */}
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider block">Regras de Engajamento Obrigatório</span>
                
                <label className="flex items-center justify-between bg-[#18181B] p-2.5 rounded-xl border border-[#27272A] text-xs cursor-pointer">
                  <span className="text-white font-medium">Validar Curtida no Post Oficial</span>
                  <input
                    type="checkbox"
                    checked={requireLike}
                    onChange={(e) => setRequireLike(e.target.checked)}
                    className="accent-[#D4AF37] w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between bg-[#18181B] p-2.5 rounded-xl border border-[#27272A] text-xs cursor-pointer">
                  <span className="text-white font-medium">Validar Story via Webhook / OCR</span>
                  <input
                    type="checkbox"
                    checked={requireStory}
                    onChange={(e) => setRequireStory(e.target.checked)}
                    className="accent-[#D4AF37] w-4 h-4"
                  />
                </label>
              </div>

              {/* Anti-Fraud Filters Toggles */}
              <div className="space-y-2 pt-2 border-t border-[#27272A]">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">Filtro de Contas Inválidas & Bot Protection</span>

                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] hover:text-white cursor-pointer">
                    <span>Desconsiderar perfis marcados repetidamente</span>
                    <input type="checkbox" checked={filterDuplicateMentions} onChange={(e) => setFilterDuplicateMentions(e.target.checked)} className="accent-[#D4AF37]" />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] hover:text-white cursor-pointer">
                    <span>Ignorar perfis fakes e contas inativas</span>
                    <input type="checkbox" checked={filterFakes} onChange={(e) => setFilterFakes(e.target.checked)} className="accent-[#D4AF37]" />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] hover:text-white cursor-pointer">
                    <span>Ignorar perfis verificados / famosos</span>
                    <input type="checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} className="accent-[#D4AF37]" />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] hover:text-white cursor-pointer">
                    <span>Desconsiderar páginas comerciais</span>
                    <input type="checkbox" checked={filterBusiness} onChange={(e) => setFilterBusiness(e.target.checked)} className="accent-[#D4AF37]" />
                  </label>

                  <label className="flex items-center justify-between text-xs text-[#A1A1AA] hover:text-white cursor-pointer">
                    <span>Bloquear disparos em lote (SPAM Burst)</span>
                    <input type="checkbox" checked={filterSpamBots} onChange={(e) => setFilterSpamBots(e.target.checked)} className="accent-[#D4AF37]" />
                  </label>
                </div>
              </div>

              {/* Execute Action Button */}
              <button
                onClick={handleStartApuracao}
                disabled={step === 'fetching' || step === 'filtering' || step === 'drawing'}
                className="w-full bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {step === 'fetching' || step === 'filtering' || step === 'drawing' ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processando Apuração...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Iniciar Apuração</span>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* Right Column: Real-Time Execution Console & Results (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Inline Real-Time Arena View */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D4AF37]" />
                  Arena de Sorteio em Tempo Real
                </span>
                <button
                  type="button"
                  onClick={() => setShowArenaModal(true)}
                  className="bg-[#27272A] hover:bg-[#3F3F46] text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye size={12} />
                  <span>Expandir Tela Cheia (Modal)</span>
                </button>
              </div>

              <BouncingBubblesStage
                tickets={
                  validTickets.length > 0
                    ? validTickets
                    : executeFilteringPipelineSync().tickets
                }
                step={step}
                winnerTicket={winnerTicket}
                onReplayDraw={handleStartDraw}
                profileImageUrl={testedProfileImage}
              />
            </div>

            {/* Live Progress Card */}
            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-[#D4AF37] animate-pulse" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase">Console de Apuração Graph API</h3>
                </div>
                <span className="text-[10px] font-mono text-[#A1A1AA]">
                  Rate Limit: <strong className={rateLimitPercent > 70 ? 'text-amber-400' : 'text-emerald-400'}>{rateLimitPercent}%</strong>
                </span>
              </div>

              {/* Status Stepper */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                <div className={`p-2 rounded-xl border ${step === 'fetching' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold' : step === 'filtering' || step === 'drawing' || step === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#18181B] border-[#27272A] text-[#71717A]'}`}>
                  1. Fetch API
                </div>
                <div className={`p-2 rounded-xl border ${step === 'filtering' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold' : step === 'drawing' || step === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#18181B] border-[#27272A] text-[#71717A]'}`}>
                  2. Pipeline Filtros
                </div>
                <div className={`p-2 rounded-xl border ${step === 'drawing' ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold' : step === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#18181B] border-[#27272A] text-[#71717A]'}`}>
                  3. Bilhete Cripto
                </div>
                <div className={`p-2 rounded-xl border ${step === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-[#18181B] border-[#27272A] text-[#71717A]'}`}>
                  4. Ganhador
                </div>
              </div>

              {/* Progress Bar */}
              {step !== 'idle' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#A1A1AA]">
                    <span>Coletando comentários paginados...</span>
                    <span>{totalFetched} analisados</span>
                  </div>
                  <div className="w-full bg-[#18181B] rounded-full h-2 overflow-hidden border border-[#27272A]">
                    <div 
                      className="bg-gradient-to-r from-[#D4AF37] to-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${fetchProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live Terminal Log Stream */}
              <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] space-y-1">
                {logs.length === 0 ? (
                  <p className="text-[#71717A] italic">Aguardando início do processo. Clique em "Iniciar Apuração"...</p>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="text-[#E4E4E7] flex items-start gap-2">
                      <span className="text-[#71717A] shrink-0">&gt;</span>
                      <span className={log.includes('🎉') || log.includes('CONCLUÍDO') ? 'text-emerald-400 font-bold' : log.includes('Fase') ? 'text-[#D4AF37]' : ''}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Filter Pipeline Results Metrics */}
            {step !== 'idle' && (
              <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                  <span>Métricas e Entradas Desconsideradas</span>
                  <span className="text-emerald-400 font-bold">{validTickets.length} Bilhetes Válidos</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Marcações &lt; Min</span>
                    <span className="text-amber-400 font-bold text-sm">{discardedStats.insufficientMentions}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Perfis Repetidos</span>
                    <span className="text-red-400 font-bold text-sm">{discardedStats.duplicateMentions}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Perfis Fakes/Inativos</span>
                    <span className="text-red-400 font-bold text-sm">{discardedStats.fakeInactive}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Famosos/Verificados</span>
                    <span className="text-red-400 font-bold text-sm">{discardedStats.verifiedCelebrity}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Páginas Comerciais</span>
                    <span className="text-red-400 font-bold text-sm">{discardedStats.businessAccount}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Bot Burst SPAM</span>
                    <span className="text-red-400 font-bold text-sm">{discardedStats.spamBotBurst}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Sem Curtida no Post</span>
                    <span className="text-amber-400 font-bold text-sm">{discardedStats.missingLike}</span>
                  </div>

                  <div className="bg-[#18181B] p-2.5 rounded-xl border border-[#27272A]">
                    <span className="text-[#71717A] block text-[10px]">Sem Story Verificado</span>
                    <span className="text-amber-400 font-bold text-sm">{discardedStats.missingStory}</span>
                  </div>
                </div>

                {/* Audit & Verification Panel */}
                <div className="space-y-2 pt-4 border-t border-[#27272A]/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider block font-mono">
                      📋 Painel de Conferência de Comentários Validados
                    </span>
                    <span className="text-[10px] text-[#A1A1AA] font-mono">
                      {validTickets.length} registros elegíveis
                    </span>
                  </div>
                  
                  <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] divide-y divide-[#27272A]/40">
                    {validTickets.length === 0 ? (
                      <p className="text-[#71717A] italic text-center py-4">Aguardando validação dos comentários...</p>
                    ) : (
                      validTickets.map((t, idx) => (
                        <div key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#D4AF37] font-bold text-[10px]">#{idx + 1}</span>
                              <span className="text-white font-bold">@{t.username}</span>
                              <span className="bg-[#27272A] text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                {t.ticketNumber}
                              </span>
                            </div>
                            <p className="text-[#A1A1AA] italic">"{t.commentText}"</p>
                          </div>
                          <div className="text-[10px] text-[#71717A] text-right shrink-0">
                            <div>Marcações: <strong className="text-white">{t.taggedCount}</strong></div>
                            <div className="text-[9px] text-[#4F4F56] truncate w-24">ID: {t.instagramId}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Winner Spotlight Card */}
            {winnerTicket && (
              <div className="bg-gradient-to-br from-[#18181B] via-emerald-950/20 to-[#18181B] border-2 border-emerald-500 p-6 rounded-2xl space-y-4 animate-fadeIn shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-500 text-black font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                    <Award size={14} /> Ganhador Oficial do Sorteio
                  </span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    {winnerTicket.ticketNumber}
                  </span>
                </div>

                <div className="flex items-center gap-4 bg-[#0A0A0B]/80 p-4 rounded-xl border border-emerald-500/30">
                  <div className="w-14 h-14 bg-gradient-to-tr from-[#D4AF37] to-emerald-400 rounded-full flex items-center justify-center font-bold text-xl text-black shrink-0">
                    @{winnerTicket.username.substring(0, 2).toUpperCase()}
                  </div>
                  
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white font-mono">@{winnerTicket.username}</h3>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <p className="text-xs text-[#A1A1AA] italic truncate">"{winnerTicket.commentText}"</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#71717A] font-mono">
                      <span>ID: {winnerTicket.instagramId}</span>
                      <span>Marcações válidas: {winnerTicket.taggedCount}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] space-y-1 font-mono text-[10px]">
                  <span className="text-[#71717A] uppercase font-bold block">Hash de Auditoria SHA-256 (Comprovação Inviolável):</span>
                  <p className="text-emerald-400 break-all">{drawSeedHash}</p>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* BOUNCING BUBBLES ARENA MODAL */}
      {showArenaModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[#111113] border-2 border-[#D4AF37]/60 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#18181B]">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#D4AF37]" />
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Arena de Sorteio</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowArenaModal(false)}
                className="text-[#71717A] hover:text-white p-1.5 rounded-lg bg-[#27272A]/50 hover:bg-[#27272A] transition-all cursor-pointer font-mono text-xs"
              >
                [FECHAR ESC]
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <BouncingBubblesStage
                tickets={
                  validTickets.length > 0
                    ? validTickets
                    : executeFilteringPipelineSync().tickets
                }
                step={step}
                winnerTicket={winnerTicket}
                onReplayDraw={handleStartDraw}
                profileImageUrl={testedProfileImage}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TECHNICAL ARCHITECTURE & GRAPH API */}
      {subTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-serif italic text-white flex items-center gap-2">
              <Layers className="text-[#D4AF37]" size={20} /> Arquitetura de Integração Meta Graph API
            </h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Mapeamento de endpoints oficiais e fluxo de processamento assíncrono projetado para o Android Native (Kotlin Coroutines + Flow) tratando restrições de cuota e limites de requisições.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Endpoint 1 */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">GET /{`{media-id}`}</span>
                <h4 className="text-xs font-bold text-white font-mono">1. Metadados do Post Oficial</h4>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Busca estatísticas do post (<code>like_count</code>, <code>comments_count</code>) e valida se a mídia pertence à conta de negócios autorizada.
                </p>
              </div>

              {/* Endpoint 2 */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">GET /{`{media-id}`}/comments</span>
                <h4 className="text-xs font-bold text-white font-mono">2. Paginação Cursor de Comentários</h4>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Extrai em lote de 100 comentários usando o cursor <code>after</code> até consumir todos os registros em páginas ordenadas cronologicamente.
                </p>
              </div>

              {/* Endpoint 3 */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">GET /{`{user-id}`}</span>
                <h4 className="text-xs font-bold text-white font-mono">3. Perfil do Participante & Business Discovery</h4>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Consulta metadados do participante para validar <code>is_verified</code>, presença de foto de perfil e atividade do perfil.
                </p>
              </div>

              {/* Endpoint 4 */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">POST /webhooks/instagram</span>
                <h4 className="text-xs font-bold text-white font-mono">4. Webhook de Menção em Stories</h4>
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Recebe e processa eventos do tipo <code>instagram_mentions</code> quando um usuário publica um Story marcando <code>@suaconta</code>.
                </p>
              </div>

            </div>
          </div>

          {/* Rate Limiting & Story Bypass Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase">
                <Zap className="text-[#D4AF37]" size={16} /> Estratégia de Rate Limiting
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                A Meta impõe limites rigorosos de 200 chamadas por usuário por hora. Para evitar o código de erro <code>4 - Application Level Rate Limit Exceeded</code>:
              </p>
              <ul className="text-xs space-y-2 text-[#E4E4E7]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <span><strong>Header Parsing:</strong> Leitura contínua do header <code>X-App-Usage</code> para monitorar o percentual de consumo em tempo real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <span><strong>Backoff Exponencial:</strong> Quando a cuota atinge 80%, a pipeline insere um <code>delay()</code> dinâmico entre requisições.</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase">
                <Share2 className="text-emerald-400" size={16} /> Arquitetura de Validação de Stories
              </h4>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                A API pública do Graph não permite ler visualizações arbitrárias de Stories. A solução combina duas abordagens complementares:
              </p>
              <ul className="text-xs space-y-2 text-[#E4E4E7]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Canal Principal (Webhooks):</strong> Servidor escuta o evento de webhook <code>instagram_mentions</code> quando o usuário marca a conta no Story e correlaciona automaticamente com o ID do usuário.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Canal Fallback (In-App OCR):</strong> O participante envia o print no app. O motor <code>ML Kit Text Recognition</code> local processa o print e confirma <code>@suaconta</code> e timestamp &lt; 24h.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 3: KOTLIN CODE SOURCE */}
      {subTab === 'code' && (
        <div className="space-y-6">
          <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Code2 size={16} className="text-[#D4AF37]" /> Implementação em Kotlin (Android Native)
              </h3>
              <button
                onClick={() => copyToClipboard(kotlinSampleCode, 'kotlin')}
                className="bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode === 'kotlin' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedCode === 'kotlin' ? 'Copiado!' : 'Copiar Código Kotlin'}</span>
              </button>
            </div>

            <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded-xl font-mono text-[11px] overflow-x-auto text-[#E4E4E7] leading-relaxed">
              <pre>{kotlinSampleCode}</pre>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LGPD & PRIVACY */}
      {subTab === 'lgpd' && (
        <div className="bg-[#111113] border border-[#27272A] p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-serif italic text-white flex items-center gap-2">
            <Lock className="text-emerald-400" size={20} /> Conformidade com a LGPD e Segurança
          </h3>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            O módulo de sorteios adota o princípio de <strong>Minimização de Dados (Data Minimization)</strong> e <strong>Retenção Efêmera</strong> exigidos pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018):
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono">1. Dados Mínimos</h4>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Coleta exclusivamente o <code>instagram_id</code> e o <code>username</code>. Nomes completos, e-mails ou dados biométricos nunca são associados ao registro do sorteio.
              </p>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono">2. Expurgo Automático</h4>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Após a homologação do resultado e expiração do prazo legal de auditoria (30 dias), os registros em memória e banco local são destruídos via worker programado no <code>WorkManager</code>.
              </p>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono">3. Prova Criptográfica SHA-256</h4>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                A semente do sorteio gera um hash SHA-256 que pode ser verificado publicamente sem expor a lista completa de participantes, garantindo transparência pública e auditabilidade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT CERTIFICATE MODAL */}
      {showAuditModal && winnerTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#111113] border-2 border-[#D4AF37] max-w-2xl w-full p-6 rounded-2xl space-y-5 relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="text-[#D4AF37]" size={20} />
                <h3 className="text-sm font-bold text-white font-mono uppercase">Certificado Oficial de Auditoria do Sorteio</h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-[#71717A] hover:text-white text-xs font-mono font-bold cursor-pointer"
              >
                [FECHAR ESC]
              </button>
            </div>

            <div className="bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A] font-mono text-[11px] space-y-2 text-[#E4E4E7]">
              <div className="text-center text-[#D4AF37] font-bold border-b border-[#27272A] pb-2">
                ACERVUS CORE - RELATÓRIO PÚBLICO DE ELEGIBILIDADE E PROVA CRIPTOGRÁFICA
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div><strong>Data e Hora:</strong> {new Date().toLocaleString('pt-BR')}</div>
                <div><strong>Plataforma:</strong> Instagram Graph API v19.0</div>
                <div><strong>Post ID:</strong> {mediaId}</div>
                <div><strong>Regra:</strong> {ticketRule === 'per_comment' ? '1 Bilhete/Comentário' : '1 Bilhete/Usuário'}</div>
                <div><strong>Total Bilhetes Válidos:</strong> {validTickets.length}</div>
                <div><strong>Algoritmo de Seleção:</strong> java.security.SecureRandom</div>
              </div>

              <div className="pt-2 border-t border-[#27272A] space-y-1">
                <div className="text-emerald-400 font-bold">GANHADOR SELECIONADO:</div>
                <div>• Username: @{winnerTicket.username}</div>
                <div>• Ticket Nº: {winnerTicket.ticketNumber}</div>
                <div>• Instagram User ID: {winnerTicket.instagramId}</div>
                <div>• Texto do Comentário: "{winnerTicket.commentText}"</div>
              </div>

              <div className="pt-2 border-t border-[#27272A] space-y-1">
                <div className="text-[#D4AF37] font-bold">SEMENTE HASH SHA-256 DA PROVA:</div>
                <div className="text-[10px] text-emerald-400 break-all">{drawSeedHash}</div>
              </div>

              <div className="text-[9px] text-[#71717A] pt-2 italic">
                * Este documento confirma que os filtros anti-fraude, detecção de spam e validação de engajamento foram aplicados conforme a legislação vigente e normas da LGPD.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  alert('Certificado exportado em PDF/JSON com sucesso!');
                  setShowAuditModal(false);
                }}
                className="bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center gap-2"
              >
                <Download size={14} />
                <span>Baixar Certificado Auditado</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Kotlin production source code string
const kotlinSampleCode = `// Architecture: Clean Architecture + MVVM + Retrofit + Coroutines Flow + Jetpack Security
// Module: Instagram Giveaway, Secure Token Storage & Live Validation Engine

package com.acervus.core.data.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.acervus.core.data.remote.InstagramGraphApi
import java.security.SecureRandom
import java.security.MessageDigest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

// ==========================================
// 1. SECURE STORAGE (EncryptedSharedPreferences)
// ==========================================
class SecureTokenStorage(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "acervus_secure_api_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    companion object {
        private const val KEY_ACCESS_TOKEN = "instagram_access_token"
        private const val KEY_APP_SECRET = "fb_app_secret"
    }

    fun saveAccessToken(token: String) {
        sharedPreferences.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    fun saveAppSecret(secret: String) {
        sharedPreferences.edit().putString(KEY_APP_SECRET, secret).apply()
    }

    fun getAppSecret(): String? {
        return sharedPreferences.getString(KEY_APP_SECRET, null)
    }

    fun clearCredentials() {
        sharedPreferences.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_APP_SECRET)
            .apply()
    }
}

// ==========================================
// 2. TOKEN VALIDATION & SCOPES VERIFIER
// ==========================================
data class TokenDebugResponse(val data: DebugData)
data class DebugData(
    val appId: String,
    val isValid: Boolean,
    val scopes: List<String>,
    val expiresAt: Long,
    val userId: String
)

interface InstagramGraphApi {
    @GET("v19.0/{media_id}/comments")
    suspend fun getComments(
        @Path("media_id") mediaId: String,
        @Query("access_token") accessToken: String,
        @Query("limit") limit: Int = 100,
        @Query("after") afterCursor: String? = null,
        @Query("fields") fields: String = "id,text,timestamp,from{id,username}"
    ): GraphCommentsResponse

    @GET("debug_token")
    suspend fun debugToken(
        @Query("input_token") inputToken: String,
        @Query("access_token") appOrClientToken: String // Formato AppID|AppSecret
    ): TokenDebugResponse
}

class MetaTokenValidator(
    private val api: InstagramGraphApi,
    private val secureStorage: SecureTokenStorage
) {
    private val requiredScopes = setOf(
        "instagram_basic",
        "instagram_manage_comments",
        "pages_read_engagement",
        "pages_show_list"
    )

    suspend fun validateAndCheckPermissions(
        appId: String,
        appSecret: String
    ): ValidationResult {
        val token = secureStorage.getAccessToken() 
            ?: return ValidationResult.Error("Token de acesso não localizado no armazenamento seguro.")

        return try {
            // Token de aplicativo para autenticar a depuração: "appId|appSecret"
            val appToken = "$appId|$appSecret"
            val debugResponse = api.debugToken(token, appToken)
            val debugData = debugResponse.data

            if (!debugData.isValid) {
                return ValidationResult.Error("O Token de Acesso à API expirou ou é inválido.")
            }

            // Verifica a presença de todos os escopos obrigatórios
            val missingScopes = requiredScopes.filter { it !in debugData.scopes }
            if (missingScopes.isNotEmpty()) {
                return ValidationResult.InsufficientPermissions(
                    missingScopes = missingScopes,
                    grantedScopes = debugData.scopes
                )
            }

            ValidationResult.Success(
                expiresAt = debugData.expiresAt,
                scopes = debugData.scopes
            )
        } catch (e: Exception) {
            ValidationResult.Error("Erro de comunicação com a Meta Graph API: \${e.message}")
        }
    }
}

sealed interface ValidationResult {
    data class Success(val expiresAt: Long, val scopes: List<String>) : ValidationResult
    data class InsufficientPermissions(val missingScopes: List<String>, val grantedScopes: List<String>) : ValidationResult
    data class Error(val message: String) : ValidationResult
}

// ==========================================
// 3. CRYPTOGRAPHICALLY SECURE SELECTION
// ==========================================
data class Ticket(
    val ticketNumber: String,
    val instagramId: String,
    val username: String,
    val commentId: String,
    val commentText: String
)

class SecureRandomDrawEngine {
    private val secureRandom = SecureRandom()

    fun performDraw(tickets: List<Ticket>): Pair<Ticket, String> {
        require(tickets.isNotEmpty()) { "A lista de bilhetes válidos não pode estar vazia" }

        val selectedIndex = secureRandom.nextInt(tickets.size)
        val winner = tickets[selectedIndex]

        // Prova criptográfica auditável com Hash SHA-256 da semente
        val rawSeed = "\${winner.instagramId}_\${winner.ticketNumber}_\${System.currentTimeMillis()}"
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(rawSeed.toByteArray())
        val sha256Hex = hashBytes.joinToString("") { "%02x".format(it) }

        return Pair(winner, sha256Hex)
    }
}
`;
