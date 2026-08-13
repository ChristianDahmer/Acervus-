import { Cliente, ItemAcervo, ReservaComItens, StatusReserva, EmpresaConfig, ThemeConfig, CategoriaItem, TransacaoFinanceira, RegistroManutencao } from '../types';

import painelRedondoImg from '../assets/images/painel_redondo_decoracao_1785939361018.jpg';
import painelOvalImg from '../assets/images/painel_oval_festa_1785939374411.jpg';
import cilindrosImg from '../assets/images/cilindros_trio_festa_1785939385642.jpg';
import suporteBoloImg from '../assets/images/suporte_bolo_doces_1785939398110.jpg';
import arcoBaloesImg from '../assets/images/arco_baloes_festa_1785939412161.jpg';
import neonHappyBirthdayImg from '../assets/images/neon_happy_birthday_1785939426242.jpg';
import carrinhoGourmetImg from '../assets/images/carrinho_gourmet_festa_1785939439329.jpg';
import mesaMdfImg from '../assets/images/mesa_mdf_decorativa_1785939450774.jpg';

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
  nomeFantasia: 'Bora Festar Locações',
  razaoSocial: 'Bora Festar Eventos e Festas LTDA',
  cnpj: '45.678.910/0001-23',
  ambienteSistema: 'teste',
  enderecoCompleto: 'Rua das Festas, 500 - Centro, São Paulo - SP',
  linkMapaLocalizacao: 'https://maps.google.com/?q=Rua+das+Festas,+500+-+Centro,+São+Paulo+-+SP',
  telefoneWhatsapp: '5511999998888',
  nomeRepresentante: 'Juliana Medeiros',
  representantesAdicionais: [],
  logoUrl: '/logo.png',
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
  pixChave: '45.678.910/0001-23',
  bancoNome: '',
  bancoAgencia: '',
  bancoConta: '',
  bancoTipoConta: 'CORRENTE',
  bancoBeneficiario: '',
  bancoDocumento: '',
};

export const INITIAL_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#D4AF37',
  themeMode: 'obsidian',
  highContrastText: true,
  exibirGuiaArquitetura: false,
};


export const INITIAL_CLIENTES: Cliente[] = [
  { id: 1, nome: 'Ana Carolina Silva', telefone: '5511987654321', email: 'ana.silva@email.com' },
  { id: 2, nome: 'Carlos Eduardo Santos', telefone: '5511976543210', email: 'carlos.santos@email.com' },
  { id: 3, nome: 'Mariana Oliveira', telefone: '5521998877665', email: 'mariana.oliveira@email.com' },
  { id: 4, nome: 'Lucas Mendes', telefone: '5531988112233', email: 'lucas.mendes@email.com' },
];

