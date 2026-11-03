import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  Image as ImageIcon,
  Truck,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Upload,
  Bot,
  Wand2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  MapPin,
  Phone,
  QrCode,
  Compass
} from 'lucide-react';
import { EmpresaConfig } from '../types';
import { formatCurrencyBRL, parseCurrencyBRLToNumber } from '../utils/currencyMask';
import { validarDocumento, formatarDocumento, apenasNumeros } from '../utils/documentValidation';
import { analyzeUserIntentAsync } from '../lib/aiEngine';
import { saveConfig, saveDocument } from '../lib/firebaseSync';
import { obterLocalizacaoEEnderecoGPS } from '../utils/addressUtils';

interface OnboardingIaWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaConfig: EmpresaConfig;
  onSaveEmpresaConfig: (config: EmpresaConfig) => void;
}

export const OnboardingIaWizardModal: React.FC<OnboardingIaWizardModalProps> = ({
  isOpen,
  onClose,
  empresaConfig,
  onSaveEmpresaConfig,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<EmpresaConfig>(() => ({ ...empresaConfig }));

  // Sincroniza os dados do formulário sempre que o modal for aberto ou empresaConfig mudar
  useEffect(() => {
    if (isOpen && empresaConfig) {
      setFormData({ ...empresaConfig });
      setCurrentStep(1);
      setDocError(null);
      setAiSuccessMessage(null);
      setAiPrompt('');
    }
  }, [isOpen, empresaConfig]);
  
  // IA Auto-fill states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  
  // Validation error states
  const [docError, setDocError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof EmpresaConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Preenchimento Inteligente via IA
  const handleAiAutoFill = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    setAiSuccessMessage(null);

    try {
      // Analisa o texto do usuário com a IA para extrair dados da empresa
      const promptInstruction = `Analise o texto a seguir e extraia os dados cadastrais da empresa de locação. Retorne um JSON com as chaves: "nomeFantasia", "razaoSocial", "cnpj", "ramoAtividade", "telefoneWhatsapp", "email", "endereco", "cidade", "uf", "cep", "pixChave", "valorFretePorKm", "nomeRepresentante".
Texto: "${aiPrompt}"`;

      let aiAnswerText = '';
      try {
        const result = await analyzeUserIntentAsync(promptInstruction, 'EmpresaConfig');
        aiAnswerText = result.answer || '';
      } catch (e) {
        console.warn('Falha na consulta assíncrona da IA:', e);
      }

      // Extração combinada (JSON da IA + RegEx/NLP heurístico resiliente sobre o texto do usuário)
      const newConfig = { ...formData };
      const extractedFields: string[] = [];
      const combinedText = `${aiPrompt}\n${aiAnswerText}`;

      // 1. Tentar parsear blocos JSON na resposta ou prompt
      const jsonMatches = combinedText.match(/\{[\s\S]*?\}/g);
      if (jsonMatches) {
        for (const jm of jsonMatches) {
          try {
            const parsed = JSON.parse(jm);
            if (parsed.nomeFantasia && typeof parsed.nomeFantasia === 'string' && parsed.nomeFantasia.length > 1) {
              newConfig.nomeFantasia = parsed.nomeFantasia.trim();
              extractedFields.push('Nome Fantasia');
            }
            if (parsed.razaoSocial && typeof parsed.razaoSocial === 'string' && parsed.razaoSocial.length > 1) {
              newConfig.razaoSocial = parsed.razaoSocial.trim();
              extractedFields.push('Razão Social');
            }
            if (parsed.cnpj && typeof parsed.cnpj === 'string') {
              const doc = parsed.cnpj.replace(/[^a-zA-Z0-9]/g, '');
              if (doc.length === 14 || doc.length === 11) {
                newConfig.cnpj = formatarDocumento(doc);
                extractedFields.push('CNPJ/CPF');
              }
            }
            if (parsed.telefoneWhatsapp) {
              const digits = String(parsed.telefoneWhatsapp).replace(/\D/g, '');
              if (digits.length >= 8) {
                newConfig.telefoneWhatsapp = digits;
                extractedFields.push('Telefone/WhatsApp');
              }
            }
            if (parsed.ramoAtividade && typeof parsed.ramoAtividade === 'string') {
              newConfig.ramoAtividade = parsed.ramoAtividade.trim();
              extractedFields.push('Ramo');
            }
            if (parsed.endereco && typeof parsed.endereco === 'string') {
              newConfig.endereco = parsed.endereco.trim();
              extractedFields.push('Endereço');
            }
            if (parsed.cidade && typeof parsed.cidade === 'string') {
              newConfig.cidade = parsed.cidade.trim();
              extractedFields.push('Cidade');
            }
            if (parsed.uf && typeof parsed.uf === 'string') {
              newConfig.uf = parsed.uf.trim().toUpperCase();
              extractedFields.push('UF');
            }
            if (parsed.cep && typeof parsed.cep === 'string') {
              newConfig.cep = parsed.cep.trim();
              extractedFields.push('CEP');
            }
            if (parsed.pixChave && typeof parsed.pixChave === 'string') {
              newConfig.pixChave = parsed.pixChave.trim();
              extractedFields.push('Chave PIX');
            }
            if (parsed.valorFretePorKm !== undefined && parsed.valorFretePorKm !== null) {
              const val = Number(parsed.valorFretePorKm);
              if (!isNaN(val) && val >= 0) {
                newConfig.valorFretePorKm = val;
                extractedFields.push('Frete por Km');
              }
            }
            if (parsed.nomeRepresentante && typeof parsed.nomeRepresentante === 'string') {
              newConfig.nomeRepresentante = parsed.nomeRepresentante.trim();
              extractedFields.push('Representante');
            }
          } catch (_) {
            // Ignora JSON malformado
          }
        }
      }

      // 2. Extração NLP Heurística Resiliente sobre aiPrompt
      // Documento CNPJ / CPF
      if (!extractedFields.includes('CNPJ/CPF')) {
        const docMatch = combinedText.match(/([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/?[0-9]{4}-?[0-9]{2})|([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})|(\b\d{11,14}\b)/i);
        if (docMatch) {
          const rawDoc = docMatch[0].replace(/\D/g, '');
          if (rawDoc.length === 14 || rawDoc.length === 11) {
            newConfig.cnpj = formatarDocumento(rawDoc);
            if (!newConfig.pixChave) {
              newConfig.pixChave = rawDoc;
              newConfig.pixTipoChave = rawDoc.length === 14 ? 'CNPJ' : 'CPF';
            }
            extractedFields.push('CNPJ/CPF');
          }
        }
      }

      // Telefone / WhatsApp
      if (!extractedFields.includes('Telefone/WhatsApp')) {
        const phoneMatch = combinedText.match(/(?:tel|telefone|whatsapp|whats|cel|celular)?[\s:]*(?:\+?55\s*)?(?:\(?(\d{2})\)?\s*)?(9?\d{4}[-\s]?\d{4})/i);
        if (phoneMatch) {
          const ddd = phoneMatch[1] || '51';
          const num = phoneMatch[2].replace(/\D/g, '');
          newConfig.telefoneWhatsapp = `${ddd}${num}`;
          extractedFields.push('Telefone/WhatsApp');
        }
      }

      // E-mail
      if (!extractedFields.includes('E-mail')) {
        const emailMatch = combinedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) {
          newConfig.email = emailMatch[1];
          extractedFields.push('E-mail');
        }
      }

      // Frete por Km
      if (!extractedFields.includes('Frete por Km')) {
        const freteMatch = combinedText.match(/(?:frete|km|quilômetro|tarifa)[\s:]*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
        if (freteMatch) {
          const val = parseFloat(freteMatch[1].replace(',', '.'));
          if (!isNaN(val) && val >= 0) {
            newConfig.valorFretePorKm = val;
            extractedFields.push('Frete por Km');
          }
        }
      }

      // CEP
      if (!extractedFields.includes('CEP')) {
        const cepMatch = combinedText.match(/(?:cep)?[\s:]*(\d{5}-?\d{3})/i);
        if (cepMatch) {
          newConfig.cep = cepMatch[1];
          extractedFields.push('CEP');
        }
      }

      // Chave PIX
      if (!extractedFields.includes('Chave PIX')) {
        const pixMatch = combinedText.match(/(?:pix|chave pix)[\s:]*([^\s,;.]{5,50})/i);
        if (pixMatch && pixMatch[1]) {
          const key = pixMatch[1].trim();
          if (key && !key.toLowerCase().includes('sim') && !key.toLowerCase().includes('nao')) {
            newConfig.pixChave = key;
            extractedFields.push('Chave PIX');
          }
        }
      }

      // Nome Fantasia / Razão Social
      if (!extractedFields.includes('Nome Fantasia')) {
        const namePatterns = [
          /(?:nome|fantasia|empresa|locadora|chama-se|chamada|sou a|somos a|nome da empresa)[\s:]+([A-Za-z0-9À-ÿ\s&.-]+?)(?:,|$|\n|;|\.|\s-|\sCNPJ|\sTel|\sWhatsApp)/i,
          /^(?:Somos a|Sou a|Locadora|Empresa)?\s*([A-Za-z0-9À-ÿ\s&.-]{3,40}?)(?:,|$|\n|;|\.|\sCNPJ|\sTel)/i
        ];

        for (const pat of namePatterns) {
          const nameMatch = combinedText.match(pat);
          if (nameMatch && nameMatch[1]) {
            let extracted = nameMatch[1].trim();
            extracted = extracted.replace(/^(somos a|sou a|locadora|empresa)\s+/i, '');
            if (
              extracted.length > 2 &&
              !extracted.toLowerCase().startsWith('cnpj') &&
              !extracted.toLowerCase().startsWith('tel') &&
              !extracted.toLowerCase().startsWith('http')
            ) {
              newConfig.nomeFantasia = extracted;
              if (!newConfig.razaoSocial || newConfig.razaoSocial.includes('LTDA')) {
                newConfig.razaoSocial = `${extracted} Locações e Eventos LTDA`;
              }
              extractedFields.push('Nome Fantasia');
              break;
            }
          }
        }
      }

      // Endereço
      if (!extractedFields.includes('Endereço')) {
        const endMatch = combinedText.match(/(?:endereço|rua|avenida|av|localizada|sediada)[\s:]+([A-Za-z0-9À-ÿ\s,.-]+?)(?:,|$|\n|;|\.|\sCEP|\sCNPJ)/i);
        if (endMatch && endMatch[1]) {
          const addr = endMatch[1].trim();
          if (addr.length > 4) {
            newConfig.endereco = addr;
            extractedFields.push('Endereço');
          }
        }
      }

      // Representante
      if (!extractedFields.includes('Representante')) {
        const repMatch = combinedText.match(/(?:representante|responsável|proprietário|dono|contato)[\s:]+([A-Za-z0-9À-ÿ\s]+?)(?:,|$|\n|;|\.)/i);
        if (repMatch && repMatch[1]) {
          const repName = repMatch[1].trim();
          if (repName.length > 2) {
            newConfig.nomeRepresentante = repName;
            extractedFields.push('Representante');
          }
        }
      }

      const uniqueFields = Array.from(new Set(extractedFields));
      setFormData(newConfig);

      if (uniqueFields.length > 0) {
        setAiSuccessMessage(`✨ A IA identificou e preencheu ${uniqueFields.length} campo(s) automaticamente: ${uniqueFields.join(', ')}. Verifique os dados abaixo.`);
        if (docError) setDocError(null);
      } else {
        setAiSuccessMessage('✨ Dados processados pela IA! Verifique e ajuste os campos do formulário abaixo.');
      }
    } catch (error) {
      console.warn('Erro ao processar preenchimento por IA:', error);
      setAiSuccessMessage('Não foi possível extrair todos os dados automaticamente, mas você pode preencher os campos manualmente abaixo.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Processo de Upload de Logo em Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem do logotipo deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        handleFieldChange('logoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Avançar com validação
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.nomeFantasia.trim()) {
        alert('Por favor, informe o Nome Fantasia da sua empresa.');
        return;
      }
      if (formData.cnpj) {
        const val = validarDocumento(formData.cnpj);
        if (!val.valido) {
          setDocError(val.mensagemErro || 'CNPJ / CPF inválido.');
          return;
        }
      }
      setDocError(null);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  // Concluir e salvar
  const handleCompleteOnboarding = async () => {
    setIsSaving(true);
    try {
      const finalConfig: EmpresaConfig = {
        ...formData,
        ambienteSistema: formData.ambienteSistema || 'producao',
        senhaAcesso: formData.senhaAcesso || '123456',
      };

      // Salvar no estado local e no banco de dados multi-tenant
      onSaveEmpresaConfig(finalConfig);
      await saveConfig('empresaConfig', finalConfig);
      
      // Criar/atualizar o primeiro usuário (dispositivo autorizado) com os dados do responsável na empresa
      const deviceUuid = localStorage.getItem('locadora_device_uuid') || 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      if (!localStorage.getItem('locadora_device_uuid')) {
        localStorage.setItem('locadora_device_uuid', deviceUuid);
      }

      const adminUserDevice = {
        id: deviceUuid,
        imei: deviceUuid,
        nomeDispositivo: 'Terminal Principal Administrador',
        cnpjEmpresa: finalConfig.cnpj || '00.000.000/0001-00',
        usuario: finalConfig.nomeRepresentante || 'Administrador',
        email: finalConfig.email || 'contato@locadora.com.br',
        senha: finalConfig.senhaAcesso || '123456',
        telefone: finalConfig.telefoneWhatsapp || '',
        nivelAcesso: 'ADMINISTRADOR',
        status: 'APROVADO',
        dataSolicitacao: Date.now(),
        dataAtualizacao: Date.now(),
        ultimoAcesso: Date.now(),
        permissoesModulos: ['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios', 'empresa', 'developer']
      };

      // Salvar localmente e no banco de dados
      localStorage.setItem('locadora_authenticated_device', JSON.stringify(adminUserDevice));
      await saveDocument('dispositivos_autorizados', deviceUuid, adminUserDevice);

      // Marcar onboarding como concluído
      localStorage.setItem('acervus_onboarding_completed', 'true');
      localStorage.setItem('acervus_onboarding_date', new Date().toISOString());

      onClose();
      // Recarregar para garantir inicialização 100% limpa com o novo usuário logado
      window.location.reload();
    } catch (e) {
      console.error('Erro ao salvar onboarding:', e);
      alert('Ocorreu um erro ao salvar as configurações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, title: 'Empresa', icon: Building2 },
    { num: 2, title: 'Logotipo', icon: ImageIcon },
    { num: 3, title: 'Logística', icon: Truck },
    { num: 4, title: 'Financeiro', icon: DollarSign },
    { num: 5, title: 'Conclusão', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#121215] border border-[#27272A] rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho do Assistente IA */}
        <div className="bg-gradient-to-r from-[#1E1E24] via-[#18181C] to-[#1E1E24] p-6 border-b border-[#27272A] relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8B7326] p-0.5 flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <div className="w-full h-full bg-[#0A0A0C] rounded-[14px] flex items-center justify-center">
                <Bot size={26} className="text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Assistente de Configuração</h2>
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  Acervus Core
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Bem-vindo! Vamos personalizar a sua conta em poucos passos para emissão de propostas e contratos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#27272A] rounded-xl transition-colors cursor-pointer"
            title="Pular por enquanto"
          >
            <X size={20} />
          </button>
        </div>

        {/* Indicador de Passos */}
        <div className="bg-[#18181C] px-6 py-3 border-b border-[#27272A] flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => isCompleted && setCurrentStep(s.num)}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    isActive
                      ? 'text-[#D4AF37] font-bold'
                      : isCompleted
                      ? 'text-emerald-400 font-medium'
                      : 'text-[#71717A]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-[#27272A] text-[#A1A1AA]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className="text-xs whitespace-nowrap hidden sm:inline">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-[1px] flex-1 min-w-[12px] ${isCompleted ? 'bg-emerald-500/50' : 'bg-[#27272A]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Conteúdo Dinâmico por Passo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* PASSO 1: DADOS DA EMPRESA */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Caixa de IA Autopreenchimento */}
              <div className="bg-gradient-to-br from-[#1E1E24] to-[#141418] border border-[#D4AF37]/30 rounded-2xl p-4 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 size={18} className="text-[#D4AF37]" />
                  <h3 className="text-xs font-bold text-[#E4E4E7] uppercase tracking-wider font-mono">
                    Preenchimento Inteligente por Voz ou Texto (IA)
                  </h3>
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  Prefere economizar tempo? Digite abaixo um resumo sobre a sua locadora e a IA preencherá os dados para você.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAiProcessing && aiPrompt.trim()) {
                        e.preventDefault();
                        handleAiAutoFill();
                      }
                    }}
                    placeholder="Ex: Somos a Festas & Eventos Locadora, CNPJ 00.000.000/0001-00, WhatsApp 11987654321..."
                    className="flex-1 bg-[#0A0A0C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                  />
                  <button
                    onClick={handleAiAutoFill}
                    disabled={isAiProcessing || !aiPrompt.trim()}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {isAiProcessing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Preencher com IA
                  </button>
                </div>
                {aiSuccessMessage && (
                  <p className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    {aiSuccessMessage}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Nome Fantasia da Empresa <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nomeFantasia}
                    onChange={(e) => handleFieldChange('nomeFantasia', e.target.value)}
                    placeholder="Ex: Festas & Eventos Locadora"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(e) => handleFieldChange('razaoSocial', e.target.value)}
                    placeholder="Ex: Festas & Eventos Locação LTDA"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    CNPJ ou CPF do Locador
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const formatted = formatarDocumento(e.target.value);
                      handleFieldChange('cnpj', formatted);
                      if (docError) setDocError(null);
                    }}
                    placeholder="Ex: 00.000.000/0001-00 ou 12.ABC.345/0001-95"
                    className={`w-full bg-[#18181C] border ${
                      docError ? 'border-red-500' : 'border-[#27272A] focus:border-[#D4AF37]'
                    } rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none transition-colors`}
                  />
                  {docError && <p className="text-[10px] text-red-400 mt-1">{docError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Ramo de Atuação
                  </label>
                  <input
                    type="text"
                    value={formData.ramoAtuacao}
                    onChange={(e) => handleFieldChange('ramoAtuacao', e.target.value)}
                    placeholder="Ex: Locação de Móveis e Decoração para Eventos"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    WhatsApp Comercial da Locadora
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-[#A1A1AA]" />
                    <input
                      type="text"
                      value={formData.telefoneWhatsapp}
                      onChange={(e) => handleFieldChange('telefoneWhatsapp', e.target.value)}
                      placeholder="Ex: 5511987654321"
                      className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Representante Legal / Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.nomeRepresentante}
                    onChange={(e) => handleFieldChange('nomeRepresentante', e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    E-mail do Responsável
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="Ex: gestor@empresa.com.br"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: IDENTIDADE VISUAL & LOGOTIPO */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold text-white">Identidade Visual da Empresa</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  O logotipo cadastrado será renderizado automaticamente no cabeçalho das Propostas de Orçamento Web, Contratos em PDF e Relatórios.
                </p>
              </div>

              <div className="bg-[#18181C] border border-[#27272A] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                {formData.logoUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.logoUrl}
                      alt="Logo da Empresa"
                      className="max-h-32 max-w-full object-contain rounded-xl border border-[#3F3F46] p-2 bg-black/40"
                    />
                    <button
                      onClick={() => handleFieldChange('logoUrl', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs shadow-lg hover:bg-red-600 cursor-pointer"
                      title="Remover logotipo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-[#0A0A0C] border-2 border-dashed border-[#3F3F46] flex flex-col items-center justify-center text-[#71717A]">
                    <ImageIcon size={32} />
                    <span className="text-[10px] mt-1">Sem Logo</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <label className="bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <Upload size={14} />
                    {formData.logoUrl ? 'Alterar Logotipo' : 'Enviar Imagem (PNG/JPG)'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Ou informe a URL pública da sua Logomarca
                </label>
                <input
                  type="text"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                  placeholder="https://suaempresa.com.br/logo.png"
                  className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* PASSO 3: LOGÍSTICA & FRETE */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold text-white">Logística & Cálculo de Frete por Quilômetro</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  Configure o endereço da sua sede e a tarifa por km para permitir o cálculo dinâmico de frete em propostas e agendamentos.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Endereço Completo da Sede (Ponto de Partida)
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-[#A1A1AA]" />
                    <input
                      type="text"
                      value={formData.enderecoCompleto}
                      onChange={(e) => handleFieldChange('enderecoCompleto', e.target.value)}
                      placeholder="Ex: Rua das Festas, 500 - Centro, São Paulo - SP"
                      className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                      Valor do Frete por Quilômetro (R$/Km)
                    </label>
                    <input
                      type="text"
                      value={formatCurrencyBRL(formData.valorFretePorKm ?? 3.5)}
                      onChange={(e) => handleFieldChange('valorFretePorKm', parseCurrencyBRLToNumber(e.target.value))}
                      placeholder="R$ 3,50"
                      className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                      Google Maps API Key (Opcional)
                    </label>
                    <input
                      type="password"
                      value={formData.googleMapsApiKey || ''}
                      onChange={(e) => handleFieldChange('googleMapsApiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: DADOS FINANCEIROS & RECEBIMENTO PIX */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-sm font-bold text-white">Dados Financeiros & Chave PIX</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  Defina a Chave PIX da empresa para que os clientes realizem o pagamento de sinal de reserva e depósito de caução com praticidade.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Tipo de Chave PIX
                  </label>
                  <select
                    value={formData.pixTipoChave || 'CNPJ'}
                    onChange={(e) => handleFieldChange('pixTipoChave', e.target.value)}
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="E-MAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="CHAVE_ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Chave PIX Oficial
                  </label>
                  <div className="relative">
                    <QrCode size={14} className="absolute left-3 top-3 text-[#A1A1AA]" />
                    <input
                      type="text"
                      value={formData.pixChave || ''}
                      onChange={(e) => handleFieldChange('pixChave', e.target.value)}
                      placeholder="Informe a Chave PIX"
                      className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Nome do Banco
                  </label>
                  <input
                    type="text"
                    value={formData.bancoNome || ''}
                    onChange={(e) => handleFieldChange('bancoNome', e.target.value)}
                    placeholder="Ex: Banco Itaú / Nubank"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    Nome do Beneficiário
                  </label>
                  <input
                    type="text"
                    value={formData.bancoBeneficiario || ''}
                    onChange={(e) => handleFieldChange('bancoBeneficiario', e.target.value)}
                    placeholder="Ex: Festas & Eventos Locação LTDA"
                    className="w-full bg-[#18181C] border border-[#27272A] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 5: CONCLUSÃO */}
          {currentStep === 5 && (
            <div className="space-y-6 text-center animate-fadeIn py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/10">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Configuração Inicial Concluída com Sucesso!</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mt-1">
                  Sua conta do **Acervus Core** está devidamente parametrizada e pronta para emissão de propostas, reservas e contratos.
                </p>
              </div>

              <div className="bg-[#18181C] border border-[#27272A] rounded-2xl p-4 text-left max-w-md mx-auto font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-[#27272A] pb-1.5">
                  <span className="text-[#71717A]">Empresa:</span>
                  <span className="text-white font-bold">{formData.nomeFantasia}</span>
                </div>
                <div className="flex justify-between border-b border-[#27272A] pb-1.5">
                  <span className="text-[#71717A]">Documento:</span>
                  <span className="text-cyan-400 font-bold">{formData.cnpj || 'Não Informado'}</span>
                </div>
                <div className="flex justify-between border-b border-[#27272A] pb-1.5">
                  <span className="text-[#71717A]">Frete/Km:</span>
                  <span className="text-emerald-400 font-bold">R$ {(formData.valorFretePorKm || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Chave PIX:</span>
                  <span className="text-[#D4AF37] font-bold">{formData.pixChave || 'Não Informada'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé / Controles do Passo */}
        <div className="p-6 bg-[#18181C] border-t border-[#27272A] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-xl border border-[#27272A] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs text-[#71717A] hover:text-[#A1A1AA] underline transition-colors cursor-pointer"
            >
              Pular Configuração por enquanto
            </button>
          )}

          {currentStep < 5 ? (
            <button
              onClick={handleNextStep}
              className="bg-gradient-to-r from-[#D4AF37] to-[#8B7326] text-black font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
            >
              Avançar <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCompleteOnboarding}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-8 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Concluir & Iniciar Sistema
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
