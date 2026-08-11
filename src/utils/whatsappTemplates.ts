import { Cliente, ReservaComItens, StatusCicloVenda, EmpresaConfig } from '../types';

export function formatarDataBr(timestampMs: number): string {
  if (!timestampMs) return '';
  const d = new Date(timestampMs);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function sanitizarTelefone(telefone: string): string {
  if (!telefone) return '5511999998888';
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.startsWith('55') && apenasNumeros.length >= 12) {
    return apenasNumeros;
  }
  return `55${apenasNumeros}`;
}

export interface PlaceholderInfo {
  tag: string;
  label: string;
  category: 'Cliente' | 'Reserva' | 'Empresa';
  description: string;
}

export const WHATSAPP_PLACEHOLDERS: PlaceholderInfo[] = [
  { tag: '{cliente_nome}', label: 'Nome do Cliente', category: 'Cliente', description: 'Nome cadastrado do cliente' },
  { tag: '{cliente_telefone}', label: 'Telefone do Cliente', category: 'Cliente', description: 'Número de WhatsApp do cliente' },
  { tag: '{cliente_email}', label: 'E-mail do Cliente', category: 'Cliente', description: 'Endereço de e-mail do cliente' },
  
  { tag: '{reserva_id}', label: 'Nº da Reserva', category: 'Reserva', description: 'Código identificador da reserva (#1001)' },
  { tag: '{data_retirada}', label: 'Data de Retirada', category: 'Reserva', description: 'Data prevista para entrega/retirada' },
  { tag: '{data_devolucao}', label: 'Data de Devolução', category: 'Reserva', description: 'Data prevista para devolução' },
  { tag: '{dias_reserva}', label: 'Qtd. de Dias', category: 'Reserva', description: 'Período total de locação em dias' },
  { tag: '{total}', label: 'Valor Total (R$)', category: 'Reserva', description: 'Valor total formatado em Reais' },
  { tag: '{itens_lista}', label: 'Lista de Itens c/ Preço', category: 'Reserva', description: 'Lista detalhada com nome e valor unitário' },
  { tag: '{itens_simples}', label: 'Lista de Itens Nomes', category: 'Reserva', description: 'Lista simplificada com nome dos equipamentos' },

  { tag: '{empresa_nome}', label: 'Nome Fantasia', category: 'Empresa', description: 'Nome fantasia da locadora' },
  { tag: '{empresa_razao_social}', label: 'Razão Social', category: 'Empresa', description: 'Razão social oficial da empresa' },
  { tag: '{empresa_cnpj}', label: 'CNPJ Empresa', category: 'Empresa', description: 'CNPJ da locadora' },
  { tag: '{empresa_endereco}', label: 'Endereço da Sede', category: 'Empresa', description: 'Endereço completo cadastrado para retirada' },
  { tag: '{empresa_mapa}', label: 'Link do Mapa da Empresa', category: 'Empresa', description: 'Link de localização para acesso via mapa' },
  { tag: '{empresa_telefone}', label: 'WhatsApp da Empresa', category: 'Empresa', description: 'Telefone oficial de contato' },
  { tag: '{empresa_representante}', label: 'Representante Legal', category: 'Empresa', description: 'Nome do sócio / gestor do contrato' },
  { tag: '{link_formulario}', label: 'Link do Formulário', category: 'Empresa', description: 'Link do formulário do Google Forms gerado' },
];

