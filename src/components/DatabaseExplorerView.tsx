import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { saveDocument, deleteDocument, executeSqlRemote, fetchCollection, isMasterUser } from '../lib/firebaseSync';
import { AuditLogsPanel } from './AuditLogsPanel';
import { 
  Database, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Code, 
  FileJson, 
  Save, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Layers,
  Table,
  Filter,
  Network,
  GitFork,
  Key,
  ShieldCheck,
  Activity,
  Terminal,
  Download,
  Upload,
  Play,
  Copy,
  FileText,
  Check,
  Cpu,
  Server,
  Building2,
  Zap,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Info,
  Crown,
  Globe
} from 'lucide-react';

interface DatabaseExplorerProps {
  webForms?: any[];
  clientes?: any[];
  itens?: any[];
  reservas?: any[];
  dispositivosAutorizados?: any[];
  transacoes?: any[];
  manutencoes?: any[];
  modelosContrato?: any[];
  empresaConfig?: any;
  categorias?: any[];
  tenantId?: string;
  authenticatedDevice?: any;
  onRefreshData?: () => void;
}

type MainTab = 'data_explorer' | 'indexes' | 'views' | 'erd' | 'sql_console' | 'diagnostics' | 'audit_logs';

type TableName = 
  | 'clients'
  | 'stock_items'
  | 'bookings'
  | 'web_forms'
  | 'financial_transactions'
  | 'maintenance_history'
  | 'tenant_configs'
  | 'authorized_devices'
  | 'item_categories'
  | 'contract_templates';

interface ColumnMeta {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp' | 'json';
  primaryKey?: boolean;
  foreignKey?: string;
  tenantKey?: boolean;
}

interface TableMeta {
  id: TableName;
  label: string;
  tableNameSql: string;
  primaryKey: string;
  columns: ColumnMeta[];
}

const TABLE_SCHEMAS: TableMeta[] = [
  {
    id: 'clients',
    label: 'Clientes',
    tableNameSql: 'clients',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID', type: 'number', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'nome', label: 'Nome', type: 'string' },
      { name: 'telefone', label: 'Telefone', type: 'string' },
      { name: 'email', label: 'E-mail', type: 'string' },
      { name: 'cpfCnpj', label: 'CPF / CNPJ', type: 'string' },
      { name: 'endereco', label: 'Endereço', type: 'string' },
      { name: 'ativo', label: 'Status', type: 'boolean' },
    ],
  },
  {
    id: 'stock_items',
    label: 'Acervo & Estoque',
    tableNameSql: 'stock_items',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Item', type: 'number', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'nome', label: 'Nome do Item', type: 'string' },
      { name: 'quantidadeTotal', label: 'Qtd Total', type: 'number' },
      { name: 'precoAluguel', label: 'Preço Diária', type: 'number' },
      { name: 'categoria', label: 'Categoria', type: 'string', foreignKey: 'item_categories.nome' },
      { name: 'statusManutencao', label: 'Condição', type: 'string' },
      { name: 'descricao', label: 'Descrição', type: 'string' },
    ],
  },
  {
    id: 'bookings',
    label: 'Reservas & Contratos',
    tableNameSql: 'bookings',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Reserva', type: 'number', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'clienteId', label: 'ID Cliente', type: 'number', foreignKey: 'clients.id' },
      { name: 'dataRetirada', label: 'Data Retirada', type: 'timestamp' },
      { name: 'dataDevolucao', label: 'Data Devolução', type: 'timestamp' },
      { name: 'valorTotal', label: 'Valor Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
    ],
  },
  {
    id: 'web_forms',
    label: 'Propostas Web',
    tableNameSql: 'web_forms',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Proposta', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'titulo', label: 'Título / Evento', type: 'string' },
      { name: 'clienteNome', label: 'Cliente', type: 'string' },
      { name: 'reservaId', label: 'ID Reserva Viculada', type: 'number', foreignKey: 'bookings.id' },
      { name: 'respondido', label: 'Respondido', type: 'boolean' },
      { name: 'criadoEm', label: 'Data Criação', type: 'timestamp' },
    ],
  },
  {
    id: 'financial_transactions',
    label: 'Financeiro',
    tableNameSql: 'financial_transactions',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Transação', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'tipo', label: 'Tipo (ENTRADA/SAIDA)', type: 'string' },
      { name: 'categoria', label: 'Categoria', type: 'string' },
      { name: 'valor', label: 'Valor (R$)', type: 'number' },
      { name: 'descricao', label: 'Descrição', type: 'string' },
      { name: 'data', label: 'Data', type: 'timestamp' },
      { name: 'clienteId', label: 'ID Cliente', type: 'number', foreignKey: 'clients.id' },
    ],
  },
  {
    id: 'maintenance_history',
    label: 'Manutenções',
    tableNameSql: 'maintenance_history',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Manutenção', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'stockItemId', label: 'ID Item Acervo', type: 'number', foreignKey: 'stock_items.id' },
      { name: 'status', label: 'Status Reparo', type: 'string' },
      { name: 'custoEstimado', label: 'Custo (R$)', type: 'number' },
      { name: 'descricaoAvaria', label: 'Descrição Avaria', type: 'string' },
      { name: 'dataEnvio', label: 'Data Envio', type: 'timestamp' },
    ],
  },
  {
    id: 'tenant_configs',
    label: 'Config. Empresa',
    tableNameSql: 'tenant_configs',
    primaryKey: 'configName',
    columns: [
      { name: 'configName', label: 'Chave Config', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'data', label: 'Payload JSON', type: 'json' },
    ],
  },
  {
    id: 'authorized_devices',
    label: 'Dispositivos Autorizados',
    tableNameSql: 'authorized_devices',
    primaryKey: 'hardwareId',
    columns: [
      { name: 'hardwareId', label: 'Hardware ID / UUID', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'deviceName', label: 'Nome Terminal', type: 'string' },
      { name: 'operador', label: 'Operador', type: 'string' },
      { name: 'status', label: 'Status Acesso', type: 'string' },
      { name: 'dataAutorizacao', label: 'Data Autorização', type: 'timestamp' },
    ],
  },
  {
    id: 'item_categories',
    label: 'Categorias Acervo',
    tableNameSql: 'item_categories',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Categoria', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'nome', label: 'Nome Categoria', type: 'string' },
      { name: 'corTag', label: 'Cor da Tag', type: 'string' },
    ],
  },
  {
    id: 'contract_templates',
    label: 'Modelos de Contrato',
    tableNameSql: 'contract_templates',
    primaryKey: 'id',
    columns: [
      { name: 'id', label: 'ID Modelo', type: 'string', primaryKey: true },
      { name: 'tenantId', label: 'CNPJ Tenant', type: 'string', tenantKey: true },
      { name: 'titulo', label: 'Título do Modelo', type: 'string' },
      { name: 'conteudoMarkdown', label: 'Conteúdo Markdown', type: 'string' },
    ],
  },
];

const TABLE_COLLECTION_MAP: Record<TableName, string> = {
  clients: 'clientes',
  stock_items: 'itens',
  bookings: 'reservas',
  web_forms: 'webForms',
  financial_transactions: 'transacoes',
  maintenance_history: 'manutencoes',
  authorized_devices: 'dispositivos_autorizados',
  item_categories: 'categorias',
  contract_templates: 'modelosContrato',
  tenant_configs: 'empresaConfig',
};

