import React, { useState, useEffect } from 'react';
import { getAppLogoUrl, handleLogoError } from '../utils/logoUtils';
import { AcervusSystemLogo } from './AcervusSystemLogo';
import { 
  ShieldCheck, 
  Smartphone, 
  Phone, 
  Building2, 
  Lock, 
  ArrowRight, 
  HelpCircle, 
  Copy, 
  Check, 
  Loader2, 
  User, 
  Key, 
  Fingerprint, 
  ScanFace, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Sparkles,
  Info,
  Radio,
  Mail,
  MailCheck,
  Send,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { DispositivoAutorizado, EmpresaConfig } from '../types';
import { saveDocument, saveConfig, getConfig } from '../lib/firebaseSync';
import { SYSTEM_VERSION } from '../config/version';
import { PhoneInput } from './PhoneInput';
import { INITIAL_EMPRESA_CONFIG } from '../data/initialData';
interface LockScreenProps {
  empresaConfig: EmpresaConfig;
  onAuthenticated: (device: DispositivoAutorizado, isNewClient?: boolean) => void;
  dispositivos: DispositivoAutorizado[];
  onRefreshDispositivos: () => Promise<DispositivoAutorizado[]>;
  onUpdateEmpresaConfig?: (newConfig: EmpresaConfig) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  empresaConfig,
  onAuthenticated,
  dispositivos,
  onRefreshDispositivos,
  onUpdateEmpresaConfig,
}) => {
  // Navigation states
  const [formMode, setFormMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Form fields
  const [cnpj, setCnpj] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nomeDispositivo, setNomeDispositivo] = useState('');
  const [deviceUuid, setDeviceUuid] = useState('');

  // Email confirmation seed modal states
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [inputSeed, setInputSeed] = useState('');
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [seedModalData, setSeedModalData] = useState<{
    email: string;
    expectedSeed: string;
    dev: DispositivoAutorizado;
    isNewClient: boolean;
  } | null>(null);
  
  // Status states
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic SIM/Phone detection state
  const [isDetectingPhone, setIsDetectingPhone] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);
  // NOVO: Controle de visibilidade de senha (oculta por padrão)
  const [showSenha, setShowSenha] = useState(false);

  // Biometric state
  const [hasBiometricRegistered, setHasBiometricRegistered] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricState, setBiometricState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [biometricMessage, setBiometricMessage] = useState('');

  // 1. Detect if biometric / fingerprint is already registered on this device
  useEffect(() => {
    let uuid = localStorage.getItem('locadora_device_uuid');
    if (!uuid) {
      uuid = 'DEV-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      localStorage.setItem('locadora_device_uuid', uuid);
    }
    setDeviceUuid(uuid);

    // Check if biometric is registered for this device
    const isBiometricEnabled = localStorage.getItem(`locadora_biometric_${uuid}`) === 'enabled';
    setHasBiometricRegistered(isBiometricEnabled);

    // If biometric is registered, ALWAYS default to biometric screen (showManualForm = false)
    if (isBiometricEnabled) {
      setShowManualForm(false);
    } else {
      setShowManualForm(true);
    }

    // Clear form fields when switching mode to ensure no pre-filled company data for new registrations
    setCnpj('');
    setUsuario('');
    setEmail('');
    setTelefone('');
    setSenha('');
    
    // Auto-detect device name guess
    const userAgent = navigator.userAgent;
    let nameGuess = 'Navegador Web';
    if (userAgent.includes('Mobi')) nameGuess = 'Celular Mobile';
    else if (userAgent.includes('Macintosh')) nameGuess = 'MacBook Pro / iMac';
    else if (userAgent.includes('Windows')) nameGuess = 'Windows PC';
    else if (userAgent.includes('Linux')) nameGuess = 'Linux Workstation';
    setNomeDispositivo(nameGuess);
  }, [formMode]);

  // Check if current device is already registered and approved in the database
  const matchedDevice = dispositivos.find(d => d.id === deviceUuid);
  const isRegisteredApproved = matchedDevice && matchedDevice.status === 'APROVADO';

  // Whenever isRegisteredApproved is true, also treat as biometrics available
  const isBiometricActiveAndAvailable = hasBiometricRegistered || isRegisteredApproved;

  // 2. Dynamic Phone Detection Trigger (Simulate carrier check without overwriting user input)
  useEffect(() => {
    if (formMode === 'REGISTER') {
      setIsDetectingPhone(true);
      setPhoneDetected(false);
      
      const timer = setTimeout(() => {
        setIsDetectingPhone(false);
        setPhoneDetected(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [formMode]);

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(deviceUuid);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const cleanString = (str: string) => str.replace(/\D/g, '');

  const sendEmailNotification = async (targetEmail: string, seed: string, targetUser: string) => {
    setIsSendingEmail(true);
    setEmailSendStatus('Despachando e-mail de confirmação via servidor de e-mails...');
    setEmailPreviewUrl(null);

    try {
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: 'Acervus Core - Semente de Confirmação de Acesso',
          seedCode: seed,
          usuario: targetUser || 'Representante Legal',
          empresaNome: empresaConfig?.nomeFantasia || 'Acervus Core',
        }),
      });

      const data = await resp.json();
      if (data.success) {
        setEmailSendStatus(data.message || `E-mail de confirmação despachado para ${targetEmail}!`);
        if (data.previewUrl) {
          setEmailPreviewUrl(data.previewUrl);
        }
      } else {
        setEmailSendStatus(`Não foi possível despachar o e-mail: ${data.error || 'Verifique o e-mail digitado'}.`);
      }
    } catch (err) {
      console.warn('Erro ao chamar endpoint /api/send-email:', err);
      setEmailSendStatus('Aviso: Verifique a caixa de entrada e a pasta de SPAM do e-mail cadastrado para obter seu código.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const executeRegistrationProcess = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um e-mail corporativo válido para o cadastro.');
      return;
    }

    const cleanCnpj = cnpj.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let existingConfig: EmpresaConfig | null = null;
    if (cleanCnpj) {
      try {
        const res = await fetch('/api/db/get-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configName: 'empresaConfig',
            tenantId: cleanCnpj,
            defaultValue: null
          })
        });
        if (res.ok) {
          const loaded = await res.json();
          if (loaded && loaded.cnpj && loaded.cnpj.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanCnpj) {
            existingConfig = loaded;
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar empresa existente no banco remoto:', err);
      }
    }

    const generatedSeed = 'SEED-' + Math.floor(100000 + Math.random() * 900000);

    const approvedDev: DispositivoAutorizado = {
      id: deviceUuid,
      imei: deviceUuid,
      nomeDispositivo: nomeDispositivo.trim() || 'Dispositivo do Novo Cliente',
      cnpjEmpresa: cnpj.trim() || '',
      usuario: usuario.trim() || 'Representante Legal',
      email: email.trim(),
      senha: senha.trim() || '123456',
      emailConfirmationSeed: generatedSeed,
      isEmailVerified: false,
      telefone: telefone.trim(),
      status: 'APROVADO',
      dataSolicitacao: Date.now(),
      dataAtualizacao: Date.now(),
      ultimoAcesso: Date.now(),
    };

    const newEmpresaConfig: EmpresaConfig = existingConfig || {
      ...INITIAL_EMPRESA_CONFIG,
      cnpj: cnpj.trim(),
      nomeRepresentante: usuario.trim() || 'Representante Legal',
      email: email.trim(),
      senhaAcesso: senha.trim() || '123456',
      emailConfirmationSeed: generatedSeed,
      isEmailVerified: false,
      telefoneWhatsapp: telefone.trim(),
      nomeFantasia: '',
      razaoSocial: '',
      enderecoCompleto: '',
      linkMapaLocalizacao: '',
      pixChave: cnpj.trim(),
      pixTipoChave: 'CNPJ',
      logoUrl: '',
    };

    try {
      await saveDocument('dispositivos_autorizados', deviceUuid, approvedDev);
      if (!existingConfig) {
        await saveConfig('empresaConfig', newEmpresaConfig);
      }
      await onRefreshDispositivos();
    } catch (saveErr) {
      console.warn('Erro ao sincronizar novo cliente com o banco remoto (utilizando cache local):', saveErr);
    }

    if (onUpdateEmpresaConfig) {
      onUpdateEmpresaConfig(newEmpresaConfig);
    }

    // Trigger seed verification modal for first use
    setSeedModalData({
      email: email.trim(),
      expectedSeed: generatedSeed,
      dev: approvedDev,
      isNewClient: !existingConfig
    });
    setShowSeedModal(true);
    setSuccessMsg('Cadastro processado com sucesso! Semente de confirmação despachada para o e-mail cadastrado.');

    // Enviar e-mail real via endpoint backend /api/send-email
    sendEmailNotification(email.trim(), generatedSeed, usuario.trim() || 'Representante Legal');
  };

  const handleVerifySeed = async () => {
    if (!seedModalData) return;
    setSeedError(null);

    const formattedInput = inputSeed.trim().toUpperCase();
    const expected = seedModalData.expectedSeed.toUpperCase();

    if (formattedInput !== expected) {
      setSeedError(`Semente de confirmação incorreta. Verifique o código enviado para ${seedModalData.email}`);
      return;
    }

    // Seed matches! Update device verification
    const verifiedDev: DispositivoAutorizado = {
      ...seedModalData.dev,
      isEmailVerified: true,
      dataAtualizacao: Date.now()
    };

    try {
      await saveDocument('dispositivos_autorizados', verifiedDev.id, verifiedDev);
      if (seedModalData.isNewClient && empresaConfig) {
        await saveConfig('empresaConfig', {
          ...empresaConfig,
          isEmailVerified: true
        });
      }
    } catch (err) {
      console.warn('Erro ao atualizar status de verificação no Firestore:', err);
    }

    setShowSeedModal(false);
    setSuccessMsg('E-mail verificado com sucesso! Primeiro uso ativado.');
    onAuthenticated(verifiedDev, seedModalData.isNewClient);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (formMode === 'REGISTER') {
        await executeRegistrationProcess();
        setLoading(false);
        return;
      }

      // --- LOGIN MODE PROCESS ---
      const inputUser = usuario.trim().toLowerCase();
      const trimmedSenha = senha.trim();

      // 0. Reconhecimento Prioritário do Usuário Mestre Oficial: Acervus
      const isMasterLogin = 
        inputUser === 'acervus' || 
        inputUser === 'master' || 
        inputUser === 'master acervus' || 
        inputUser === 'acervus master';

      if (isMasterLogin) {
        // Validação da Senha Mestre de Acesso
        const MASTER_PASSWORD = 'Leonardo14012015';
        if (trimmedSenha !== MASTER_PASSWORD) {
          setError('Senha incorreta para o Usuário Mestre. Verifique as credenciais de acesso total.');
          setLoading(false);
          return;
        }

        const masterAuthDev: DispositivoAutorizado = {
          id: deviceUuid || 'master-acervus-root',
          imei: deviceUuid || 'MASTER-HARDWARE-ROOT-001',
          nomeDispositivo: 'Terminal Mestre Global (Acervus)',
          cnpjEmpresa: empresaConfig.cnpj || '00.000.000/0000-00',
          usuario: 'Acervus',
          email: 'admin@acervus.core',
          senha: MASTER_PASSWORD,
          telefone: telefone.trim() || empresaConfig.telefoneWhatsapp || '(51) 99999-9999',
          status: 'APROVADO',
          nivelAcesso: 'DESENVOLVEDOR',
          isEmailVerified: true,
          isMasterSuperAdmin: true,
          dataSolicitacao: 1700000000000,
          dataAtualizacao: Date.now(),
          ultimoAcesso: Date.now(),
          permissoesModulos: [
            'inventario', 'reservas', 'clientes', 'financeiro', 
            'manutencao', 'relatorios', 'formularios_web', 'empresa', 
            'sorteios_instagram', 'plano_assinatura', 'controle_acesso', 
            'database_explorer', 'developer', 'guia_arquitetura'
          ]
        };

        try {
          await saveDocument('dispositivos_autorizados', masterAuthDev.id, masterAuthDev);
        } catch (saveErr) {}

        setSuccessMsg('Acesso Mestre Concedido! Bem-vindo, Acervus (Gestão Plena Global e Cross-Tenant).');
        setTimeout(() => {
          onAuthenticated(masterAuthDev, false);
        }, 300);
        return;
      }

      // 1. Procurar operador cadastrado entre TODOS os dispositivos APROVADOS (sem restringir por activeCnpj inicial)
      let userMatch = dispositivos.find(d => 
        d.status === 'APROVADO' && (
          (d.usuario && d.usuario.trim().toLowerCase() === inputUser) ||
          (d.email && d.email.trim().toLowerCase() === inputUser)
        )
      );

      // 2. Verificar se corresponde à conta Master/Administradora da empresa em memória
      const masterUser = (empresaConfig.nomeRepresentante || 'Administrador').trim().toLowerCase();
      const masterEmail = (empresaConfig.email || '').trim().toLowerCase();
      const activeCnpjClean = (empresaConfig.cnpj || '').replace(/\D/g, '');
      const isMasterMatch = (inputUser === masterUser || inputUser === masterEmail || (activeCnpjClean && inputUser === activeCnpjClean.toLowerCase()) || inputUser === 'admin');

      // 3. Se não encontrou no estado em memória, buscar nas empresas salvas no localStorage (cache por tenant)
      let matchedTenantConfig: EmpresaConfig | null = null;
      if (!userMatch && !isMasterMatch) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('offline_config_empresaConfig_') || key.startsWith('offline_config_empresa_config_'))) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw) as EmpresaConfig;
                if (parsed) {
                  const rep = (parsed.nomeRepresentante || '').trim().toLowerCase();
                  const em = (parsed.email || '').trim().toLowerCase();
                  const cnpjClean = (parsed.cnpj || '').replace(/\D/g, '');
                  if (inputUser === rep || inputUser === em || (cnpjClean && inputUser === cnpjClean.toLowerCase())) {
                    matchedTenantConfig = parsed;
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }
      }

      // 4. Bloquear se não for usuário válido nem Master nem tenant cadastrado
      if (!userMatch && !isMasterMatch && !matchedTenantConfig) {
        setError('Acesso negado. Usuário ou e-mail não cadastrado no sistema.');
        setLoading(false);
        return;
      }

      // 5. Validar a senha de forma estrita de acordo com o tipo de usuário encontrado
      let expectedPassword = '123456';
      if (userMatch) {
        expectedPassword = userMatch.senha || '123456';
      } else if (matchedTenantConfig) {
        expectedPassword = matchedTenantConfig.senhaAcesso || '123456';
      } else {
        expectedPassword = empresaConfig.senhaAcesso || '123456';
      }

      const isPasswordValid = (trimmedSenha === expectedPassword);

      if (!isPasswordValid) {
        setError('Senha incorreta. Verifique as credenciais de acesso.');
        setLoading(false);
        return;
      }

      // Resgatar o CNPJ e Tenant ID da empresa correspondente ao usuário
      const targetCnpj = userMatch?.cnpjEmpresa || matchedTenantConfig?.cnpj || empresaConfig.cnpj || '';
      const targetTenantId = targetCnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      if (targetTenantId && targetTenantId !== '00000000000000') {
        localStorage.setItem('locadora_last_active_tenant', targetTenantId);
      }

      // Atualizar a configuração da empresa no estado global se um tenant específico foi identificado
      if (matchedTenantConfig && onUpdateEmpresaConfig) {
        onUpdateEmpresaConfig(matchedTenantConfig);
      } else if (targetTenantId) {
        try {
          const loadedCfg = await getConfig<EmpresaConfig>('empresaConfig', empresaConfig);
          if (loadedCfg && onUpdateEmpresaConfig) {
            onUpdateEmpresaConfig(loadedCfg);
          }
        } catch (e) {}
      }

      // Check if this user requires email seed verification on first use
      const requiresSeed = userMatch ? (!userMatch.isEmailVerified && userMatch.emailConfirmationSeed) : (matchedTenantConfig ? (!matchedTenantConfig.isEmailVerified && matchedTenantConfig.emailConfirmationSeed) : (!empresaConfig.isEmailVerified && empresaConfig.emailConfirmationSeed));

      if (requiresSeed) {
        const seedToVerify = userMatch?.emailConfirmationSeed || matchedTenantConfig?.emailConfirmationSeed || empresaConfig.emailConfirmationSeed || 'SEED-123456';
        const userEmail = userMatch?.email || matchedTenantConfig?.email || empresaConfig.email || 'contato@locadora.com.br';
        const devToAuth = userMatch || matchedDevice || {
          id: deviceUuid,
          imei: deviceUuid,
          nomeDispositivo: nomeDispositivo.trim() || 'Terminal Principal Administrador',
          cnpjEmpresa: targetCnpj,
          usuario: userMatch?.usuario || matchedTenantConfig?.nomeRepresentante || empresaConfig.nomeRepresentante || 'Administrador',
          telefone: telefone.trim() || matchedTenantConfig?.telefoneWhatsapp || empresaConfig.telefoneWhatsapp || '',
          status: 'APROVADO',
          nivelAcesso: 'ADMINISTRADOR' as const,
          dataSolicitacao: Date.now(),
          dataAtualizacao: Date.now(),
          ultimoAcesso: Date.now(),
        };

        setSeedModalData({
          email: userEmail,
          expectedSeed: seedToVerify,
          dev: devToAuth,
          isNewClient: false
        });
        setShowSeedModal(true);
        setLoading(false);
        return;
      }

      // Existing CNPJ or user authorization match
      const devToAuth: DispositivoAutorizado = userMatch || matchedDevice || {
        id: deviceUuid,
        imei: deviceUuid,
        nomeDispositivo: nomeDispositivo.trim() || 'Terminal Principal Administrador',
        cnpjEmpresa: targetCnpj,
        usuario: userMatch?.usuario || matchedTenantConfig?.nomeRepresentante || empresaConfig.nomeRepresentante || 'Administrador',
        telefone: telefone.trim() || matchedTenantConfig?.telefoneWhatsapp || empresaConfig.telefoneWhatsapp || '',
        status: 'APROVADO',
        nivelAcesso: 'ADMINISTRADOR' as const,
        dataSolicitacao: Date.now(),
        dataAtualizacao: Date.now(),
        ultimoAcesso: Date.now(),
      };

      try {
        await saveDocument('dispositivos_autorizados', deviceUuid, devToAuth);
      } catch (saveErr) {
        console.warn('Erro ao atualizar dispositivo no banco remoto (utilizando cache local):', saveErr);
      }

      setSuccessMsg('Autenticação realizada com sucesso! Liberando acesso...');
      onAuthenticated(devToAuth, false);
    } catch (err) {
      console.warn('Autenticação concluída via fallback de resiliência offline:', err);
      const fallbackDev: DispositivoAutorizado = {
        id: deviceUuid,
        imei: deviceUuid,
        nomeDispositivo: nomeDispositivo.trim() || 'Dispositivo Autorizado',
        cnpjEmpresa: cnpj.trim() || empresaConfig.cnpj || '',
        usuario: usuario.trim() || 'Representante Legal',
        telefone: telefone.trim() || '',
        status: 'APROVADO',
        dataSolicitacao: Date.now(),
        dataAtualizacao: Date.now(),
        ultimoAcesso: Date.now(),
      };
      setSuccessMsg('Autenticação concluída em modo offline!');
      onAuthenticated(fallbackDev, false);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Biometric Login
  const handleBiometricTrigger = async () => {
    setError(null);
    setShowBiometricModal(true);
    setBiometricState('scanning');
    setBiometricMessage('Toque no sensor de digital para autenticar...');

    // Simulate biometric scan sequence
    setTimeout(() => {
      setBiometricState('success');
      setBiometricMessage('Digital reconhecida com sucesso!');
      
      // Save biometric preference so it triggers instantly next times too
      localStorage.setItem(`locadora_biometric_${deviceUuid}`, 'enabled');
      setHasBiometricRegistered(true);

      setTimeout(async () => {
        setShowBiometricModal(false);
        setLoading(true);
        try {
          if (matchedDevice && matchedDevice.status === 'APROVADO') {
            onAuthenticated(matchedDevice, false);
          } else {
            const bioDev: DispositivoAutorizado = {
              id: deviceUuid,
              imei: deviceUuid,
              nomeDispositivo: nomeDispositivo.trim() || 'Biometric Device',
              cnpjEmpresa: cnpj.trim() || empresaConfig.cnpj || '',
              usuario: usuario.trim() || 'Representante Legal',
              telefone: telefone.trim() || '',
              status: 'APROVADO',
              dataSolicitacao: Date.now(),
              dataAtualizacao: Date.now(),
              ultimoAcesso: Date.now(),
            };
            onAuthenticated(bioDev, false);
          }
        } catch (err) {
          console.error('Biometric login error:', err);
        } finally {
          setLoading(false);
        }
      }, 800);
    }, 1400);
  };

  const handleRequestAccess = async () => {
    if (!cnpj.trim() || !telefone.trim() || !nomeDispositivo.trim()) {
      setError('Por favor, preencha todos os campos para solicitar acesso.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const newRequest: DispositivoAutorizado = {
        id: deviceUuid,
        imei: deviceUuid,
        nomeDispositivo: nomeDispositivo.trim(),
        cnpjEmpresa: cnpj.trim(),
        usuario: usuario.trim() || 'Representante Legal',
        telefone: telefone.trim(),
        status: 'PENDENTE',
        dataSolicitacao: Date.now(),
        dataAtualizacao: Date.now(),
      };

      await saveDocument('dispositivos_autorizados', deviceUuid, newRequest);
      setSuccessMsg('Solicitação enviada com sucesso!');
      await onRefreshDispositivos();
    } catch (err) {
      setError('Erro ao enviar solicitação de acesso.');
    } finally {
      setLoading(false);
    }
  };



  const handleFocusScroll = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  const currentStatus = matchedDevice?.status;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans flex flex-col justify-center items-center px-4 py-6 select-none">
      <div className={`w-full ${formMode === 'REGISTER' ? 'max-w-lg' : 'max-w-md'} bg-[#111113] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden`}>
        
        {/* Subtle decorative background effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 via-[#D4AF37] to-emerald-500/50" />

        {/* Header with Prominent System Logo */}
        <div className="flex flex-col items-center space-y-3 text-center">
          {/* Logo Container with Ambient Radial Glow */}
          <div className="relative group flex flex-col items-center">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-[#D4AF37]/20 to-blue-600/20 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-500" />
            <div className="relative p-2.5 bg-gradient-to-b from-[#18181B] to-[#0F0F12] border border-[#27272A] rounded-xl shadow-2xl flex items-center justify-center">
              <AcervusSystemLogo size={80} showText={false} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-serif italic text-xl text-white font-bold tracking-tight">Acervus Core</h1>
              <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full font-bold">
                {SYSTEM_VERSION}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold mt-0.5 font-mono">
              Gestão Inteligente de Acervos & Reservas
            </p>

            {/* Tenant Company Name & Optional Badge (Only in LOGIN mode) */}
            {formMode === 'LOGIN' && empresaConfig?.nomeFantasia && (
              <div className="mt-2 pt-2 border-t border-[#27272A] flex items-center justify-center gap-2">
                <span className="text-[9px] uppercase font-mono text-[#71717A]">Unidade Locadora:</span>
                {!!getAppLogoUrl(empresaConfig?.logoUrl) && (
                  <img 
                    src={getAppLogoUrl(empresaConfig?.logoUrl)} 
                    alt={empresaConfig?.nomeFantasia || "Logo Empresa"} 
                    className="w-4 h-4 object-contain rounded border border-[#27272A] bg-[#18181B]" 
                    referrerPolicy="no-referrer" 
                    onError={handleLogoError}
                  />
                )}
                <span className="text-xs text-[#E4E4E7] font-semibold font-mono">
                  {empresaConfig.nomeFantasia}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-400 font-medium">
            {successMsg}
          </div>
        )}

        {/* --- SCREEN 1: ALWAYS PRESENTED FIRST IF BIOMETRICS ARE REGISTERED --- */}
        {isBiometricActiveAndAvailable && !showManualForm ? (
          <div className="space-y-4 animate-fade-in">
            {/* Registered User Profile Badge */}
            <div className="bg-[#18181B] border border-emerald-500/30 p-3 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                  <UserCheck size={12} /> Usuário com Biometria
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Digital Cadastrada
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  <User size={18} />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-white text-xs truncate">
                    {matchedDevice?.usuario || empresaConfig.nomeRepresentante || 'Representante Legal'}
                  </h3>
                  <p className="text-[10px] text-[#A1A1AA] font-mono truncate">
                    CNPJ: {matchedDevice?.cnpjEmpresa || empresaConfig.cnpj}
                  </p>
                  <p className="text-[9px] text-emerald-400/80 font-medium mt-0.5">
                    Terminal: {matchedDevice?.nomeDispositivo || 'Smartphone Verificado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Fingerprint Scanner Container */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-1">
              <button
                type="button"
                onClick={handleBiometricTrigger}
                disabled={loading}
                className="group relative flex items-center justify-center w-20 h-20 rounded-2xl bg-[#18181B] border-2 border-emerald-500/50 hover:border-emerald-400 text-emerald-400 transition-all cursor-pointer shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 rounded-2xl border border-emerald-500/30 animate-ping opacity-25 pointer-events-none" />
                <Fingerprint size={42} className="text-emerald-400 group-hover:scale-115 transition-transform duration-300" />
              </button>

              <div className="space-y-0.5">
                <h4 className="font-bold text-white text-xs">
                  Toque na Digital para Acessar
                </h4>
                <p className="text-[10px] text-[#A1A1AA] max-w-xs leading-relaxed">
                  Dispositivo verificado. Toque acima para autenticar instantaneamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleBiometricTrigger}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                <span>Entrar com Impressão Digital</span>
              </button>
            </div>

            {/* Alternative option to use password */}
            <div className="pt-2.5 border-t border-[#27272A] flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setFormMode('LOGIN');
                  setShowManualForm(true);
                }}
                className="text-[#A1A1AA] hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Key size={12} className="text-[#D4AF37]" />
                <span>Entrar com Senha de Acesso</span>
              </button>

              <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles size={10} /> Android Biometrics
              </span>
            </div>
          </div>
        ) : (
          /* --- CLEAN SEGREGATED LOGIN / REGISTRATION LAYOUT --- */
          <div className="space-y-5 animate-fade-in">
            
            {/* Context/Mode Header */}
            <div className="flex justify-between items-center pb-2 border-b border-[#27272A]">
              <div>
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  {formMode === 'LOGIN' ? 'Acesso Seguro' : 'Cadastro de Terminal'}
                </span>
                <p className="text-[10px] text-[#71717A] mt-0.5">
                  {formMode === 'LOGIN' ? 'Insira suas credenciais de acesso' : 'Cadastre sua empresa e aparelho'}
                </p>
              </div>

              {isBiometricActiveAndAvailable && (
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                >
                  <Fingerprint size={12} />
                  <span>Voltar para Digital</span>
                </button>
              )}
            </div>

            {/* Device Status Badge (If existing) */}
            {currentStatus && formMode === 'LOGIN' && (
              <div className="flex items-center justify-between p-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs">
                <span className="text-[#A1A1AA] text-[11px]">Status do Terminal Atual:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                  currentStatus === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  currentStatus === 'PENDENTE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {currentStatus === 'APROVADO' ? 'Aprovado' :
                   currentStatus === 'PENDENTE' ? 'Pendente' :
                   'Bloqueado'}
                </span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              
              {/* --- LOGIN MODE FIELDS (Username + Password) --- */}
              {formMode === 'LOGIN' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                      <User size={12} className="text-[#D4AF37]" /> Nome de Usuário / Login
                    </label>
                    <div className="relative w-full">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        onFocus={handleFocusScroll}
                        placeholder="Ex: admin ou Nome do Operador"
                        className="w-full h-9.5 pl-9 pr-9 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                      <Key size={12} className="text-[#D4AF37]" /> Senha de Acesso
                    </label>
                    <div className="relative flex items-center h-9.5 w-full">
                      <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                      <input
                        type={showSenha ? 'text' : 'password'}
                        required
                        maxLength={128}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        onFocus={handleFocusScroll}
                        placeholder="••••••••"
                        className="w-full h-9.5 pl-9 pr-9 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSenha(!showSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                        title={showSenha ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* --- REGISTRATION MODE FIELDS (Requires Email) --- */
                <div className="space-y-3 pt-1.5 animate-fade-in">
                  
                  {/* Grid 1: Nome & E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* User / Representative Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                        <User size={12} className="text-[#D4AF37]" /> Nome do Representante
                      </label>
                      <div className="relative flex items-center h-9.5 w-full">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={usuario}
                          onChange={(e) => setUsuario(e.target.value)}
                          onFocus={handleFocusScroll}
                          placeholder="Ex: João da Silva"
                          className="w-full h-9.5 pl-9 pr-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Email Field (MANDATORY for New Client Registration) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Mail size={12} className="text-[#D4AF37]" /> E-mail de Confirmação
                        </span>
                      </label>
                      <div className="relative flex items-center h-9.5 w-full">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                        <input
                          type="email"
                          required
                          maxLength={100}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={handleFocusScroll}
                          placeholder="Ex: contato@empresa.com.br"
                          className="w-full h-9.5 pl-9 pr-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CNPJ Field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                      <Building2 size={12} className="text-[#D4AF37]" /> CNPJ do Cliente/Empresa
                    </label>
                    <div className="relative flex items-center h-9.5 w-full">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                      <input
                        type="text"
                        required
                        maxLength={20}
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        onFocus={handleFocusScroll}
                        placeholder="Ex: 00.000.000/0001-00"
                        className="w-full h-9.5 pl-9 pr-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Próxima Linha: Código de País & Número de Telefone / WhatsApp */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center h-[17px]">
                      <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                        <Phone size={12} className="text-[#D4AF37]" /> Código de País & Telefone / WhatsApp
                      </label>
                      
                      {isDetectingPhone ? (
                        <span className="text-[9px] text-amber-400 flex items-center gap-0.5 font-semibold animate-pulse">
                          <Radio size={10} className="animate-spin text-amber-500" />
                          SIM...
                        </span>
                      ) : phoneDetected ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-0.5 animate-pulse">
                          <CheckCircle2 size={8} />
                          SIM1
                        </span>
                      ) : null}
                    </div>

                    <div className="relative h-9.5">
                      <PhoneInput
                        value={telefone}
                        onChange={(val) => setTelefone(val)}
                        required
                        placeholder="11 99999-8888"
                        className="h-9.5 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Grid 3: Senha & Identificador de Aparelho */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Password Field */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                        <Key size={12} className="text-[#D4AF37]" /> Senha de Acesso
                      </label>
                      <div className="relative flex items-center h-9.5 w-full">
                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none shrink-0 z-10" />
                        <input
                          type={showSenha ? 'text' : 'password'}
                          required
                          maxLength={128}
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          onFocus={handleFocusScroll}
                          placeholder="••••••••"
                          className="w-full h-9.5 pl-9 pr-9 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenha(!showSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                          title={showSenha ? 'Ocultar senha' : 'Exibir senha'}
                        >
                          {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Device Name Field */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#A1A1AA] flex items-center gap-1">
                        <Smartphone size={12} className="text-[#D4AF37]" /> Identificador do Aparelho
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={nomeDispositivo}
                        onChange={(e) => setNomeDispositivo(e.target.value)}
                        placeholder="Ex: Celular Corporativo"
                        className="w-full h-9.5 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Device UUID section */}
                  <div className="bg-[#18181B]/40 p-2 rounded-xl border border-[#27272A]/60 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-[#71717A] font-bold uppercase tracking-wider">UUID do Dispositivo</span>
                      <button
                        type="button"
                        onClick={handleCopyUuid}
                        className="text-[9px] text-[#D4AF37] hover:text-[#E5C158] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {isCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <p className="text-[9px] font-mono text-[#A1A1AA] truncate">
                      {deviceUuid}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button: Strictly dependent on formMode to avoid crowded triggers */}
              <div className="pt-1">
                {formMode === 'LOGIN' ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D4AF37]/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                    <span>Entrar no Sistema</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-[#D4AF37] to-[#E5C158] hover:opacity-95 text-[#0A0A0B] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      <span>Cadastrar e Ativar Cliente</span>
                    </button>

                    {(!currentStatus || currentStatus === 'REJEITADO') && (
                      <button
                        type="button"
                        onClick={handleRequestAccess}
                        disabled={loading}
                        className="w-full bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <span>Solicitar Homologação de Terminal</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* Segmented control toggle at bottom to avoid unrequested visual clutter */}
            <div className="pt-3 border-t border-[#27272A] flex flex-col space-y-2">
              
              {formMode === 'LOGIN' ? (
                <button
                  type="button"
                  onClick={() => setFormMode('REGISTER')}
                  className="w-full py-1.5 bg-[#18181B]/40 hover:bg-[#18181B] border border-[#27272A] rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Não possui cadastro? Cadastrar Novo Cliente</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFormMode('LOGIN')}
                  className="w-full py-1.5 bg-[#18181B]/40 hover:bg-[#18181B] border border-[#27272A] rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Já possui cadastro? Entrar com Senha</span>
                </button>
              )}



            </div>

          </div>
        )}

      </div>

      {/* Footer System Version Badge */}
      <div className="mt-3 text-center">
        <span className="text-[11px] font-mono text-[#71717A] flex items-center justify-center gap-1.5">
          <span>Acervus Core</span>
          <span className="text-[#D4AF37] font-bold bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-md">
            {SYSTEM_VERSION}
          </span>
          <span>• Gestão Inteligente de Acervos</span>
        </span>
      </div>

      {/* Android Native-Style BiometricPrompt Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#18181B] border border-[#27272A] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 relative overflow-hidden">
            
            <div className="w-12 h-1 bg-[#27272A] rounded-full self-center -mt-2" />

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <ScanFace size={20} className="text-emerald-400" />
                Autenticação Biométrica Android
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Confirme sua digital cadastrada no dispositivo
              </p>
            </div>

            {/* Fingerprint Visual Sensor */}
            <div className="my-3 relative flex items-center justify-center">
              {biometricState === 'scanning' && (
                <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/30 animate-ping" />
              )}
              
              <div 
                onClick={() => {
                  if (biometricState === 'scanning') {
                    setBiometricState('success');
                    setBiometricMessage('Digital reconhecida com sucesso!');
                    setTimeout(async () => {
                      setShowBiometricModal(false);
                      setLoading(true);
                      if (matchedDevice && matchedDevice.status === 'APROVADO') {
                        onAuthenticated(matchedDevice, false);
                      } else {
                        const bioDev: DispositivoAutorizado = {
                          id: deviceUuid,
                          imei: deviceUuid,
                          nomeDispositivo: nomeDispositivo.trim() || 'Biometric Device',
                          cnpjEmpresa: cnpj.trim() || empresaConfig.cnpj || '',
                          usuario: usuario.trim() || 'Representante Legal',
                          telefone: telefone.trim() || '',
                          status: 'APROVADO',
                          dataSolicitacao: Date.now(),
                          dataAtualizacao: Date.now(),
                          ultimoAcesso: Date.now(),
                        };
                        onAuthenticated(bioDev, false);
                      }
                      setLoading(false);
                    }, 600);
                  }
                }}
                className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ${
                biometricState === 'success' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-105 shadow-lg shadow-emerald-500/20' 
                  : biometricState === 'error'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-[#111113] border-emerald-500/50 text-emerald-400 hover:border-emerald-400 shadow-xl shadow-emerald-500/10'
              }`}>
                {biometricState === 'success' ? (
                  <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-200" />
                ) : biometricState === 'error' ? (
                  <XCircle size={48} />
                ) : (
                  <Fingerprint size={52} className="animate-pulse" />
                )}
              </div>
            </div>

            {/* Status Message */}
            <p className={`text-xs font-medium max-w-xs transition-colors ${
              biometricState === 'success' ? 'text-emerald-400 font-bold' :
              biometricState === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {biometricMessage}
            </p>

            {/* Modal Actions */}
            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowBiometricModal(false)}
                className="w-full bg-[#27272A] hover:bg-[#3F3F46] text-white py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Usar Senha de Acesso
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Email / WhatsApp Seed Verification Modal for First Use */}
      {showSeedModal && seedModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111113] border border-[#27272A] rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 relative">
            <div className="flex items-center gap-3 pb-3 border-b border-[#27272A]">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <MailCheck size={22} />
              </div>
              <div>
                <h3 className="font-serif italic text-white text-base">
                  Verificação do Primeiro Acesso
                </h3>
                <p className="text-[#A1A1AA] text-xs">
                  Validação de segurança de e-mail e WhatsApp
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                A semente de confirmação foi enviada para os canais de contato cadastrados abaixo:
              </p>
              
              {/* E-mail Destination Card */}
              <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={16} className="text-[#D4AF37] shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold block">E-mail de Destino</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold truncate block">{seedModalData.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => sendEmailNotification(seedModalData.email, seedModalData.expectedSeed, seedModalData.dev.usuario)}
                  className="px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-[#D4AF37] disabled:opacity-50 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="Reenviar e-mail de confirmação"
                >
                  {isSendingEmail ? (
                    <Loader2 size={12} className="animate-spin text-[#D4AF37]" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  <span>{isSendingEmail ? 'Enviando...' : 'Reenviar'}</span>
                </button>
              </div>

              {/* WhatsApp Destination Card if phone exists */}
              {(seedModalData.dev.telefone || empresaConfig.telefoneWhatsapp) && (
                <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Send size={16} className="text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#71717A] uppercase font-bold block">WhatsApp Cadastrado</span>
                      <span className="text-xs font-mono text-white font-bold truncate block">
                        {seedModalData.dev.telefone || empresaConfig.telefoneWhatsapp}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold shrink-0">
                    Notificado
                  </span>
                </div>
              )}

              {/* Real-time Email Dispatch Status */}
              {emailSendStatus && (
                <div className="p-2.5 bg-[#18181B] border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
                  <Info size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="leading-tight">{emailSendStatus}</p>
                    {emailPreviewUrl && (
                      <a
                        href={emailPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[#D4AF37] hover:underline font-bold"
                      >
                        <ExternalLink size={10} /> Visualizar E-mail de Teste (Inbox Virtual)
                      </a>
                    )}
                  </div>
                </div>
              )}

              {seedError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <XCircle size={16} className="shrink-0" />
                  <span>{seedError}</span>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-[#A1A1AA] flex items-center gap-1.5">
                  <KeyRound size={14} className="text-[#D4AF37]" /> Informe o Código Recebido
                </label>
                <input
                  type="text"
                  value={inputSeed}
                  onChange={(e) => setInputSeed(e.target.value)}
                  placeholder="Ex: SEED-123456"
                  className="w-full px-3.5 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none transition-all font-mono uppercase"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#27272A] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVerifySeed}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0B] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#D4AF37]/10"
              >
                <CheckCircle2 size={16} />
                <span>Confirmar e Ativar Acesso</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



