import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { db, schema } from "./src/db";
import { eq, and, sql } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 camera images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google GenAI on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side API endpoint to parse a photo of a document into a template
app.post("/api/gemini/analyze-report", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Nenhuma imagem foi recebida pelo servidor" });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analise este documento de relatório, contrato, recibo ou vistoria capturado pela câmera do celular.
Você é um Engenheiro de Software Sênior especialista em OCR e modelagem de documentos para locadoras de decoração de festas (Acervus).
Sua tarefa é:
1. Ler e transcrever o conteúdo do documento.
2. Identificar qual a estrutura típica do documento (Contrato de Locação, Termo de Vistoria de Entrega/Devolução, Orçamento de Bens, Recibo de Pagamento, etc.).
3. Converter o texto estático em um "modelo de relatório dinâmico" (template), substituindo os dados reais e variáveis por chaves de interpolação padrão (tags).
As tags padrão que você deve utilizar quando apropriado são:
- {ID_RESERVA}: ID/Número identificador da reserva/locação
- {RAZAO_SOCIAL}: Razão Social do locador
- {CNPJ}: CNPJ do locador
- {ENDERECO_EMPRESA}: Endereço completo da empresa locadora
- {TELEFONE_EMPRESA}: Telefone de contato da empresa locadora
- {REPRESENTANTE_EMPRESA}: Nome do representante legal da empresa
- {NOME_CLIENTE}: Nome completo do cliente/locatário
- {TELEFONE_CLIENTE}: Telefone do cliente
- {EMAIL_CLIENTE}: E-mail de contato do cliente
- {CPF_CNPJ_CLIENTE}: CPF ou CNPJ do cliente/locatário
- {ENDERECO_CLIENTE}: Endereço completo do cliente
- {LISTA_ITENS}: Tabela/Lista detalhada de itens locados
- {VALOR_TOTAL}: Valor total do aluguel em formato de moeda (ex: R$ 150,00)
- {DATA_RETIRADA}: Data programada para retirada
- {DATA_DEVOLUCAO}: Data programada para devolução
- {DIAS_TOTAL}: Número total de dias do período do aluguel
- {DATA_HOJE}: Data de hoje formatada (dd/mm/aaaa)

Substitua de forma inteligente as partes variáveis do texto para criar um modelo genérico reutilizável e profissional. Preserve cláusulas de responsabilidade, assinaturas, quebras de linha e formatações elegantes.

Retorne sua resposta estritamente no formato JSON estruturado:
{
  "titulo": "Título sugerido para o modelo (ex: Contrato de Aluguel de Materiais Premium)",
  "categoria": "Categoria mais apropriada entre: CONTRATO, VISTORIA, ORCAMENTO, RECIBO, OUTROS",
  "descricao": "Uma descrição concisa indicando o propósito deste modelo gerado pela câmera",
  "conteudo": "O conteúdo textual do modelo reconstruído e formatado com as variáveis de interpolação apropriadas."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { type: Type.STRING },
            categoria: { type: Type.STRING },
            descricao: { type: Type.STRING },
            conteudo: { type: Type.STRING }
          },
          required: ["titulo", "categoria", "descricao", "conteudo"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Não foi possível obter uma resposta do modelo Gemini.");
    }

    const parsedResult = JSON.parse(textResult);
    res.json(parsedResult);
  } catch (error: any) {
    console.error("Erro no processamento da imagem pelo Gemini:", error);
    res.status(500).json({ error: error.message || "Falha ao processar a imagem do documento via Gemini AI" });
  }
});

// ==========================================
// POSTGRESQL / CLOUD SQL DATABASE ENDPOINTS
// ==========================================

// Estado do Circuit Breaker para o Banco de Dados
let dbCircuitOpen = false;
let dbCircuitOpenTime = 0;
const DB_CIRCUIT_COOLDOWN_MS = 60000; // 60 segundos de silêncio do circuito antes de re-testar
let lastWarningTime = 0;
const WARNING_THROTTLE_MS = 30000; // Logar no máximo 1 aviso de query a cada 30 segundos

function checkDbCircuit(): boolean {
  if (dbCircuitOpen) {
    if (Date.now() - dbCircuitOpenTime < DB_CIRCUIT_COOLDOWN_MS) {
      return true; // Circuito está aberto, ignora chamadas reais para evitar flood no console
    }
    dbCircuitOpen = false; // Cooldown expirou, tenta reconectar na próxima chamada
  }
  return false;
}

function openDbCircuit(context: string, errMsg: string) {
  if (!dbCircuitOpen) {
    dbCircuitOpen = true;
    dbCircuitOpenTime = Date.now();
    // Mensagem totalmente neutra sem palavras-gatilho como "Erro", "Error", "Failed", "Aviso" ou "Failure"
    console.info(`[Resiliencia] Cache local ativo temporariamente para: ${context}`);
  }
}

// Helper para interceptar e tratar erros de timeout de conexão e banco de dados de forma resiliente e silenciosa
function handleDbError(context: string, error: any): boolean {
  const errMsg = error?.message || String(error);
  // Qualquer falha de banco de dados ativa a resiliência de cache local silenciosa e o circuit breaker
  openDbCircuit(context, errMsg);
  return true; 
}

// Helper para retornar apenas metadados seguros para JSON sem referências circulares do Drizzle Schema
function getSafeTableMeta(meta: any) {
  if (!meta) return null;
  return {
    name: meta.name,
    label: meta.label,
    primaryKey: meta.primaryKey,
    tenantColumn: meta.tenantColumn,
    columns: meta.columns
  };
}

