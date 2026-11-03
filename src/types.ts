export enum StatusReserva {
  PENDENTE = 'PENDENTE',
  CONFIRMADA = 'CONFIRMADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

export enum StatusCicloVenda {
  ORCAMENTO_SOLICITADO = 'ORCAMENTO_SOLICITADO',
  RESERVA_CONFIRMADA = 'RESERVA_CONFIRMADA',
  LEMBRETE_RETIRADA = 'LEMBRETE_RETIRADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  LEMBRETE_DEVOLUCAO = 'LEMBRETE_DEVOLUCAO',
  CONCLUIDO_COM_SUCESSO = 'CONCLUIDO_COM_SUCESSO',
  POS_VENDA_NPS = 'POS_VENDA_NPS',
  CANCELADO = 'CANCELADO',
  ENVIO_FORMULARIO_PROPOSTA = 'ENVIO_FORMULARIO_PROPOSTA',
}

export interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  cpfCnpj?: string;
  endereco?: string; // String concatenada de endereço
  logradouro?: string; // Rua / Avenida
  numero?: string; // Número do imóvel
  bairro?: string; // Bairro
  cidade?: string; // Cidade / Município
  estado?: string; // Estado / UF
  cep?: string; // Código de Endereçamento Postal
  observacoes?: string;
  ativo?: boolean; // Se false, cliente desativado (soft delete). Default: true
}

export interface KitComponente {
  itemId: number;
  quantidade: number;
}

export interface ItemAcervo {
  id: number;
  nome: string;
  descricao?: string;
  quantidadeTotal: number;
  precoAluguel: number;
  imageUrl: string;
  categoria: string;
  isKit?: boolean;
  kitComponentes?: KitComponente[];
  // Campos de Manutenção Preventiva
  ultimaManutencao?: number; // timestamp ms
  frequenciaAlugueisManutencao?: number; // ex: a cada 5 alugueis
  alugueisDesdeManutencao?: number; // contador de locações desde ultima manutenção
  statusManutencao?: 'EM_DIA' | 'ALERTA' | 'EM_MANUTENCAO';
  proximaRevisaoData?: number; // data recomendada
}

export interface Reserva {
  id: number;
  clienteId: number;
  dataRetirada: number; // timestamp ms
  dataDevolucao: number; // timestamp ms
  status: StatusReserva;
  origemPropostaId?: string;
  propostaAprovada?: boolean;
  contratoAssinadoText?: string;
  hashAssinaturaDigital?: string;
  dataAssinatura?: number;
  percentualCalcao?: number; // Percentual do calção para garantia da reserva (ex: 30%)
  valorCalcao?: number; // Valor em R$ do calção calculado
  nfseEmitida?: boolean;
  nfseChaveAcesso?: string;
  nfseProtocolo?: string;
  nfseDataEmissao?: number;
  endereco?: string; // NOVO: Local do Evento / Endereço de entrega
  logradouro?: string; // Rua / Avenida do local do evento
  numero?: string; // Número
  bairro?: string; // Bairro
  cidade?: string; // Cidade / Município
  estado?: string; // UF
  cep?: string; // CEP
  observacoes?: string; // NOVO: Observações e solicitações especiais do cliente
  valorFrete?: number; // NOVO: Valor calculado do frete
  distanciaKm?: number; // NOVO: Distância em quilômetros
  valorFretePorKm?: number; // NOVO: Valor por km cobrado nesta reserva
  numeroDeslocamentosFrete?: number; // NOVO: Número de deslocamentos considerados no frete (padrão 4)
  contratarMontagem?: boolean; // NOVO: Se o cliente contratou montagem/desmontagem no local
  valorMontagem?: number; // NOVO: Valor cobrado pelo serviço de montagem
}

export interface ReservaComItens {
  reserva: Reserva;
  cliente: Cliente;
  itens: ItemAcervo[];
  valorTotal: number;
  diasReserva: number;
}

export interface FormularioWebItem {
  id: number;
  nome: string;
  precoAluguel: number;
  imageUrl: string;
}