export const DEFAULT_TEMPLATES: Record<StatusCicloVenda, string> = {
  [StatusCicloVenda.ORCAMENTO_SOLICITADO]:
    `Olá *{cliente_nome}*, tudo bem? 👋\n\nObrigado pelo interesse na *{empresa_nome}*!\n\nGeramos a proposta para o seu pedido *#{reserva_id}*:\n{itens_lista}\n\n*Período pretendido:* {data_retirada} até {data_devolucao} ({dias_reserva} dia(s))\n*Valor total estimado:* {total}\n\nDeseja confirmar a sua reserva e garantir a disponibilidade dos itens?\n\n_{empresa_nome} • Atenciosamente, {empresa_representante}_`,

  [StatusCicloVenda.RESERVA_CONFIRMADA]:
    `Tudo certo, *{cliente_nome}*! 🎉\n\nSua reserva *#{reserva_id}* com a *{empresa_nome}* está *CONFIRMADA*.\n\n📅 *Retirada:* {data_retirada}\n📅 *Devolução:* {data_devolucao}\n📍 *Local de Retirada:* {empresa_endereco}\n🗺️ *Acesso via Mapa:* {empresa_mapa}\n💰 *Valor Total:* {total}\n\n📦 *Itens Reservados:*\n{itens_simples}\n\nObrigado pela confiança! Qualquer dúvida, entre em contato via WhatsApp ({empresa_telefone}).`,

  [StatusCicloVenda.LEMBRETE_RETIRADA]:
    `Olá *{cliente_nome}*! Lembrete rápido da *{empresa_nome}* ⏰\n\nSeus itens para a reserva *#{reserva_id}* estarão prontos para retirada amanhã (*{data_retirada}*).\n\n📦 *Itens:*\n{itens_simples}\n\n📍 *Endereço da Sede:* {empresa_endereco}\n\nPor favor, confirme se virá no horário combinado!`,

  [StatusCicloVenda.EM_ANDAMENTO]:
    `Olá *{cliente_nome}*! Espero que seus equipamentos estejam sendo úteis! ✨\n\nSua reserva *#{reserva_id}* com a *{empresa_nome}* está ativa.\n\nLembramos que a data prevista para devolução é *{data_devolucao}*.\nAproveite bastante e cuide bem dos nossos itens!`,

  [StatusCicloVenda.LEMBRETE_DEVOLUCAO]:
    `Olá *{cliente_nome}*! Passando para lembrar da devolução 🔄\n\nA devolução dos itens da reserva *#{reserva_id}* na *{empresa_nome}* está agendada para amanhã (*{data_devolucao}*).\n\n📍 *Local de Devolução:* {empresa_endereco}\n\n⚠️ *Checklist para devolução:*\n{itens_simples}\n\nFavor entregar os itens limpos e com todos os acessórios originais.`,

  [StatusCicloVenda.CONCLUIDO_COM_SUCESSO]:
    `Devolução concluída com sucesso, *{cliente_nome}*! ✅\n\nInspecionamos os itens da reserva *#{reserva_id}* e está tudo perfeito. Seu contrato com a *{empresa_nome}* foi encerrado.\n\nMuito obrigado por escolher a *{empresa_nome}*. Foi um prazer atendê-lo(a)!`,

  [StatusCicloVenda.POS_VENDA_NPS]:
    `Olá *{cliente_nome}*, como vai? 😊\n\nA equipe da *{empresa_nome}* agradece sua preferência! Como foi sua experiência com a reserva *#{reserva_id}*?\n\nSua opinião é muito importante para nós!\n\n🎁 *Cupom de agradecimento:* Use o código *CLIENTE10* para 10% OFF no seu próximo aluguel com a {empresa_nome}!`,

  [StatusCicloVenda.CANCELADO]:
    `Olá *{cliente_nome}*.\n\nConfirmamos o cancelamento da reserva *#{reserva_id}* com a *{empresa_nome}*.\n\nLamentamos que não tenhamos fechado neste momento. Se precisar de algo no futuro ou quiser renegociar as datas, estamos à disposição!\n\nAtenciosamente,\n*{empresa_nome}* ({empresa_representante})`,

  [StatusCicloVenda.ENVIO_FORMULARIO_PROPOSTA]:
    `Olá *{cliente_nome}*! 👋\n\nConforme conversamos, segue o link para você acessar e preencher os dados da proposta gerada no formulário de orçamento da *{empresa_nome}*:\n\n🔗 *Link do Formulário:* {link_formulario}\n\nFicamos à disposição para qualquer dúvida!\n\n_{empresa_nome} • Atenciosamente, {empresa_representante}_`,
};