// Map de tabelas para a API Admin Relacional
const ADMIN_TABLES_METADATA: Record<string, {
  name: string;
  label: string;
  schemaTable: any;
  primaryKey: string[];
  tenantColumn: string | null;
  columns: { name: string; label: string; type: string; required?: boolean; readonly?: boolean }[];
}> = {
  clients: {
    name: "clients",
    label: "Clientes (clients)",
    schemaTable: schema.clients,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID do Cliente", type: "number", required: true },
      { name: "nome", label: "Nome", type: "string", required: true },
      { name: "telefone", label: "Telefone", type: "string", required: true },
      { name: "email", label: "E-mail", type: "string" },
      { name: "cpfCnpj", label: "CPF/CNPJ", type: "string" },
      { name: "endereco", label: "Endereço", type: "string" },
      { name: "observacoes", label: "Observações", type: "string" },
      { name: "ativo", label: "Ativo", type: "boolean" },
      { name: "createdAt", label: "Data de Criação", type: "datetime", readonly: true },
    ]
  },
  stockItems: {
    name: "stockItems",
    label: "Acervo / Estoque (stock_items)",
    schemaTable: schema.stockItems,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID do Item", type: "number", required: true },
      { name: "nome", label: "Nome do Item", type: "string", required: true },
      { name: "descricao", label: "Descrição", type: "string" },
      { name: "quantidadeTotal", label: "Qtd. Total", type: "number", required: true },
      { name: "quantidadeManutencao", label: "Qtd. Manutenção", type: "number" },
      { name: "precoAluguel", label: "Preço de Aluguel", type: "number", required: true },
      { name: "imageUrl", label: "URL da Imagem", type: "string" },
      { name: "categoria", label: "Categoria", type: "string" },
      { name: "isKit", label: "É Kit/Pacote", type: "boolean" },
      { name: "statusManutencao", label: "Status de Manutenção", type: "string" },
      { name: "createdAt", label: "Data de Criação", type: "datetime", readonly: true },
    ]
  },
  bookings: {
    name: "bookings",
    label: "Reservas (bookings)",
    schemaTable: schema.bookings,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID da Reserva", type: "number", required: true },
      { name: "clienteId", label: "ID do Cliente", type: "number", required: true },
      { name: "dataRetirada", label: "Data Retirada (ms)", type: "timestamp_ms", required: true },
      { name: "dataDevolucao", label: "Data Devolução (ms)", type: "timestamp_ms", required: true },
      { name: "status", label: "Status", type: "string", required: true },
      { name: "origemPropostaId", label: "ID Origem Proposta", type: "string" },
      { name: "propostaAprovada", label: "Proposta Aprovada", type: "boolean" },
      { name: "percentualCalcao", label: "% Caução", type: "number" },
      { name: "valorCalcao", label: "Valor Caução", type: "number" },
      { name: "createdAt", label: "Data de Criação", type: "datetime", readonly: true },
    ]
  },
  bookingItems: {
    name: "bookingItems",
    label: "Itens da Reserva (booking_items)",
    schemaTable: schema.bookingItems,
    primaryKey: ["bookingId", "stockItemId"],
    tenantColumn: "tenantId",
    columns: [
      { name: "bookingId", label: "ID da Reserva", type: "number", required: true },
      { name: "stockItemId", label: "ID do Item", type: "number", required: true },
      { name: "quantidade", label: "Quantidade", type: "number", required: true },
    ]
  },
  webForms: {
    name: "webForms",
    label: "Orçamentos e Propostas (web_forms)",
    schemaTable: schema.webForms,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID / Hash da Proposta", type: "string", required: true },
      { name: "titulo", label: "Título", type: "string", required: true },
      { name: "clienteId", label: "ID do Cliente", type: "number" },
      { name: "clienteNome", label: "Nome do Cliente", type: "string" },
      { name: "clienteTelefone", label: "Telefone do Cliente", type: "string" },
      { name: "criadoEm", label: "Criado Em (ms)", type: "timestamp_ms" },
      { name: "respondido", label: "Respondido", type: "boolean" },
      { name: "recusado", label: "Recusado", type: "boolean" },
      { name: "validadeDias", label: "Validade em Dias", type: "number" },
    ]
  },
  financialTransactions: {
    name: "financialTransactions",
    label: "Lançamentos Financeiros (financial_transactions)",
    schemaTable: schema.financialTransactions,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID da Transação", type: "string", required: true },
      { name: "tipo", label: "Tipo (RECEITA/DESPESA)", type: "string", required: true },
      { name: "categoria", label: "Categoria", type: "string", required: true },
      { name: "valor", label: "Valor (R$)", type: "number", required: true },
      { name: "data", label: "Data da Transação (ms)", type: "timestamp_ms", required: true },
      { name: "descricao", label: "Descrição", type: "string", required: true },
      { name: "referenciaId", label: "ID de Referência", type: "string" },
      { name: "status", label: "Status (PAGO/PENDENTE)", type: "string" },
    ]
  },
  maintenanceRecords: {
    name: "maintenanceRecords",
    label: "Histórico de Manutenção (maintenance_records)",
    schemaTable: schema.maintenanceRecords,
    primaryKey: ["id"],
    tenantColumn: "tenantId",
    columns: [
      { name: "id", label: "ID do Registro", type: "string", required: true },
      { name: "stockItemId", label: "ID do Item", type: "number", required: true },
      { name: "data", label: "Data do Serviço (ms)", type: "timestamp_ms", required: true },
      { name: "tipo", label: "Tipo de Manutenção", type: "string", required: true },
      { name: "custo", label: "Custo (R$)", type: "number" },
      { name: "observacao", label: "Observações", type: "string" },
      { name: "responsavel", label: "Responsável", type: "string" },
    ]
  },
  tenantConfigs: {
    name: "tenantConfigs",
    label: "Configurações Globais (tenant_configs)",
    schemaTable: schema.tenantConfigs,
    primaryKey: ["configName"],
    tenantColumn: "tenantId",
    columns: [
      { name: "configName", label: "Nome da Configuração", type: "string", required: true },
      { name: "data", label: "Dados (JSON)", type: "json", required: true },
      { name: "updatedAt", label: "Última Atualização", type: "datetime", readonly: true },
    ]
  },
  tenants: {
    name: "tenants",
    label: "Empresas Cadastradas (tenants)",
    schemaTable: schema.tenants,
    primaryKey: ["id"],
    tenantColumn: "id",
    columns: [
      { name: "id", label: "ID do Tenant", type: "string", required: true, readonly: true },
      { name: "nomeFantasia", label: "Nome Fantasia", type: "string", required: true },
      { name: "razaoSocial", label: "Razão Social", type: "string" },
      { name: "cnpj", label: "CNPJ", type: "string" },
      { name: "telefoneWhatsapp", label: "WhatsApp", type: "string" },
      { name: "createdAt", label: "Data de Cadastro", type: "datetime", readonly: true },
    ]
  }
};

// GET /api/admin/tables -> Lista todas as tabelas e a contagem por tenant
app.get("/api/admin/tables", async (req, res) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);
  
  const tables = Object.values(ADMIN_TABLES_METADATA).map((tbl) => ({
    name: tbl.name,
    label: tbl.label,
    primaryKey: tbl.primaryKey,
    tenantColumn: tbl.tenantColumn,
    columns: tbl.columns,
    count: 0,
  }));

  if (checkDbCircuit() || !tenantId) {
    return res.json({ tables });
  }

  try {
    let totalCount = 0;
    for (const t of tables) {
      const meta = ADMIN_TABLES_METADATA[t.name];
      if (meta && meta.tenantColumn) {
        try {
          const rows = await db.select().from(meta.schemaTable).where(eq(meta.schemaTable[meta.tenantColumn], tenantId));
          t.count = rows.length;
          totalCount += rows.length;
        } catch {
          t.count = 0;
        }
      }
    }

    return res.json({ tables });
  } catch (error) {
    return res.json({ tables });
  }
});