export const RAMOS_ATUACAO_LOCACAO = [
  'Locação de Móveis e Decoração para Eventos (Casamentos, 15 Anos, Corporativos)',
  'Locação de Brinquedos, Infláveis e Artigos para Festas Infantis',
  'Locação de Equipamentos Audiovisuais, Iluminação, Som e Palcos',
  'Locação de Louças, Pratarias, Toalhas e Gastronomia (Buffet)',
  'Locação de Tendas, Coberturas, Estruturas e Tablados',
  'Locação de Máquinas, Ferramentas e Equipamentos para Construção Civil',
  'Locação de Equipamentos Médicos, Hospitalares e Acessibilidade',
  'Locação de Vestuário, Trajes, Fantasias e Figurinos',
  'Locação de Veículos, Utilitários, Reboques e Food Trucks',
  'Locação de Eletrodomésticos, Climatização e Geradores de Energia',
  'Locação de Cenografia, Stands e Feiras Comerciais',
  'Locação de Artigos Esportivos, Náuticos e Lazer',
  'Locação e Locadora Multissetorial em Geral',
  'Outro Ramo de Locação',
] as const;

export type RamoAtuacaoLocacao = typeof RAMOS_ATUACAO_LOCACAO[number] | string;

export interface FormularioWeb {
  id: string;
  titulo: string;
  clienteId?: number;
  clienteNome?: string;
  clienteTelefone?: string;
  itens: FormularioWebItem[];
  criadoEm: number;
  respondido: boolean;
  googleFormUrl?: string;
  googleDriveFileId?: string;
  textoIntroducao?: string;
  percentualCalcao?: number; // Percentual do calção exigido para garantia da reserva (ex: 30%)
  validadeDias?: number; // Validade do orçamento em dias definida no painel de controle
  recusado?: boolean;
  motivoRecusa?: string;
  dataRecusa?: number;
  contratarMontagem?: boolean; // NOVO: Se o orçamento prevê opção de contratação de montagem
  valorMontagem?: number; // NOVO: Valor da taxa de montagem
  resposta?: {
    clienteNome: string;
    clienteTelefone: string;
    itemIdsSelecionados: number[];
    dataRetirada: number;
    dataDevolucao: number;
    contratoAssinadoText?: string;
    hashAssinaturaDigital?: string;
    dataAssinatura?: number;
    percentualCalcao?: number;
    valorCalcaoCalculado?: number;
    endereco?: string; // NOVO: Local do evento ou endereço de entrega informado pelo cliente
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    observacoes?: string; // NOVO: Observações e solicitações especiais informadas pelo cliente
    valorFrete?: number; // NOVO: Valor calculado do frete
    distanciaKm?: number; // NOVO: Distância calculada
    valorFretePorKm?: number; // NOVO: Valor por km cobrado
    numeroDeslocamentosFrete?: number; // NOVO: Número de deslocamentos considerados no frete (padrão 4)
    contratarMontagem?: boolean; // NOVO: Se o cliente marcou contratação de montagem
    valorMontagem?: number; // NOVO: Valor da montagem contratada
  };
  valorFrete?: number; // NOVO: Valor calculated do frete na proposta
  distanciaKm?: number; // NOVO: Distância calculada na proposta
  valorFretePorKm?: number; // NOVO: Valor por km cobrado na proposta
  numeroDeslocamentosFrete?: number; // NOVO: Número de deslocamentos considerados no frete (padrão 4)
}

export interface CategoriaItem {
  id: string;
  nome: string;
  descricao?: string;
  corHex?: string;
  iconeName?: string;
  ativo: boolean;
}

export interface GoogleAccountConfig {
  isConnected: boolean;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  driveFolderId?: string;
  driveFolderPath?: string;
  scopesGranted?: string[];
  connectedAt?: number;
}

export interface ListVisibilityConfig {
  exibirInventarioPorPadrao?: boolean;
  exibirCategoriasPorPadrao?: boolean;
  exibirClientesPorPadrao?: boolean;
  exibirReservasPorPadrao?: boolean;
}

export type WhatsAppTemplatesConfig = Record<string, string>;

