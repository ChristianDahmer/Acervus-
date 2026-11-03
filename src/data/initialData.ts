import { Cliente, ItemAcervo, ReservaComItens, EmpresaConfig, ThemeConfig, CategoriaItem, TransacaoFinanceira, RegistroManutencao } from '../types';

export const INITIAL_CATEGORIAS: CategoriaItem[] = [
  {
    id: 'cat-1',
    nome: 'Painéis & Decoração',
    descricao: 'Painéis redondos, ovas, arcos e fundos cenográficos para festas e eventos.',
    corHex: '#D4AF37',
    iconeName: 'Layers',
    ativo: true,
  },
  {
    id: 'cat-2',
    nome: 'Móveis & Suportes',
    descricao: 'Cilindros, mesas, aparadores, estantes e estruturas de suporte em MDF/Metal.',
    corHex: '#3B82F6',
    iconeName: 'Box',
    ativo: true,
  },
  {
    id: 'cat-3',
    nome: 'Iluminação & Som',
    descricao: 'Canhões LED, refletores, luzes de neon e caixas de som de alta performance.',
    corHex: '#10B981',
    iconeName: 'Sparkles',
    ativo: true,
  },
  {
    id: 'cat-4',
    nome: 'Vasos & Bandejas',
    descricao: 'Bandejas cerâmicas, vasos para arranjos florais, boleiras e suportes de doces.',
    corHex: '#EC4899',
    iconeName: 'Utensils',
    ativo: true,
  },
  {
    id: 'cat-5',
    nome: 'Infantil & Temáticos',
    descricao: 'Personagens em feltro/resina, displays de chão e kits de festas infantis.',
    corHex: '#F59E0B',
    iconeName: 'Tag',
    ativo: true,
  },
];

export const INITIAL_EMPRESA_CONFIG: EmpresaConfig = {
  nomeFantasia: '',
  razaoSocial: '',
  cnpj: '',
  ramoAtuacao: 'Locação de Móveis e Decoração para Eventos',
  ambienteSistema: 'producao',
  enderecoCompleto: '',
  linkMapaLocalizacao: '',
  telefoneWhatsapp: '',
  telefonesAdicionais: [],
  nomeRepresentante: '',
  representantesAdicionais: [],
  logoUrl: '',
  listVisibility: {
    exibirInventarioPorPadrao: true,
    exibirCategoriasPorPadrao: true,
    exibirClientesPorPadrao: true,
    exibirReservasPorPadrao: true,
  },
  tabDisplay: {
    abaPrincipalId: 'inventario',
    abasFixadas: ['inventario', 'reservas'],
    ordemAbas: ['inventario', 'reservas', 'google_forms', 'clientes', 'financeiro', 'relatorios', 'manutencao'],
    abasOcultas: [],
    nomesAbas: {},
  },
  habilitarGoogleDrive: true,
  habilitarGoogleForms: true,
  backupAutoDriveEnabled: true,
  pixTipoChave: 'CNPJ',
  pixChave: '',
  bancoNome: '',
  bancoAgencia: '',
  bancoConta: '',
  bancoTipoConta: 'CORRENTE',
  bancoBeneficiario: '',
  bancoDocumento: '',
  valorFretePorKm: 2.5,
  numeroDeslocamentosFrete: 4,
};

export const INITIAL_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#D4AF37',
  themeMode: 'obsidian',
  highContrastText: true,
  exibirGuiaArquitetura: false,
};


export const INITIAL_CLIENTES: Cliente[] = [];

export const INITIAL_ITENS: ItemAcervo[] = [];

export const INITIAL_RESERVAS: ReservaComItens[] = [];

export const INITIAL_FINANCE_TRANSACTIONS: TransacaoFinanceira[] = [];

export const INITIAL_MAINTENANCE_LOGS: RegistroManutencao[] = [];

