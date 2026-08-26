import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  HardDrive, 
  ShieldCheck, 
  Code2, 
  Copy, 
  Check, 
  FileText, 
  Video, 
  Sparkles, 
  Cpu, 
  Database, 
  Share2, 
  Box, 
  Calendar, 
  Users, 
  DollarSign, 
  Wrench, 
  BarChart3, 
  Link as LinkIcon, 
  Building2, 
  Instagram, 
  Award, 
  Lock, 
  ExternalLink,
  ChevronRight,
  Printer,
  Search,
  CheckCircle2,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { NfseAndroidDocView } from './NfseAndroidDocView';

export const GuiaSistemaArquiteturaView: React.FC = () => {
  const [docTab, setDocTab] = useState<'arquitetura' | 'modulos' | 'nfse' | 'marketing' | 'kotlin'>('arquitetura');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>('inventario');

  const handleCopySpec = () => {
    const text = `# ACERVUS CORE (GGERE) - ESPECIFICAÇÃO TÉCNICA OFICIAL E ARQUITETURA
Versão: 2.5.0-ENTERPRISE (Multi-Tenant & Android Clean Architecture)
Plataforma: React 18+ / TypeScript / Express + Android Native Kotlin 2.0+

---
1. ARQUITETURA E CAMADAS
- Presentation: Jetpack Compose + MVVM (ViewModel + StateFlow)
- Domain: Use Cases puros, Entities e Repository Interfaces
- Data: Room ORM (SQLite com SQLCipher) + Google Cloud Firestore + Cloud SQL PostgreSQL

2. REGRAS DE NEGÓCIO DESTAQUE
- RN-01: Isolamento estrito Multi-Tenant por \`tenantId\`
- RN-02: Algoritmo atômico anti-overbooking por menor gargalo de Kits
- RN-03: Coletor QR Code com leitor em tempo real e feedback sonoro Web Audio API
- RN-04: Cálculo de Frete por Quilometragem (R$/Km) integrado à Google Distance Matrix API
- RN-05: Envelopes de Assinatura Gov.br PKCS#7 com hash SHA-256 e carimbo ICP-Brasil
- RN-19: Módulo de Sorteios Instagram sincronizado com Canal Oficial do Tenant
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const modulosList = [
    {
      id: 'inventario',
      name: '1. Acervo & Estoque',
      code: 'inventario',
      icon: Box,
      desc: 'Gestão de móveis, louças e decorações com foto HD, precificação e Kits Virtuais.',
      details: [
        'Kits Virtuais Dinâmicos: O estoque é calculado dinamicamente com base na peça componente com menor quantidade disponível.',
        'Coletor & Leitor QR Code: Modal com leitor de câmera ao vivo (facingMode: environment) e simulador para conferência em galpão.',
        'Controle de Vistorias & Avarias: Registro de condição física da peça antes do envio e no retorno do evento.',
        'Etiquetas QR Code: Geração de etiquetas imprimíveis com identificador único e chave do tenant.'
      ]
    },
    {
      id: 'reservas',
      name: '2. Reservas & Logística',
      code: 'reservas',
      icon: Calendar,
      desc: 'Agendamentos de locação com trava atômica de datas e simulação de frete.',
      details: [
        'Trava Atômica de Overbooking: Validação de conflitos de datas em milissegundos.',
        'Cálculo de Frete por Km: Integração com a Google Distance Matrix API e tarifa R$/Km configurável.',
        'Gestão de Caução PIX: Controle de retenção para avarias e devolução automática pós-evento.',
        'Minuta de Contrato em PDF: Injeção automática da logo da empresa e assinatura digital Gov.br.'
      ]
    },
    {
      id: 'clientes',
      name: '3. CRM de Clientes',
      code: 'clientes',
      icon: Users,
      desc: 'Base de clientes com validação de CPF/CNPJ e atalho para WhatsApp Direct.',
      details: [
        'Validação de CPF/CNPJ: Algoritmo de checagem de dígitos verificadores oficiais.',
        'Formatação E.164: Telefones formatados para integração nativa com o WhatsApp Web e celular.',
        'Histórico de Locações: Visão unificada de faturamento e índice de adimplência do cliente.',
        'Tags de Segmentação: Categorização entre Noivas, Cerimonialistas, Buffets e Decoradores.'
      ]
    },
    {
      id: 'financeiro',
      name: '4. Financeiro & DRE',
      code: 'financeiro',
      icon: DollarSign,
      desc: 'Fluxo de caixa, livro caixa e DRE sintético do negócio.',
      details: [
        'DRE Sintético Automatizado: Receitas operacionais, custos de frete, manutenção e margem líquida.',
        'Conciliação de Locações: Baixas automáticas de parcelas e pagamentos de entrada.',
        'Controle de Depósitos de Caução: Isolamento contábil das cauções recebidas.',
        'Exportação de Relatórios: Geração em PDF e Excel formatado.'
      ]
    },
    {
      id: 'manutencao',
      name: '5. Manutenção & Avarias',
      code: 'manutencao',
      icon: Wrench,
      desc: 'Controle de avarias, ordens de serviço (OS) e giros de reforma do acervo.',
      details: [
        'Abertura de OS por Item: Bloqueio temporário do estoque durante período de reforma.',
        'Cálculo de Custos de Reparo: Lançamento direto na DRE do evento gerador do dano.',
        'Histórico de Avarias por Peça: Avaliação de durabilidade e vida útil do móvel.'
      ]
    },
    {
      id: 'relatorios',
      name: '6. Relatórios & Minutas',
      code: 'relatorios',
      icon: BarChart3,
      desc: 'Relatórios analíticos e modelos de contratos de locação personalizáveis.',
      details: [
        'Injeção da Logomarca da Empresa: Marca personalizada no cabeçalho de todos os PDFs.',
        'Relatórios de Curva de Faturamento: Análise de peças mais rentáveis do acervo.',
        'Exportação Google Docs: Integração com a Google Drive API para edição remota.'
      ]
    },
    {
      id: 'formularios_web',
      name: '7. Propostas Web Interativas',
      code: 'formularios_web',
      icon: LinkIcon,
      desc: 'Links públicos de orçamento para clientes finais com simulador de frete.',
      details: [
        'Propostas Públicas Personalizadas: Exibição de galerias HD e simulação de frete por CEP/distância.',
        'Pagamento via Caução PIX: Exibição do QR Code PIX configurado no perfil da empresa.',
        'Aceite Digital Imediato: Registro de IP, data/hora e confirmação pelo cliente.'
      ]
    },
    {
      id: 'empresa',
      name: '8. Perfil Empresa & Identidade Visual',
      code: 'empresa',
      icon: Building2,
      desc: 'Configuração dos dados cadastrais, logotipo da empresa e parâmetros de frete.',
      details: [
        'Seção Identidade Visual: Upload e preview de imagem (PNG, JPG, WebP, SVG) com conversão Base64.',
        'Parâmetro Frete R$/Km: Configuração da tarifa por quilômetro rodado.',
        'Dados Cadastrais em Linha Única: Razão Social, CNPJ, Inscrição Municipal e Endereço Oficial.'
      ]
    },
    {
      id: 'sorteios_instagram',
      name: '9. Sorteios Instagram',
      code: 'sorteios_instagram',
      icon: Instagram,
      desc: 'Campanhas de engajamento para captação de noivas e debutantes.',
      details: [
        'Canal do Instagram Associado: Cadastro do perfil oficial da empresa (@canal).',
        'Integração Meta Graph API: Conexão homologada v19.0 para comentários e menções em Stories.',
        'Sorteio Auditável: Geração de sementes criptográficas SHA-256 para transparência total.'
      ]
    },
    {
      id: 'plano_assinatura',
      name: '10. Plano & Licenciamento',
      code: 'plano_assinatura',
      icon: Award,
      desc: 'Gestão da assinatura do software, renovações e suporte técnico prioritário.',
      details: [
        'SLA de Atendimento: Suporte direto via WhatsApp e e-mail.',
        'Status do Tenant: Monitoramento de limite de dispositivos atrelados ao plano.'
      ]
    },
    {
      id: 'controle_acesso',
      name: '11. Controle de Acesso (RBAC & MDM)',
      code: 'controle_acesso',
      icon: Lock,
      desc: 'Gerenciamento de permissões de operadores e vínculo de hardware MDM.',
      details: [
        'Perfis RBAC: DESENVOLVEDOR, ADMINISTRADOR e OPERADOR.',
        'Vínculo de Hardware Quádruplo: Associação de IMEI, CNPJ, Telefone e E-mail.'
      ]
    },
    {
      id: 'database_explorer',
      name: '12. Database Explorer',
      code: 'database_explorer',
      icon: Database,
      desc: 'Console SQL, inspetor de tabelas Cloud SQL e dados do Firestore.',
      details: [
        'Console SQL Interativo: Execução de consultas DQL/DML em ambiente seguro.',
        'Auditoria Multi-Tenant: Validação e inspeção da chave tenantId.'
      ]
    }
  ];

  const regrasNegocio = [
    { id: 'RN-01', title: 'Multi-Tenancy Estrito', desc: 'Todas as tabelas do banco de dados obrigatoriamente filtram e registram a chave `tenantId`.' },
    { id: 'RN-02', title: 'Estoque Mínimo de Kits Virtuais', desc: 'O estoque total do Kit é limitado pelo menor saldo individual das peças componentes.' },
    { id: 'RN-03', title: 'Bipagem do Coletor QR Code', desc: 'Modos CONSULTA, ENTRADA (devolução) e SAÍDA (expedição) com Web Audio API.' },
    { id: 'RN-04', title: 'Cálculo Dinâmico de Frete por Km', desc: 'Distância (Km) x valorFretePorKm configurado no Perfil Empresa.' },
    { id: 'RN-05', title: 'Assinatura Gov.br PKCS#7', desc: 'Conformidade com a Lei 14.063/2020 e hash criptográfico SHA-256.' },
    { id: 'RN-19', title: 'Sorteios vinculados ao Canal do Instagram', desc: 'Sincronização do canal oficial `@empresa` com a Meta Graph API.' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-wider mb-1">
            <Cpu size={14} /> Arquitetura de Software & Documentação Oficial
          </div>
          <h2 className="text-2xl font-serif italic font-extrabold text-white flex items-center gap-3">
            <BookOpen className="text-[#D4AF37]" size={28} />
            Guia do Sistema & Arquitetura (Acervus Core)
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1 max-w-2xl">
            Documentação técnica completa, especificação Clean Architecture, módulos do sistema, SEFIN/NFS-e e guia para IAs geradoras de mídia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySpec}
            className="px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#D4AF37] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Especificação Ttécnica'}</span>
          </button>
        </div>
      </div>

      {/* SUB-ABAS DE NAVEGAÇÃO DA DOCUMENTAÇÃO */}
      <div className="flex flex-wrap gap-2 border-b border-[#27272A] pb-3">
        <button
          onClick={() => setDocTab('arquitetura')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            docTab === 'arquitetura'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          <Layers size={15} />
          <span>🏛️ Arquitetura & Regras</span>
        </button>

        <button
          onClick={() => setDocTab('modulos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            docTab === 'modulos'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          <Box size={15} />
          <span>📦 Manual dos 12 Módulos</span>
        </button>

        <button
          onClick={() => setDocTab('nfse')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            docTab === 'nfse'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          <FileText size={15} />
          <span>📄 SEFIN/NFS-e & Gov.br</span>
        </button>

        <button
          onClick={() => setDocTab('marketing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            docTab === 'marketing'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          <Sparkles size={15} />
          <span>🎬 Guia de Marketing & IA</span>
        </button>

        <button
          onClick={() => setDocTab('kotlin')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            docTab === 'kotlin'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 font-extrabold'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          <Code2 size={15} />
          <span>📱 Código Android Kotlin</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: ARQUITETURA & REGRAS */}
      {docTab === 'arquitetura' && (
        <div className="space-y-6">
          {/* CARDS DE DESTAQUE TÉCNICO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] space-y-2">
              <div className="text-[#D4AF37] font-bold flex items-center gap-2 text-sm">
                <Layers size={18} /> Clean Architecture + MVVM
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Isolamento absoluto de responsabilidades entre Presentation (Jetpack Compose), Domain (Use Cases Puros) e Data (Room ORM / Firestore).
              </p>
            </div>

            <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] space-y-2">
              <div className="text-[#D4AF37] font-bold flex items-center gap-2 text-sm">
                <HardDrive size={18} /> Offline-First & SQLite (Room)
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Garantia de operação local ACID em galpões de estoque sem conectividade com a internet, sincronizado em background via WorkManager.
              </p>
            </div>

            <div className="bg-[#111113] p-5 rounded-2xl border border-[#27272A] space-y-2">
              <div className="text-[#D4AF37] font-bold flex items-center gap-2 text-sm">
                <ShieldCheck size={18} /> Multi-Tenant & Vínculo MDM
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Isolamento lógico estrito por `tenantId` e autenticação de hardware quádruplo (IMEI, CNPJ, Telefone e Usuário Operador).
              </p>
            </div>
          </div>

          {/* REGRAS DE NEGÓCIO OFICIAIS */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 border-b border-[#27272A] pb-3">
              <Code2 className="text-[#D4AF37]" size={18} /> Directrizes de Regras de Negócio Oficiais (RN-01 a RN-19)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regrasNegocio.map((rn) => (
                <div key={rn.id} className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#D4AF37]/30">
                      {rn.id}
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">{rn.title}</h4>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed pl-1">{rn.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: MANUAL COMPLETO DOS 12 MÓDULOS */}
      {docTab === 'modulos' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* LISTA LATERAL DOS MÓDULOS */}
            <div className="w-full md:w-80 shrink-0 space-y-2">
              <div className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider font-mono px-1 mb-2">
                12 Módulos do Sistema
              </div>
              {modulosList.map((m) => {
                const IconComponent = m.icon;
                const isSelected = selectedModule === m.code;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModule(m.code)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black font-extrabold shadow-lg shadow-[#D4AF37]/20'
                        : 'bg-[#111113] text-white hover:bg-[#18181B] border border-[#27272A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent size={16} className={isSelected ? 'text-black' : 'text-[#D4AF37]'} />
                      <span className="truncate">{m.name}</span>
                    </div>
                    <ChevronRight size={14} className={isSelected ? 'text-black' : 'text-[#71717A]'} />
                  </button>
                );
              })}
            </div>

            {/* DETALHAMENTO DO MÓDULO SELECIONADO */}
            <div className="flex-1 bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-6">
              {(() => {
                const mod = modulosList.find((m) => m.code === selectedModule) || modulosList[0];
                const ModIcon = mod.icon;
                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
                      <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl">
                        <ModIcon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif italic font-bold text-white">{mod.name}</h3>
                        <p className="text-xs text-[#A1A1AA]">{mod.desc}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                        Recursos & Especificações Técnicas:
                      </h4>
                      <div className="space-y-2">
                        {mod.details.map((dt, idx) => (
                          <div key={idx} className="bg-[#18181B] p-3 rounded-xl border border-[#27272A] flex items-start gap-2.5 text-xs text-[#E4E4E7]">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{dt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: SEFIN / NFS-e & GOV.BR */}
      {docTab === 'nfse' && (
        <div className="space-y-4">
          <NfseAndroidDocView />
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: GUIA DE MARKETING & IA */}
      {docTab === 'marketing' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#27272A] pb-4">
            <div className="p-3 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-serif italic font-bold text-white">Guia para IA & Geração de Vídeos e Prompts</h3>
              <p className="text-xs text-[#A1A1AA]">
                Prompts e roteiros pré-configurados para Runway, Midjourney, DALL-E, Sora e ChatGPT gerarem vídeos promocionais e postagens do Acervus Core.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-2">
              <h4 className="font-bold text-[#D4AF37] font-mono uppercase">Prompt para Midjourney / DALL-E 3 (Mockup do App)</h4>
              <p className="text-[#E4E4E7] font-mono bg-[#09090B] p-3 rounded-lg border border-[#27272A] text-[11px] leading-relaxed">
                "A high-end commercial photograph of an event rental warehouse filled with luxury furniture, gold chiavari chairs, velvet sofas, and wooden rustic tables. In the foreground, an event business owner is holding a sleek smartphone displaying a dark-mode app user interface called ACERVUS CORE with a gold champagne logo, showing a QR Code scanner scanning a chair barcode. Clean cinematic lighting, 8k resolution, photorealistic, depth of field."
              </p>
            </div>

            <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A] space-y-2">
              <h4 className="font-bold text-pink-400 font-mono uppercase">Roteiro de Anúncio Comercial (30 Segundos)</h4>
              <ul className="space-y-1.5 text-[#A1A1AA] list-disc pl-4">
                <li><strong className="text-white">[00:00 - 00:05]</strong> Dono de locadora sobrecarregado no balcão com papéis soltos e mensagens atrasadas.</li>
                <li><strong className="text-white">[00:05 - 00:15]</strong> Apresentação do Acervus Core no celular com leitor de QR Code ao vivo.</li>
                <li><strong className="text-white">[00:15 - 00:25]</strong> Envio de proposta interativa com simulador de frete por Km e assinatura Gov.br.</li>
                <li><strong className="text-white">[00:25 - 00:30]</strong> Encerramento com tela do DRE lucrativo e logo do Acervus Core.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 5: CÓDIGO FONTE ANDROID KOTLIN */}
      {docTab === 'kotlin' && (
        <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-6 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <span className="text-[#D4AF37] font-bold">AcervusAppDatabase.kt — Android Room ORM</span>
            <span className="text-[10px] text-[#71717A]">Kotlin 2.0+ / SQLite SQLCipher</span>
          </div>
          <pre className="bg-[#09090B] p-4 rounded-xl border border-[#27272A] text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
{`@Database(
    entities = [
        ItemEntity::class,
        ClienteEntity::class,
        ReservaEntity::class,
        TransacaoEntity::class,
        ManutencaoEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class AcervusAppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun clienteDao(): ClienteDao
    abstract fun reservaDao(): ReservaDao
    abstract fun transacaoDao(): TransacaoDao
    abstract fun manutencaoDao(): ManutencaoDao
}`}
          </pre>
        </div>
      )}
    </div>
  );
};