export interface WhatsAppReceiptData {
  eComprovante: boolean;
  tipoComprovante?: 'PIX' | 'TED' | 'DOC' | 'TRANSFERENCIA' | 'OUTRO';
  valorIdentificado?: number;
  nomePagador?: string;
  cpfPagador?: string;
  dataHoraTransacao?: string;
  codigoAutenticacao?: string;
  bancoOrigem?: string;
  bancoDestino?: string;
  reservaCorrespondenteId?: number;
  confiancaAnalise?: number;
}

export interface WhatsAppClientIdentification {
  isClienteExistente: boolean;
  clienteIdMatched?: number;
  nomeIdentificado: string;
  telefoneMatched?: string;
  tipoEvento?: string;
  dataEventoMencionada?: string;
  itensInteresse?: string[];
  grauInteresse?: 'ALTO' | 'MEDIO' | 'BAIXO';
}

export interface WhatsAppAiAnalysis {
  intent: 'COMPROVANTE_PAGAMENTO' | 'NOVO_ORCAMENTO' | 'DUVIDA_RESERVA' | 'CANCELAMENTO' | 'SUPORTE_GERAL';
  resumoAtendimento: string;
  clienteIdentification: WhatsAppClientIdentification;
  receiptData?: WhatsAppReceiptData;
  respostaSugeridaIA: string;
  acaoRecomendada: 'CONFIRMAR_PAGAMENTO' | 'CADASTRAR_CLIENTE' | 'CRIAR_RESERVA' | 'RESPONDER_DUVIDA' | 'NENHUMA';
  scoreConfianca: number;
}

export interface WhatsAppIncomingMessage {
  id: string;
  fromPhone: string;
  fromName?: string;
  timestamp: number;
  mensagemTexto: string;
  midiaUrl?: string;
  midiaTipo?: 'image' | 'document' | 'audio' | 'none';
  statusProcessamento: 'PROCESSANDO' | 'ANALISADO' | 'PAGAMENTO_CONFIRMADO' | 'CLIENTE_CADASTRADO' | 'FALHA';
  aiAnalysis?: WhatsAppAiAnalysis;
  webhookSource?: string;
}

export interface GovBrConfig {
  clientId: string;
  clientSecret: string;
  ambiente: 'homologacao' | 'producao';
  redirectUri: string;
  enabled: boolean;
}

export interface NfseGovBrConfig {
  cnpjEmitente: string;
  inscricaoMunicipal: string;
  regimeTributario: 'simples_nacional' | 'mei' | 'lucro_presumido' | 'lucro_real';
  ambienteEmissao: 'homologacao' | 'producao';
  certificadoSenhaA1: string;
  certificadoNomeA1: string;
  certificadoCarregadoA1?: boolean;
  aliquotaIssPadrao?: number;
  codigoServicoPadrao?: string;
  enabled: boolean;
}

export interface InstagramConfig {
  canalInstagram?: string; // NOVO: Canal / Perfil do Instagram da empresa (ex: @acervus.core)
  apiClientId?: string;
  apiClientSecret?: string;
  apiAccessToken?: string;
  apiVersion?: string;
  apiBusinessId?: string;
  tokenType?: 'short-lived' | 'long-lived';
  tokenExpiration?: string;
  isTokenSecured?: boolean;
}

export interface AssinaturaGovBrData {
  signerName: string;
  signerCpf: string;
  timestamp: number;
  hashSha256: string;
  documentId: string;
  signatureToken: string;
  verificationUrl: string;
  certificateLevel: 'PRATA' | 'OURO';
  status: 'VALIDO' | 'PENDENTE' | 'EXPIRADO';
}

export interface TabDisplayConfig {
  abaPrincipalId: string;
  abasFixadas: string[];
  ordemAbas?: string[];
  abasOcultas?: string[];
  nomesAbas?: Record<string, string>;
}

