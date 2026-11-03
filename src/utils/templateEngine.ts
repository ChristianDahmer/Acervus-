import { EmpresaConfig, ReservaComItens, Cliente } from '../types';
import { formatarDataBr, formatarMoeda } from './whatsappTemplates';

export interface TemplateTag {
  tag: string;
  label: string;
  category: 'EMPRESA' | 'CLIENTE' | 'RESERVA' | 'ITENS' | 'SISTEMA';
  description: string;
  example: string;
}

export const AVAILABLE_TEMPLATE_TAGS: TemplateTag[] = [
  // Empresa
  { tag: '{NOME_EMPRESA}', label: 'Nome Fantasia da Empresa', category: 'EMPRESA', description: 'Nome de fantasia da locadora', example: 'Minha Locadora' },
  { tag: '{RAZAO_SOCIAL}', label: 'Razão Social', category: 'EMPRESA', description: 'Razão social registrada', example: 'Minha Locadora LTDA' },
  { tag: '{CNPJ}', label: 'CNPJ da Empresa', category: 'EMPRESA', description: 'CNPJ formatado', example: '00.000.000/0001-00' },
  { tag: '{ENDERECO_EMPRESA}', label: 'Endereço da Empresa', category: 'EMPRESA', description: 'Logradouro completo', example: 'Av. Paulista, 1000 - Bela Vista' },
  { tag: '{TELEFONE_EMPRESA}', label: 'WhatsApp da Empresa', category: 'EMPRESA', description: 'Telefone comercial', example: '(11) 98765-4321' },
  { tag: '{REPRESENTANTE_EMPRESA}', label: 'Representante Legal', category: 'EMPRESA', description: 'Nome do gestor / representante', example: 'Gestor Responsável' },

  // Cliente
  { tag: '{NOME_CLIENTE}', label: 'Nome do Cliente', category: 'CLIENTE', description: 'Nome completo do contratante', example: 'Ana Carolina Silva' },
  { tag: '{CPF_CNPJ_CLIENTE}', label: 'CPF/CNPJ do Cliente', category: 'CLIENTE', description: 'Documento oficial do cliente', example: '000.000.000-00' },
  { tag: '{TELEFONE_CLIENTE}', label: 'Telefone do Cliente', category: 'CLIENTE', description: 'Telefone / WhatsApp do cliente', example: '(11) 98765-4321' },
  { tag: '{EMAIL_CLIENTE}', label: 'E-mail do Cliente', category: 'CLIENTE', description: 'E-mail principal do cliente', example: 'cliente@exemplo.com' },
  { tag: '{ENDERECO_CLIENTE}', label: 'Endereço do Cliente', category: 'CLIENTE', description: 'Endereço cadastrado', example: 'Rua Exemplo, 123' },

  // Reserva
  { tag: '{ID_RESERVA}', label: 'Número da Reserva', category: 'RESERVA', description: 'Código único da reserva', example: '#101' },
  { tag: '{DATA_RETIRADA}', label: 'Data de Retirada', category: 'RESERVA', description: 'Data agendada de retirada', example: '25/08/2026' },
  { tag: '{DATA_DEVOLUCAO}', label: 'Data de Devolução', category: 'RESERVA', description: 'Data agendada de devolução', example: '28/08/2026' },
  { tag: '{DIAS_RESERVA}', label: 'Quantidade de Dias', category: 'RESERVA', description: 'Duração total do aluguel em dias', example: '3' },
  { tag: '{VALOR_TOTAL}', label: 'Valor Total do Aluguel', category: 'RESERVA', description: 'Valor total formatado em R$', example: 'R$ 750,00' },
  { tag: '{STATUS_RESERVA}', label: 'Status da Reserva', category: 'RESERVA', description: 'Status atual da reserva', example: 'CONFIRMADA' },

  // Itens
  { tag: '{LISTA_ITENS}', label: 'Tabela de Itens e Quantidades', category: 'ITENS', description: 'Lista completa detalhada dos móveis / peças alugados', example: '- 1x Painel Redondo (R$ 50,00/dia)' },

  // Sistema
  { tag: '{DATA_HOJE}', label: 'Data Atual', category: 'SISTEMA', description: 'Data de geração do documento', example: '24/07/2026' },
];

export function fillContractTemplate(
  templateText: string,
  data: {
    empresaConfig: EmpresaConfig;
    reservaComItens?: ReservaComItens | null;
    cliente?: Cliente | null;
  }
): string {
  if (!templateText) return '';

  const { empresaConfig, reservaComItens, cliente: directCliente } = data;
  const cliente = reservaComItens?.cliente || directCliente;
  const reserva = reservaComItens?.reserva;

  let result = templateText;

  // Replacement map
  const replacements: Record<string, string> = {
    '{NOME_EMPRESA}': empresaConfig.nomeFantasia || 'Sua Empresa Locadora',
    '{RAZAO_SOCIAL}': empresaConfig.razaoSocial || empresaConfig.nomeFantasia || 'Sua Empresa Locadora LTDA',
    '{CNPJ}': empresaConfig.cnpj || '00.000.000/0001-00',
    '{ENDERECO_EMPRESA}': empresaConfig.enderecoCompleto || 'Endereço da Empresa',
    '{TELEFONE_EMPRESA}': empresaConfig.telefoneWhatsapp || 'Não informado',
    '{REPRESENTANTE_EMPRESA}': empresaConfig.nomeRepresentante || 'Representante Legal',

    '{NOME_CLIENTE}': cliente?.nome || 'CLIENTE NÃO SELECIONADO',
    '{CPF_CNPJ_CLIENTE}': cliente?.cpfCnpj || 'Não informado',
    '{TELEFONE_CLIENTE}': cliente?.telefone || 'Não informado',
    '{EMAIL_CLIENTE}': cliente?.email || 'Não informado',
    '{ENDERECO_CLIENTE}': cliente?.endereco || 'Não informado',

    '{ID_RESERVA}': reserva ? `#${reserva.id}` : '#---',
    '{DATA_RETIRADA}': reserva ? formatarDataBr(reserva.dataRetirada) : 'Data Retirada',
    '{DATA_DEVOLUCAO}': reserva ? formatarDataBr(reserva.dataDevolucao) : 'Data Devolução',
    '{DIAS_RESERVA}': reservaComItens ? String(reservaComItens.diasReserva) : '1',
    '{VALOR_TOTAL}': reservaComItens ? formatarMoeda(reservaComItens.valorTotal) : 'R$ 0,00',
    '{STATUS_RESERVA}': reserva ? reserva.status : 'PENDENTE',

    '{DATA_HOJE}': formatarDataBr(Date.now()),
  };

  // Build items list
  if (reservaComItens && reservaComItens.itens && reservaComItens.itens.length > 0) {
    const itemsLines = reservaComItens.itens.map(
      (item, index) => `${index + 1}. ${item.nome} (${item.categoria}) — ${formatarMoeda(item.precoAluguel)}/dia`
    );
    replacements['{LISTA_ITENS}'] = itemsLines.join('\n');
  } else {
    replacements['{LISTA_ITENS}'] = '1. Item Exemplo 1 (R$ 50,00/dia)\n2. Item Exemplo 2 (R$ 100,00/dia)';
  }

  // Replace all keys
  Object.entries(replacements).forEach(([tag, val]) => {
    const regex = new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, val);
  });

  return result;
}
