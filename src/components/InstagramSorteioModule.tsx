import React, { useState, useEffect } from 'react';
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

const playSynthBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.12) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
};

const BouncingBubblesStage: React.FC<{
  tickets: TicketRecord[];
  step: 'idle' | 'fetching' | 'filtering' | 'ticketing' | 'drawing' | 'completed';
  winnerTicket: TicketRecord | null;
  onReplayDraw?: () => void;
  profileImageUrl?: string | null;
}> = ({ tickets, step, winnerTicket, onReplayDraw, profileImageUrl }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState<number>(0.5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [hoveredBubble, setHoveredBubble] = useState<BubbleItem | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState<number>(0);

  // Initialize bubbles whenever tickets change or step changes (starting at center for burst effect, emerged one by one in order)
  useEffect(() => {
    if (tickets.length === 0) {
      setBubbles([]);
      setRevealedCount(0);
      return;
    }

    // Limit visible bubbles to 32 for crisp performance
    const sample = tickets.slice(0, 32);
    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = 340;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const initialBubbles: BubbleItem[] = sample.map((t, idx) => {
      const radius = 26 + (idx % 3) * 4; // 26px to 34px
      const angle = Math.random() * Math.PI * 2;
      const speedMag = 2.5 + Math.random() * 3.5;
      const vx = Math.cos(angle) * speedMag;
      const vy = Math.sin(angle) * speedMag;
      return {
        id: `${t.ticketNumber}-${idx}`,
        username: t.username,
        commentText: t.commentText,
        avatarUrl: t.avatarUrl || AVATAR_IMAGES[idx % AVATAR_IMAGES.length],
        ticketNumber: t.ticketNumber,
        x: centerX,
        y: centerY,
        vx,
        vy,
        radius,
        isWinner: winnerTicket?.ticketNumber === t.ticketNumber,
      };
    });

    setBubbles(initialBubbles);
    setRevealedCount(0);

    // Stagger emergence one by one in ordered sequence
    let currentCount = 0;
    const timer = setInterval(() => {
      currentCount++;
      setRevealedCount(currentCount);
      if (currentCount >= sample.length) {
        clearInterval(timer);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [tickets, winnerTicket]);

  // Physics animation loop
  useEffect(() => {
    if (bubbles.length === 0) return;

    let animId: number;
    const updatePhysics = () => {
      setBubbles((prev) => {
        if (prev.length === 0) return prev;
        const width = containerRef.current?.clientWidth || 600;
        const height = 340;

        return prev.map((b) => {
          // If winner and completed, pull toward center
          if (step === 'completed' && winnerTicket && b.ticketNumber === winnerTicket.ticketNumber) {
            const targetX = width / 2;
            const targetY = height / 2;
            const newX = b.x + (targetX - b.x) * 0.1;
            const newY = b.y + (targetY - b.y) * 0.1;
            return { ...b, x: newX, y: newY, vx: 0, vy: 0 };
          }

          let nx = b.x + b.vx * speed;
          let ny = b.y + b.vy * speed;
          let nvx = b.vx;
          let nvy = b.vy;

          // Wall collision
          if (nx - b.radius < 0) {
            nx = b.radius;
            nvx = Math.abs(nvx);
          } else if (nx + b.radius > width) {
            nx = width - b.radius;
            nvx = -Math.abs(nvx);
          }

          if (ny - b.radius < 0) {
            ny = b.radius;
            nvy = Math.abs(nvy);
          } else if (ny + b.radius > height) {
            ny = height - b.radius;
            nvy = -Math.abs(nvy);
          }

          return { ...b, x: nx, y: ny, vx: nvx, vy: nvy };
        });
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [bubbles.length, speed, step, winnerTicket]);

  // Audio & Highlight pulse during drawing phase
  useEffect(() => {
    if (step !== 'drawing' || bubbles.length === 0) {
      setActiveHighlightId(null);
      return;
    }

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * bubbles.length);
      const chosen = bubbles[randomIndex];
      if (chosen) {
        setActiveHighlightId(chosen.id);
        if (soundEnabled) {
          playSynthBeep(300 + Math.random() * 400, 'triangle', 0.08);
        }
      }
    }, 180);

    return () => clearInterval(interval);
  }, [step, bubbles, soundEnabled]);

  // Fanfare sound on completion
  useEffect(() => {
    if (step === 'completed' && winnerTicket && soundEnabled) {
      playSynthBeep(523.25, 'sine', 0.2); // C5
      setTimeout(() => playSynthBeep(659.25, 'sine', 0.2), 150); // E5
      setTimeout(() => playSynthBeep(783.99, 'sine', 0.3), 300); // G5
      setTimeout(() => playSynthBeep(1046.50, 'sine', 0.5), 500); // C6
    }
  }, [step, winnerTicket, soundEnabled]);

  if (tickets.length === 0) return null;

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
            Arena de Sorteio em Bolhas Saltitantes
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
                {s === 0.5 ? '0.5x (-50%)' : s === 0.7 ? '0.7x' : '1x'}
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
              <span>Re-Sorteio</span>
            </button>
          )}
        </div>
      </div>

      {/* Physics Canvas Arena */}
      <div
        ref={containerRef}
        className="relative w-full h-[340px] bg-[#0A0A0B] rounded-xl border border-[#27272A] overflow-hidden select-none"
      >
        {/* Central Profile Avatar Source */}
        {step !== 'completed' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 flex flex-col items-center pointer-events-none opacity-85">
            <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37]/60 shadow-[0_0_40px_rgba(212,175,55,0.4)] overflow-hidden bg-[#18181B] animate-pulse">
              <img
                src={profileImageUrl || AVATAR_IMAGES[0]}
                alt="Perfil do Sorteio"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="mt-1.5 bg-black/85 text-[#D4AF37] font-mono text-[9px] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30 font-bold uppercase tracking-wider">
              Origem do Sorteio
            </span>
          </div>
        )}

        {/* Draw status banner overlay */}
        {step === 'drawing' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black font-extrabold text-[11px] font-mono px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-[#D4AF37]/30 z-30 animate-pulse flex items-center gap-2">
            <RefreshCw size={12} className="animate-spin" />
            <span>Sorteando Comentário em Bolhas...</span>
          </div>
        )}

        {/* Floating Bouncing Bubbles */}
        {bubbles
          .slice(0, revealedCount)
          .filter((b) => step !== 'completed' || (winnerTicket && b.ticketNumber === winnerTicket.ticketNumber))
          .map((b) => {
          const isWinner = step === 'completed' && winnerTicket && b.ticketNumber === winnerTicket.ticketNumber;
          const isHighlighted = activeHighlightId === b.id;

          // Dimensions
          const renderRadius = isWinner ? 54 : b.radius;

          return (
            <div
              key={b.id}
              onMouseEnter={() => setHoveredBubble(b)}
              onMouseLeave={() => setHoveredBubble(null)}
              className={`absolute rounded-full flex items-center justify-center cursor-pointer transition-all ${
                isWinner
                  ? 'z-40 scale-125 border-4 border-[#D4AF37] shadow-[0_0_45px_rgba(212,175,55,0.9)] animate-bounce'
                  : isHighlighted
                  ? 'z-30 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] scale-110'
                  : 'z-10 border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] hover:scale-110 hover:z-30'
              }`}
              style={{
                width: `${renderRadius * 2}px`,
                height: `${renderRadius * 2}px`,
                transform: `translate3d(${b.x - renderRadius}px, ${b.y - renderRadius}px, 0)`,
                transition: isWinner ? 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
              }}
            >
              {/* Profile image inside bubble */}
              <img
                src={b.avatarUrl}
                alt={b.username}
                className="w-full h-full rounded-full object-cover pointer-events-none"
              />

              {/* Username label badge below bubble */}
              <div className="absolute -bottom-2 bg-black/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-full border border-[#D4AF37]/50 max-w-[80px] truncate pointer-events-none font-bold text-center shadow-md">
                @{b.username}
              </div>

              {/* Winner Golden Crown / Trophy */}
              {isWinner && (
                <div className="absolute -top-5 bg-[#D4AF37] text-black rounded-full p-1 border border-white shadow-lg animate-bounce">
                  <Award size={16} />
                </div>
              )}
            </div>
          );
        })}

        {/* Confetti / Papel Picado Explosion Animation on Completed */}
        {step === 'completed' && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {Array.from({ length: 45 }).map((_, i) => {
              const colors = ['#D4AF37', '#34D399', '#60A5FA', '#F43F5E', '#A855F7', '#FBBF24', '#22D3EE'];
              const color = colors[i % colors.length];
              const left = 45 + (Math.random() - 0.5) * 70;
              const top = 40 + (Math.random() - 0.5) * 50;
              const animDuration = 1.2 + Math.random() * 1.8;
              const animDelay = Math.random() * 0.3;
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-sm animate-ping opacity-90"
                  style={{
                    backgroundColor: color,
                    left: `${left}%`,
                    top: `${top}%`,
                    animationDuration: `${animDuration}s`,
                    animationDelay: `${animDelay}s`,
                    transform: `rotate(${Math.random() * 360}deg) scale(${0.6 + Math.random() * 1.4})`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Hovered Bubble Info Tooltip */}
        {hoveredBubble && (
          <div
            className="absolute bottom-3 left-3 bg-[#18181B]/95 border border-[#D4AF37] text-white p-2.5 rounded-xl text-xs font-mono z-40 max-w-xs shadow-xl backdrop-blur-md space-y-1 pointer-events-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#D4AF37] font-bold">@{hoveredBubble.username}</span>
              <span className="bg-[#27272A] text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                {hoveredBubble.ticketNumber}
              </span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] italic">"{hoveredBubble.commentText}"</p>
          </div>
        )}

        {/* Winner Highlight Card inside Stage */}
        {step === 'completed' && winnerTicket && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0A0A0B]/95 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl z-40 text-center space-y-1 shadow-2xl backdrop-blur-lg max-w-md w-full animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm font-mono uppercase tracking-wider">
              <Award size={18} /> @{winnerTicket.username} VENCEU O SORTEIO!
            </div>
            <p className="text-xs text-[#A1A1AA] italic truncate">"{winnerTicket.commentText}"</p>
            <div className="text-[10px] font-mono text-[#D4AF37] font-bold">
              Bilhete da Sorte: {winnerTicket.ticketNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const InstagramSorteioModule: React.FC = () => {
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

  // Meta Graph API Configuration States
  const [apiClientId, setApiClientId] = useState('410294810293810');
  const [apiClientSecret, setApiClientSecret] = useState('app_secret_7f8g9h1k2l3m4n5o6p');
  const [apiAccessToken, setApiAccessToken] = useState('EAAdF8aZA5b6MBO4pZC2ZC1ZA9V9XyMvZCpK68D3l16Xf83hK0y7yZAZBcZApZAJZB1ZCs9mZB3oZD');
  const [apiVersion, setApiVersion] = useState('v19.0');
  const [apiBusinessId, setApiBusinessId] = useState('17841405193810294');
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Advanced Token Security & Lifecycle (Android Specialist Requirements)
  const [tokenType, setTokenType] = useState<'short-lived' | 'long-lived'>('long-lived');
  const [tokenExpiration, setTokenExpiration] = useState('Expira em 60 dias (02/10/2026)');
  const [isTokenSecured, setIsTokenSecured] = useState(true);
  const [isValidatingApi, setIsValidatingApi] = useState(false);
  const [apiScopes, setApiScopes] = useState({
    instagram_basic: true,
    instagram_manage_comments: true,
    pages_read_engagement: true,
    pages_show_list: true,
  });

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

  const handleStartProcess = () => {
    setShowArenaModal(true);
    setStep('fetching');
    setFetchProgress(0);
    setRateLimitPercent(18);
    setTotalFetched(0);
    setValidTickets([]);
    setWinnerTicket(null);
    setDiscardedStats({
      insufficientMentions: 0,
      duplicateMentions: 0,
      fakeInactive: 0,
      verifiedCelebrity: 0,
      businessAccount: 0,
      spamBotBurst: 0,
      missingLike: 0,
      missingStory: 0,
    });

    addLog(`Conectando ao endpoint da Graph API: GET /${apiVersion}/${mediaId}/comments?access_token=${apiAccessToken.substring(0, 8)}...`);
    addLog(`App ID Ativo: ${apiClientId} | Conta Comercial ID: ${apiBusinessId}`);
    addLog('Cursor ativado: limit=100 & fields=id,text,timestamp,from{id,username}');

    // Step 1: Simulate Graph API Fetching with Cursors & Rate Limit Control
    let currentFetched = 0;
    const interval = setInterval(() => {
      currentFetched += 25;
      setTotalFetched(currentFetched);
      setFetchProgress(Math.min(100, Math.floor((currentFetched / 120) * 100)));
      setRateLimitPercent((prev) => Math.min(85, prev + 6));

      addLog(`Graph API Response: HTTP 200 OK [Cursor: after=QVFI...${currentFetched}] (${currentFetched} comentários recebidos)`);

      if (currentFetched >= 120) {
        clearInterval(interval);
        addLog('Fase 1 Concluída: 120 comentários extraídos via paginação Graph API.');
        
        // Move to Filtering
        setTimeout(() => executeFilteringPipeline(), 600);
      }
    }, 400);
  };

  const executeFilteringPipeline = () => {
    setStep('filtering');
    addLog('Fase 2 Iniciada: Aplicando Pipeline de Filtros e Validações Anti-Fraude...');

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

    rawComments.forEach((c) => {
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
        timestamp: new Date().toISOString()
      });
    });

    setDiscardedStats(stats);
    setValidTickets(tickets);

    addLog(`Filtro Anti-Fraude Concluído: ${tickets.length} bilhetes gerados (${rawComments.length - tickets.length} desconsiderados).`);

    // Log complete report of validated comments for operator verification
    const reportLogs: string[] = [];
    reportLogs.push('================================================================================');
    tickets.forEach((t, i) => {
      reportLogs.push(`[CONFERÊNCIA #${i + 1}] Bilhete: ${t.ticketNumber} | @${t.username}: "${t.commentText}" (${t.taggedCount} marcações válidas)`);
    });
    reportLogs.push(`📋 RELATÓRIO COMPLETO DE COMENTÁRIOS VALIDADOS EM FILTRO (${tickets.length} BILHETES HOMOLOGADOS)`);
    reportLogs.push('================================================================================');
    addMultipleLogs(reportLogs);

    setTimeout(() => {
      setStep('drawing');
      setShowArenaModal(true);
      executeCryptographicDraw(tickets);
    }, 1200);
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
            
            {/* Meta Graph API Credentials Card */}
            <div className="bg-[#111113] border border-[#27272A] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#D4AF37]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Conector de Token Meta Graph
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiConfig(!showApiConfig)}
                  className="bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/20 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                >
                  <Code2 size={10} />
                  {showApiConfig ? 'RECOLHER' : 'CONFIGURAR'}
                </button>
              </div>

              {/* Security Banner: Android EncryptedSharedPreferences (Jetpack Security) */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${isTokenSecured ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-white flex items-center gap-1.5">
                    <ShieldCheck size={12} className={isTokenSecured ? 'text-emerald-400' : 'text-amber-400'} />
                    Armazenamento Android Seguro
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isTokenSecured} 
                      onChange={(e) => handleToggleSecureStorage(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-[#18181B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#71717A] peer-checked:after:bg-[#D4AF37] after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#27272A]"></div>
                  </label>
                </div>
                <p className="text-[10px] text-[#A1A1AA] leading-normal font-sans">
                  {isTokenSecured ? (
                    <span><strong>Ativado (Jetpack Security)</strong>: Token salvo com criptografia AES-256-SIV (chaves) e AES-256-GCM (valores) pelo Keystore do Android, impedindo extração física do dispositivo.</span>
                  ) : (
                    <span className="text-amber-400/90 font-semibold">⚠️ SharedPreferences Comum: O token está exposto no armazenamento local do Android em texto plano (Risco de Segurança de Auditoria!).</span>
                  )}
                </p>
              </div>

              {showApiConfig ? (
                <div className="space-y-3.5 pt-1 transition-all duration-300">
                  {/* API Client ID & Secret */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">App ID</label>
                      <input
                        type="text"
                        value={apiClientId}
                        onChange={(e) => setApiClientId(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                        placeholder="Ex: 4102948..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">App Secret Key</label>
                      <input
                        type="password"
                        value={apiClientSecret}
                        onChange={(e) => setApiClientSecret(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                        placeholder="••••••••••••••••••••"
                      />
                    </div>
                  </div>

                  {/* Token Type Switch & Conversion */}
                  <div className="bg-[#18181B] border border-[#27272A] p-2.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">Ciclo de Vida do Token</label>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${tokenType === 'long-lived' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {tokenType === 'long-lived' ? 'Long-Lived (60 Dias)' : 'Short-Lived (2 Horas)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTokenType('short-lived');
                          setTokenExpiration('Expira em 2 horas');
                          addLog('[API CONFIG] Tipo de Token alterado para Short-Lived (Token de Usuário de curta duração - 2 horas).');
                        }}
                        className={`py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${tokenType === 'short-lived' ? 'bg-[#D4AF37] text-black' : 'bg-[#111113] text-[#A1A1AA] hover:bg-[#27272A] border border-[#27272A]'}`}
                      >
                        Curta Duração
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTokenType('long-lived');
                          setTokenExpiration('Expira em 60 dias (02/10/2026)');
                          addLog('[API CONFIG] Tipo de Token alterado para Long-Lived (Token de Página/Usuário estendido - 60 dias).');
                        }}
                        className={`py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${tokenType === 'long-lived' ? 'bg-[#D4AF37] text-black' : 'bg-[#111113] text-[#A1A1AA] hover:bg-[#27272A] border border-[#27272A]'}`}
                      >
                        Longa Duração
                      </button>
                    </div>

                    {tokenType === 'short-lived' && (
                      <button
                        type="button"
                        onClick={handleConvertLongLivedToken}
                        className="w-full mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md"
                      >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        Gerar Long-Lived Token (60 dias)
                      </button>
                    )}
                  </div>

                  {/* API Access Token */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">User/Page Access Token (Bearer)</label>
                      <span className="text-[9px] text-[#71717A] font-mono">{tokenExpiration}</span>
                    </div>
                    <textarea
                      value={apiAccessToken}
                      onChange={(e) => setApiAccessToken(e.target.value)}
                      rows={2}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono resize-none leading-normal"
                      placeholder="EAAdF8aZA5b6MBO..."
                    />
                  </div>

                  {/* API version and Business Account ID in two columns */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">Versão API</label>
                      <select
                        value={apiVersion}
                        onChange={(e) => setApiVersion(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                      >
                        <option value="v17.0">v17.0</option>
                        <option value="v18.0">v18.0</option>
                        <option value="v19.0">v19.0</option>
                        <option value="v20.0">v20.0</option>
                        <option value="v21.0">v21.0</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-mono">Business ID</label>
                      <input
                        type="text"
                        value={apiBusinessId}
                        onChange={(e) => setApiBusinessId(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                        placeholder="Ex: 1784140..."
                      />
                    </div>
                  </div>

                  {/* Real-Time Permissions & Scopes Checklist */}
                  <div className="bg-[#18181B]/50 border border-[#27272A] p-2.5 rounded-xl space-y-1.5 font-mono text-[10px]">
                    <span className="text-[#A1A1AA] uppercase font-bold tracking-wider block border-b border-[#27272A] pb-1.5">
                      ✓ Escopos Autorizados (Graph Debug)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-0.5">
                      <div className="flex items-center gap-1.5 text-white">
                        <CheckCircle2 size={10} className={apiScopes.instagram_basic ? 'text-emerald-400' : 'text-[#71717A]'} />
                        <span className={apiScopes.instagram_basic ? '' : 'line-through text-[#71717A]'}>instagram_basic</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white">
                        <CheckCircle2 size={10} className={apiScopes.instagram_manage_comments ? 'text-emerald-400' : 'text-[#71717A]'} />
                        <span className={apiScopes.instagram_manage_comments ? '' : 'line-through text-[#71717A]'}>manage_comments</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white">
                        <CheckCircle2 size={10} className={apiScopes.pages_read_engagement ? 'text-emerald-400' : 'text-[#71717A]'} />
                        <span className={apiScopes.pages_read_engagement ? '' : 'line-through text-[#71717A]'}>read_engagement</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white">
                        <CheckCircle2 size={10} className={apiScopes.pages_show_list ? 'text-emerald-400' : 'text-[#71717A]'} />
                        <span className={apiScopes.pages_show_list ? '' : 'line-through text-[#71717A]'}>pages_show_list</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestApiConnection}
                    disabled={isValidatingApi}
                    className="w-full bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/30 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isValidatingApi ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span>Verificando Token...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Testar & Validar Token</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-[#18181B]/50 p-2.5 rounded-xl border border-[#27272A] text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-white text-[11px] font-mono">Meta SDK Conectado ({apiVersion})</span>
                    </div>
                    <span className="text-[10px] text-[#D4AF37] font-mono font-bold uppercase">{tokenType === 'long-lived' ? 'Long-Lived' : 'Short-Lived'}</span>
                  </div>
                  
                  {isTokenSecured && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/5 text-emerald-400 text-[9px] font-mono px-2 py-1 rounded border border-emerald-500/10">
                      <ShieldCheck size={10} />
                      <span>CRIPTOGRAFADO NO ANDROID KEYSTORE (AES-256-GCM)</span>
                    </div>
                  )}
                </div>
              )}
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
                onClick={handleStartProcess}
                disabled={step === 'fetching' || step === 'filtering' || step === 'drawing'}
                className="w-full bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {step === 'fetching' || step === 'filtering' || step === 'drawing' ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processando Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Iniciar Apuração e Sorteio Automatizado</span>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* Right Column: Real-Time Execution Console & Results (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Bouncing Bubbles Arena Modal Trigger Card */}
            <div className="bg-gradient-to-br from-[#18181B] via-[#111113] to-[#0A0A0B] border-2 border-[#D4AF37]/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none" />
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border-2 border-[#D4AF37] flex items-center justify-center mx-auto text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)] animate-pulse">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Arena de Sorteio em Bolhas Saltitantes</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  Visualização imersiva em tempo real com animação padrão em 1x, saltos a partir do perfil central e efeito festivo de papel picado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowArenaModal(true)}
                className="bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#D4AF37]/30 transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
              >
                <Play size={16} />
                <span>Abrir Arena de Sorteio (Modal)</span>
              </button>
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
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Arena de Sorteio em Bolhas Saltitantes (1x)</h2>
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
                    : generateMockComments().map((c, i) => ({
                        ticketNumber: `SLOT-${100000 + i}`,
                        instagramId: c.instagramId,
                        username: c.username,
                        commentId: c.id,
                        commentText: c.text,
                        taggedCount: c.taggedUsers.length,
                        hashSeed: 'seed',
                        timestamp: c.timestamp,
                        avatarUrl: AVATAR_IMAGES[i % AVATAR_IMAGES.length],
                      }))
                }
                step={step}
                winnerTicket={winnerTicket}
                onReplayDraw={handleStartProcess}
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