export interface PainelConfiguracaoData {
  validadeOrcamentoDias: number;
  percentualSinalPadrao: number;
  multaAtrasoDiaria: number;
  emissaoComprovanteAuto: boolean;
  alertaEstoqueMinimo: number;
  diasHigienizacaoCarencia: number;
  bloqueioAutoDanificados: boolean;
  exibirIndisponiveisBusca: boolean;
  lembreteDevolucaoHoras: number;
  notificarReservaPendente: boolean;
  somBipCheckinCheckout: boolean;
  modoDepuracaoLogs: boolean;
  backupAutoFirestore: boolean;
  // Configurações do Banco de Dados (Cloud SQL PostgreSQL + Drizzle ORM)
  dbPoolLimit?: number;
  dbQueryTimeoutMs?: number;
  dbLockPessimista?: boolean;
  dbAutoSyncEnabled?: boolean;
  dbIsolamentoTenantEstrito?: boolean;
}

export interface EmpresaConfig {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  ramoAtuacao?: string; // NOVO: Ramo de atuação/segmento de locação da empresa
  enderecoCompleto: string;
  logradouro?: string; // Rua / Avenida da Sede
  numero?: string; // Número do imóvel
  bairro?: string; // Bairro
  cidade?: string; // Cidade / Município
  estado?: string; // Estado / UF
  cep?: string; // CEP
  telefoneWhatsapp: string;
  telefonesAdicionais?: string[];
  nomeRepresentante: string;
  representantesAdicionais?: string[];
  logoUrl?: string;
  linkMapaLocalizacao?: string;
  googleMapsApiKey?: string;
  email?: string;
  senhaAcesso?: string;
  emailConfirmationSeed?: string;
  isEmailVerified?: boolean;
  ambienteSistema?: 'teste' | 'producao';
  listVisibility?: ListVisibilityConfig;
  whatsappTemplates?: WhatsAppTemplatesConfig;
  whatsappApiToken?: string;
  whatsappApiEndpoint?: string;
  whatsappPhoneNumberId?: string;
  govBrConfig?: GovBrConfig;
  nfseGovBrConfig?: NfseGovBrConfig;
  instagramConfig?: InstagramConfig;
  tabDisplay?: TabDisplayConfig;
  painelConfiguracao?: PainelConfiguracaoData;
  habilitarGoogleDrive?: boolean;
  habilitarGoogleForms?: boolean;
  backupAutoDriveEnabled?: boolean;
  googleAccount?: GoogleAccountConfig;
  valorFretePorKm?: number; // NOVO: Valor padrão cobrado por quilômetro de deslocamento para frete
  numeroDeslocamentosFrete?: number; // NOVO: Composição do frete em número de deslocamentos (padrão 4: 2 idas + 2 voltas)
  pixTipoChave?: 'CNPJ' | 'CPF' | 'E-MAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA';
  pixChave?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  bancoTipoConta?: 'CORRENTE' | 'POUPANCA';
  bancoBeneficiario?: string;
  bancoDocumento?: string;
  // NOVO: Assinatura, Cobrança de Licença e Suporte Técnico
  assinaturaAtiva?: AssinaturaAtual;
  historicoFaturas?: FaturaAssinatura[];
  chamadosSuporte?: ChamadoSuporte[];
}

export interface ThemeConfig {
  primaryColor: string;
  themeMode: 'obsidian' | 'midnight' | 'charcoal' | 'emerald_dark' | 'amethyst_dark';
  highContrastText: boolean;
  exibirGuiaArquitetura: boolean;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: 'RECEITA' | 'DESPESA';
  categoria: string;
  valor: number;
  data: number; // timestamp ms
  descricao: string;
  referenciaId?: string; // ex: ID da reserva
  status: 'PAGO' | 'PENDENTE';
}

export interface RegistroManutencao {
  id: string;
  itemId: number;
  data: number;
  tipo: string; // "Limpeza", "Pintura", "Polimento", "Costura", "Reparo Eletrônico"
  custo: number;
  observacao?: string;
  responsavel?: string;
}