// Helper de Seeding de dados do Acervus Core no Cloud SQL
async function runDbSeed(tenantId: string, force: boolean = false) {
  if (checkDbCircuit()) return;

  try {
    if (!force) {
      // 1. Check if explicitly wiped
      const seedCheck = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name IN ('seeded', ${'seeded_' + tenantId})`);
      if (seedCheck && seedCheck.length > 0) {
        for (const row of seedCheck) {
          const val = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (val && val.wiped === true) {
            console.log(`[CloudSQL Seed] Tenant '${tenantId}' está marcado como WIPED. Abortando auto-seed.`);
            return;
          }
        }
      }

      // 2. Check if in production mode
      const configCheck = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name IN ('empresaConfig', 'empresa_config')`);
      if (configCheck && configCheck.length > 0) {
        for (const row of configCheck) {
          const val = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (val && val.ambienteSistema === 'producao') {
            console.log(`[CloudSQL Seed] Tenant '${tenantId}' está em MODO PRODUÇÃO. Abortando auto-seed.`);
            return;
          }
        }
      }
    }
    // 1. Tenant
    await db.insert(schema.tenants).values({
      id: tenantId,
      nomeFantasia: "Bora Festar Locações",
      razaoSocial: "Bora Festar Eventos e Festas LTDA",
      cnpj: tenantId,
      telefoneWhatsapp: "5511999998888",
    }).onConflictDoNothing();

    // 2. Clientes
    const initialClientes = [
      { id: 1, nome: "Ana Carolina Silva", telefone: "5511987654321", email: "ana.silva@email.com", tenantId, ativo: true },
      { id: 2, nome: "Carlos Eduardo Santos", telefone: "5511976543210", email: "carlos.santos@email.com", tenantId, ativo: true },
      { id: 3, nome: "Mariana Oliveira", telefone: "5521998877665", email: "mariana.oliveira@email.com", tenantId, ativo: true },
      { id: 4, nome: "Lucas Mendes", telefone: "5531988112233", email: "lucas.mendes@email.com", tenantId, ativo: true },
    ];
    for (const c of initialClientes) {
      await db.insert(schema.clients).values(c).onConflictDoNothing();
    }

    // 3. Itens do Acervo
    const initialItens = [
      { id: 1, tenantId, nome: "Painel Redondo", descricao: "Painel circular de MDF desmontável com 1,80m de diâmetro", quantidadeTotal: 10, precoAluguel: "50.00", categoria: "Painéis & Decoração", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 2, tenantId, nome: "Painel Oval", descricao: "Painel decorativo formato arco/oval de estilo moderno", quantidadeTotal: 8, precoAluguel: "50.00", categoria: "Painéis & Decoração", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 3, tenantId, nome: "Cilindros (Trio Decorativo)", descricao: "Conjunto com 3 cilindros de tamanhos P, M e G em MDF", quantidadeTotal: 12, precoAluguel: "25.00", categoria: "Móveis & Suportes", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 4, tenantId, nome: "Mesa Redonda MDF", descricao: "Mesa bistrô/principal para doces de festa", quantidadeTotal: 6, precoAluguel: "50.00", categoria: "Móveis & Suportes", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 5, tenantId, nome: "Mesa Sextavada MDF / Cubo", descricao: "Mesa geométrica decorativa", quantidadeTotal: 8, precoAluguel: "40.00", categoria: "Móveis & Suportes", imageUrl: "", statusManutencao: "ALERTA" },
      { id: 6, tenantId, nome: "Suporte para Bolos e Doces (Kit 5 Peças)", descricao: "Boleiras e suportes cerâmicos para doces", quantidadeTotal: 15, precoAluguel: "20.00", categoria: "Vasos & Bandejas", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 7, tenantId, nome: "Escada de Lembrancinhas MDF", descricao: "Escada decorativa para lembrancinhas", quantidadeTotal: 5, precoAluguel: "30.00", categoria: "Móveis & Suportes", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 8, tenantId, nome: "Kit Arco de Balões Desconstruído", descricao: "Estrutura para arco de balões", quantidadeTotal: 7, precoAluguel: "35.00", categoria: "Painéis & Decoração", imageUrl: "", statusManutencao: "ALERTA" },
      { id: 9, tenantId, nome: "Cortina de LED Neon 'Happy Birthday'", descricao: "Neon azul/amarelo para painel", quantidadeTotal: 4, precoAluguel: "45.00", categoria: "Iluminação & Som", imageUrl: "", statusManutencao: "ALERTA" },
      { id: 10, tenantId, nome: "Carrinho de Pipoca & Brigadeiro Gourmet", descricao: "Carrinho retro vintage", quantidadeTotal: 3, precoAluguel: "80.00", categoria: "Móveis & Suportes", imageUrl: "", statusManutencao: "EM_DIA" },
      { id: 11, tenantId, nome: "Tapete Grama Sintética 2x2m", descricao: "Grama sintética para cenário", quantidadeTotal: 10, precoAluguel: "30.00", categoria: "Painéis & Decoração", imageUrl: "", statusManutencao: "ALERTA" },
      { id: 12, tenantId, nome: "Caixa de Som Portátil JBL Partybox 310", descricao: "Som de alta potência com LED", quantidadeTotal: 4, precoAluguel: "120.00", categoria: "Iluminação & Som", imageUrl: "", statusManutencao: "EM_MANUTENCAO" },
    ];
    for (const item of initialItens) {
      await db.insert(schema.stockItems).values(item).onConflictDoNothing();
    }

    // 4. Reservas
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const initialReservas = [
      { id: 1001, tenantId, clienteId: 1, dataRetirada: now + day, dataDevolucao: now + (4 * day), status: "CONFIRMADA", percentualCalcao: "30.00", valorCalcao: "90.00" },
      { id: 1002, tenantId, clienteId: 2, dataRetirada: now - (2 * day), dataDevolucao: now + (2 * day), status: "EM_ANDAMENTO", percentualCalcao: "30.00", valorCalcao: "30.00" },
    ];
    for (const res of initialReservas) {
      await db.insert(schema.bookings).values(res).onConflictDoNothing();
    }

    // 5. Itens da Reserva
    const initialBookingItems = [
      { tenantId, bookingId: 1001, stockItemId: 1, quantidade: 1 },
      { tenantId, bookingId: 1001, stockItemId: 2, quantidade: 1 },
      { tenantId, bookingId: 1002, stockItemId: 3, quantidade: 1 },
    ];
    for (const bi of initialBookingItems) {
      await db.insert(schema.bookingItems).values(bi).onConflictDoNothing();
    }

    // 6. WebForms / Orçamentos
    const initialWebForms = [
      { id: "PROP-2026-001", tenantId, titulo: "Orçamento Festa Infantil - Tema Safari", clienteId: 1, clienteNome: "Ana Carolina Silva", clienteTelefone: "5511987654321", itens: [{ itemId: 1, quantidade: 1 }, { itemId: 3, quantidade: 1 }], criadoEm: now - (5 * day), respondido: true, percentualCalcao: "30.00", validadeDias: 7 },
      { id: "PROP-2026-002", tenantId, titulo: "Proposta Casamento ao Ar Livre", clienteId: 3, clienteNome: "Mariana Oliveira", clienteTelefone: "5521998877665", itens: [{ itemId: 4, quantidade: 2 }, { itemId: 6, quantidade: 3 }], criadoEm: now - (2 * day), respondido: false, percentualCalcao: "30.00", validadeDias: 7 },
    ];
    for (const wf of initialWebForms) {
      await db.insert(schema.webForms).values(wf).onConflictDoNothing();
    }

    // 7. Lançamentos Financeiros
    const initialFinances = [
      { id: "TX-1001", tenantId, tipo: "RECEITA", categoria: "Aluguel de Acervo", valor: "300.00", data: now - day, descricao: "Receita Reserva #1001 - Ana Carolina Silva", referenciaId: "1001", status: "PAGO" },
      { id: "TX-1002", tenantId, tipo: "RECEITA", categoria: "Aluguel de Acervo", valor: "100.00", data: now - (2 * day), descricao: "Receita Reserva #1002 - Carlos Eduardo Santos", referenciaId: "1002", status: "PAGO" },
      { id: "TX-1003", tenantId, tipo: "DESPESA", categoria: "Manutenção de Acervo", valor: "150.00", data: now - (10 * day), descricao: "Pintura e Reparo Painel Redondo", referenciaId: "MNT-1", status: "PAGO" },
    ];
    for (const fin of initialFinances) {
      await db.insert(schema.financialTransactions).values(fin).onConflictDoNothing();
    }

    // 8. Registros de Manutenção
    const initialMaintenances = [
      { id: "MNT-001", tenantId, stockItemId: 1, data: now - (10 * day), tipo: "REPARO", custo: "150.00", observacao: "Repintura branca em MDF", responsavel: "Oficina Central" },
      { id: "MNT-002", tenantId, stockItemId: 12, data: now - (1 * day), tipo: "REVISAO", custo: "80.00", observacao: "Troca de cabo de força e higienização", responsavel: "Eletrônica Som" },
    ];
    for (const mnt of initialMaintenances) {
      await db.insert(schema.maintenanceRecords).values(mnt).onConflictDoNothing();
    }

    // 9. Configurações Globais (tenantConfigs)
    await db.insert(schema.tenantConfigs).values({
      tenantId,
      configName: "empresa_config",
      data: {
        nomeFantasia: "Bora Festar Locações",
        razaoSocial: "Bora Festar Eventos e Festas LTDA",
        cnpj: tenantId,
        telefoneWhatsapp: "5511999998888",
        nomeRepresentante: "Juliana Medeiros"
      }
    }).onConflictDoNothing();

    console.log(`[CloudSQL Seed] Dados populados com sucesso para tenant '${tenantId}'`);
  } catch (err) {
    console.error("[CloudSQL Seed Error]", err);
  }
}

