import React, { useState } from 'react';
import { EmpresaConfig, DispositivoAutorizado } from '../types';
import { saveDocument, MASTER_USER_ACERVUS, isMasterUser } from '../lib/firebaseSync';
import { 
  Users, 
  Smartphone, 
  ShieldAlert, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Search, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Building2, 
  CheckCircle, 
  Plus, 
  X, 
  Code2, 
  Shield, 
  Briefcase, 
  User, 
  Info,
  Key,
  Layers,
  Crown
} from 'lucide-react';

interface ClientUserAccessControlProps {
  empresaConfig?: EmpresaConfig;
  dispositivosAutorizados: DispositivoAutorizado[];
  clientes?: any[]; // Mantido para compatibilidade retroativa
  onRefreshData?: () => void;
  onUpdateDispositivoStatus?: (id: string, status: 'APROVADO' | 'REJEITADO' | 'REVOGADO' | 'PENDENTE') => void;
}

export const ClientUserAccessControlView: React.FC<ClientUserAccessControlProps> = ({
  empresaConfig,
  dispositivosAutorizados = [],
  onRefreshData,
  onUpdateDispositivoStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'TODOS' | 'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'GERENTE' | 'OPERADOR'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'APROVADO' | 'REVOGADO' | 'PENDENTE'>('TODOS');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal Novo Operador
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nomeOperador: '',
    email: '',
    telefone: '',
    nomeDispositivo: '',
    hardwareId: '',
    nivelAcesso: 'OPERADOR' as 'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR',
    cnpjEmpresa: empresaConfig?.cnpj || '00.000.000/0001-00',
  });

  const handleOpenAdd = () => {
    setNovoUsuario({
      nomeOperador: '',
      email: '',
      telefone: '',
      nomeDispositivo: '',
      hardwareId: '',
      nivelAcesso: 'OPERADOR',
      cnpjEmpresa: empresaConfig?.cnpj || '00.000.000/0001-00',
    });
    setIsAddModalOpen(true);
  };

  // Lista unificada garantindo presença do Usuário Mestre Acervus e deduplicação estrita
  const allUsersWithMaster = React.useMemo(() => {
    const uniqueMap = new Map<string, DispositivoAutorizado>();

    (dispositivosAutorizados || []).forEach((d) => {
      if (!d) return;
      const key = d.id || d.device_id || d.hardwareId || (d.usuarioEmail ? `email-${d.usuarioEmail.toLowerCase()}` : null) || (d.usuarioNome ? `nome-${d.usuarioNome.toLowerCase()}` : null) || d.impressaoDigital;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, d);
      }
    });

    const hasMaster = Array.from(uniqueMap.values()).some((d) => isMasterUser(d));
    if (!hasMaster) {
      uniqueMap.set(MASTER_USER_ACERVUS.id, MASTER_USER_ACERVUS);
    }

    return Array.from(uniqueMap.values());
  }, [dispositivosAutorizados]);

  // Estatísticas de Operadores e Dispositivos do Tenant
  const totalUsuarios = allUsersWithMaster.length;
  const activeDevicesCount = allUsersWithMaster.filter((d) => d.status === 'APROVADO').length;
  const revokedDevicesCount = allUsersWithMaster.filter((d) => d.status === 'REVOGADO' || d.status === 'REJEITADO').length;
  const pendingDevicesCount = allUsersWithMaster.filter((d) => d.status === 'PENDENTE').length;

  const devsCount = allUsersWithMaster.filter((d) => d.nivelAcesso === 'DESENVOLVEDOR' || isMasterUser(d)).length;
  const adminsCount = allUsersWithMaster.filter((d) => d.nivelAcesso === 'ADMINISTRADOR').length;
  const gerentesCount = allUsersWithMaster.filter((d) => d.nivelAcesso === 'GERENTE').length;
  const operadoresCount = allUsersWithMaster.filter((d) => d.nivelAcesso === 'OPERADOR' || !d.nivelAcesso).length;

  // Filtragem de Usuários / Operadores da Empresa Contratante
  const filteredUsers = allUsersWithMaster.filter((d) => {
    // Filtro por Status
    if (statusFilter === 'APROVADO' && d.status !== 'APROVADO') return false;
    if (statusFilter === 'REVOGADO' && d.status !== 'REVOGADO' && d.status !== 'REJEITADO') return false;
    if (statusFilter === 'PENDENTE' && d.status !== 'PENDENTE') return false;

    // Filtro por Nível de Acesso
    if (roleFilter !== 'TODOS') {
      const userRole = d.nivelAcesso || 'OPERADOR';
      if (userRole !== roleFilter) return false;
    }

    // Busca Textual
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.usuario && d.usuario.toLowerCase().includes(term)) ||
      (d.nomeDispositivo && d.nomeDispositivo.toLowerCase().includes(term)) ||
      (d.email && d.email.toLowerCase().includes(term)) ||
      (d.telefone && d.telefone.includes(term)) ||
      (d.imei && d.imei.toLowerCase().includes(term)) ||
      (d.id && d.id.toLowerCase().includes(term))
    );
  });

  const handleRevokeDevice = async (dispositivo: DispositivoAutorizado) => {
    const nome = dispositivo.usuario || dispositivo.nomeDispositivo;
    if (!confirm(`Deseja REVOGAR O ACESSO do usuário/operador '${nome}'? Esta ação bloqueará imediatamente a credencial e o dispositivo vinculado no Android KeyStore.`)) {
      return;
    }

    try {
      if (onUpdateDispositivoStatus) {
        onUpdateDispositivoStatus(dispositivo.id, 'REVOGADO');
      } else {
        await saveDocument('dispositivos_autorizados', dispositivo.id, {
          ...dispositivo,
          status: 'REVOGADO',
          dataAtualizacao: Date.now(),
        });
      }

      setActionMessage(`Acesso do operador/dispositivo '${nome}' foi REVOGADO com sucesso.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao revogar acesso do dispositivo. Tente novamente.');
    }
  };

  const handleApproveDevice = async (dispositivo: DispositivoAutorizado) => {
    const nome = dispositivo.usuario || dispositivo.nomeDispositivo;
    try {
      if (onUpdateDispositivoStatus) {
        onUpdateDispositivoStatus(dispositivo.id, 'APROVADO');
      } else {
        await saveDocument('dispositivos_autorizados', dispositivo.id, {
          ...dispositivo,
          status: 'APROVADO',
          dataAtualizacao: Date.now(),
        });
      }

      setActionMessage(`Acesso do operador/dispositivo '${nome}' foi APROVADO e RESTAURADO.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar dispositivo.');
    }
  };

  const handleChangeUserRole = async (dispositivo: DispositivoAutorizado, newRole: 'OPERADOR' | 'GERENTE' | 'ADMINISTRADOR' | 'DESENVOLVEDOR') => {
    const nome = dispositivo.usuario || dispositivo.nomeDispositivo;
    try {
      const updated = {
        ...dispositivo,
        nivelAcesso: newRole,
        dataAtualizacao: Date.now(),
      };
      await saveDocument('dispositivos_autorizados', dispositivo.id, updated);
      setActionMessage(`Nível de acesso de '${nome}' atualizado para ${newRole}.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar nível de acesso do operador.');
    }
  };

  const handleCreateUsuarioOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUsuario.nomeOperador.trim()) {
      alert('Informe o nome do operador / funcionário.');
      return;
    }

    try {
      const newDevId = `DEV_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload: DispositivoAutorizado = {
        id: newDevId,
        nomeDispositivo: novoUsuario.nomeDispositivo || 'Smartphone Corporal',
        usuario: novoUsuario.nomeOperador,
        email: novoUsuario.email,
        telefone: novoUsuario.telefone,
        cnpjEmpresa: novoUsuario.cnpjEmpresa,
        imei: novoUsuario.hardwareId || `UUID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        nivelAcesso: novoUsuario.nivelAcesso,
        status: 'APROVADO',
        dataSolicitacao: Date.now(),
        dataAtualizacao: Date.now(),
        ultimoAcesso: Date.now(),
        permissoesModulos: ['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios'],
      };

      await saveDocument('dispositivos_autorizados', newDevId, payload);
      setActionMessage(`Operador '${novoUsuario.nomeOperador}' cadastrado e autorizado com sucesso.`);
      setIsAddModalOpen(false);
      setNovoUsuario({
        nomeOperador: '',
        email: '',
        telefone: '',
        nomeDispositivo: '',
        hardwareId: '',
        nivelAcesso: 'OPERADOR',
        cnpjEmpresa: empresaConfig?.cnpj || '00.000.000/0001-00',
      });
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar novo operador.');
    }
  };

  return (
    <div className="space-y-6 text-[#E4E4E7]">
      {/* Header Banner */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="text-[#D4AF37]" size={22} />
            <h2 className="text-lg font-serif italic font-extrabold text-white">
              Gestão de Empresas Contratantes (Tenants), Operadores e Acessos
            </h2>
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              SECURITY GOVERNANCE
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              MULTI-TENANT ESTRITO
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Controle corporativo de acessos para a empresa contratante (Tenant) e seus funcionários/operadores.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#b89628] text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Plus size={15} />
            <span>Novo Operador</span>
          </button>

          <button
            onClick={async () => {
              try {
                const currentUuid = localStorage.getItem('locadora_device_uuid') || 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                const savedDevStr = localStorage.getItem('locadora_authenticated_device');
                let devToSync: DispositivoAutorizado;
                if (savedDevStr) {
                  devToSync = JSON.parse(savedDevStr);
                } else {
                  devToSync = {
                    id: currentUuid,
                    imei: currentUuid,
                    nomeDispositivo: 'Terminal Principal Atual',
                    cnpjEmpresa: empresaConfig?.cnpj || '00.000.000/0001-00',
                    usuario: empresaConfig?.nomeRepresentante || 'Administrador do Sistema',
                    email: empresaConfig?.email || 'admin@acervuscore.com.br',
                    telefone: empresaConfig?.telefoneWhatsapp || '',
                    nivelAcesso: 'ADMINISTRADOR',
                    status: 'APROVADO',
                    dataSolicitacao: Date.now(),
                    dataAtualizacao: Date.now(),
                    ultimoAcesso: Date.now(),
                    permissoesModulos: ['inventario', 'reservas', 'clientes', 'financeiro', 'manutencao', 'relatorios', 'empresa', 'developer']
                  };
                }
                await saveDocument('dispositivos_autorizados', devToSync.id, devToSync);
                setActionMessage(`Seu usuário/dispositivo (${devToSync.usuario}) foi sincronizado com sucesso nos painéis.`);
                if (onRefreshData) onRefreshData();
                setTimeout(() => setActionMessage(null), 4000);
              } catch (err) {
                console.error(err);
                alert('Erro ao sincronizar usuário atual.');
              }
            }}
            className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#D4AF37] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Sincronizar seu usuário atual para garantir exibição nos painéis"
          >
            <UserCheck size={14} />
            <span>Sincronizar Meu Usuário</span>
          </button>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className="text-[#D4AF37]" />
              <span>Atualizar</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain Clarification Alert Box */}
      <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-2xl text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#D4AF37] font-bold">
          <Info size={16} />
          <span>Diretriz do Arquitetura Multi-Tenant e Atores do Sistema:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[#A1A1AA]">
          <div className="p-2.5 bg-[#111113] rounded-xl border border-[#27272A]">
            <span className="text-white font-bold block mb-0.5">1. Empresa Contratante (Tenant)</span>
            Empresa usuária do software Acervus Core. Mantém isolamento estrito de estoque, caixa e operadores pelo <code className="text-[#D4AF37]">tenant_id</code>.
          </div>
          <div className="p-2.5 bg-[#111113] rounded-xl border border-[#27272A]">
            <span className="text-white font-bold block mb-0.5">2. Operador / Funcionário (Usuário)</span>
            Usuário com credenciais corporativas e autorização de hardware no sistema (<span className="text-emerald-400 font-semibold">Operador, Gerente, Admin, Dev</span>).
          </div>
          <div className="p-2.5 bg-[#111113] rounded-xl border border-[#27272A]">
            <span className="text-white font-bold block mb-0.5">3. Cliente Final (Locatário)</span>
            Cliente atendido pela empresa que aluga itens do acervo. <strong className="text-red-400">Não possui login nem conta</strong> no sistema administrativo.
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#111113] border border-[#27272A] p-3.5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#71717A] uppercase block">Tenant / Empresa Usuária</span>
          <span className="text-sm font-bold text-white font-mono truncate block">{empresaConfig?.nomeEmpresa || 'Empresa Contratante'}</span>
          <p className="text-[10px] text-[#A1A1AA] truncate">CNPJ: {empresaConfig?.cnpj || 'Não Informado'}</p>
        </div>

        <div className="bg-[#111113] border border-[#27272A] p-3.5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase block">Total de Operadores</span>
          <span className="text-lg font-bold text-[#D4AF37] font-mono">{totalUsuarios}</span>
          <p className="text-[10px] text-[#A1A1AA]">{activeDevicesCount} Ativos | {revokedDevicesCount} Revogados</p>
        </div>

        <div className="bg-[#111113] border border-emerald-500/30 p-3.5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">Operadores Ativos</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">{activeDevicesCount}</span>
          <p className="text-[10px] text-[#A1A1AA]">Acesso Autorizado</p>
        </div>

        <div className="bg-[#111113] border border-red-500/30 p-3.5 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-red-400 uppercase block">Acessos Revogados</span>
          <span className="text-lg font-bold text-red-400 font-mono">{revokedDevicesCount}</span>
          <p className="text-[10px] text-[#A1A1AA]">Bloqueio KeyStore</p>
        </div>

        <div className="bg-[#111113] border border-[#27272A] p-3.5 rounded-2xl space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase block">Perfis / Roles</span>
          <div className="text-[10px] font-mono space-y-0.5 text-[#A1A1AA]">
            <div>Devs: <strong className="text-emerald-400">{devsCount}</strong> | Admins: <strong className="text-blue-400">{adminsCount}</strong></div>
            <div>Gerentes: <strong className="text-amber-400">{gerentesCount}</strong> | Ops: <strong className="text-zinc-300">{operadoresCount}</strong></div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#111113] border border-[#27272A] p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 text-[#71717A]" size={15} />
          <input
            type="text"
            placeholder="Buscar operador, e-mail, dispositivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex gap-1 bg-[#18181B] p-1 rounded-xl border border-[#27272A]">
            {(['TODOS', 'APROVADO', 'REVOGADO', 'PENDENTE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#D4AF37] text-black font-extrabold'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-[#18181B] border border-[#27272A] text-white text-xs font-semibold px-3 py-1.5 rounded-xl focus:border-[#D4AF37] focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos os Perfis</option>
            <option value="DESENVOLVEDOR">💻 Desenvolvedor</option>
            <option value="ADMINISTRADOR">🛡️ Administrador</option>
            <option value="GERENTE">💼 Gerente</option>
            <option value="OPERADOR">👤 Operador</option>
          </select>
        </div>
      </div>

      {/* Operators & Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-[#111113] border border-[#27272A] p-8 rounded-2xl text-center text-[#71717A]">
            <Users size={32} className="mx-auto mb-2 opacity-30 text-[#D4AF37]" />
            <p className="text-xs font-bold text-white">Nenhum operador ou usuário encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredUsers.map((dispositivo, idx) => {
            const isMaster = isMasterUser(dispositivo);
            const isApproved = dispositivo.status === 'APROVADO';
            const isRevoked = dispositivo.status === 'REVOGADO' || dispositivo.status === 'REJEITADO';
            const userRole = dispositivo.nivelAcesso || 'OPERADOR';
            const nomeOperador = dispositivo.usuario || dispositivo.nomeDispositivo;

            return (
              <div
                key={`${dispositivo.id || 'usr'}-${idx}`}
                className={`bg-[#111113] border rounded-2xl p-4 shadow-xl transition-all space-y-3 ${
                  isMaster
                    ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[#D4AF37]/10'
                    : isApproved 
                    ? 'border-[#27272A] hover:border-[#D4AF37]/40' 
                    : isRevoked 
                    ? 'border-red-500/40 bg-red-950/10' 
                    : 'border-amber-500/40 bg-amber-950/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Operator & Device Header Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {isMaster ? <Crown size={15} className="text-[#D4AF37] animate-pulse" /> : <User size={15} className="text-[#D4AF37]" />}
                        {nomeOperador}
                      </h3>

                      {/* Master Badge */}
                      {isMaster && (
                        <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                          👑 MESTRE GLOBAL (TODOS OS TENANTS)
                        </span>
                      )}

                      {/* Status Badge */}
                      {isApproved ? (
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> ATIVO / APROVADO
                        </span>
                      ) : isRevoked ? (
                        <span className="bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldAlert size={11} /> REVOGADO
                        </span>
                      ) : (
                        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          PENDENTE
                        </span>
                      )}

                      {/* Role Selector Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isMaster ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40' :
                        userRole === 'DESENVOLVEDOR' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        userRole === 'ADMINISTRADOR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        userRole === 'GERENTE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {isMaster && '👑 Administrador Mestre Root'}
                        {!isMaster && userRole === 'DESENVOLVEDOR' && '💻 Desenvolvedor Android'}
                        {!isMaster && userRole === 'ADMINISTRADOR' && '🛡️ Administrador'}
                        {!isMaster && userRole === 'GERENTE' && '💼 Gerente'}
                        {!isMaster && userRole === 'OPERADOR' && '👤 Operador'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A1A1AA]">
                      <span className="flex items-center gap-1">
                        <Smartphone size={12} className="text-[#D4AF37]" />
                        <strong>Aparelho:</strong> {dispositivo.nomeDispositivo}
                      </span>
                      {dispositivo.email && <span><strong>E-mail:</strong> {dispositivo.email}</span>}
                      {dispositivo.telefone && <span><strong>Tel:</strong> {dispositivo.telefone}</span>}
                      <span className="font-mono text-[10px] text-[#71717A]">
                        Hardware ID: {dispositivo.imei || dispositivo.id}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Role Dropdown */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isMaster ? (
                      <span className="text-[11px] text-[#D4AF37] font-semibold px-3 py-1.5 bg-[#18181B] border border-[#D4AF37]/30 rounded-xl">
                        🔒 Gestão Plena & Acesso Total
                      </span>
                    ) : (
                      <>
                        {/* Alterar Perfil */}
                        <select
                          value={userRole}
                          onChange={(e) => handleChangeUserRole(dispositivo, e.target.value as any)}
                          className="bg-[#18181B] border border-[#27272A] text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl focus:border-[#D4AF37] focus:outline-none cursor-pointer"
                          title="Alterar Nível de Acesso do Operador"
                        >
                          <option value="OPERADOR">👤 Operador</option>
                          <option value="GERENTE">💼 Gerente</option>
                          <option value="ADMINISTRADOR">🛡️ Administrador</option>
                          <option value="DESENVOLVEDOR">💻 Desenvolvedor</option>
                        </select>

                        {/* Revogar / Aprovar Botões */}
                        {isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeDevice(dispositivo)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserX size={13} />
                            <span>Revogar Acesso</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApproveDevice(dispositivo)}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck size={13} />
                            <span>Autorizar / Aprovar</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="pt-2 border-t border-[#27272A]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#A1A1AA]">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="font-mono text-[#71717A] uppercase mr-1">Permissões de Módulo:</span>
                    {(dispositivo.permissoesModulos || ['inventario', 'reservas', 'clientes', 'financeiro']).map((m, mIdx) => (
                      <span key={`${m}-${mIdx}`} className="px-2 py-0.5 rounded bg-[#18181B] border border-[#27272A] text-zinc-300 font-mono">
                        {m}
                      </span>
                    ))}
                  </div>

                  <div className="font-mono text-[10px] text-[#71717A]">
                    Último Acesso: {dispositivo.ultimoAcesso ? new Date(dispositivo.ultimoAcesso).toLocaleString('pt-BR') : 'Recentemente'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Cadastro de Novo Operador */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111113] border border-[#27272A] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck size={20} className="text-[#D4AF37]" />
                <h3 className="font-serif italic text-lg font-bold text-white">Cadastrar Novo Operador da Empresa</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUsuarioOperador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Nome Completo do Operador / Funcionário *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={novoUsuario.nomeOperador}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nomeOperador: e.target.value })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    maxLength={100}
                    placeholder="carlos@empresa.com.br"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="(11) 99999-8888"
                    value={novoUsuario.telefone}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, telefone: e.target.value })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Modelo do Dispositivo Autorizado</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Ex: Samsung Tab S9 / iPhone 15"
                    value={novoUsuario.nomeDispositivo}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nomeDispositivo: e.target.value })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Nível de Acesso (Perfil)</label>
                  <select
                    value={novoUsuario.nivelAcesso}
                    onChange={(e) => setNovoUsuario({ ...novoUsuario, nivelAcesso: e.target.value as any })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none cursor-pointer"
                  >
                    <option value="OPERADOR">👤 Operador (Básico)</option>
                    <option value="GERENTE">💼 Gerente (Intermediário)</option>
                    <option value="ADMINISTRADOR">🛡️ Administrador (Completo)</option>
                    <option value="DESENVOLVEDOR">💻 Desenvolvedor (ART/SQL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Hardware UUID / IMEI (Opcional)</label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Deixe em branco para gerar UUID dinâmico de segurança"
                  value={novoUsuario.hardwareId}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, hardwareId: e.target.value })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#27272A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b89628] text-black text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  Autorizar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
