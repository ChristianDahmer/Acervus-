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
  endereco?: string;
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
  };
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

export interface GovBrConfig {
  clientId: string;
  clientSecret: string;
  ambiente: 'homologacao' | 'producao';
  redirectUri: string;
  enabled: boolean;
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
  enderecoCompleto: string;
  telefoneWhatsapp: string;
  nomeRepresentante: string;
  logoUrl?: string;
  linkMapaLocalizacao?: string;
  email?: string;
  senhaAcesso?: string;
  emailConfirmationSeed?: string;
  isEmailVerified?: boolean;
  listVisibility?: ListVisibilityConfig;
  whatsappTemplates?: WhatsAppTemplatesConfig;
  whatsappApiToken?: string;
  whatsappApiEndpoint?: string;
  whatsappPhoneNumberId?: string;
  govBrConfig?: GovBrConfig;
  tabDisplay?: TabDisplayConfig;
  painelConfiguracao?: PainelConfiguracaoData;
  habilitarGoogleDrive?: boolean;
  habilitarGoogleForms?: boolean;
  pixTipoChave?: 'CNPJ' | 'CPF' | 'E-MAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA';
  pixChave?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  bancoTipoConta?: 'CORRENTE' | 'POUPANCA';
  bancoBeneficiario?: string;
  bancoDocumento?: string;
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
  dataSolicitacao: number; // timestamp ms
  dataAtualizacao: number; // timestamp ms
  ultimoAcesso?: number; // timestamp ms
  nivelAcesso?: 'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR';
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