export const INITIAL_ITENS: ItemAcervo[] = [
  {
    id: 1,
    nome: 'Painel Redondo',
    descricao: 'Painel circular de MDF desmontável com 1,80m de diâmetro, ideal para fundos de mesa de bolo e arranjos de balões.',
    quantidadeTotal: 10,
    precoAluguel: 50.0,
    categoria: 'Painéis & Decoração',
    imageUrl: painelRedondoImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 dias atrás
    frequenciaAlugueisManutencao: 5,
    alugueisDesdeManutencao: 2,
    statusManutencao: 'EM_DIA',
    proximaRevisaoData: Date.now() + 1000 * 60 * 60 * 24 * 60,
  },
  {
    id: 2,
    nome: 'Painel Oval',
    descricao: 'Painel decorativo formato arco/oval de estilo moderno, estrutura reforçada para aplicação de tecidos e artes temáticas.',
    quantidadeTotal: 8,
    precoAluguel: 50.0,
    categoria: 'Painéis & Decoração',
    imageUrl: painelOvalImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 15,
    frequenciaAlugueisManutencao: 5,
    alugueisDesdeManutencao: 1,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 3,
    nome: 'Cilindros (Trio Decorativo)',
    descricao: 'Conjunto com 3 cilindros de tamanhos P, M e G em MDF laqueado branco para apoio de bolos, doces e peças decorativas.',
    quantidadeTotal: 12,
    precoAluguel: 25.0,
    categoria: 'Móveis & Suportes',
    imageUrl: cilindrosImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 40,
    frequenciaAlugueisManutencao: 6,
    alugueisDesdeManutencao: 5,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 4,
    nome: 'Mesa Redonda MDF',
    descricao: 'Mesa bistrô/principal para doces de festa com tampo redondo de 1,20m e pés palito reforçados.',
    quantidadeTotal: 6,
    precoAluguel: 50.0,
    categoria: 'Móveis & Suportes',
    imageUrl: mesaMdfImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 10,
    frequenciaAlugueisManutencao: 4,
    alugueisDesdeManutencao: 0,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 5,
    nome: 'Mesa Sextavada MDF / Cubo',
    quantidadeTotal: 8,
    precoAluguel: 40.0,
    categoria: 'Móveis & Suportes',
    imageUrl: mesaMdfImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 45,
    frequenciaAlugueisManutencao: 4,
    alugueisDesdeManutencao: 4,
    statusManutencao: 'ALERTA', // Atingiu limite de alugueis sem revisão
  },
  {
    id: 6,
    nome: 'Suporte para Bolos e Doces (Kit 5 Peças)',
    quantidadeTotal: 15,
    precoAluguel: 20.0,
    categoria: 'Vasos & Bandejas',
    imageUrl: suporteBoloImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 60,
    frequenciaAlugueisManutencao: 10,
    alugueisDesdeManutencao: 2,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 7,
    nome: 'Escada de Lembrancinhas MDF',
    quantidadeTotal: 5,
    precoAluguel: 30.0,
    categoria: 'Móveis & Suportes',
    imageUrl: mesaMdfImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 12,
    frequenciaAlugueisManutencao: 6,
    alugueisDesdeManutencao: 0,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 8,
    nome: 'Kit Arco de Balões Desconstruído',
    quantidadeTotal: 7,
    precoAluguel: 35.0,
    categoria: 'Painéis & Decoração',
    imageUrl: arcoBaloesImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 80,
    frequenciaAlugueisManutencao: 3,
    alugueisDesdeManutencao: 3,
    statusManutencao: 'ALERTA',
  },
  {
    id: 9,
    nome: 'Cortina de LED Neon "Happy Birthday"',
    quantidadeTotal: 4,
    precoAluguel: 45.0,
    categoria: 'Iluminação & Som',
    imageUrl: neonHappyBirthdayImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 dias atrás
    frequenciaAlugueisManutencao: 3,
    alugueisDesdeManutencao: 4, // estourou frequencia!
    statusManutencao: 'ALERTA',
  },
  {
    id: 10,
    nome: 'Carrinho de Pipoca & Brigadeiro Gourmet',
    quantidadeTotal: 3,
    precoAluguel: 80.0,
    categoria: 'Móveis & Suportes',
    imageUrl: carrinhoGourmetImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 90,
    frequenciaAlugueisManutencao: 5,
    alugueisDesdeManutencao: 1,
    statusManutencao: 'EM_DIA',
  },
  {
    id: 11,
    nome: 'Tapete Grama Sintética 2x2m',
    quantidadeTotal: 10,
    precoAluguel: 30.0,
    categoria: 'Painéis & Decoração',
    imageUrl: neonHappyBirthdayImg,
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 120,
    frequenciaAlugueisManutencao: 8,
    alugueisDesdeManutencao: 8,
    statusManutencao: 'ALERTA',
  },
  {
    id: 12,
    nome: 'Caixa de Som Portátil JBL Partybox 310',
    quantidadeTotal: 4,
    precoAluguel: 120.0,
    categoria: 'Iluminação & Som',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80',
    ultimaManutencao: Date.now() - 1000 * 60 * 60 * 24 * 1,
    frequenciaAlugueisManutencao: 4,
    alugueisDesdeManutencao: 0,
    statusManutencao: 'EM_MANUTENCAO', // Sob revisão ativa
  },
];

const today = new Date();
const start1 = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 1); // tomorrow
const end1 = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 4); // +4 days

const start2 = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
const end2 = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 2); // +2 days