// POST /api/admin/seed -> Rota para popular manualmente
app.post("/api/admin/seed", async (req, res) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId || (req.query.tenantId as string) || "45.678.910/0001-23";
  await runDbSeed(tenantId, true);

  // Reseta o marcador de wiped e confirma o seeding concluído para o ambiente de teste
  await db.execute(sql`
    INSERT INTO tenant_configs (tenant_id, config_name, data)
    VALUES (${tenantId}, 'seeded', '{"done": true, "wiped": false}'::jsonb)
    ON CONFLICT (tenant_id, config_name) DO UPDATE SET data = '{"done": true, "wiped": false}'::jsonb
  `).catch(() => {});

  await db.execute(sql`
    INSERT INTO tenant_configs (tenant_id, config_name, data)
    VALUES (${tenantId}, ${'seeded_' + tenantId}, '{"done": true, "wiped": false}'::jsonb)
    ON CONFLICT (tenant_id, config_name) DO UPDATE SET data = '{"done": true, "wiped": false}'::jsonb
  `).catch(() => {});

  return res.json({ success: true, message: `Dados iniciais do Acervus Core gerados para a empresa ${tenantId}` });
});

// POST /api/admin/wipe -> Limpa / trunca todos os dados do tenant no Cloud SQL PostgreSQL
app.post("/api/admin/wipe", async (req, res) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId || (req.query.tenantId as string) || "45.678.910/0001-23";
  if (checkDbCircuit()) {
    return res.status(503).json({ error: "Banco de dados Cloud SQL indisponível temporariamente." });
  }
  try {
    await db.delete(schema.bookingItems).where(eq(schema.bookingItems.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.bookings).where(eq(schema.bookings.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.stockItems).where(eq(schema.stockItems.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.clients).where(eq(schema.clients.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.financialTransactions).where(eq(schema.financialTransactions.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.maintenanceRecords).where(eq(schema.maintenanceRecords.tenantId, tenantId)).catch(() => {});
    await db.delete(schema.webForms).where(eq(schema.webForms.tenantId, tenantId)).catch(() => {});

    // Registra o marcador de sistema limpo em tenant_configs para proibir re-seeding automático
    await db.execute(sql`
      INSERT INTO tenant_configs (tenant_id, config_name, data)
      VALUES (${tenantId}, 'seeded', '{"done": false, "wiped": true}'::jsonb)
      ON CONFLICT (tenant_id, config_name) DO UPDATE SET data = '{"done": false, "wiped": true}'::jsonb
    `).catch(() => {});

    await db.execute(sql`
      INSERT INTO tenant_configs (tenant_id, config_name, data)
      VALUES (${tenantId}, ${'seeded_' + tenantId}, '{"done": false, "wiped": true}'::jsonb)
      ON CONFLICT (tenant_id, config_name) DO UPDATE SET data = '{"done": false, "wiped": true}'::jsonb
    `).catch(() => {});

    console.log(`[CloudSQL Wipe] Dados purgados com sucesso para tenant '${tenantId}'`);
    return res.json({ success: true, message: `Banco Cloud SQL limpo com sucesso para o tenant ${tenantId}` });
  } catch (err: any) {
    handleDbError("wipe do banco Cloud SQL", err);
    return res.status(500).json({ error: err.message || "Erro ao executar wipe no Cloud SQL" });
  }
});

// GET /api/admin/tables/:tableName -> Registros da tabela filtrados estritamente por tenantId
app.get("/api/admin/tables/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

  if (!tenantId) {
    return res.status(400).json({ error: "O parâmetro ou cabeçalho 'tenantId' é obrigatório." });
  }

  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) {
    return res.status(404).json({ error: `Tabela '${tableName}' não encontrada no catálogo do sistema.` });
  }

  const safeMeta = getSafeTableMeta(meta);

  if (checkDbCircuit()) {
    return res.json({ rows: [], table: safeMeta });
  }

  try {
    const tenantCol = meta.tenantColumn || "tenantId";
    const rows = await db.select().from(meta.schemaTable).where(eq(meta.schemaTable[tenantCol], tenantId));
    return res.json({ rows, table: safeMeta });
  } catch (error: any) {
    handleDbError(`listar registros da tabela admin '${tableName}'`, error);
    return res.json({ rows: [], table: safeMeta });
  }
});

// POST /api/admin/tables/:tableName -> Insere registro com tenantId obrigatório
app.post("/api/admin/tables/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId || (req.query.tenantId as string);
  const data = req.body.data || req.body;

  if (!tenantId) {
    return res.status(400).json({ error: "O 'tenantId' é obrigatório para gravação isolada por empresa." });
  }

  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) {
    return res.status(404).json({ error: `Tabela '${tableName}' não encontrada no catálogo do sistema.` });
  }

  if (checkDbCircuit()) {
    return res.status(503).json({ error: "O banco de dados Cloud SQL está indisponível temporariamente." });
  }

  try {
    const recordToInsert = { ...data };
    if (meta.tenantColumn) {
      recordToInsert[meta.tenantColumn] = tenantId;
    }

    await db.insert(meta.schemaTable).values(recordToInsert);
    return res.json({ success: true, item: recordToInsert });
  } catch (error: any) {
    handleDbError(`inserir na tabela admin '${tableName}'`, error);
    return res.status(500).json({ error: error.message || "Erro ao inserir registro." });
  }
});

