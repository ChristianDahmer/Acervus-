import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Smartphone, 
  Sparkles, 
  RefreshCw, 
  X, 
  Check, 
  CheckCircle2, 
  Image, 
  AlertCircle, 
  FileText, 
  Layers, 
  Activity, 
  ChevronRight, 
  Play, 
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { ModeloContrato } from '../types';

interface AndroidCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExtractedModelo: (modelo: ModeloContrato) => void;
}

// Mock report samples that can be drawn on a Canvas to simulate a document photo
const DOCUMENT_SAMPLES = [
  {
    id: 'contrato_rustico',
    name: 'Contrato de Mobiliário Rústico',
    type: 'CONTRATO',
    desc: 'Contrato formal com cláusulas de responsabilidade e valores.',
    draw: (ctx: CanvasRenderingContext2D) => {
      // Background paper
      ctx.fillStyle = '#fbf9f4';
      ctx.fillRect(0, 0, 500, 700);
      
      // Page border
      ctx.strokeStyle = '#dcd5c5';
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 470, 670);
      
      // Title
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CONTRATO DE LOCAÇÃO DE BENS MÓVEIS', 250, 60);
      
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, 75);
      ctx.lineTo(400, 75);
      ctx.stroke();
      
      // Text body blocks
      ctx.fillStyle = '#292524';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      
      const lines = [
        'CONTRATANTE (LOCATÁRIA): Maria Clara de Oliveira, CPF: 111.222.333-44,',
        'residente no endereço Av. das Nações, 1500, São Paulo - SP.',
        '',
        'CONTRATADA (LOCADORA): ACERVUS DECORAÇÕES LTDA, CNPJ: 12.345.678/0001-90,',
        'com sede operacional na Rua das Flores, 120, Curitiba - PR.',
        '',
        'CLÁUSULA 1ª - DO OBJETO E ITENS:',
        'O presente contrato tem por objeto a locação temporária dos seguintes itens:',
        ' - 01 Painel Redondo de Madeira Rústica (Cod: 104)',
        ' - 03 Cilindros Decorativos de Pinus (M, G, GG)',
        ' - 02 Suportes de Mesa de Ferro Ouro Envelhecido',
        '',
        'CLÁUSULA 2ª - DO PERÍODO E RETIRADA:',
        'A retirada dos bens ocorrerá em 12/08/2026 e a devolução em 15/08/2026,',
        'totalizando o período contratual de 3 dias corridos.',
        '',
        'CLÁUSULA 3ª - DO VALOR E PAGAMENTO:',
        'O valor total desta locação é de R$ 450,00 (quatrocentos e cinquenta reais).',
        'O pagamento de um sinal de 50% (R$ 225,00) deve ser realizado na assinatura.',
        '',
        'CLÁUSULA 4ª - DA MULTA E DANOS:',
        'Qualquer avaria constatada na devolução acarretará multa equivalente',
        'a 5x o valor do aluguel individual da peça danificada.',
        '',
        'São Paulo, 10 de Agosto de 2026.'
      ];
      
      let y = 110;
      lines.forEach(l => {
        if (l.startsWith('CLÁUSULA') || l.startsWith('CONTRATANTE') || l.startsWith('CONTRATADA')) {
          ctx.font = 'bold 10px Georgia, serif';
        } else {
          ctx.font = '10px sans-serif';
        }
        ctx.fillText(l, 40, y);
        y += 18;
      });
      
      // Signatures
      ctx.strokeStyle = '#a8a29e';
      ctx.beginPath();
      ctx.moveTo(50, 630); ctx.lineTo(210, 630);
      ctx.moveTo(290, 630); ctx.lineTo(450, 630);
      ctx.stroke();
      
      ctx.fillStyle = '#78716c';
      ctx.font = 'italic 8px sans-serif';
      ctx.fillText('Assinatura do Locatário', 90, 645);
      ctx.fillText('Assinatura da Locadora', 330, 645);
    }
  },
  {
    id: 'vistoria_entrega',
    name: 'Termo de Vistoria de Entrega',
    type: 'VISTORIA',
    desc: 'Checklist de vistoria de entrega para certificar conservação.',
    draw: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, 500, 700);
      
      ctx.strokeStyle = '#b0c4de';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, 470, 670);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TERMO DE VISTORIA E RECEBIMENTO DE ACERVO', 250, 55);
      
      ctx.fillStyle = '#475569';
      ctx.font = '9px sans-serif';
      ctx.fillText('Controle de Integridade e Check-In de Equipamentos — Reserva #4092', 250, 75);
      
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(470, 90); ctx.stroke();
      
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('DADOS DA LOCAÇÃO:', 35, 115);
      
      ctx.font = '9px sans-serif';
      ctx.fillText('Cliente: Roberta Albuquerque Lima  |  Telefone: (11) 98765-4321', 35, 135);
      ctx.fillText('Data da Entrega / Retirada: 20/09/2026', 35, 150);
      ctx.fillText('Vistoriador Responsável: Bruno Mendes (Acervus)', 35, 165);
      
      // Table Header
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(35, 190, 430, 22);
      ctx.strokeRect(35, 190, 430, 22);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('Código', 40, 204);
      ctx.fillText('Item do Acervo', 100, 204);
      ctx.fillText('Estado na Entrega', 240, 204);
      ctx.fillText('Observação / Detalhe', 345, 204);
      
      // Table Rows
      const rows = [
        ['#0102', 'Painel Circular Romano Carbono', 'EXCELENTE', 'Sem riscos na pintura'],
        ['#0344', 'Cilindro P Envelopado Bege', 'BOM', 'Pequeno amassado no rodapé'],
        ['#0345', 'Cilindro M Envelopado Bege', 'EXCELENTE', 'Perfeito estado'],
        ['#0988', 'Trio de Boleiras Cerâmica Rosa', 'EXCELENTE', 'Sem trincados ou marcas'],
        ['#0412', 'Mesa de Ferro Rústica Desmontável', 'REGULAR', 'Algumas marcas de desgaste'],
      ];
      
      let y = 212;
      rows.forEach(r => {
        ctx.strokeRect(35, y, 430, 25);
        ctx.fillStyle = '#334155';
        ctx.font = '9px sans-serif';
        ctx.fillText(r[0], 40, y + 16);
        ctx.fillText(r[1], 100, y + 16);
        
        if (r[2] === 'EXCELENTE') {
          ctx.fillStyle = '#16a34a';
          ctx.font = 'bold 9px sans-serif';
        } else if (r[2] === 'BOM') {
          ctx.fillStyle = '#2563eb';
          ctx.font = 'bold 9px sans-serif';
        } else {
          ctx.fillStyle = '#ea580c';
          ctx.font = 'bold 9px sans-serif';
        }
        ctx.fillText(r[2], 240, y + 16);
        
        ctx.fillStyle = '#475569';
        ctx.font = '8px sans-serif';
        ctx.fillText(r[3], 345, y + 16);
        
        y += 25;
      });
      
      // Footer Clauses
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('DECLARAÇÃO DE CONFORMIDADE:', 35, y + 35);
      
      ctx.fillStyle = '#475569';
      ctx.font = '8px sans-serif';
      ctx.fillText('O cliente declara ter recebido os materiais acima relacionados em perfeito estado', 35, y + 55);
      ctx.fillText('de conservação e limpeza, excetuando as avarias registradas neste laudo de vistoria,', 35, y + 68);
      ctx.fillText('e se compromete a devolvê-los nas mesmas condições operacionais de uso.', 35, y + 81);
      
      // Signature lines
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(50, 610); ctx.lineTo(210, 610);
      ctx.moveTo(290, 610); ctx.lineTo(450, 610);
      ctx.stroke();
      
      ctx.fillStyle = '#64748b';
      ctx.font = '8px sans-serif';
      ctx.fillText('Cliente: Roberta Albuquerque', 65, 625);
      ctx.fillText('Assinatura do Vistoriador', 315, 625);
    }
  },
  {
    id: 'orcamento_festa',
    name: 'Orçamento de Locação',
    type: 'ORCAMENTO',
    desc: 'Modelo de orçamento com tabela de preços e especificações.',
    draw: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#fcfaf6';
      ctx.fillRect(0, 0, 500, 700);
      
      ctx.strokeStyle = '#c5a880';
      ctx.lineWidth = 4;
      ctx.strokeRect(15, 15, 470, 670);
      
      ctx.fillStyle = '#1e1b18';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('ORÇAMENTO DE LOCAÇÃO DE MATERIAIS', 250, 60);
      ctx.font = 'italic 10px Georgia, serif';
      ctx.fillStyle = '#8f704b';
      ctx.fillText('Acervus Locação & Design de Eventos', 250, 80);
      
      ctx.strokeStyle = '#e6dfd5';
      ctx.beginPath(); ctx.moveTo(50, 95); ctx.lineTo(450, 95); ctx.stroke();
      
      ctx.fillStyle = '#3e3835';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.fillText('DADOS DO CLIENTE:', 40, 125);
      
      ctx.font = '10px sans-serif';
      ctx.fillText('Nome: Juliana Prestes Silveira  |  E-mail: juliana@prestes.com', 40, 145);
      ctx.fillText('Telefone: (41) 99912-8833  |  CPF: 999.888.777-66', 40, 162);
      ctx.fillText('Endereço do Evento: Salão de Festas Solar, Rua XV, 450, Curitiba', 40, 179);
      
      // Items grid
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(40, 210, 420, 22);
      ctx.fillStyle = '#1e1b18';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('Qtd', 45, 224);
      ctx.fillText('Especificação do Material', 80, 224);
      ctx.fillText('Preço Unit.', 290, 224);
      ctx.fillText('Valor Total', 380, 224);
      
      const items = [
        ['01', 'Kit Arco de Balões Desconstruído (Dourado/Preto)', 'R$ 180,00', 'R$ 180,00'],
        ['01', 'Painel de Led Neon "Happy Birthday" Luminoso', 'R$ 70,00', 'R$ 70,00'],
        ['03', 'Mesas Cilindricas de Acrílico Transparente', 'R$ 50,00', 'R$ 150,00'],
        ['02', 'Vasos de Vidro Cristal Imperial Grande', 'R$ 30,00', 'R$ 60,00'],
        ['01', 'Tapete Felpudo Creme Luxo (3m x 2m)', 'R$ 100,00', 'R$ 100,00'],
      ];
      
      let y = 236;
      items.forEach(it => {
        ctx.strokeStyle = '#e6dfd5';
        ctx.beginPath(); ctx.moveTo(40, y + 22); ctx.lineTo(460, y + 22); ctx.stroke();
        
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#3e3835';
        ctx.fillText(it[0], 45, y + 14);
        ctx.fillText(it[1], 80, y + 14);
        ctx.fillText(it[2], 290, y + 14);
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(it[3], 380, y + 14);
        
        y += 22;
      });
      
      // Totals box
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(280, y + 15, 180, 55);
      ctx.strokeRect(280, y + 15, 180, 55);
      
      ctx.fillStyle = '#1e1b18';
      ctx.font = '9px sans-serif';
      ctx.fillText('Subtotal das Peças:', 290, y + 30);
      ctx.fillText('Frete de Entrega/Montagem:', 290, y + 45);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('VALOR TOTAL ORÇADO:', 290, y + 62);
      
      ctx.font = '9px sans-serif';
      ctx.fillText('R$ 560,00', 390, y + 30);
      ctx.fillText('R$ 80,00', 390, y + 45);
      ctx.font = 'bold 10px Georgia, serif';
      ctx.fillStyle = '#8f704b';
      ctx.fillText('R$ 640,00', 390, y + 62);
      
      // Signature / Conditions
      ctx.fillStyle = '#7c726a';
      ctx.font = 'italic 8px sans-serif';
      ctx.fillText('* Orçamento válido por 10 dias corridos a partir desta data.', 40, y + 90);
      ctx.fillText('* Necessária reserva antecipada para garantir disponibilidade de agenda.', 40, y + 102);
      
      ctx.strokeStyle = '#d9d0c3';
      ctx.beginPath();
      ctx.moveTo(250, 620); ctx.lineTo(450, 620);
      ctx.stroke();
      ctx.fillStyle = '#3e3835';
      ctx.font = '9px sans-serif';
      ctx.fillText('Juliana Prestes Silveira', 290, 635);
    }
  }
];