export const INITIAL_RESERVAS: ReservaComItens[] = [
  {
    reserva: {
      id: 1001,
      clienteId: 1,
      dataRetirada: start1.getTime(),
      dataDevolucao: end1.getTime(),
      status: StatusReserva.CONFIRMADA,
    },
    cliente: INITIAL_CLIENTES[0],
    itens: [INITIAL_ITENS[0], INITIAL_ITENS[1]], // Painel Redondo (50) + Painel Oval (50)
    valorTotal: (50 + 50) * 3,
    diasReserva: 3,
  },
  {
    reserva: {
      id: 1002,
      clienteId: 2,
      dataRetirada: start2.getTime(),
      dataDevolucao: end2.getTime(),
      status: StatusReserva.EM_ANDAMENTO,
    },
    cliente: INITIAL_CLIENTES[1],
    itens: [INITIAL_ITENS[2]], // Cilindros (25)
    valorTotal: 25 * 4,
    diasReserva: 4,
  },
];

export const INITIAL_FINANCE_TRANSACTIONS: TransacaoFinanceira[] = [
  {
    id: 'TX-1001',
    tipo: 'RECEITA',
    categoria: 'Aluguel de Acervo',
    valor: 300.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 1, // 1 dia atrás
    descricao: 'Receita Reserva #1001 - Ana Carolina Silva',
    referenciaId: '1001',
    status: 'PAGO'
  },
  {
    id: 'TX-1002',
    tipo: 'RECEITA',
    categoria: 'Aluguel de Acervo',
    valor: 100.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 2, // 2 dias atrás
    descricao: 'Receita Reserva #1002 - Carlos Eduardo Santos',
    referenciaId: '1002',
    status: 'PAGO'
  },
  {
    id: 'TX-3',
    tipo: 'RECEITA',
    categoria: 'Serviço de Frete',
    valor: 180.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 3,
    descricao: 'Frete e montagem - Evento Condomínio Ipês',
    status: 'PAGO'
  },
  {
    id: 'TX-4',
    tipo: 'DESPESA',
    categoria: 'Manutenção de Itens',
    valor: 85.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 5,
    descricao: 'Reparo Fiação Cortina de LED Happy Birthday',
    referenciaId: '9',
    status: 'PAGO'
  },
  {
    id: 'TX-5',
    tipo: 'DESPESA',
    categoria: 'Manutenção de Itens',
    valor: 120.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 10,
    descricao: 'Pintura e Polimento Mesa Sextavada MDF',
    referenciaId: '5',
    status: 'PAGO'
  },
  {
    id: 'TX-6',
    tipo: 'DESPESA',
    categoria: 'Insumos',
    valor: 250.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 15,
    descricao: 'Balões diversos, tecidos de cetim, fita dupla face',
    status: 'PAGO'
  },
  {
    id: 'TX-7',
    tipo: 'DESPESA',
    categoria: 'Logística',
    valor: 95.00,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 2,
    descricao: 'Combustível veículo utilitário - Entregas Zona Sul',
    status: 'PAGO'
  },
  {
    id: 'TX-8',
    tipo: 'DESPESA',
    categoria: 'Assinaturas',
    valor: 54.90,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 8,
    descricao: 'Assinatura Mensal Google Workspace & Drive',
    status: 'PAGO'
  }
];

export const INITIAL_MAINTENANCE_LOGS: RegistroManutencao[] = [
  {
    id: 'M-1',
    itemId: 9,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 5,
    tipo: 'Reparo de Fiação',
    custo: 85.00,
    observacao: 'Fiação re-soldada, isolação reforçada para segurança em eventos',
    responsavel: 'Eletrotécnica Jairo'
  },
  {
    id: 'M-2',
    itemId: 5,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 10,
    tipo: 'Pintura e Polimento',
    custo: 120.00,
    observacao: 'Pintura esmalte premium branca anti-riscos nos tampos',
    responsavel: 'Marcenaria Silva'
  },
  {
    id: 'M-3',
    itemId: 12,
    data: today.getTime() - 1000 * 60 * 60 * 24 * 1,
    tipo: 'Limpeza Geral',
    custo: 0.00,
    observacao: 'Limpeza profunda de poeira da grade frontal e testes de bateria',
    responsavel: 'Equipe Própria'
  }
];

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