export function processarTemplateWhatsApp(
  template: string,
  reservaComItens: ReservaComItens,
  cliente: Cliente,
  empresaConfig?: EmpresaConfig,
  linkFormulario?: string
): string {
  if (!template) return '';

  const idReserva = String(reservaComItens.reserva.id);
  const dataRetirada = formatarDataBr(reservaComItens.reserva.dataRetirada);
  const dataDevolucao = formatarDataBr(reservaComItens.reserva.dataDevolucao);
  const diasReserva = String(reservaComItens.diasReserva || 1);
  const total = formatarMoeda(reservaComItens.valorTotal);

  const listaItensComPreco = (reservaComItens.itens || [])
    .map((i) => `• ${i.nome} (${formatarMoeda(i.precoAluguel)}/dia)`)
    .join('\n');

  const listaItensSimples = (reservaComItens.itens || [])
    .map((i) => `• ${i.nome}`)
    .join('\n');

  const nomeEmpresa = empresaConfig?.nomeFantasia || 'Bora Festar Locações';
  const razaoSocial = empresaConfig?.razaoSocial || 'Bora Festar Eventos e Festas LTDA';
  const cnpjEmpresa = empresaConfig?.cnpj || '45.678.910/0001-23';
  const enderecoEmpresa = empresaConfig?.enderecoCompleto || 'Rua das Festas, 500 - Centro, São Paulo - SP';
  const mapaEmpresa = empresaConfig?.linkMapaLocalizacao || 'https://maps.google.com/?q=Rua+das+Festas,+500+-+Centro,+São+Paulo+-+SP';
  const telefoneEmpresa = empresaConfig?.telefoneWhatsapp || '5511999998888';
  const representanteEmpresa = empresaConfig?.nomeRepresentante || 'Juliana Medeiros';

  return template
    .replace(/\{cliente_nome\}/g, cliente.nome || 'Cliente')
    .replace(/\{cliente_telefone\}/g, cliente.telefone || '')
    .replace(/\{cliente_email\}/g, cliente.email || '')
    .replace(/\{reserva_id\}/g, idReserva)
    .replace(/\{data_retirada\}/g, dataRetirada)
    .replace(/\{data_devolucao\}/g, dataDevolucao)
    .replace(/\{dias_reserva\}/g, diasReserva)
    .replace(/\{total\}/g, total)
    .replace(/\{itens_lista\}/g, listaItensComPreco)
    .replace(/\{itens_simples\}/g, listaItensSimples)
    .replace(/\{empresa_nome\}/g, nomeEmpresa)
    .replace(/\{empresa_razao_social\}/g, razaoSocial)
    .replace(/\{empresa_cnpj\}/g, cnpjEmpresa)
    .replace(/\{empresa_endereco\}/g, enderecoEmpresa)
    .replace(/\{empresa_mapa\}/g, mapaEmpresa)
    .replace(/\{empresa_telefone\}/g, telefoneEmpresa)
    .replace(/\{empresa_representante\}/g, representanteEmpresa)
    .replace(/\{link_formulario\}/g, linkFormulario || '');
}

export function gerarMensagemWhatsApp(
  statusCiclo: StatusCicloVenda,
  reservaComItens: ReservaComItens,
  cliente: Cliente,
  empresaConfig?: EmpresaConfig,
  linkFormulario?: string
): string {
  const customTemplate = empresaConfig?.whatsappTemplates?.[statusCiclo];
  const templateFinal = customTemplate && customTemplate.trim().length > 0
    ? customTemplate
    : DEFAULT_TEMPLATES[statusCiclo] || DEFAULT_TEMPLATES[StatusCicloVenda.RESERVA_CONFIRMADA];

  return processarTemplateWhatsApp(templateFinal, reservaComItens, cliente, empresaConfig, linkFormulario);
}