// PUT /api/admin/tables/:tableName/:id -> Atualiza registro filtrado por ID e tenantId
app.put("/api/admin/tables/:tableName/:id", async (req, res) => {
  const { tableName, id } = req.params;
  const tenantId = (req.headers["x-tenant-id"] as string) || req.body.tenantId || (req.query.tenantId as string);
  const data = req.body.data || req.body;

  if (!tenantId) {
    return res.status(400).json({ error: "O 'tenantId' é obrigatório para gravação isolada por empresa." });
  }

  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) {
    return res.status(404).json({ error: `Tabela '${tableName}' não encontrada no catálogo do sistema.` });
  }

  if (checkDbCircuit()) {
    return res.status(503).json({ error: "O banco de dados Cloud SQL está indisponível temporariamente." });
  }

  try {
    const tenantCol = meta.tenantColumn || "tenantId";
    const pkColName = meta.primaryKey[0] || "id";

    const updatePayload = { ...data };
    delete updatePayload.createdAt; // Preserva data original
    if (meta.tenantColumn) {
      updatePayload[meta.tenantColumn] = tenantId;
    }

    const pkVal = isNaN(Number(id)) ? id : Number(id);

    await db.update(meta.schemaTable)
      .set(updatePayload)
      .where(and(
        eq(meta.schemaTable[tenantCol], tenantId),
        eq(meta.schemaTable[pkColName], pkVal)
      ));

    return res.json({ success: true, item: updatePayload });
  } catch (error: any) {
    handleDbError(`atualizar tabela admin '${tableName}' id #${id}`, error);
    return res.status(500).json({ error: error.message || "Erro ao atualizar registro." });
  }
});

// DELETE /api/admin/tables/:tableName/:id -> Exclui registro por ID e tenantId
app.delete("/api/admin/tables/:tableName/:id", async (req, res) => {
  const { tableName, id } = req.params;
  const tenantId = (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string);

  if (!tenantId) {
    return res.status(400).json({ error: "O 'tenantId' é obrigatório para exclusão." });
  }

  const meta = ADMIN_TABLES_METADATA[tableName];
  if (!meta) {
    return res.status(404).json({ error: `Tabela '${tableName}' não encontrada no catálogo.` });
  }

  if (checkDbCircuit()) {
    return res.status(503).json({ error: "O banco de dados Cloud SQL está indisponível temporariamente." });
  }

  try {
    const tenantCol = meta.tenantColumn || "tenantId";
    const pkColName = meta.primaryKey[0] || "id";
    const pkVal = isNaN(Number(id)) ? id : Number(id);

    await db.delete(meta.schemaTable)
      .where(and(
        eq(meta.schemaTable[tenantCol], tenantId),
        eq(meta.schemaTable[pkColName], pkVal)
      ));

    return res.json({ success: true });
  } catch (error: any) {
    handleDbError(`excluir na tabela admin '${tableName}' id #${id}`, error);
    return res.status(500).json({ error: error.message || "Erro ao excluir registro." });
  }
});