export const INITIAL_MODELOS_CONTRATO: any[] = [
  {
    id: 'MODELO-CONTRATO-PADRAO',
    titulo: 'Contrato Padrão de Locação de Acervo & Móveis',
    categoria: 'CONTRATO',
    descricao: 'Contrato jurídico completo para aluguel de itens de decoração, móveis e equipamentos.',
    isPadrao: true,
    criadoEm: Date.now() - 1000 * 60 * 60 * 24 * 30,
    atualizadoEm: Date.now() - 1000 * 60 * 60 * 24 * 2,
    origemImportacao: 'Modelo do Sistema',
    conteudo: `CONTRATO DE LOCAÇÃO DE BENS MÓVEIS DE DECORAÇÃO — RESERVA {ID_RESERVA}

LOCADOR:
Razão Social: {RAZAO_SOCIAL} ({NOME_EMPRESA})
CNPJ: {CNPJ}
Endereço: {ENDERECO_EMPRESA}
Telefone/WhatsApp: {TELEFONE_EMPRESA}
Representado por: {REPRESENTANTE_EMPRESA}

LOCATÁRIO:
Nome/Razão Social: {NOME_CLIENTE}
CPF/CNPJ: {CPF_CNPJ_CLIENTE}
Telefone: {TELEFONE_CLIENTE}
E-mail: {EMAIL_CLIENTE}
Endereço: {ENDERECO_CLIENTE}

CLÁUSULA PRIMEIRA — DO OBJETO:
O presente contrato tem por objeto a locação temporária dos bens móveis, utensílios e decorações descritos abaixo:

{LISTA_ITENS}

CLÁUSULA SEGUNDA — DAS DATAS E PRAZOS:
- Data de Retirada/Entrega: {DATA_RETIRADA}
- Data de Devolução/Coleta: {DATA_DEVOLUCAO}
- Período total contratado: {DIAS_RESERVA} dia(s)
- Status da Reserva: {STATUS_RESERVA}

CLÁUSULA TERCEIRA — DO VALOR E CONDICOES DE PAGAMENTO:
Pelo aluguel dos bens descritos, o LOCATÁRIO pagará ao LOCADOR o valor total de {VALOR_TOTAL}.

CLÁUSULA QUARTA — CONSERVAÇÃO E RESPONSABILIDADE:
O LOCATÁRIO declara receber os bens em perfeito estado de conservação, limpeza e funcionamento, obrigando-se a devolvê-los no mesmo estado. Em caso de dano, quebra, extravio ou perda total de qualquer peça, o LOCATÁRIO ressarcirá o LOCADOR pelo valor de reposição no prazo máximo de 5 (cinco) dias úteis.

CLÁUSULA QUINTA — DO FORO:
Para dirimir quaisquer dúvidas decorrentes do presente contrato, as partes elegem o foro da comarca da sede do LOCADOR.

E, por estarem assim justos e contratados, assinam o presente instrumento.

{NOME_EMPRESA} — {DATA_HOJE}


_______________________________________________
LOCADOR: {RAZAO_SOCIAL}
Representante: {REPRESENTANTE_EMPRESA}


_______________________________________________
LOCATÁRIO: {NOME_CLIENTE}
CPF/CNPJ: {CPF_CNPJ_CLIENTE}`
  },
  {
    id: 'MODELO-TERMO-VISTORIA',
    titulo: 'Termo de Vistoria, Entrega e Check-in de Peças',
    categoria: 'VISTORIA',
    descricao: 'Termo técnico de checagem física de peças na entrega/devolução.',
    isPadrao: false,
    criadoEm: Date.now() - 1000 * 60 * 60 * 24 * 15,
    atualizadoEm: Date.now() - 1000 * 60 * 60 * 24 * 1,
    origemImportacao: 'Modelo do Sistema',
    conteudo: `TERMO DE VISTORIA E CHECK-IN DE PEÇAS — RESERVA {ID_RESERVA}

EMPRESA LOCADORA: {NOME_EMPRESA} ({CNPJ})
CLIENTE RESPONSÁVEL: {NOME_CLIENTE} ({TELEFONE_CLIENTE})
DATA DO CHECK-IN: {DATA_RETIRADA} | PREV. DEVOLUÇÃO: {DATA_DEVOLUCAO}

ITENS INSPECIONADOS E CONFERIDOS:
{LISTA_ITENS}

ESTADO DE CONSERVAÇÃO E OBSERVAÇÕES DE ENTREGA:
(  ) Peças limpas e sem riscos ou avarias prévias.
(  ) Pintura e acabamentos em bom estado.
(  ) Embalagens de proteção / capas inclusas.

Declaro que conferi os itens acima descritos na presença da equipe da {NOME_EMPRESA} e atesto que estão conforme o contratado.


Assinatura do Cliente: ___________________________________
Nome: {NOME_CLIENTE}
Data: {DATA_HOJE}`
  },
  {
    id: 'MODELO-ORCAMENTO-OFICIAL',
    titulo: 'Proposta Comercial & Orçamento Detalhado',
    categoria: 'ORCAMENTO',
    descricao: 'Documento formal de proposta com tabela de itens e prazo de validade.',
    isPadrao: false,
    criadoEm: Date.now() - 1000 * 60 * 60 * 24 * 10,
    atualizadoEm: Date.now() - 1000 * 60 * 60 * 24 * 1,
    origemImportacao: 'Modelo do Sistema',
    conteudo: `PROPOSTA COMERCIAL E ORÇAMENTO — {NOME_EMPRESA}

Para: {NOME_CLIENTE}
Atendimento/Telefone: {TELEFONE_CLIENTE} | E-mail: {EMAIL_CLIENTE}
Data da Proposta: {DATA_HOJE}
Validade da Proposta: 7 dias a contar desta data.

PERÍODO DE LOCAÇÃO SOLICITADO:
- Data Pretendida de Retirada: {DATA_RETIRADA}
- Data Pretendida de Devolução: {DATA_DEVOLUCAO}
- Duração: {DIAS_RESERVA} dia(s)

RELAÇÃO DE PEÇAS E VALORES ESTIMADOS:
{LISTA_ITENS}

VALOR TOTAL DA PROPOSTA: {VALOR_TOTAL}

Condições de Reserva:
1. A reserva das peças só é garantida mediante pagamento de sinal (50%) ou confirmação formal no sistema.
2. Frete/logística de entrega a combinar conforme localidade.

Ficamos à disposição para dúvidas!
{NOME_EMPRESA} | WhatsApp: {TELEFONE_EMPRESA}`
  },
  {
    id: 'MODELO-RECIBO-QUITACAO',
    titulo: 'Recibo de Devolução, Quitação e Baixa de Caução',
    categoria: 'RECIBO',
    descricao: 'Recibo final de encerramento da locação com devolução de itens.',
    isPadrao: false,
    criadoEm: Date.now() - 1000 * 60 * 60 * 24 * 5,
    atualizadoEm: Date.now() - 1000 * 60 * 60 * 24 * 1,
    origemImportacao: 'Modelo do Sistema',
    conteudo: `RECIBO DE DEVOLUÇÃO E QUITAÇÃO DE LOCAÇÃO — RESERVA {ID_RESERVA}

Recebemos do(a) Sr.(a) {NOME_CLIENTE}, portador(a) do CPF/CNPJ {CPF_CNPJ_CLIENTE}, a devolução completa das peças e móveis pertencentes ao acervo de {NOME_EMPRESA} ({CNPJ}), referentes à Reserva nº {ID_RESERVA}.

ITENS RECEBIDOS E AVALIADOS:
{LISTA_ITENS}

DECLARAÇÃO DE QUITAÇÃO:
Atestamos que os bens foram entregues em ordem na data de {DATA_HOJE}, dando plena, geral e irrevogável quitação do aluguel no valor total de {VALOR_TOTAL}, nada mais havendo a reclamar quanto a esta locação.

São Paulo, {DATA_HOJE}.


_______________________________________________________
{RAZAO_SOCIAL}
Representante: {REPRESENTANTE_EMPRESA}`
  }
];