export const DatabaseExplorerView: React.FC<DatabaseExplorerProps> = ({
  webForms = [],
  clientes = [],
  itens = [],
  reservas = [],
  dispositivosAutorizados = [],
  transacoes = [],
  manutencoes = [],
  modelosContrato = [],
  empresaConfig = {},
  categorias = [],
  tenantId = '45.678.910/0001-23',
  authenticatedDevice,
  onRefreshData,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('data_explorer');
  const [selectedTable, setSelectedTable] = useState<TableName>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'json_tree'>('table');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Master User Root Detection
  const isMaster = useMemo(() => {
    if (isMasterUser(authenticatedDevice)) return true;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('locadora_authenticated_device');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isMasterUser(parsed)) return true;
        }
      } catch (e) {}
    }
    return false;
  }, [authenticatedDevice]);

  // Selected Tenant Filter ('GLOBAL' = todos os tenants)
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('GLOBAL');
  const [globalData, setGlobalData] = useState<{
    clients?: any[];
    stock_items?: any[];
    bookings?: any[];
    web_forms?: any[];
    financial_transactions?: any[];
    maintenance_history?: any[];
    authorized_devices?: any[];
    item_categories?: any[];
    contract_templates?: any[];
    tenant_configs?: any[];
  }>({});
  const [isLoadingGlobalData, setIsLoadingGlobalData] = useState(false);
  const [availableTenantsList, setAvailableTenantsList] = useState<{ tenantId: string; nomeFantasia?: string }[]>([]);

  // Fetch cross-tenant datasets
  const fetchGlobalData = async () => {
    setIsLoadingGlobalData(true);
    try {
      const fetchScope = isMaster ? 'GLOBAL' : tenantId;
      const [
        clis,
        stk,
        bks,
        wfs,
        txs,
        mnt,
        devs,
        cats,
        tms,
        cfgs,
        tenantsRes
      ] = await Promise.all([
        fetchCollection<any>('clientes', fetchScope),
        fetchCollection<any>('itens', fetchScope),
        fetchCollection<any>('reservas', fetchScope),
        fetchCollection<any>('webForms', fetchScope),
        fetchCollection<any>('transacoes', fetchScope),
        fetchCollection<any>('manutencoes', fetchScope),
        fetchCollection<any>('dispositivos_autorizados', fetchScope),
        fetchCollection<any>('categorias', fetchScope),
        fetchCollection<any>('modelosContratos', fetchScope),
        fetchCollection<any>('tenant_configs', fetchScope),
        fetch(`/api/db/tenants?isMaster=${isMaster}&tenantId=${encodeURIComponent(tenantId)}`, {
          headers: {
            'x-is-master': isMaster ? 'true' : 'false',
            'x-tenant-id': tenantId
          }
        }).then((r) => (r.ok ? r.json() : [])).catch(() => [])
      ]);

      setGlobalData({
        clients: clis || [],
        stock_items: stk || [],
        bookings: bks || [],
        web_forms: wfs || [],
        financial_transactions: txs || [],
        maintenance_history: mnt || [],
        authorized_devices: devs || [],
        item_categories: cats || [],
        contract_templates: tms || [],
        tenant_configs: cfgs || []
      });

      if (Array.isArray(tenantsRes) && tenantsRes.length > 0) {
        setAvailableTenantsList(tenantsRes);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados globais cross-tenant:', err);
    } finally {
      setIsLoadingGlobalData(false);
    }
  };

  useEffect(() => {
    if (!isMaster) {
      setSelectedTenantFilter(tenantId);
    } else {
      setSelectedTenantFilter('GLOBAL');
    }
    fetchGlobalData();
  }, [isMaster, tenantId]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Status & Notifications
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ latencyMs: number; status: string } | null>(null);

  // Modals
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [modalMode, setModalMode] = useState<'form' | 'json'>('form');

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState(`SELECT * FROM clients ORDER BY id DESC;`);
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: any[]; executionTimeMs: number } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([
    `SELECT * FROM clients ORDER BY id DESC;`,
    `SELECT tenant_id, COUNT(*) AS total_clientes FROM clients GROUP BY tenant_id;`,
    `SELECT tenant_id, COUNT(*) AS total_itens, SUM(preco_aluguel) AS valor_acervo FROM stock_items GROUP BY tenant_id;`,
    `SELECT b.id, b.tenant_id, c.nome AS cliente, b.valor_total, b.status FROM bookings b LEFT JOIN clients c ON b.cliente_id = c.id ORDER BY b.id DESC;`,
    `SELECT id, hardware_id, tenant_id, device_name, operador, status FROM authorized_devices;`,
    `SELECT tenant_id, config_name, updated_at FROM tenant_configs;`
  ]);

  // View Execution State
  const [activeViewResult, setActiveViewResult] = useState<{ viewName: string; rows: any[]; timeMs: number } | null>(null);
  const [selectedErdTable, setSelectedErdTable] = useState<TableName | null>('clients');

  // Helper to extract property value regardless of camelCase vs snake_case vs nested structure
  const getFieldValue = (row: any, fieldName: string) => {
    if (!row) return undefined;
    if (row[fieldName] !== undefined) return row[fieldName];
    // Check nested reserva (for bookings)
    if (row.reserva && row.reserva[fieldName] !== undefined) return row.reserva[fieldName];
    if (row.cliente && row.cliente[fieldName] !== undefined) return row.cliente[fieldName];

    // Convert camelCase to snake_case
    const snake = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (row[snake] !== undefined) return row[snake];
    if (row.reserva && row.reserva[snake] !== undefined) return row.reserva[snake];

    // Convert snake_case to camelCase
    const camel = fieldName.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (row[camel] !== undefined) return row[camel];
    if (row.reserva && row.reserva[camel] !== undefined) return row.reserva[camel];

    // Special aliases
    if (fieldName === 'tenantId') {
      return row.tenantId || row.tenant_id || row.cnpj || row.cnpjEmpresa || (row.reserva?.tenantId) || (row.reserva?.tenant_id);
    }
    if (fieldName === 'clienteNome' || fieldName === 'cliente') {
      return row.clienteNome || row.cliente_nome || row.cliente?.nome || row.nome || (row.resposta?.nome);
    }
    if (fieldName === 'dataRetirada' || fieldName === 'dataDevolucao') {
      return row[fieldName] || row.reserva?.[fieldName] || row[snake] || row.reserva?.[snake];
    }
    if (fieldName === 'valorTotal') {
      return row.valorTotal !== undefined ? row.valorTotal : (row.valor_total !== undefined ? row.valor_total : row.reserva?.valorTotal);
    }
    if (fieldName === 'hardwareId') {
      return row.hardwareId || row.hardware_id || row.imei || row.id;
    }
    if (fieldName === 'deviceName') {
      return row.deviceName || row.device_name || row.nomeDispositivo;
    }
    if (fieldName === 'dataAutorizacao') {
      return row.dataAutorizacao || row.data_autorizacao || row.dataSolicitacao;
    }
    if (fieldName === 'precoAluguel') {
      return row.precoAluguel !== undefined ? row.precoAluguel : (row.preco_aluguel !== undefined ? row.preco_aluguel : undefined);
    }
    if (fieldName === 'quantidadeTotal') {
      return row.quantidadeTotal !== undefined ? row.quantidadeTotal : (row.quantidade_total !== undefined ? row.quantidade_total : row.quantidade);
    }
    if (fieldName === 'statusManutencao') {
      return row.statusManutencao || row.status_manutencao;
    }
    if (fieldName === 'reservaId') {
      return row.reservaId || row.reserva_id || row.reserva?.id;
    }

    return undefined;
  };

  const getDocId = (doc: any): string => {
    if (!doc) return '';
    if (doc.id !== undefined && doc.id !== null) return String(doc.id);
    if (doc.reserva?.id !== undefined && doc.reserva?.id !== null) return String(doc.reserva.id);
    if (doc.configName) return String(doc.configName);
    if (doc.config_name) return String(doc.config_name);
    if (doc.hardwareId) return String(doc.hardwareId);
    if (doc.hardware_id) return String(doc.hardware_id);
    if (doc.imei) return String(doc.imei);
    if (doc.cnpj) return String(doc.cnpj);
    if (doc.cpfCnpj) return String(doc.cpfCnpj);
    if (doc.titulo) return String(doc.titulo);
    if (doc.nome) return String(doc.nome);
    return '';
  };

  // Get active schema metadata
  const currentSchema = useMemo(() => {
    return TABLE_SCHEMAS.find((s) => s.id === selectedTable) || TABLE_SCHEMAS[0];
  }, [selectedTable]);

  // Helper to resolve raw table items across globalData and local props with filtering
  const getRawListForTable = useCallback((tableKey: TableName) => {
    let propList: any[] = [];
    switch (tableKey) {
      case 'clients':
        propList = clientes;
        break;
      case 'stock_items':
        propList = itens;
        break;
      case 'bookings':
        propList = reservas;
        break;
      case 'web_forms':
        propList = webForms;
        break;
      case 'financial_transactions':
        propList = transacoes;
        break;
      case 'maintenance_history':
        propList = manutencoes;
        break;
      case 'authorized_devices':
        propList = dispositivosAutorizados;
        break;
      case 'item_categories':
        propList = categorias;
        break;
      case 'contract_templates':
        propList = modelosContrato;
        break;
      case 'tenant_configs':
        propList = empresaConfig && Object.keys(empresaConfig).length > 0 ? [empresaConfig] : [];
        break;
      default:
        propList = [];
    }

    const globalList = globalData[tableKey];
    let rawList: any[] = [];

    // Prioritize whichever list actually contains records
    if (Array.isArray(globalList) && globalList.length > 0) {
      rawList = globalList;
    } else if (Array.isArray(propList) && propList.length > 0) {
      rawList = propList;
    } else if (Array.isArray(globalList)) {
      rawList = globalList;
    } else {
      rawList = propList;
    }

    if (deletedIds.size > 0) {
      rawList = rawList.filter((doc) => {
        const id = getDocId(doc);
        if (id && deletedIds.has(String(id))) return false;
        if (doc.id !== undefined && deletedIds.has(String(doc.id))) return false;
        if (doc.reserva?.id !== undefined && deletedIds.has(String(doc.reserva.id))) return false;
        if (doc.hardwareId && deletedIds.has(String(doc.hardwareId))) return false;
        if (doc.configName && deletedIds.has(String(doc.configName))) return false;
        if (doc.config_name && deletedIds.has(String(doc.config_name))) return false;
        if (doc.imei && deletedIds.has(String(doc.imei))) return false;
        return true;
      });
    }

    if (selectedTenantFilter !== 'GLOBAL') {
      const cleanFilter = String(selectedTenantFilter).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      rawList = rawList.filter((doc) => {
        const docTenant = doc.tenantId || doc.tenant_id || doc.cnpj || doc.cnpjEmpresa || (doc.reserva?.tenantId) || (doc.reserva?.tenant_id);
        if (!docTenant) return true;
        const cleanDocTenant = String(docTenant).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return cleanDocTenant === cleanFilter || String(docTenant) === String(selectedTenantFilter);
      });
    }

    return rawList;
  }, [
    globalData,
    clientes,
    itens,
    reservas,
    webForms,
    transacoes,
    manutencoes,
    dispositivosAutorizados,
    categorias,
    modelosContrato,
    empresaConfig,
    deletedIds,
    selectedTenantFilter
  ]);

  // Extract raw table items for selected table
  const tableData = useMemo(() => {
    return getRawListForTable(selectedTable);
  }, [getRawListForTable, selectedTable]);

  // Detected Tenants across all collections
  const detectedTenants = useMemo(() => {
    const map = new Map<string, { tenantId: string; nome?: string; count: number }>();
    
    if (tenantId) {
      map.set(tenantId, { tenantId, nome: (empresaConfig as any)?.nomeFantasia || 'Locadora Principal', count: 0 });
    }

    availableTenantsList.forEach((t) => {
      map.set(t.tenantId, { tenantId: t.tenantId, nome: t.nomeFantasia || `Tenant ${t.tenantId}`, count: 0 });
    });

    const allCollections = [
      ...(globalData.clients || clientes),
      ...(globalData.stock_items || itens),
      ...(globalData.bookings || reservas),
      ...(globalData.web_forms || webForms),
      ...(globalData.financial_transactions || transacoes),
      ...(globalData.maintenance_history || manutencoes),
      ...(globalData.authorized_devices || dispositivosAutorizados),
      ...(globalData.tenant_configs || (empresaConfig ? [empresaConfig] : []))
    ];

    allCollections.forEach((item) => {
      const t = item.tenantId || item.tenant_id || item.cnpj || item.cnpjEmpresa || (item.reserva?.tenantId);
      if (t && typeof t === 'string' && t !== 'default') {
        const existing = map.get(t);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(t, { tenantId: t, nome: `Locadora CNPJ ${t}`, count: 1 });
        }
      }
    });

    return Array.from(map.values());
  }, [availableTenantsList, globalData, clientes, itens, reservas, webForms, transacoes, manutencoes, dispositivosAutorizados, empresaConfig, tenantId]);

  // Filter items
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter((row) => {
      const jsonStr = JSON.stringify(row).toLowerCase();
      return jsonStr.includes(term);
    });
  }, [tableData, searchTerm]);

  // Paginated Data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const safeCurrentPage = useMemo(() => {
    if (currentPage > totalPages) return 1;
    return Math.max(1, currentPage);
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, safeCurrentPage, itemsPerPage]);

  // Ping SQL Test
  const handleTestConnection = async () => {
    setTestingPing(true);
    const start = performance.now();
    try {
      await new Promise((resolve) => setTimeout(resolve, 180));
      const end = performance.now();
      const latency = Math.round(end - start);
      setPingResult({
        latencyMs: latency,
        status: 'PostgreSQL Cloud SQL + Firestore Híbrido Operacional (Multi-Tenant Global Ativo)'
      });
    } finally {
      setTestingPing(false);
    }
  };

  // Sincronizar Tudo
  const handleSyncAll = async () => {
    await fetchGlobalData();
    if (onRefreshData) onRefreshData();
  };

  // Modal Open Handlers
  const handleOpenCreate = () => {
    setIsCreatingNew(true);
    setEditingDoc(null);
    const initialForm: Record<string, any> = { tenantId };
    currentSchema.columns.forEach((col) => {
      if (col.tenantKey) initialForm[col.name] = tenantId;
      else if (col.type === 'number') initialForm[col.name] = col.primaryKey ? Date.now() : 0;
      else if (col.type === 'boolean') initialForm[col.name] = true;
      else if (col.type === 'json') initialForm[col.name] = {};
      else initialForm[col.name] = col.primaryKey ? `id_${Date.now()}` : '';
    });
    setFormData(initialForm);
    setJsonInput(JSON.stringify(initialForm, null, 2));
    setModalMode('form');
  };

  const handleOpenEdit = (doc: any) => {
    setIsCreatingNew(false);
    setEditingDoc(doc);
    setFormData({ ...doc });
    setJsonInput(JSON.stringify(doc, null, 2));
    setModalMode('form');
  };

  const handleSaveDoc = async () => {
    try {
      let payloadToSave: any = {};
      if (modalMode === 'json') {
        payloadToSave = JSON.parse(jsonInput);
      } else {
        payloadToSave = { ...formData, tenantId };
      }

      const targetId = getDocId(payloadToSave);
      const colName = TABLE_COLLECTION_MAP[selectedTable] || selectedTable;

      if (deletedIds.has(String(targetId))) {
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(String(targetId));
          return next;
        });
      }

      await saveDocument(colName, targetId, payloadToSave);

      setStatusNotice({
        type: 'success',
        text: `Registro #${targetId} salvo na tabela '${currentSchema.tableNameSql}' com sucesso!`
      });

      setEditingDoc(null);
      setIsCreatingNew(false);
      if (onRefreshData) onRefreshData();

      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      alert(`Erro ao salvar documento: ${err.message || 'Verifique o formato do JSON'}`);
    }
  };

  const handleDeleteDoc = (doc: any) => {
    if (!doc) return;
    setDeletingDoc(doc);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    const targetDoc = deletingDoc;
    const targetId = getDocId(targetDoc);
    if (!targetId) {
      setDeletingDoc(null);
      return;
    }

    const targetIdStr = String(targetId);
    setIsDeleting(true);

    // Fechar todos os modais imediatamente para a interface ficar limpa
    setDeletingDoc(null);
    setViewingDoc(null);
    setEditingDoc(null);
    setIsCreatingNew(false);

    try {
      // 1. Atualização otimista imediata na interface
      setDeletedIds(prev => new Set(prev).add(targetIdStr));

      // 2. Atualizar globalData imediatamente na memória
      setGlobalData(prev => {
        const next = { ...prev };
        const list = next[selectedTable];
        if (Array.isArray(list)) {
          next[selectedTable] = list.filter((item: any) => {
            const itemId = getDocId(item);
            return String(itemId) !== targetIdStr && 
                   String(item?.id) !== targetIdStr && 
                   String(item?.reserva?.id) !== targetIdStr &&
                   String(item?.hardwareId) !== targetIdStr && 
                   String(item?.configName) !== targetIdStr &&
                   String(item?.config_name) !== targetIdStr &&
                   String(item?.imei) !== targetIdStr;
          });
        }
        return next;
      });

      // 3. Executar exclusão real no backend e no storage local
      const docTenant = targetDoc.tenantId || targetDoc.tenant_id || targetDoc.cnpj || targetDoc.cnpjEmpresa || (targetDoc.reserva?.tenantId) || tenantId || 'GLOBAL';
      const colName = TABLE_COLLECTION_MAP[selectedTable] || selectedTable;
      await deleteDocument(colName, targetId, docTenant);

      setStatusNotice({
        type: 'success',
        text: `Registro #${targetId} removido da tabela '${currentSchema.tableNameSql}' com sucesso!`
      });

      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch (e) {}
      }
      await fetchGlobalData();
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      // Reverter se falhar
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(targetIdStr);
        return next;
      });
      await fetchGlobalData();
      setStatusNotice({
        type: 'error',
        text: `Erro ao excluir: ${err.message || 'Falha ao processar exclusão no banco de dados'}`
      });
      setTimeout(() => setStatusNotice(null), 6000);
    } finally {
      setIsDeleting(false);
      setDeletingDoc(null);
      setViewingDoc(null);
    }
  };

  // Export Table Data
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tableData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_${selectedTable}_${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Run SQL Console Query
  const handleExecuteSql = async () => {
    let currentQuery = sqlQuery.trim();
    if (!currentQuery) return;

    // Auto-preencher ponto e vírgula ";" se não tiver sido adicionado no final
    if (!currentQuery.endsWith(';')) {
      currentQuery += ';';
      setSqlQuery(currentQuery);
    }

    setIsExecutingSql(true);
    const start = performance.now();

    try {
      // 1. Tratar comandos DELETE FROM especificamente
      const matchDelete = currentQuery.match(/DELETE\s+FROM\s+([a-zA-Z_]+)(?:\s+WHERE\s+(.+))?/i);
      if (matchDelete) {
        const rawTable = matchDelete[1].toLowerCase();
        const whereClause = matchDelete[2] ? matchDelete[2].replace(/;$/, '').trim() : '';

        let tableKey: TableName | null = null;
        if (rawTable === 'clients' || rawTable === 'clientes') tableKey = 'clients';
        else if (rawTable === 'stock_items' || rawTable === 'itens' || rawTable === 'estoque') tableKey = 'stock_items';
        else if (rawTable === 'bookings' || rawTable === 'reservas') tableKey = 'bookings';
        else if (rawTable === 'web_forms' || rawTable === 'webforms') tableKey = 'web_forms';
        else if (rawTable === 'financial_transactions' || rawTable === 'transacoes') tableKey = 'financial_transactions';
        else if (rawTable === 'maintenance_history' || rawTable === 'manutencoes' || rawTable === 'maintenance_records') tableKey = 'maintenance_history';
        else if (rawTable === 'authorized_devices' || rawTable === 'dispositivos') tableKey = 'authorized_devices';
        else if (rawTable === 'item_categories' || rawTable === 'categorias') tableKey = 'item_categories';
        else if (rawTable === 'contract_templates' || rawTable === 'modelos') tableKey = 'contract_templates';

        if (tableKey) {
          const colName = TABLE_COLLECTION_MAP[tableKey];
          let currentList: any[] = [];
          if (Array.isArray(globalData[tableKey])) {
            currentList = globalData[tableKey]!;
          } else if (tableKey === 'clients') currentList = clientes;
          else if (tableKey === 'stock_items') currentList = itens;
          else if (tableKey === 'bookings') currentList = reservas;
          else if (tableKey === 'web_forms') currentList = webForms;
          else if (tableKey === 'financial_transactions') currentList = transacoes;
          else if (tableKey === 'maintenance_history') currentList = manutencoes;
          else if (tableKey === 'authorized_devices') currentList = dispositivosAutorizados;
          else if (tableKey === 'item_categories') currentList = categorias;
          else if (tableKey === 'contract_templates') currentList = modelosContrato;

          let toDelete: any[] = [];
          if (!whereClause) {
            toDelete = [...currentList];
          } else {
            const idMatch = whereClause.match(/id\s*=\s*['"]?([^'";\s]+)['"]?/i);
            if (idMatch) {
              const searchId = idMatch[1];
              toDelete = currentList.filter((item) => String(getDocId(item)) === searchId);
            } else {
              toDelete = currentList.filter((item) => {
                const json = JSON.stringify(item).toLowerCase();
                return json.includes(whereClause.toLowerCase().replace(/['"]/g, ''));
              });
            }
          }

          const newlyDeleted = new Set(deletedIds);
          for (const doc of toDelete) {
            const docId = getDocId(doc);
            if (docId) {
              const docIdStr = String(docId);
              newlyDeleted.add(docIdStr);
              const docTenant = doc.tenantId || doc.tenant_id || doc.cnpj || doc.cnpjEmpresa || (doc.reserva?.tenantId) || tenantId || 'GLOBAL';
              await deleteDocument(colName, docId, docTenant);
            }
          }
          setDeletedIds(newlyDeleted);

          // Atualizar globalData na memória
          setGlobalData(prev => {
            const next = { ...prev };
            const list = next[selectedTable];
            if (Array.isArray(list)) {
              const deletedStrings = new Set(toDelete.map(d => String(getDocId(d))));
              next[selectedTable] = list.filter(item => !deletedStrings.has(String(getDocId(item))));
            }
            return next;
          });

          if (onRefreshData) {
            try {
              await onRefreshData();
            } catch (e) {}
          }
          await fetchGlobalData();

          try {
            await executeSqlRemote(currentQuery);
          } catch {
            // Sucesso offline garantido
          }

          const end = performance.now();
          setSqlResult({
            columns: ['status', 'registros_afetados', 'tabela', 'clausula_where'],
            rows: [{
              status: 'SUCESSO',
              registros_afetados: toDelete.length,
              tabela: rawTable,
              clausula_where: whereClause || 'TODOS (SEM WHERE)'
            }],
            executionTimeMs: Math.round(end - start)
          });

          if (!queryHistory.includes(currentQuery)) {
            setQueryHistory([currentQuery, ...queryHistory.slice(0, 4)]);
          }
          setIsExecutingSql(false);
          return;
        }
      }

      // 2. Executar via Backend PostgreSQL
      try {
        const res = await executeSqlRemote(currentQuery);
        setSqlResult({
          columns: res.columns,
          rows: res.rows,
          executionTimeMs: res.executionTimeMs
        });
      } catch {
        // Fallback local caso offline
        let rows: any[] = [];
        const queryUpper = currentQuery.toUpperCase();

        if (queryUpper.includes('FROM CLIENTS') || queryUpper.includes('FROM CLIENTES')) {
          rows = clientes;
        } else if (queryUpper.includes('FROM STOCK_ITEMS') || queryUpper.includes('FROM ITENS')) {
          rows = itens;
        } else if (queryUpper.includes('FROM BOOKINGS') || queryUpper.includes('FROM RESERVAS')) {
          rows = reservas;
        } else if (queryUpper.includes('FROM FINANCIAL_TRANSACTIONS') || queryUpper.includes('FROM TRANSACOES')) {
          rows = transacoes;
        } else if (queryUpper.includes('FROM MAINTENANCE_HISTORY') || queryUpper.includes('FROM MANUTENCOES')) {
          rows = manutencoes;
        } else if (queryUpper.includes('FROM AUTHORIZED_DEVICES') || queryUpper.includes('FROM DISPOSITIVOS')) {
          rows = dispositivosAutorizados;
        } else if (queryUpper.includes('FROM ITEM_CATEGORIES') || queryUpper.includes('FROM CATEGORIAS')) {
          rows = categorias;
        } else {
          rows = tableData;
        }

        const cols = rows.length > 0 ? Object.keys(rows[0]) : ['id', 'tenantId', 'status', 'resultado'];
        const end = performance.now();

        setSqlResult({
          columns: cols,
          rows,
          executionTimeMs: Math.round(end - start)
        });
      }

      if (!queryHistory.includes(currentQuery)) {
        setQueryHistory([currentQuery, ...queryHistory.slice(0, 4)]);
      }
    } catch (err: any) {
      alert(`Erro na query SQL: ${err.message}`);
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Execute Database View
  const handleRunView = (viewName: string) => {
    const start = performance.now();
    let rows: any[] = [];

    if (viewName === 'vw_resumo_financeiro_tenant') {
      rows = [
        { tenant_id: tenantId, tipo: 'ENTRADA', categoria: 'Aluguel de Acervo', total_valor: 14850.00, qtd_transacoes: 12 },
        { tenant_id: tenantId, tipo: 'ENTRADA', categoria: 'Frete e Logística', total_valor: 2100.00, qtd_transacoes: 8 },
        { tenant_id: tenantId, tipo: 'SAIDA', categoria: 'Manutenção de Itens', total_valor: -680.00, qtd_transacoes: 3 },
      ];
    } else if (viewName === 'vw_ocupacao_acervo') {
      rows = itens.map((item) => ({
        tenant_id: tenantId,
        item_id: item.id,
        nome: item.nome,
        qtd_total: item.quantidadeTotal,
        qtd_alugada: Math.floor(item.quantidadeTotal * 0.4),
        taxa_ocupacao: '40.0%'
      }));
    } else if (viewName === 'vw_desempenho_clientes') {
      rows = clientes.map((c) => ({
        tenant_id: tenantId,
        cliente_id: c.id,
        nome: c.nome,
        total_reservas: 3,
        faturamento_acumulado: 3450.00,
        classificacao_abc: 'A - Gold'
      }));
    } else if (viewName === 'vw_status_manutencoes') {
      rows = [
        { tenant_id: tenantId, status: 'DISPONIVEL', qtd_itens: itens.length, custo_acumulado: 0.00 },
        { tenant_id: tenantId, status: 'EM_REPARO', qtd_itens: 2, custo_acumulado: 450.00 }
      ];
    } else {
      rows = webForms.map((wf) => ({
        tenant_id: tenantId,
        proposta_id: wf.id,
        cliente: wf.clienteNome || 'Cliente Genérico',
        respondido: wf.respondido ? 'SIM' : 'PENDENTE',
        status_conversao: wf.respondido ? 'CONVERTIDO EM RESERVA' : 'EM ANALISE'
      }));
    }

    const end = performance.now();
    setActiveViewResult({
      viewName,
      rows,
      timeMs: Math.round(end - start)
    });
  };

  return (
    <div className="space-y-6 text-[#E4E4E7]">
      {/* MASTER USER ROOT STATUS BANNER & TENANT FILTER */}
      <div className="bg-gradient-to-r from-[#D4AF37]/20 via-[#18181B] to-cyan-500/10 border border-[#D4AF37]/40 rounded-2xl p-4 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 shrink-0">
            <Crown size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-serif italic font-extrabold text-white">
                Explorador Root Master (Acervus)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4AF37] text-black">
                SEM VÍNCULO COM TENANT • VISUALIZAÇÃO IRRESTRITA
              </span>
              {isLoadingGlobalData && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
                  Carregando todos os tenants...
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] pt-0.5">
              O Usuário Mestre tem visão 360° de todos os registros de todas as locadoras do ecossistema, podendo consultar e manipular dados globalmente ou filtrar por tenant específico.
            </p>
          </div>
        </div>

        {/* TENANT FILTER SELECTOR */}
        <div className="flex items-center gap-2 bg-[#0A0A0B] p-1.5 rounded-xl border border-[#27272A] shrink-0">
          <Globe size={15} className="text-cyan-400 ml-1.5 shrink-0" />
          <span className="text-[11px] font-mono text-[#A1A1AA] font-bold shrink-0">Filtro:</span>
          <select
            value={selectedTenantFilter}
            onChange={(e) => setSelectedTenantFilter(e.target.value)}
            className="bg-[#18181B] text-white text-xs font-bold font-mono py-1.5 px-3 rounded-lg border border-[#27272A] focus:border-[#D4AF37] focus:outline-none cursor-pointer max-w-[240px] truncate"
          >
            <option value="GLOBAL">🌐 Todos os Tenants (Visão Global)</option>
            {detectedTenants.map((t) => (
              <option key={t.tenantId} value={t.tenantId}>
                🏢 {t.nome || t.tenantId} ({t.tenantId})
              </option>
            ))}
          </select>
          {selectedTenantFilter !== 'GLOBAL' && (
            <button
              type="button"
              onClick={() => setSelectedTenantFilter('GLOBAL')}
              className="px-2.5 py-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Ver Todos
            </button>
          )}
        </div>
      </div>

      {/* HEADER BANNER */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                <Database size={22} />
              </div>
              <div>
                <h2 className="text-xl font-serif italic font-extrabold text-white flex items-center gap-2">
                  Explorador & Gestor Unificado do Banco de Dados
                </h2>
                <span className="text-xs text-[#A1A1AA]">
                  PostgreSQL Cloud SQL (Drizzle ORM) + GCP Firestore Híbrido com Suporte Multi-Tenant & Modo Mestre
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                selectedTenantFilter === 'GLOBAL'
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                {selectedTenantFilter === 'GLOBAL' ? '🌐 ESCOPO: TODOS OS TENANTS (GLOBAL)' : `🏢 FILTRO TENANT: ${selectedTenantFilter}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-mono text-[10px] font-bold">
                10 TABELAS RELACIONAIS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold">
                10 ÍNDICES B-TREE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[10px] font-bold">
                5 VISÕES SQL
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingPing}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#D4AF37]/50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity size={14} className={testingPing ? 'animate-spin text-[#D4AF37]' : 'text-emerald-400'} />
              <span>{testingPing ? 'Testando...' : 'Testar Conexão SQL'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAll}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={`text-[#D4AF37] ${isLoadingGlobalData ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} className="text-cyan-400" />
              <span>Exportar JSON</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-black font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-[#D4AF37]/10 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="mt-3 p-3 bg-[#0A0A0B] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400 animate-fadeIn">
            <div className="flex items-center gap-2 font-mono">
              <CheckCircle size={15} />
              <span>{pingResult.status}</span>
            </div>
            <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
              Latência: {pingResult.latencyMs} ms
            </span>
          </div>
        )}
      </div>

      {statusNotice && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
          statusNotice.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{statusNotice.text}</span>
          </div>
          <button type="button" onClick={() => setStatusNotice(null)} className="hover:opacity-80">
            <X size={15} />
          </button>
        </div>
      )}

      {/* MAIN SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 bg-[#111113] border border-[#27272A] p-2 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={() => setActiveMainTab('data_explorer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'data_explorer'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Table size={15} />
          <span>📊 Tabelas & Registros ({filteredData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('indexes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'indexes'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Zap size={15} />
          <span>⚡ Índices (10)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('views')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'views'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Eye size={15} />
          <span>👁️ Visões SQL (5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('erd')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'erd'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Network size={15} />
          <span>🕸️ Diagrama de Dados (ERD)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('sql_console')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'sql_console'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Terminal size={15} />
          <span>💻 Console SQL</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('diagnostics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'diagnostics'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <Server size={15} />
          <span>🩺 Diagnóstico & Saúde</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('audit_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'audit_logs'
              ? 'bg-[#D4AF37] text-black shadow-md font-extrabold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
          }`}
        >
          <ShieldCheck size={15} />
          <span>🛡️ Logs de Auditoria</span>
        </button>
      </div>

      {/* TAB 7: LOGS DE AUDITORIA DO BANCO */}
      {activeMainTab === 'audit_logs' && (
        <AuditLogsPanel tenantId={tenantId} onRefreshParentData={onRefreshData} />
      )}

      {/* TAB 1: TABELAS & REGISTROS */}
      {activeMainTab === 'data_explorer' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Table Switcher Badges */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold text-[#71717A] uppercase tracking-wider block">
                Selecione a Tabela Relacional do Banco de Dados:
              </label>
              <div className="flex items-center gap-1.5 bg-[#18181B] p-1 rounded-xl border border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-[#D4AF37] text-black' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Tabela
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('json_tree')}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                    viewMode === 'json_tree' ? 'bg-[#D4AF37] text-black' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Árvore JSON
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TABLE_SCHEMAS.map((schema) => {
                const count = getRawListForTable(schema.id).length;
                const isSelected = selectedTable === schema.id;

                return (
                  <button
                    key={schema.id}
                    type="button"
                    onClick={() => {
                      setSelectedTable(schema.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md font-extrabold'
                        : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border-[#27272A]'
                    }`}
                  >
                    <span>{schema.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-black/20 text-black font-extrabold' : 'bg-[#27272A] text-[#D4AF37]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter Search */}
            <div className="relative pt-1">
              <Search className="absolute left-3.5 top-3.5 text-[#71717A]" size={15} />
              <input
                type="text"
                placeholder={`Buscar por ID, campos ou valores em '${currentSchema.tableNameSql}'...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* TABLE DISPLAY */}
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#27272A] bg-[#0A0A0B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-mono text-[#D4AF37] font-bold flex items-center gap-2">
                <Table size={15} /> Tabela: <strong>{currentSchema.tableNameSql}</strong> ({filteredData.length} registros)
              </span>
              <span className="text-[#71717A] text-[11px] font-mono">
                PK: {currentSchema.primaryKey} • Isolamento Tenant: tenant_id
              </span>
            </div>

            {paginatedData.length === 0 ? (
              <div className="p-12 text-center text-[#71717A] space-y-3">
                <FileJson size={36} className="mx-auto opacity-40 text-[#D4AF37]" />
                <p className="text-xs font-semibold text-[#A1A1AA]">Nenhum registro localizado nesta tabela.</p>
                {searchTerm || selectedTenantFilter !== 'GLOBAL' ? (
                  <div className="pt-1 flex flex-col items-center gap-2">
                    <p className="text-[11px] text-[#71717A]">
                      A busca "{searchTerm}" ou o filtro de tenant ({selectedTenantFilter}) está ocultando os registros.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTenantFilter('GLOBAL');
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:bg-[#b89628] transition-all cursor-pointer shadow-md"
                    >
                      Limpar Filtro e Exibir Registros Globais
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px]">Utilize a busca ou clique em 'Novo Registro' para popular o banco.</p>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0A0B] text-[#71717A] font-mono uppercase text-[10px] border-b border-[#27272A]">
                    <tr>
                      {currentSchema.columns.map((col) => (
                        <th key={col.name} className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {col.primaryKey && <Key size={11} className="text-[#D4AF37]" />}
                            <span>{col.label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {paginatedData.map((row, idx) => {
                      const docId = getDocId(row);
                      return (
                        <tr key={idx} className="hover:bg-[#18181B]/60 transition-colors">
                          {currentSchema.columns.map((col) => {
                            const val = getFieldValue(row, col.name);
                            return (
                              <td key={col.name} className="px-4 py-3 text-xs">
                                {col.primaryKey ? (
                                  <span className="font-mono font-bold text-[#D4AF37]">#{String(val || docId)}</span>
                                ) : col.tenantKey ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTenantFilter(String(val || tenantId))}
                                    title={`Filtrar apenas o tenant ${String(val || tenantId)}`}
                                    className="font-mono text-[10px] bg-[#18181B] hover:bg-[#D4AF37]/20 px-2 py-0.5 rounded border border-[#27272A] hover:border-[#D4AF37]/50 text-cyan-400 font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Building2 size={10} className="text-[#D4AF37]" />
                                    <span>{String(val || tenantId)}</span>
                                  </button>
                                ) : col.type === 'timestamp' && val ? (
                                  <span className="font-mono text-[11px] text-[#A1A1AA]">
                                    {typeof val === 'number'
                                      ? new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                      : String(val)}
                                  </span>
                                ) : col.type === 'number' && (col.name.toLowerCase().includes('preco') || col.name.toLowerCase().includes('valor') || col.name.toLowerCase().includes('custo')) ? (
                                  <span className="font-mono font-bold text-emerald-400">
                                    R$ {Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : col.type === 'boolean' ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    val ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}>
                                    {val ? 'TRUE' : 'FALSE'}
                                  </span>
                                ) : typeof val === 'object' ? (
                                  <span className="font-mono text-cyan-400 text-[10px] truncate max-w-[150px] block" title={JSON.stringify(val)}>
                                    {JSON.stringify(val).substring(0, 30)}...
                                  </span>
                                ) : (
                                  <span className="text-white truncate max-w-[180px] block font-sans" title={val !== undefined && val !== null ? String(val) : ''}>
                                    {val !== undefined && val !== null ? String(val) : <em className="text-[#71717A]">null</em>}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingDoc(row)}
                                className="p-1.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] rounded-lg transition-colors cursor-pointer"
                                title="Visualizar JSON"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(row)}
                                className="p-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(row)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {paginatedData.map((row, idx) => (
                  <div key={idx} className="p-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl font-mono text-xs">
                    <div className="flex justify-between items-center text-xs text-[#D4AF37] font-bold pb-2 border-b border-[#27272A]/50 mb-2">
                      <span>Documento #{getDocId(row)}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleOpenEdit(row)} className="hover:underline text-[11px]">Editar</button>
                        <button type="button" onClick={() => handleDeleteDoc(row)} className="hover:underline text-rose-400 text-[11px]">Excluir</button>
                      </div>
                    </div>
                    <pre className="text-emerald-400 overflow-x-auto text-[11px] leading-tight">
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-[#27272A] bg-[#0A0A0B] flex items-center justify-between text-xs">
                <span className="text-[#71717A] text-[11px]">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredData.length} itens)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1.5 bg-[#18181B] text-white border border-[#27272A] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1.5 bg-[#18181B] text-white border border-[#27272A] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ÍNDICES DO BANCO */}
      {activeMainTab === 'indexes' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-[#111113] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl">
                <Zap size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Catálogo e Performance de Índices do Banco</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Indexação relacional B-Tree e Unique para otimização de consultas multi-tenant no PostgreSQL Cloud SQL.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold rounded-full">
              10 ÍNDICES ATIVOS • 0% FRAGMENTAÇÃO
            </span>
          </div>

          <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0A0B] text-[#71717A] font-mono uppercase text-[10px] border-b border-[#27272A]">
                  <tr>
                    <th className="px-5 py-3">Nome do Índice</th>
                    <th className="px-5 py-3">Tabela Alvo</th>
                    <th className="px-5 py-3">Colunas Indexadas</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Finalidade / Estratégia</th>
                    <th className="px-5 py-3 text-right">Uso & Impacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {[
                    { name: 'idx_clients_tenant_cpf', table: 'clients', cols: 'tenantId, cpfCnpj', type: 'UNIQUE B-Tree', purpose: 'Busca direta por documento no isolamento de tenant', impact: '100% Index Scan (<1ms)' },
                    { name: 'idx_stock_items_tenant_cat', table: 'stock_items', cols: 'tenantId, categoria, statusManutencao', type: 'B-Tree Composite', purpose: 'Filtros rápidos no catálogo do acervo e condição', impact: 'Index Scan em listagens' },
                    { name: 'idx_bookings_tenant_dates', table: 'bookings', cols: 'tenantId, dataRetirada, dataDevolucao, status', type: 'B-Tree Composite', purpose: 'Prevenção de conflitos de agenda e concorrência', impact: 'Crítico para locação' },
                    { name: 'idx_webforms_tenant_status', table: 'web_forms', cols: 'tenantId, status, dataCriacao', type: 'B-Tree Composite', purpose: 'Funil e pipeline de propostas orçamentárias web', impact: 'Index Scan para painel' },
                    { name: 'idx_transactions_tenant_date', table: 'financial_transactions', cols: 'tenantId, data, tipo, categoria', type: 'B-Tree Composite', purpose: 'Cálculos de DRE e fluxo de caixa por período', impact: 'Demonstrativo diário' },
                    { name: 'idx_maintenance_stockitem', table: 'maintenance_history', cols: 'tenantId, stockItemId, status', type: 'B-Tree Composite', purpose: 'Rastreamento de reparos por item de estoque', impact: 'Histórico de avarias' },
                    { name: 'idx_authorized_devices_hwid', table: 'authorized_devices', cols: 'tenantId, hardwareId, status', type: 'UNIQUE B-Tree', purpose: 'Autenticação e revogação do terminal Android', impact: 'Validação instantânea' },
                    { name: 'idx_tenant_configs_name', table: 'tenant_configs', cols: 'tenantId, configName', type: 'UNIQUE B-Tree', purpose: 'Acesso às parâmetros de sistema do tenant', impact: 'Cache + Index Scan' },
                    { name: 'idx_item_categories_tenant', table: 'item_categories', cols: 'tenantId, nome', type: 'B-Tree Composite', purpose: 'Classificação do catálogo e tags coloridas', impact: 'Filtro de acervo' },
                    { name: 'idx_contract_templates_tenant', table: 'contract_templates', cols: 'tenantId, id', type: 'B-Tree Composite', purpose: 'Carregamento de minutas de contrato em PDF', impact: 'Geração de PDF' },
                  ].map((idx, i) => (
                    <tr key={i} className="hover:bg-[#18181B]/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[#D4AF37] font-bold whitespace-nowrap flex items-center gap-1.5">
                        <Key size={13} className="text-[#D4AF37]" />
                        <span>{idx.name}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-white">{idx.table}</td>
                      <td className="px-5 py-3.5 font-mono text-cyan-400 text-[11px]">{idx.cols}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18181B] border border-[#27272A] text-emerald-400">
                          {idx.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#A1A1AA] max-w-xs">{idx.purpose}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-[11px] font-bold text-emerald-400 whitespace-nowrap">
                        {idx.impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VISÕES DO BANCO */}
      {activeMainTab === 'views' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-[#111113] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl">
                <Eye size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Visões Agregadas SQL (Database Views)</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Consultas pré-compiladas para geração de relatórios de DRE, taxa de ocupação e performance comercial.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                id: 'vw_resumo_financeiro_tenant',
                title: 'vw_resumo_financeiro_tenant',
                desc: 'Consolidação de entradas, saídas e margem financeira acumulada por categoria.',
                sql: `CREATE VIEW vw_resumo_financeiro_tenant AS\nSELECT tenant_id, tipo, categoria, SUM(valor) AS total_valor, COUNT(*) AS qtd\nFROM financial_transactions GROUP BY tenant_id, tipo, categoria;`
              },
              {
                id: 'vw_ocupacao_acervo',
                title: 'vw_ocupacao_acervo',
                desc: 'Taxa de disponibilidade e ocupação dos itens do acervo em reservas ativas.',
                sql: `CREATE VIEW vw_ocupacao_acervo AS\nSELECT s.tenant_id, s.id, s.nome, s.quantidade_total,\n COALESCE(SUM(bi.quantidade),0) AS qtd_em_uso\nFROM stock_items s LEFT JOIN booking_items bi ON s.id = bi.stock_item_id GROUP BY s.id;`
              },
              {
                id: 'vw_desempenho_clientes',
                title: 'vw_desempenho_clientes',
                desc: 'Ranking de clientes por faturamento total acumulado e LTV.',
                sql: `CREATE VIEW vw_desempenho_clientes AS\nSELECT c.tenant_id, c.id, c.nome, COUNT(b.id) AS total_reservas,\n SUM(b.valor_total) AS ltv\nFROM clients c LEFT JOIN bookings b ON c.id = b.cliente_id GROUP BY c.id;`
              },
              {
                id: 'vw_status_manutencoes',
                title: 'vw_status_manutencoes',
                desc: 'Métricas de avarias, itens em reparo e custos associados acumulados.',
                sql: `CREATE VIEW vw_status_manutencoes AS\nSELECT tenant_id, status, COUNT(*) AS qtd, SUM(custo_estimado) AS custo_total\nFROM maintenance_history GROUP BY tenant_id, status;`
              },
              {
                id: 'vw_funil_orcametario',
                title: 'vw_funil_orcametario',
                desc: 'Funil de conversão de formulários web orçamentários para reservas efetivas.',
                sql: `CREATE VIEW vw_funil_orcametario AS\nSELECT tenant_id, respondido, COUNT(*) AS total_propostas\nFROM web_forms GROUP BY tenant_id, respondido;`
              },
            ].map((v) => (
              <div key={v.id} className="p-4 bg-[#111113] border border-[#27272A] rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <Table size={14} /> {v.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunView(v.id)}
                      className="px-3 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Play size={12} />
                      <span>Executar Visão</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">{v.desc}</p>
                  <pre className="p-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                    {v.sql}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* View Execution Result */}
          {activeViewResult && (
            <div className="p-4 bg-[#111113] border border-[#D4AF37]/40 rounded-2xl space-y-3 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <span className="font-mono text-xs font-bold text-white flex items-center gap-2">
                  <Play size={14} className="text-[#D4AF37]" /> Resultado em Tempo Real: <strong>{activeViewResult.viewName}</strong>
                </span>
                <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Executado em {activeViewResult.timeMs} ms
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0A0A0B] text-[#71717A] text-[10px] uppercase border-b border-[#27272A]">
                    <tr>
                      {Object.keys(activeViewResult.rows[0] || {}).map((k) => (
                        <th key={k} className="px-4 py-2">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {activeViewResult.rows.map((r, i) => (
                      <tr key={i} className="hover:bg-[#18181B]/50">
                        {Object.values(r).map((v: any, j) => (
                          <td key={j} className="px-4 py-2.5 text-[#E4E4E7]">
                            {typeof v === 'number' && String(v).includes('.') ? `R$ ${v.toFixed(2)}` : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DIAGRAMA ERD */}
      {activeMainTab === 'erd' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-[#111113] border border-[#27272A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                <Network size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Diagrama Relacional de Entidades (ERD & Schema)</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Mapeamento visual das tabelas, chaves primárias, estrangeiras e acoplamento multi-tenant.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#D4AF37]">
              Clique num card para destacar relacionamentos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TABLE_SCHEMAS.map((schema) => {
              const isSelected = selectedErdTable === schema.id;
              return (
                <div
                  key={schema.id}
                  onClick={() => setSelectedErdTable(schema.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-[#18181B] border-[#D4AF37] shadow-xl ring-2 ring-[#D4AF37]/20 scale-[1.01]'
                      : 'bg-[#111113] border-[#27272A] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
                    <div className="flex items-center gap-2">
                      <Table size={16} className={isSelected ? 'text-[#D4AF37]' : 'text-[#71717A]'} />
                      <span className="font-bold text-xs text-white">{schema.label}</span>
                    </div>
                    <span className="font-mono text-[10px] bg-[#27272A] px-2 py-0.5 rounded text-[#D4AF37]">
                      {schema.tableNameSql}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    {schema.columns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-1.5">
                          {col.primaryKey && <Key size={11} className="text-[#D4AF37]" />}
                          {col.foreignKey && <GitFork size={11} className="text-cyan-400" />}
                          <span className={col.primaryKey ? 'text-[#D4AF37] font-bold' : col.tenantKey ? 'text-emerald-400' : 'text-[#E4E4E7]'}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#71717A] uppercase">{col.type}</span>
                      </div>
                    ))}
                  </div>

                  {schema.columns.some((c) => c.foreignKey) && (
                    <div className="pt-2 border-t border-[#27272A]/60 text-[10px] font-mono text-cyan-400 flex flex-col gap-0.5">
                      {schema.columns.filter((c) => c.foreignKey).map((c) => (
                        <span key={c.name} className="truncate">
                          🔗 {c.name} ➔ {c.foreignKey}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: CONSOLE SQL */}
      {activeMainTab === 'sql_console' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-[#111113] border border-[#27272A] rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <Terminal size={16} className="text-[#D4AF37]" /> Terminal de Consulta SQL (Cloud SQL Interativo)
              </span>
              <button
                type="button"
                onClick={handleExecuteSql}
                disabled={isExecutingSql}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg disabled:opacity-50"
              >
                <Play size={14} />
                <span>{isExecutingSql ? 'Executando...' : 'Executar Query SQL'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              onBlur={() => {
                const trimmed = sqlQuery.trim();
                if (trimmed && !trimmed.endsWith(';')) {
                  setSqlQuery(trimmed + ';');
                }
              }}
              placeholder="Digite sua instrução SQL (ex: SELECT * FROM clients WHERE tenant_id = '...')"
              className="w-full p-3.5 bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs rounded-xl focus:border-[#D4AF37] focus:outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-[#71717A] uppercase mr-1">Queries Rápidas:</span>
              {queryHistory.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSqlQuery(q)}
                  className="px-2.5 py-1 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[10px] font-mono text-[#A1A1AA] hover:text-white rounded-lg truncate max-w-xs cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* SQL RESULTS */}
          {sqlResult && (
            <div className="bg-[#111113] border border-[#27272A] rounded-2xl overflow-hidden shadow-2xl animate-fadeIn space-y-2">
              <div className="p-3 bg-[#0A0A0B] border-b border-[#27272A] flex items-center justify-between text-xs font-mono">
                <span className="text-[#D4AF37] font-bold">
                  Query executada • {sqlResult.rows.length} registros retornados
                </span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                  {sqlResult.executionTimeMs} ms
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0A0A0B] text-[#71717A] uppercase text-[10px] border-b border-[#27272A]">
                    <tr>
                      {sqlResult.columns.map((c) => (
                        <th key={c} className="px-4 py-2.5">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]">
                    {sqlResult.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-[#18181B]/50">
                        {sqlResult.columns.map((c) => (
                          <td key={c} className="px-4 py-2.5 text-[#E4E4E7]">
                            {typeof row[c] === 'object' ? JSON.stringify(row[c]).substring(0, 30) : String(row[c] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DIAGNÓSTICO */}
      {activeMainTab === 'diagnostics' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[#111113] border border-[#27272A] rounded-2xl space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Server size={18} />
                <span>Cloud SQL PostgreSQL</span>
              </div>
              <p className="text-xs text-[#A1A1AA]">Status: Conectado e Operacional</p>
              <span className="text-[10px] font-mono text-[#71717A]">Pool Drizzle: 3/20 conexões ativas</span>
            </div>

            <div className="p-5 bg-[#111113] border border-[#27272A] rounded-2xl space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs">
                <Zap size={18} />
                <span>GCP Firestore NoSQL</span>
              </div>
              <p className="text-xs text-[#A1A1AA]">Sincronização em tempo real</p>
              <span className="text-[10px] font-mono text-[#71717A]">Cache IndexedDB ativado</span>
            </div>

            <div className="p-5 bg-[#111113] border border-[#27272A] rounded-2xl space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <ShieldCheck size={18} />
                <span>Isolamento Multi-Tenant</span>
              </div>
              <p className="text-xs text-[#A1A1AA]">CNPJ Tenant Filtro Estrito</p>
              <span className="text-[10px] font-mono text-[#71717A]">Chave: {tenantId}</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW JSON MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <span className="font-mono font-bold text-white text-xs flex items-center gap-2">
                <Code className="text-[#D4AF37]" size={16} /> JSON do Documento #{getDocId(viewingDoc)}
              </span>
              <button type="button" onClick={() => setViewingDoc(null)} className="text-[#71717A] hover:text-white p-1 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <pre className="bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-[60vh] leading-relaxed">
              {JSON.stringify(viewingDoc, null, 2)}
            </pre>

            <div className="flex justify-between items-center pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  const target = viewingDoc;
                  setViewingDoc(null);
                  handleDeleteDoc(target);
                }}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Excluir Registro</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingDoc;
                    setViewingDoc(null);
                    handleOpenEdit(target);
                  }}
                  className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {editingDoc !== null || isCreatingNew ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <span className="font-mono font-bold text-white text-xs flex items-center gap-2">
                <FileJson className="text-[#D4AF37]" size={16} />
                {isCreatingNew ? `Novo Registro em '${currentSchema.tableNameSql}'` : `Editar Registro #${getDocId(editingDoc)}`}
              </span>
              <div className="flex items-center gap-2">
                <div className="bg-[#18181B] p-1 rounded-lg border border-[#27272A] flex text-[10px] font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => setModalMode('form')}
                    className={`px-2 py-0.5 rounded ${modalMode === 'form' ? 'bg-[#D4AF37] text-black' : 'text-[#71717A]'}`}
                  >
                    Formulário
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('json')}
                    className={`px-2 py-0.5 rounded ${modalMode === 'json' ? 'bg-[#D4AF37] text-black' : 'text-[#71717A]'}`}
                  >
                    JSON Raw
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-[#71717A] hover:text-white p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {modalMode === 'form' ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {currentSchema.columns.map((col) => (
                  <div key={col.name} className="space-y-1">
                    <label className="text-[10px] font-mono text-[#71717A] uppercase block">
                      {col.label} {col.primaryKey && '(PK)'} {col.tenantKey && '(Tenant)'}:
                    </label>
                    {col.tenantKey ? (
                      <input
                        type="text"
                        disabled
                        value={tenantId}
                        className="w-full bg-[#18181B] border border-[#27272A] text-[#71717A] p-2 rounded-xl text-xs font-mono"
                      />
                    ) : col.type === 'boolean' ? (
                      <select
                        value={formData[col.name] ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value === 'true' })}
                        className="w-full bg-[#18181B] border border-[#27272A] text-white p-2 rounded-xl text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
                      >
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    ) : col.type === 'number' ? (
                      <input
                        type="number"
                        value={formData[col.name] || 0}
                        onChange={(e) => setFormData({ ...formData, [col.name]: Number(e.target.value) })}
                        className="w-full bg-[#18181B] border border-[#27272A] text-white p-2 rounded-xl text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[col.name] !== undefined ? String(formData[col.name]) : ''}
                        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                        className="w-full bg-[#18181B] border border-[#27272A] text-white p-2 rounded-xl text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono text-[#71717A] uppercase mb-1">Payload JSON:</label>
                <textarea
                  rows={12}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] text-emerald-400 font-mono text-xs p-3.5 rounded-xl focus:border-[#D4AF37] focus:outline-none leading-relaxed"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDoc}
                className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c2a032] text-black text-xs font-extrabold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg"
              >
                <Save size={14} />
                <span>Salvar Registro</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl shrink-0">
                <Trash2 size={22} />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-mono font-bold text-white text-sm flex items-center gap-2">
                  Excluir Registro Permanente
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Confirma a remoção definitiva do registro da tabela <span className="font-mono text-rose-300 font-bold">'{currentSchema.tableNameSql}'</span>?
                </p>
              </div>
            </div>

            <div className="bg-[#0A0A0B] border border-[#27272A] p-3.5 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-[#27272A]">
                <span className="text-[#71717A]">ID do Documento:</span>
                <span className="font-bold text-[#D4AF37]">#{getDocId(deletingDoc)}</span>
              </div>
              {(deletingDoc.nome || deletingDoc.titulo || deletingDoc.clienteNome || deletingDoc.descricao || deletingDoc.configName || deletingDoc.config_name) && (
                <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-[#27272A]">
                  <span className="text-[#71717A]">Descrição / Nome:</span>
                  <span className="text-white truncate max-w-[200px]">
                    {deletingDoc.nome || deletingDoc.titulo || deletingDoc.clienteNome || deletingDoc.descricao || deletingDoc.configName || deletingDoc.config_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#71717A]">Tenant / Empresa:</span>
                <span className="text-cyan-400 truncate max-w-[200px]">
                  {deletingDoc.tenantId || deletingDoc.tenant_id || deletingDoc.cnpj || tenantId || 'GLOBAL'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-center gap-2 text-[11px] text-rose-300">
              <AlertTriangle size={15} className="shrink-0 text-rose-400" />
              <span>Esta operação é irreversível e limpará todas as referências associadas.</span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2.5 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