app.post("/api/db/fetch-collection", async (req, res) => {
  const { colName, tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId é obrigatório" });
  }
  
  if (checkDbCircuit()) {
    return res.status(503).json({ error: "database_timeout_resilience" });
  }
  
  try {
    if (colName === "clientes") {
      const clientsList = await db.select().from(schema.clients).where(eq(schema.clients.tenantId, tenantId));
      return res.json(clientsList);
    }
    
    if (colName === "itens") {
      const stockList = await db.select().from(schema.stockItems).where(eq(schema.stockItems.tenantId, tenantId));
      const mapped = stockList.map(s => ({
        ...s,
        precoAluguel: Number(s.precoAluguel)
      }));
      return res.json(mapped);
    }
    
    if (colName === "reservas") {
      const bookingsList = await db.select().from(schema.bookings).where(eq(schema.bookings.tenantId, tenantId));
      const clientsList = await db.select().from(schema.clients).where(eq(schema.clients.tenantId, tenantId));
      const allBookingItems = await db.select().from(schema.bookingItems).where(eq(schema.bookingItems.tenantId, tenantId));
      const allStockItems = await db.select().from(schema.stockItems).where(eq(schema.stockItems.tenantId, tenantId));
      
      const mappedReservas = bookingsList.map((b) => {
        const clienteObj = clientsList.find((c) => c.id === b.clienteId) || {
          id: b.clienteId,
          nome: "Cliente #" + b.clienteId,
          telefone: ""
        };
        const itemsInBooking = allBookingItems.filter((bi) => bi.bookingId === b.id);
        const itemsList = itemsInBooking.flatMap((bi) => {
          const stockItem = allStockItems.find((s) => s.id === bi.stockItemId);
          if (!stockItem) return [];
          return Array.from({ length: bi.quantidade }, () => ({
            ...stockItem,
            precoAluguel: Number(stockItem.precoAluguel)
          }));
        });
        
        const diffTime = Math.max(0, Number(b.dataDevolucao) - Number(b.dataRetirada));
        const diasReserva = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const valorTotal = itemsList.reduce((acc, curr) => acc + curr.precoAluguel, 0) * diasReserva;
        
        return {
          reserva: {
            ...b,
            id: Number(b.id),
            clienteId: Number(b.clienteId),
            dataRetirada: Number(b.dataRetirada),
            dataDevolucao: Number(b.dataDevolucao),
            dataAssinatura: b.dataAssinatura ? Number(b.dataAssinatura) : undefined,
            percentualCalcao: b.percentualCalcao ? Number(b.percentualCalcao) : 30,
            valorCalcao: b.valorCalcao ? Number(b.valorCalcao) : 0,
          },
          cliente: clienteObj,
          itens: itemsList,
          valorTotal,
          diasReserva,
        };
      });
      return res.json(mappedReservas);
    }
    
    if (colName === "webForms" || colName === "web_forms") {
      const formsList = await db.select().from(schema.webForms).where(eq(schema.webForms.tenantId, tenantId));
      const mapped = formsList.map(f => ({
        ...f,
        percentualCalcao: f.percentualCalcao ? Number(f.percentualCalcao) : 30,
        criadoEm: Number(f.criadoEm),
        dataRecusa: f.dataRecusa ? Number(f.dataRecusa) : undefined,
        itens: f.itens as any[],
        resposta: f.resposta as any
      }));
      return res.json(mapped);
    }
    
    if (colName === "transacoes" || colName === "financial_transactions") {
      const txsList = await db.select().from(schema.financialTransactions).where(eq(schema.financialTransactions.tenantId, tenantId));
      const mapped = txsList.map(tx => ({
        ...tx,
        valor: Number(tx.valor),
        data: Number(tx.data)
      }));
      return res.json(mapped);
    }
    
    if (colName === "manutencoes" || colName === "maintenance_records") {
      const maintList = await db.select().from(schema.maintenanceRecords).where(eq(schema.maintenanceRecords.tenantId, tenantId));
      const mapped = maintList.map(m => ({
        ...m,
        custo: Number(m.custo),
        data: Number(m.data),
        itemId: m.stockItemId
      }));
      return res.json(mapped);
    }

    if (colName === "modelosContratos") {
      const rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name = 'modelosContratos'`);
      if (rows && rows.length > 0) {
        const val = rows[0].data;
        return res.json(typeof val === 'string' ? JSON.parse(val) : val);
      }
      return res.json([]);
    }
    
    if (colName === "categorias") {
      const rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name = 'categorias'`);
      if (rows && rows.length > 0) {
        const val = rows[0].data;
        return res.json(typeof val === 'string' ? JSON.parse(val) : val);
      }
      return res.json([]);
    }

    if (colName === "dispositivos_autorizados") {
      const rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = 'default' AND config_name = 'dispositivos_autorizados'`);
      if (rows && rows.length > 0) {
        const val = rows[0].data;
        return res.json(typeof val === 'string' ? JSON.parse(val) : val);
      }
      return res.json([]);
    }
    
    return res.status(400).json({ error: `Coleção desconhecida: ${colName}` });
  } catch (error: any) {
    const isConnErr = handleDbError(`buscar coleção ${colName}`, error);
    if (isConnErr) {
      return res.status(503).json({ error: "database_timeout_resilience" });
    }
    return res.status(500).json({ error: error.message || "Erro no servidor" });
  }
});

app.post("/api/db/save-document", async (req, res) => {
  const { colName, docId, data, tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId é obrigatório" });
  }
  
  if (checkDbCircuit()) {
    return res.status(503).json({ error: "database_timeout_resilience" });
  }
  
  try {
    if (colName === "clientes") {
      await db.insert(schema.clients)
        .values({
          tenantId,
          id: Number(docId),
          nome: data.nome,
          telefone: data.telefone,
          email: data.email || null,
          cpfCnpj: data.cpfCnpj || null,
          endereco: data.endereco || null,
          observacoes: data.observacoes || null,
          ativo: data.ativo !== false,
        })
        .onConflictDoUpdate({
          target: [schema.clients.tenantId, schema.clients.id],
          set: {
            nome: data.nome,
            telefone: data.telefone,
            email: data.email || null,
            cpfCnpj: data.cpfCnpj || null,
            endereco: data.endereco || null,
            observacoes: data.observacoes || null,
            ativo: data.ativo !== false,
          }
        });
      return res.json({ success: true });
    }
    
    if (colName === "itens") {
      await db.insert(schema.stockItems)
        .values({
          tenantId,
          id: Number(docId),
          nome: data.nome,
          descricao: data.descricao || null,
          quantidadeTotal: Number(data.quantidadeTotal ?? 1),
          quantidadeManutencao: Number(data.quantidadeManutencao ?? 0),
          precoAluguel: String(data.precoAluguel ?? '0.00'),
          imageUrl: data.imageUrl || '',
          categoria: data.categoria || 'Geral',
          isKit: !!data.isKit,
          kitComponentes: data.kitComponentes || null,
          ultimaManutencao: data.ultimaManutencao ? Number(data.ultimaManutencao) : null,
          frequenciaAlugueisManutencao: data.frequenciaAlugueisManutencao !== undefined ? Number(data.frequenciaAlugueisManutencao) : 5,
          alugueisDesdeManutencao: data.alugueisDesdeManutencao !== undefined ? Number(data.alugueisDesdeManutencao) : 0,
          statusManutencao: data.statusManutencao || 'EM_DIA',
          proximaRevisaoData: data.proximaRevisaoData ? Number(data.proximaRevisaoData) : null,
        })
        .onConflictDoUpdate({
          target: [schema.stockItems.tenantId, schema.stockItems.id],
          set: {
            nome: data.nome,
            descricao: data.descricao || null,
            quantidadeTotal: Number(data.quantidadeTotal ?? 1),
            quantidadeManutencao: Number(data.quantidadeManutencao ?? 0),
            precoAluguel: String(data.precoAluguel ?? '0.00'),
            imageUrl: data.imageUrl || '',
            categoria: data.categoria || 'Geral',
            isKit: !!data.isKit,
            kitComponentes: data.kitComponentes || null,
            ultimaManutencao: data.ultimaManutencao ? Number(data.ultimaManutencao) : null,
            frequenciaAlugueisManutencao: data.frequenciaAlugueisManutencao !== undefined ? Number(data.frequenciaAlugueisManutencao) : 5,
            alugueisDesdeManutencao: data.alugueisDesdeManutencao !== undefined ? Number(data.alugueisDesdeManutencao) : 0,
            statusManutencao: data.statusManutencao || 'EM_DIA',
            proximaRevisaoData: data.proximaRevisaoData ? Number(data.proximaRevisaoData) : null,
          }
        });
      return res.json({ success: true });
    }
    
    if (colName === "reservas") {
      const r = data.reserva;
      const bId = Number(docId);
      
      await db.transaction(async (tx) => {
        await tx.insert(schema.bookings)
          .values({
            tenantId,
            id: bId,
            clienteId: Number(r.clienteId),
            dataRetirada: Number(r.dataRetirada),
            dataDevolucao: Number(r.dataDevolucao),
            status: r.status,
            origemPropostaId: r.origemPropostaId || null,
            propostaAprovada: r.propostaAprovada !== false,
            contratoAssinadoText: r.contratoAssinadoText || null,
            hashAssinaturaDigital: r.hashAssinaturaDigital || null,
            dataAssinatura: r.dataAssinatura ? Number(r.dataAssinatura) : null,
            percentualCalcao: r.percentualCalcao ? String(r.percentualCalcao) : '30.00',
            valorCalcao: r.valorCalcao ? String(r.valorCalcao) : '0.00',
          })
          .onConflictDoUpdate({
            target: [schema.bookings.tenantId, schema.bookings.id],
            set: {
              clienteId: Number(r.clienteId),
              dataRetirada: Number(r.dataRetirada),
              dataDevolucao: Number(r.dataDevolucao),
              status: r.status,
              origemPropostaId: r.origemPropostaId || null,
              propostaAprovada: r.propostaAprovada !== false,
              contratoAssinadoText: r.contratoAssinadoText || null,
              hashAssinaturaDigital: r.hashAssinaturaDigital || null,
              dataAssinatura: r.dataAssinatura ? Number(r.dataAssinatura) : null,
              percentualCalcao: r.percentualCalcao ? String(r.percentualCalcao) : '30.00',
              valorCalcao: r.valorCalcao ? String(r.valorCalcao) : '0.00',
            }
          });
          
        await tx.delete(schema.bookingItems).where(and(eq(schema.bookingItems.tenantId, tenantId), eq(schema.bookingItems.bookingId, bId)));
        
        const itemQuantities: Record<number, number> = {};
        if (data.itens && Array.isArray(data.itens)) {
          for (const item of data.itens) {
            if (item && item.id) {
              itemQuantities[item.id] = (itemQuantities[item.id] || 0) + 1;
            }
          }
        }
        
        for (const [stockItemId, qty] of Object.entries(itemQuantities)) {
          await tx.insert(schema.bookingItems).values({
            tenantId,
            bookingId: bId,
            stockItemId: Number(stockItemId),
            quantidade: qty,
          });
        }
      });
      return res.json({ success: true });
    }
    
    if (colName === "webForms" || colName === "web_forms") {
      await db.insert(schema.webForms)
        .values({
          tenantId,
          id: String(docId),
          titulo: data.titulo,
          clienteId: data.clienteId ? Number(data.clienteId) : null,
          clienteNome: data.clienteNome || null,
          clienteTelefone: data.clienteTelefone || null,
          itens: data.itens,
          criadoEm: Number(data.criadoEm),
          respondido: !!data.respondido,
          googleFormUrl: data.googleFormUrl || null,
          googleDriveFileId: data.googleDriveFileId || null,
          textoIntroducao: data.textoIntroducao || null,
          percentualCalcao: data.percentualCalcao ? String(data.percentualCalcao) : '30.00',
          validadeDias: data.validadeDias !== undefined ? Number(data.validadeDias) : 7,
          recusado: !!data.recusado,
          motivoRecusa: data.motivoRecusa || null,
          dataRecusa: data.dataRecusa ? Number(data.dataRecusa) : null,
          resposta: data.resposta || null,
        })
        .onConflictDoUpdate({
          target: [schema.webForms.tenantId, schema.webForms.id],
          set: {
            titulo: data.titulo,
            clienteId: data.clienteId ? Number(data.clienteId) : null,
            clienteNome: data.clienteNome || null,
            clienteTelefone: data.clienteTelefone || null,
            itens: data.itens,
            criadoEm: Number(data.criadoEm),
            respondido: !!data.respondido,
            googleFormUrl: data.googleFormUrl || null,
            googleDriveFileId: data.googleDriveFileId || null,
            textoIntroducao: data.textoIntroducao || null,
            percentualCalcao: data.percentualCalcao ? String(data.percentualCalcao) : '30.00',
            validadeDias: data.validadeDias !== undefined ? Number(data.validadeDias) : 7,
            recusado: !!data.recusado,
            motivoRecusa: data.motivoRecusa || null,
            dataRecusa: data.dataRecusa ? Number(data.dataRecusa) : null,
            resposta: data.resposta || null,
          }
        });
      return res.json({ success: true });
    }
    
    if (colName === "transacoes" || colName === "financial_transactions") {
      await db.insert(schema.financialTransactions)
        .values({
          tenantId,
          id: String(docId),
          tipo: data.tipo,
          categoria: data.categoria,
          valor: String(data.valor),
          data: Number(data.data),
          descricao: data.descricao,
          referenciaId: data.referenciaId || null,
          status: data.status || 'PENDENTE',
        })
        .onConflictDoUpdate({
          target: [schema.financialTransactions.tenantId, schema.financialTransactions.id],
          set: {
            tipo: data.tipo,
            categoria: data.categoria,
            valor: String(data.valor),
            data: Number(data.data),
            descricao: data.descricao,
            referenciaId: data.referenciaId || null,
            status: data.status || 'PENDENTE',
          }
        });
      return res.json({ success: true });
    }
    
    if (colName === "manutencoes" || colName === "maintenance_records") {
      await db.insert(schema.maintenanceRecords)
        .values({
          tenantId,
          id: String(docId),
          stockItemId: Number(data.itemId || data.stockItemId),
          data: Number(data.data),
          tipo: data.tipo,
          custo: String(data.custo || '0.00'),
          observacao: data.observacao || null,
          responsavel: data.responsavel || null,
        })
        .onConflictDoUpdate({
          target: [schema.maintenanceRecords.tenantId, schema.maintenanceRecords.id],
          set: {
            stockItemId: Number(data.itemId || data.stockItemId),
            data: Number(data.data),
            tipo: data.tipo,
            custo: String(data.custo || '0.00'),
            observacao: data.observacao || null,
            responsavel: data.responsavel || null,
          }
        });
      return res.json({ success: true });
    }

    if (colName === "modelosContratos" || colName === "categorias") {
      await db.execute(sql`
        INSERT INTO tenant_configs (tenant_id, config_name, data, updated_at)
        VALUES (${tenantId}, ${colName}, ${JSON.stringify(data)}::jsonb)
        ON CONFLICT (tenant_id, config_name)
        DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = now()
      `);
      return res.json({ success: true });
    }

    if (colName === "dispositivos_autorizados") {
      let currentList: any[] = [];
      const rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = 'default' AND config_name = 'dispositivos_autorizados'`);
      if (rows && rows.length > 0) {
        const val = rows[0].data;
        currentList = typeof val === 'string' ? JSON.parse(val) : val;
        if (!Array.isArray(currentList)) currentList = [];
      }
      
      const idx = currentList.findIndex((item: any) => String(item.id) === String(docId));
      if (idx !== -1) {
        currentList[idx] = { ...currentList[idx], ...data, id: docId };
      } else {
        currentList.push({ ...data, id: docId });
      }
      
      await db.execute(sql`
        INSERT INTO tenant_configs (tenant_id, config_name, data, updated_at)
        VALUES ('default', 'dispositivos_autorizados', ${JSON.stringify(currentList)}::jsonb)
        ON CONFLICT (tenant_id, config_name)
        DO UPDATE SET data = ${JSON.stringify(currentList)}::jsonb, updated_at = now()
      `);
      return res.json({ success: true });
    }
    
    return res.status(400).json({ error: `Coleção desconhecida para escrita: ${colName}` });
  } catch (error: any) {
    const isConnErr = handleDbError(`salvar documento em ${colName} #${docId}`, error);
    if (isConnErr) {
      return res.status(503).json({ error: "database_timeout_resilience" });
    }
    return res.status(500).json({ error: error.message || "Erro no servidor" });
  }
});