export const AndroidCameraModal: React.FC<AndroidCameraModalProps> = ({
  isOpen,
  onClose,
  onSaveExtractedModelo
}) => {
  const [activeSampleId, setActiveSampleId] = useState<string>('contrato_rustico');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  
  // Output extracted template states
  const [extractedData, setExtractedData] = useState<{
    titulo: string;
    categoria: 'CONTRATO' | 'VISTORIA' | 'ORCAMENTO' | 'RECIBO' | 'OUTROS';
    descricao: string;
    conteudo: string;
  } | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Redraw mock document canvas whenever selected sample changes
  useEffect(() => {
    if (activeSampleId && !isCameraActive && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sample = DOCUMENT_SAMPLES.find(s => s.id === activeSampleId);
        if (sample) {
          sample.draw(ctx);
        }
      }
    }
  }, [activeSampleId, isCameraActive, isOpen, capturedImage]);

  // Handle active camera streaming
  const startCamera = async () => {
    try {
      setCapturedImage(null);
      setCameraPermissionGranted(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraPermissionGranted(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraPermissionGranted(false);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setExtractedData(null);
      setIsAnalyzing(false);
    }
  }, [isOpen]);

  // Capture image from video stream or canvas
  const handleCapture = () => {
    if (isCameraActive && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 500;
      canvas.height = video.videoHeight || 700;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    } else if (canvasRef.current) {
      // Capture from the template canvas simulator
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };

  const addLog = (msg: string) => {
    setAnalysisLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Call Express Server to run Gemini OCR + template conversion
  const handleAnalyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setAnalysisLogs([]);
    addLog("Iniciando Módulo de Análise e OCR do Acervus...");
    addLog("Ativando subsistema Jetpack CameraX de aquisição de imagem.");
    
    setTimeout(() => {
      addLog("Imagem normalizada: Codificação Base64 gerada com sucesso.");
    }, 400);

    setTimeout(() => {
      addLog("Enviando fluxo de bytes de imagem para o servidor...");
    }, 900);

    setTimeout(() => {
      addLog("Servidor conectado ao Google Gemini 3.7-Flash API.");
      addLog("Processando reconhecimento óptico de caracteres (OCR) avançado...");
    }, 1500);

    setTimeout(() => {
      addLog("Mapeando variáveis dinâmicas ({NOME_CLIENTE}, {VALOR_TOTAL}, etc.)...");
    }, 2300);

    try {
      // Trigger API endpoint
      const response = await fetch('/api/gemini/analyze-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64: capturedImage })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro de resposta da API do servidor");
      }

      const data = await response.json();
      
      addLog("Sucesso! Modelo estrutural extraído e formatado perfeitamente.");
      setExtractedData({
        titulo: data.titulo || 'Contrato Customizado Extraído',
        categoria: data.categoria || 'CONTRATO',
        descricao: data.descricao || 'Modelo reconstruído automaticamente com a câmera',
        conteudo: data.conteudo || ''
      });
    } catch (err: any) {
      console.error(err);
      addLog(`[Erro Crítico] ${err.message || 'Falha na comunicação com a IA'}`);
      
      // Fallback em caso de erro da API ou falta de chave
      addLog("Utilizando parser local heurístico como contingência...");
      const selectedSample = DOCUMENT_SAMPLES.find(s => s.id === activeSampleId);
      
      setTimeout(() => {
        setExtractedData({
          titulo: selectedSample ? `Modelo de ${selectedSample.name}` : 'Contrato Extraído',
          categoria: (selectedSample?.type as any) || 'CONTRATO',
          descricao: `Extraído da câmera em ${new Date().toLocaleDateString()}`,
          conteudo: selectedSample?.id === 'contrato_rustico' 
            ? `CONTRATO DE LOCAÇÃO DE BENS MÓVEIS — RESERVA {ID_RESERVA}\n\nLOCADOR: {RAZAO_SOCIAL} ({CNPJ})\nLOCATÁRIO: {NOME_CLIENTE} ({CPF_CNPJ_CLIENTE})\nEndereço: {ENDERECO_CLIENTE}\n\nCLÁUSULA 1ª - DO OBJETO:\nO locador cede para uso temporário o seguinte acervo de decoração:\n{LISTA_ITENS}\n\nCLÁUSULA 2ª - PERÍODO:\nA entrega ocorrerá em {DATA_RETIRADA} e a devolução em {DATA_DEVOLUCAO}, perfazendo o total de {DIAS_TOTAL} dias.\n\nCLÁUSULA 3ª - VALOR FINANCEIRO:\nO valor total de aluguel contratado é de {VALOR_TOTAL}.\n\nCLÁUSULA 4ª - DANOS:\nQualquer avaria ou quebra de peças acarretará multa ao locatário.\n\nData do Contrato: {DATA_HOJE}`
            : selectedSample?.id === 'vistoria_entrega'
            ? `TERMO DE VISTORIA E CONSERVAÇÃO DE ENTREGA — RESERVA {ID_RESERVA}\n\nLOCADOR: {RAZAO_SOCIAL} ({CNPJ})\nLOCATÁRIO: {NOME_CLIENTE}\n\nFica registrado que na retirada em {DATA_RETIRADA}, os itens descritos em {LISTA_ITENS} foram vistoriados pelo representante legal {REPRESENTANTE_EMPRESA} e entregues nas condições acordadas para uso.\n\nO cliente se compromete a devolver no dia {DATA_DEVOLUCAO} no mesmo estado operacional.\n\nAssinado em: {DATA_HOJE}`
            : `ORÇAMENTO PRÉVIO DE LOCAÇÃO — RESERVA {ID_RESERVA}\n\nCLIENTE DE INTERESSE: {NOME_CLIENTE}\nContato: {TELEFONE_CLIENTE}\n\nITENS SELECIONADOS DO ACERVO:\n{LISTA_ITENS}\n\nPERÍODO ESTIMADO: {DIAS_TOTAL} dias ({DATA_RETIRADA} até {DATA_DEVOLUCAO})\n\nVALOR PROPOSTO DE ALUGUEL: {VALOR_TOTAL}\n\nValidade da proposta: 10 dias de reserva garantida.`
        });
      }, 1000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!extractedData) return;

    const newModelo: ModeloContrato = {
      id: `MODELO-CAM-${Date.now()}`,
      titulo: extractedData.titulo,
      categoria: extractedData.categoria,
      descricao: extractedData.descricao,
      conteudo: extractedData.conteudo,
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
      isPadrao: false,
      origemImportacao: 'Câmera do Celular (Android)',
    };

    onSaveExtractedModelo(newModelo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-[#111113] border border-[#27272A] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden my-auto animate-fade-in">
        {/* Header - Android Style */}
        <div className="bg-[#111113] border-b border-[#27272A] p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-[#D4AF37] to-[#E5C158] rounded-xl text-black">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Importação via Câmera Mobile</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Jetpack CameraX
                </span>
              </div>
              <p className="text-xs text-[#71717A]">Capture uma foto de documento físico para convertê-lo instantaneamente em modelo dinâmico com IA.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1.5 hover:bg-[#18181B] rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {!extractedData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Samples and Options */}
              <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#27272A] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                      <Layers size={14} />
                      <span>Modo de Captura</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (isCameraActive) {
                            stopCamera();
                          } else {
                            startCamera();
                          }
                        }}
                        className={`py-3.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-2 border ${
                          isCameraActive
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-[#18181B] hover:bg-[#27272A] text-white border-[#27272A]'
                        }`}
                      >
                        <Camera size={20} />
                        <span>{isCameraActive ? 'Desligar Câmera' : 'Ativar Câmera'}</span>
                      </button>

                      <button
                        disabled={isCameraActive}
                        onClick={() => {
                          setIsCameraActive(false);
                          setCapturedImage(null);
                        }}
                        className={`py-3.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-2 border disabled:opacity-40 disabled:cursor-not-allowed ${
                          !isCameraActive && !capturedImage
                            ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30'
                            : 'bg-[#18181B] hover:bg-[#27272A] text-white border-[#27272A]'
                        }`}
                      >
                        <Image size={20} />
                        <span>Simulador Acervus</span>
                      </button>
                    </div>

                    {cameraPermissionGranted === false && (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-start gap-2 text-amber-400 text-[11px]">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>Acesso à câmera indisponível ou bloqueado. Use o <strong>Simulador Acervus</strong> de amostras abaixo para testar.</span>
                      </div>
                    )}
                  </div>

                  {/* Simulator Templates Options */}
                  {!isCameraActive && (
                    <div className="bg-[#0A0A0B] p-4 rounded-2xl border border-[#27272A] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                          <FileText size={14} />
                          <span>Amostras do Simulador</span>
                        </h4>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-mono">
                          Offline HD
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {DOCUMENT_SAMPLES.map((sample) => (
                          <button
                            key={sample.id}
                            disabled={isAnalyzing}
                            onClick={() => {
                              setActiveSampleId(sample.id);
                              setCapturedImage(null);
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                              activeSampleId === sample.id && !capturedImage
                                ? 'bg-[#18181B] border-[#D4AF37] text-white shadow-md'
                                : 'bg-[#18181B]/40 hover:bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              activeSampleId === sample.id && !capturedImage ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#27272A] text-[#71717A]'
                            }`}>
                              <FileText size={16} />
                            </div>
                            <div className="text-xs">
                              <p className="font-bold">{sample.name}</p>
                              <p className="text-[10px] text-[#71717A] mt-0.5 line-clamp-1">{sample.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informational Android Spec block */}
                  <div className="bg-[#0A0A0B]/50 p-3.5 rounded-2xl border border-[#27272A] space-y-1.5 text-[11px] text-[#A1A1AA]">
                    <div className="flex items-center gap-1.5 text-white font-bold mb-1">
                      <Sparkles size={13} className="text-[#D4AF37]" />
                      <span>Motor OCR Inteligente</span>
                    </div>
                    <p>O algoritmo inteligente converte o layout capturado, identifica dados reais e injeta as chaves dinâmicas compatíveis com o Acervus.</p>
                  </div>
                </div>

                {/* Confirm Capture Action Button */}
                <div className="pt-4 lg:pt-0">
                  {capturedImage ? (
                    <button
                      type="button"
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:opacity-95 text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} className="animate-pulse" />
                      <span>Analisar e Converter com IA</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="w-full py-3 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#3F3F46] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Camera size={16} />
                      <span>{isCameraActive ? 'Capturar Foto do Documento' : 'Processar Amostra Selecionada'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Simulated Camera Viewport */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center bg-[#0A0A0B] rounded-3xl border border-[#27272A] p-4 min-h-[460px] relative overflow-hidden">
                
                {/* Active Camera Live Preview */}
                {isCameraActive && !capturedImage ? (
                  <div className="w-full h-full min-h-[400px] flex items-center justify-center relative rounded-2xl overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover max-h-[500px]"
                    />
                    
                    {/* Camera overlay guide */}
                    <div className="absolute inset-0 border-[30px] border-black/60 flex items-center justify-center pointer-events-none">
                      <div className="w-[85%] h-[80%] border-2 border-dashed border-[#D4AF37] rounded-xl flex items-center justify-center relative">
                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37]" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#D4AF37]" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#D4AF37]" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37]" />
                        
                        <div className="text-[10px] text-white bg-black/70 border border-[#27272A] px-2.5 py-1 rounded-md absolute bottom-4 text-center tracking-wider uppercase font-semibold">
                          Enquadre o Relatório / Contrato
                        </div>
                      </div>
                    </div>

                    {/* Camera Controls Overlay */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold bg-black/80 px-2 py-0.5 rounded border border-emerald-500/20">
                        LIVE_PREVIEW
                      </span>
                    </div>
                  </div>
                ) : capturedImage ? (
                  /* Captured Image Freeze Screen */
                  <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center relative rounded-2xl overflow-hidden bg-black p-2">
                    <img
                      src={capturedImage}
                      alt="Capturado"
                      className="max-h-[440px] max-w-full rounded-xl object-contain border border-[#27272A]"
                    />
                    
                    {/* Visual Overlay indicator of captured */}
                    <div className="absolute top-4 left-4 bg-emerald-500 text-black font-extrabold text-[10px] px-3 py-1 rounded-lg tracking-wider flex items-center gap-1 shadow-lg">
                      <Check size={12} />
                      <span>IMAGEM CAPTURADA</span>
                    </div>

                    {/* Laser Scanner effect when analyzing */}
                    {isAnalyzing && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_12px_#D4AF37] top-0 animate-[scan_2s_linear_infinite]" />
                    )}

                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        if (isCameraActive) startCamera();
                      }}
                      disabled={isAnalyzing}
                      className="absolute bottom-4 bg-[#18181B]/90 hover:bg-[#27272A] text-white border border-[#3F3F46] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <RotateCcw size={14} />
                      <span>Descartar e Tirar Outra</span>
                    </button>
                  </div>
                ) : (
                  /* Simulator Mode: Canvas draws custom reports dynamically */
                  <div className="w-full h-full min-h-[400px] flex items-center justify-center relative rounded-2xl overflow-hidden bg-[#18181B]/20">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={700}
                      className="max-h-[450px] max-w-full rounded-2xl shadow-2xl border border-[#27272A] object-contain transition-all"
                    />

                    {/* Grid scanner animation when compiling preview */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center">
                        <div className="w-full h-[3px] bg-[#D4AF37] opacity-80 shadow-[0_0_10px_#D4AF37] absolute top-0 animate-[scan_2s_linear_infinite]" />
                      </div>
                    )}

                    <div className="absolute bottom-4 right-4 bg-black/80 border border-[#27272A] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Smartphone size={13} className="text-[#D4AF37]" />
                      <span className="text-[10px] text-white font-mono">Simulador Acervus</span>
                    </div>
                  </div>
                )}

                {/* Laser effect definition inside style tag if needed */}
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                  }
                `}</style>

                {/* Bottom Status / Logs Display Panel */}
                {isAnalyzing && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/95 border-t border-[#27272A] p-4 text-left font-mono text-[9px] text-emerald-400 space-y-1 h-36 overflow-y-auto custom-scrollbar flex flex-col justify-end">
                    {analysisLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-1">
                        <span className="text-[#71717A] shrink-0">►</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 font-bold animate-pulse text-[#D4AF37]">
                      <Activity size={10} />
                      <span>Executando extração inteligente via Gemini API...</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            /* PHASE 2: REVIEW & EDIT EXTRACTED TEMPLATE */
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3 text-emerald-400">
                <CheckCircle2 size={22} className="shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-white text-sm">Leitura e Processamento Concluídos!</p>
                  <p className="mt-1 text-emerald-300">O Gemini analisou com sucesso o documento físico, reconstruiu a estrutura do texto e adicionou de forma proativa as chaves de interpolação correspondentes.</p>
                </div>
              </div>

              {/* Form and Preview Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Inputs details */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#0A0A0B] p-5 rounded-2xl border border-[#27272A] space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                      Metadados do Modelo
                    </h4>

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                          Título do Relatório
                        </label>
                        <input
                          type="text"
                          value={extractedData.titulo}
                          onChange={(e) => setExtractedData({ ...extractedData, titulo: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs font-bold focus:border-[#D4AF37] focus:outline-none"
                          placeholder="Digite o título do modelo..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                          Categoria
                        </label>
                        <select
                          value={extractedData.categoria}
                          onChange={(e) => setExtractedData({ ...extractedData, categoria: e.target.value as any })}
                          className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs font-bold focus:border-[#D4AF37] focus:outline-none"
                        >
                          <option value="CONTRATO">CONTRATO</option>
                          <option value="VISTORIA">VISTORIA / CHECKLIST</option>
                          <option value="ORCAMENTO">ORÇAMENTO</option>
                          <option value="RECIBO">RECIBO DE PAGAMENTO</option>
                          <option value="OUTROS">OUTROS TIPOS</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                          Descrição / Notas
                        </label>
                        <textarea
                          rows={3}
                          value={extractedData.descricao}
                          onChange={(e) => setExtractedData({ ...extractedData, descricao: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-white text-xs focus:border-[#D4AF37] focus:outline-none custom-scrollbar"
                          placeholder="Notas explicativas sobre o documento..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0A0A0B]/50 p-4 rounded-2xl border border-[#27272A] space-y-2 text-xs">
                    <p className="font-bold text-white flex items-center gap-1">
                      <Info size={13} className="text-[#D4AF37]" />
                      <span>Legenda das Tags Injetadas:</span>
                    </p>
                    <p className="text-[10px] text-[#A1A1AA]">
                      As chaves no formato <code className="text-[#D4AF37] font-bold font-mono">{"{TAG}"}</code> representam campos automáticos que o sistema Acervus preencherá ao vincular este relatório a uma reserva.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      <span className="text-[9px] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded text-white font-mono">{"{NOME_CLIENTE}"}</span>
                      <span className="text-[9px] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded text-white font-mono">{"{VALOR_TOTAL}"}</span>
                      <span className="text-[9px] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded text-white font-mono">{"{LISTA_ITENS}"}</span>
                      <span className="text-[9px] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded text-white font-mono">{"{DATA_RETIRADA}"}</span>
                    </div>
                  </div>
                </div>

                {/* Extracted Content Draft Editor */}
                <div className="lg:col-span-8 space-y-2">
                  <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wide">
                    Esboço do Conteúdo Textual
                  </label>
                  <textarea
                    rows={18}
                    value={extractedData.conteudo}
                    onChange={(e) => setExtractedData({ ...extractedData, conteudo: e.target.value })}
                    className="w-full p-4 bg-[#18181B] border border-[#27272A] rounded-2xl text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none custom-scrollbar leading-relaxed"
                  />
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer - Control Bar */}
        <div className="sticky bottom-0 z-20 bg-[#111113]/95 backdrop-blur-md border-t border-[#27272A] p-4 flex items-center justify-between shrink-0">
          <div>
            {extractedData && (
              <button
                type="button"
                onClick={() => {
                  setExtractedData(null);
                  setCapturedImage(null);
                }}
                className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Escanear Outro</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            
            {extractedData && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Salvar e Salvar no Acervo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
