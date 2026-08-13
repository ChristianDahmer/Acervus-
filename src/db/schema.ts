import { pgTable, text, integer, bigint, boolean, jsonb, timestamp, index, primaryKey, decimal } from 'drizzle-orm/pg-core';

// 1. TENANTS (Empresas usuárias)
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  nomeFantasia: text('nome_fantasia').notNull(),
  razaoSocial: text('razao_social'),
  cnpj: text('cnpj'),
  telefoneWhatsapp: text('telefone_whatsapp'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// 2. STOCK / ACERVO (Itens de Estoque)
export const stockItems = pgTable('stock_items', {
  tenantId: text('tenant_id').notNull(),
  id: integer('id').notNull(),
  nome: text('nome').notNull(),
  descricao: text('descricao'),
  quantidadeTotal: integer('quantidade_total').default(1).notNull(),
  quantidadeManutencao: integer('quantidade_manutencao').default(0).notNull(),
  precoAluguel: decimal('preco_aluguel', { precision: 12, scale: 2 }).default('0.00').notNull(),
  imageUrl: text('image_url').default('').notNull(),
  categoria: text('categoria').default('Geral').notNull(),
  isKit: boolean('is_kit').default(false).notNull(),
  kitComponentes: jsonb('kit_componentes'), // Array<{ itemId: number, quantidade: number }>
  ultimaManutencao: bigint('ultima_manutencao', { mode: 'number' }),
  frequenciaAlugueisManutencao: integer('frequencia_alugueis_manutencao').default(5),
  alugueisDesdeManutencao: integer('alugueis_desde_manutencao').default(0),
  statusManutencao: text('status_manutencao').default('EM_DIA'), // 'EM_DIA' | 'ALERTA' | 'EM_MANUTENCAO'
  proximaRevisaoData: bigint('proxima_revisao_data', { mode: 'number' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  // Estratégia de Índices Compostos para Busca Sub-30ms por Tenant
  index('idx_stock_tenant_id').on(table.tenantId, table.id),
  index('idx_stock_tenant_categoria').on(table.tenantId, table.categoria),
  index('idx_stock_tenant_status_manutencao').on(table.tenantId, table.statusManutencao),
]);

// 3. CLIENTES
export const clients = pgTable('clients', {
  tenantId: text('tenant_id').notNull(),
  id: integer('id').notNull(),
  nome: text('nome').notNull(),
  telefone: text('telefone').notNull(),
  email: text('email'),
  cpfCnpj: text('cpf_cnpj'),
  endereco: text('endereco'),
  observacoes: text('observacoes'),
  ativo: boolean('ativo').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  index('idx_clients_tenant_id').on(table.tenantId, table.id),
  index('idx_clients_tenant_telefone').on(table.tenantId, table.telefone),
  index('idx_clients_tenant_nome').on(table.tenantId, table.nome),
]);

// 4. WEB FORMS / ORÇAMENTOS
export const webForms = pgTable('web_forms', {
  tenantId: text('tenant_id').notNull(),
  id: text('id').notNull(), // Hash ou UUID da proposta ex: "orc_12345"
  titulo: text('titulo').notNull(),
  clienteId: integer('cliente_id'),
  clienteNome: text('cliente_nome'),
  clienteTelefone: text('cliente_telefone'),
  itens: jsonb('itens').notNull(), // Array<FormularioWebItem>
  criadoEm: bigint('criado_em', { mode: 'number' }).notNull(),
  respondido: boolean('respondido').default(false).notNull(),
  googleFormUrl: text('google_form_url'),
  googleDriveFileId: text('google_drive_file_id'),
  textoIntroducao: text('texto_introducao'),
  percentualCalcao: decimal('percentual_calcao', { precision: 5, scale: 2 }).default('30.00'),
  validadeDias: integer('validade_dias').default(7).notNull(),
  recusado: boolean('recusado').default(false),
  motivoRecusa: text('motivo_recusa'),
  dataRecusa: bigint('data_recusa', { mode: 'number' }),
  resposta: jsonb('resposta'),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  // Índice para busca instantânea sub-30ms por tenant e código da proposta
  index('idx_webforms_tenant_id').on(table.tenantId, table.id),
  index('idx_webforms_tenant_criado_em').on(table.tenantId, table.criadoEm),
  index('idx_webforms_tenant_respondido').on(table.tenantId, table.respondido),
]);

// 5. BOOKINGS / RESERVAS
export const bookings = pgTable('bookings', {
  tenantId: text('tenant_id').notNull(),
  id: integer('id').notNull(),
  clienteId: integer('cliente_id').notNull(),
  dataRetirada: bigint('data_retirada', { mode: 'number' }).notNull(), // timestamp ms
  dataDevolucao: bigint('data_devolucao', { mode: 'number' }).notNull(), // timestamp ms
  status: text('status').default('PENDENTE').notNull(), // PENDENTE, CONFIRMADA, EM_ANDAMENTO, CONCLUIDA, CANCELADA
  origemPropostaId: text('origem_proposta_id'),
  propostaAprovada: boolean('proposta_aprovada').default(false),
  contratoAssinadoText: text('contrato_assinado_text'),
  hashAssinaturaDigital: text('hash_assinatura_digital'),
  dataAssinatura: bigint('data_assinatura', { mode: 'number' }),
  percentualCalcao: decimal('percentual_calcao', { precision: 5, scale: 2 }).default('30.00'),
  valorCalcao: decimal('valor_calcao', { precision: 12, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  // Índice composto de altíssima performance para checagem de conflito de datas de reserva
  index('idx_bookings_tenant_dates').on(table.tenantId, table.dataRetirada, table.dataDevolucao, table.status),
  index('idx_bookings_tenant_id').on(table.tenantId, table.id),
  index('idx_bookings_tenant_cliente').on(table.tenantId, table.clienteId),
]);

// 6. BOOKING ITEMS (Itens vinculados à reserva para concorrência e integridade)
export const bookingItems = pgTable('booking_items', {
  tenantId: text('tenant_id').notNull(),
  bookingId: integer('booking_id').notNull(),
  stockItemId: integer('stock_item_id').notNull(),
  quantidade: integer('quantidade').notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.bookingId, table.stockItemId] }),
  index('idx_booking_items_stock').on(table.tenantId, table.stockItemId, table.bookingId),
]);

// 7. FINANCIAL TRANSACTIONS
export const financialTransactions = pgTable('financial_transactions', {
  tenantId: text('tenant_id').notNull(),
  id: text('id').notNull(),
  tipo: text('tipo').notNull(), // 'RECEITA' | 'DESPESA'
  categoria: text('categoria').notNull(),
  valor: decimal('valor', { precision: 12, scale: 2 }).notNull(),
  data: bigint('data', { mode: 'number' }).notNull(),
  descricao: text('descricao').notNull(),
  referenciaId: text('referencia_id'),
  status: text('status').default('PENDENTE').notNull(), // 'PAGO' | 'PENDENTE'
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  index('idx_fin_tenant_data').on(table.tenantId, table.data),
]);

// 8. MAINTENANCE RECORDS
export const maintenanceRecords = pgTable('maintenance_records', {
  tenantId: text('tenant_id').notNull(),
  id: text('id').notNull(),
  stockItemId: integer('stock_item_id').notNull(),
  data: bigint('data', { mode: 'number' }).notNull(),
  tipo: text('tipo').notNull(),
  custo: decimal('custo', { precision: 12, scale: 2 }).default('0.00').notNull(),
  observacao: text('observacao'),
  responsavel: text('responsavel'),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  index('idx_maint_tenant_stock').on(table.tenantId, table.stockItemId),
]);

// 9. TENANT CONFIGS (Configurações dinâmicas de cada empresa usuária)
export const tenantConfigs = pgTable('tenant_configs', {
  tenantId: text('tenant_id').notNull(),
  configName: text('config_name').notNull(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.configName] }),
  index('idx_tenant_configs_tenant_config').on(table.tenantId, table.configName),
]);