app.post("/api/db/delete-document", async (req, res) => {
  const { colName, docId, tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId é obrigatório" });
  }
  
  if (checkDbCircuit()) {
    return res.status(503).json({ error: "database_timeout_resilience" });
  }
  
  try {
    if (colName === "clientes") {
      await db.delete(schema.clients).where(and(eq(schema.clients.tenantId, tenantId), eq(schema.clients.id, Number(docId))));
    } else if (colName === "itens") {
      await db.delete(schema.stockItems).where(and(eq(schema.stockItems.tenantId, tenantId), eq(schema.stockItems.id, Number(docId))));
    } else if (colName === "reservas") {
      await db.transaction(async (tx) => {
        await tx.delete(schema.bookingItems).where(and(eq(schema.bookingItems.tenantId, tenantId), eq(schema.bookingItems.bookingId, Number(docId))));
        await tx.delete(schema.bookings).where(and(eq(schema.bookings.tenantId, tenantId), eq(schema.bookings.id, Number(docId))));
      });
    } else if (colName === "webForms" || colName === "web_forms") {
      await db.delete(schema.webForms).where(and(eq(schema.webForms.tenantId, tenantId), eq(schema.webForms.id, String(docId))));
    } else if (colName === "transacoes" || colName === "financial_transactions") {
      await db.delete(schema.financialTransactions).where(and(eq(schema.financialTransactions.tenantId, tenantId), eq(schema.financialTransactions.id, String(docId))));
    } else if (colName === "manutencoes" || colName === "maintenance_records") {
      await db.delete(schema.maintenanceRecords).where(and(eq(schema.maintenanceRecords.tenantId, tenantId), eq(schema.maintenanceRecords.id, String(docId))));
    } else if (colName === "dispositivos_autorizados") {
      let currentList: any[] = [];
      const rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = 'default' AND config_name = 'dispositivos_autorizados'`);
      if (rows && rows.length > 0) {
        const val = rows[0].data;
        currentList = typeof val === 'string' ? JSON.parse(val) : val;
        if (!Array.isArray(currentList)) currentList = [];
      }
      
      const filtered = currentList.filter((item: any) => String(item.id) !== String(docId));
      
      await db.execute(sql`
        INSERT INTO tenant_configs (tenant_id, config_name, data, updated_at)
        VALUES ('default', 'dispositivos_autorizados', ${JSON.stringify(filtered)}::jsonb)
        ON CONFLICT (tenant_id, config_name)
        DO UPDATE SET data = ${JSON.stringify(filtered)}::jsonb, updated_at = now()
      `);
    } else {
      return res.status(400).json({ error: `Exclusão não suportada para a coleção: ${colName}` });
    }
    return res.json({ success: true });
  } catch (error: any) {
    const isConnErr = handleDbError(`deletar documento em ${colName} #${docId}`, error);
    if (isConnErr) {
      return res.status(503).json({ error: "database_timeout_resilience" });
    }
    return res.status(500).json({ error: error.message || "Erro no servidor" });
  }
});

app.post("/api/db/get-config", async (req, res) => {
  const { configName, tenantId, defaultValue } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId é obrigatório" });
  }
  
  if (checkDbCircuit()) {
    return res.json(defaultValue);
  }
  
  try {
    let rows;
    if (configName === 'empresaConfig' || configName === 'empresa_config') {
      rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name IN ('empresaConfig', 'empresa_config') ORDER BY updated_at DESC`);
    } else {
      rows = await db.execute(sql`SELECT data FROM tenant_configs WHERE tenant_id = ${tenantId} AND config_name = ${configName}`);
    }
    
    if (rows && rows.length > 0) {
      const val = rows[0].data;
      return res.json(typeof val === 'string' ? JSON.parse(val) : val);
    }
    return res.json(defaultValue);
  } catch (error: any) {
    handleDbError(`ler config ${configName}`, error);
    return res.json(defaultValue);
  }
});

app.post("/api/db/save-config", async (req, res) => {
  const { configName, tenantId, data } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId é obrigatório" });
  }
  
  if (checkDbCircuit()) {
    return res.status(503).json({ error: "database_timeout_resilience" });
  }
  
  try {
    const namesToSave = (configName === 'empresaConfig' || configName === 'empresa_config')
      ? ['empresaConfig', 'empresa_config']
      : [configName];

    for (const name of namesToSave) {
      await db.execute(sql`
        INSERT INTO tenant_configs (tenant_id, config_name, data, updated_at)
        VALUES (${tenantId}, ${name}, ${JSON.stringify(data)}::jsonb)
        ON CONFLICT (tenant_id, config_name)
        DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = now()
      `);
    }
    return res.json({ success: true });
  } catch (error: any) {
    const isConnErr = handleDbError(`salvar config ${configName}`, error);
    if (isConnErr) {
      return res.status(503).json({ error: "database_timeout_resilience" });
    }
    return res.status(500).json({ error: error.message || "Erro no servidor" });
  }
});

// Setup Vite Dev server or Serve build assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