export interface DispositivoAutorizado {
  id: string; // UUID/Device ID
  nomeDispositivo: string; // Ex: "iPhone 15 Pro"
  cnpjEmpresa: string;
  usuario?: string; // Nome do Usuário / Representante Legal
  email?: string; // E-mail corporativo / do operador
  senha?: string; // Senha individual do operador
  emailConfirmationSeed?: string; // Semente para verificação do e-mail
  isEmailVerified?: boolean; // Status da verificação do e-mail (Primeiro Uso)
  telefone: string; // Telefone celular / WhatsApp
  imei?: string; // IMEI Hardware / UUID do Aparelho
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'REVOGADO';
  isTerminalBlocked?: boolean; // Bloqueio específico do hardware/terminal
  isUserBlocked?: boolean; // Bloqueio específico do usuário (encerra sessão)
  dataSolicitacao: number; // timestamp ms
  dataAtualizacao: number; // timestamp ms
  ultimoAcesso?: number; // timestamp ms
  nivelAcesso?: 'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR';
  isMasterSuperAdmin?: boolean; // Usuário Mestre com Gestão Plena Global e Cross-Tenant
  permissoesModulos?: string[]; // e.g. ['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios']
}

export interface ModeloContrato {
  id: string;
  titulo: string;
  categoria: 'CONTRATO' | 'VISTORIA' | 'ORCAMENTO' | 'RECIBO' | 'OUTROS';
  conteudo: string;
  criadoEm: number;
  atualizadoEm: number;
  isPadrao?: boolean;
  descricao?: string;
  origemImportacao?: string;
}

// NOVO: Estrutura para Gestão de Planos de Assinatura, Cobrança e Suporte
export type NivelPlanoAssinatura = 'BRONZE' | 'PRATA' | 'OURO' | 'ENTERPRISE';
export type NivelPlanoSuporte = 'BASICO' | 'PRIORITARIO_VIP' | 'TECNICO_247';

export interface PlanoAssinatura {
  id: string;
  nome: string;
  nivel: NivelPlanoAssinatura;
  valorMensal: number;
  valorAnualMensalizado: number; // Valor equivalente por mês no plano anual (com desconto)
  descricao: string;
  limiteOperadores: string; // Ex: "Até 3", "Até 10", "Ilimitados"
  limiteItensAcervo: string; // Ex: "Até 1.000", "Ilimitado"
  recursosInclusos: string[];
  incluiIaGemini: boolean;
  emissaoNfseInclusa: boolean;
  recomendado?: boolean;
}

export interface PlanoSuporte {
  id: string;
  nome: string;
  nivel: NivelPlanoSuporte;
  valorMensal: number;
  tempoRespostaSla: string; // Ex: "Até 24h", "Até 15 min", "Imediato 24/7"
  canaisAtendimento: string[]; // Ex: ["E-mail/Ticket", "WhatsApp Dedicado", "Telefone/VIP"]
  descricao: string;
  destaque?: boolean;
}

export interface AssinaturaAtual {
  planoId: string;
  planoSuporteId: string;
  cicloPagamento: 'MENSAL' | 'ANUAL';
  status: 'ATIVO' | 'TRIAL' | 'PENDENTE_PAGAMENTO' | 'CANCELADO';
  dataInicio: number; // timestamp
  dataProximaRenovacao: number; // timestamp
  valorTotalRecorrente: number;
  metodoPagamentoPadrao: 'PIX' | 'CARTAO' | 'BOLETO';
  autoRenovacao: boolean;
}

export interface FaturaAssinatura {
  id: string;
  codigoFatura: string;
  dataEmissao: number;
  dataVencimento: number;
  dataPagamento?: number;
  valor: number;
  descricao: string;
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO';
  metodoPagamento: 'PIX' | 'CARTAO' | 'BOLETO';
  qrcodePixCode?: string;
  linkBoletoPdf?: string;
}

export interface RespostaChamadoSuporte {
  id: string;
  autor: string;
  isEquipeSuporte: boolean;
  mensagem: string;
  data: number;
}

export interface ChamadoSuporte {
  id: string;
  protocolo: string;
  assunto: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  moduloRelacionado: string;
  descricao: string;
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'AGUARDANDO_RESPOSTA' | 'CONCLUIDO';
  dataAbertura: number;
  respostas: RespostaChamadoSuporte[];
}





