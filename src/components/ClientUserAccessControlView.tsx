import React, { useState } from 'react';
import { Cliente, DispositivoAutorizado } from '../types';
import { saveDocument } from '../lib/firebaseSync';
import { 
  Users, 
  Smartphone, 
  ShieldAlert, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Search, 
  RefreshCw, 
  Key, 
  Lock, 
  Unlock, 
  Building,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';

interface ClientUserAccessControlProps {
  clientes: Cliente[];
  dispositivosAutorizados: DispositivoAutorizado[];
  onRefreshData?: () => void;
}

export const ClientUserAccessControlView: React.FC<ClientUserAccessControlProps> = ({
  clientes = [],
  dispositivosAutorizados = [],
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVOS' | 'REVOGADOS'>('TODOS');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeClientsCount = clientes.filter((c) => c.ativo !== false).length;
  const revokedClientsCount = clientes.filter((c) => c.ativo === false).length;

  const activeDevicesCount = dispositivosAutorizados.filter((d) => d.status === 'APROVADO').length;
  const revokedDevicesCount = dispositivosAutorizados.filter((d) => d.status === 'REVOGADO' || d.status === 'BLOQUEADO' || d.status === 'REJEITADO').length;

  // Filter clients by search term and status
  const filteredClients = clientes.filter((c) => {
    const isRevoked = c.ativo === false;
    if (statusFilter === 'ATIVOS' && isRevoked) return false;
    if (statusFilter === 'REVOGADOS' && !isRevoked) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      c.telefone.includes(term) ||
      (c.cpfCnpj && c.cpfCnpj.includes(term)) ||
      String(c.id).includes(term)
    );
  });

  const handleRevokeClient = async (cliente: Cliente) => {
    if (!confirm(`Deseja realmente REVOGAR O ACESSO do cliente '${cliente.nome}' e de todos os seus usuários vinculados?`)) {
      return;
    }

    try {
      // Revoke client access
      const updatedCliente = { ...cliente, ativo: false };
      await saveDocument('clientes', cliente.id, updatedCliente);

      // Revoke associated devices
      const associatedDevices = dispositivosAutorizados.filter(
        (d) => String(d.clienteId) === String(cliente.id) || d.nomeDispositivo.toLowerCase().includes(cliente.nome.toLowerCase())
      );

      for (const dev of associatedDevices) {
        await saveDocument('dispositivos_autorizados', dev.id, { ...dev, status: 'REVOGADO' });
      }

      setActionMessage(`Acesso do cliente '${cliente.nome}' e seus usuários foi REVOGADO com sucesso.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao revogar acesso do cliente. Tente novamente.');
    }
  };

  const handleRestoreClient = async (cliente: Cliente) => {
    try {
      const updatedCliente = { ...cliente, ativo: true };
      await saveDocument('clientes', cliente.id, updatedCliente);

      setActionMessage(`Acesso do cliente '${cliente.nome}' foi RESTAURADO.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao restaurar acesso do cliente.');
    }
  };

  const handleRevokeDevice = async (dispositivo: DispositivoAutorizado) => {
    if (!confirm(`Deseja revogar a autorização do dispositivo/usuário '${dispositivo.nomeDispositivo}'?`)) {
      return;
    }

    try {
      await saveDocument('dispositivos_autorizados', dispositivo.id, { ...dispositivo, status: 'REVOGADO' });
      setActionMessage(`Dispositivo '${dispositivo.nomeDispositivo}' revogado com sucesso.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao revogar dispositivo.');
    }
  };

  const handleApproveDevice = async (dispositivo: DispositivoAutorizado) => {
    try {
      await saveDocument('dispositivos_autorizados', dispositivo.id, { ...dispositivo, status: 'APROVADO' });
      setActionMessage(`Dispositivo '${dispositivo.nomeDispositivo}' aprovado e restaurado.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar dispositivo.');
    }
  };

  return (
    <div className="space-y-6 text-[#E4E4E7]">
      {/* Header Banner */}
      <div className="bg-[#111113] border border-[#27272A] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="text-[#D4AF37]" size={22} />
            <h2 className="text-lg font-serif italic font-extrabold text-white">
              Gestão de Clientes, Usuários e Revogação de Acessos
            </h2>
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              SECURITY GOVERNANCE
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Controle de permissões, auditoria de dispositivos cadastrados e bloqueio imediato de acesso ao sistema por cliente ou usuário.
          </p>
        </div>

        {onRefreshData && (
          <button
            onClick={onRefreshData}
            className="px-3.5 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className="text-[#D4AF37]" />
            <span>Atualizar Painel</span>
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111113] border border-[#27272A] p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#71717A] uppercase block">Total de Clientes</span>
          <span className="text-xl font-bold text-white font-mono">{clientes.length}</span>
          <p className="text-[10px] text-[#A1A1AA]">Empresas / Locatários</p>
        </div>

        <div className="bg-[#111113] border border-emerald-500/30 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">Clientes Ativos</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">{activeClientsCount}</span>
          <p className="text-[10px] text-[#A1A1AA]">Acesso Liberado</p>
        </div>

        <div className="bg-[#111113] border border-red-500/30 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-red-400 uppercase block">Clientes Revogados</span>
          <span className="text-xl font-bold text-red-400 font-mono">{revokedClientsCount}</span>
          <p className="text-[10px] text-[#A1A1AA]">Acesso Bloqueado</p>
        </div>

        <div className="bg-[#111113] border border-[#27272A] p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase block">Dispositivos / Usuários</span>
          <span className="text-xl font-bold text-[#D4AF37] font-mono">{dispositivosAutorizados.length}</span>
          <p className="text-[10px] text-[#A1A1AA]">{activeDevicesCount} Ativos | {revokedDevicesCount} Revogados</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#111113] border border-[#27272A] p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 text-[#71717A]" size={15} />
          <input
            type="text"
            placeholder="Buscar por cliente, CPF/CNPJ, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white placeholder-[#71717A] focus:border-[#D4AF37] focus:outline-none"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {(['TODOS', 'ATIVOS', 'REVOGADOS'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border-[#27272A]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Client & Users List Cards */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="bg-[#111113] border border-[#27272A] p-8 rounded-2xl text-center text-[#71717A]">
            <Users size={32} className="mx-auto mb-2 opacity-30 text-[#D4AF37]" />
            <p className="text-xs font-bold text-white">Nenhum cliente encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredClients.map((cliente) => {
            const isClientActive = cliente.ativo !== false;

            // Find devices/users belonging to or associated with this client
            const clientDevices = dispositivosAutorizados.filter(
              (d) => String(d.clienteId) === String(cliente.id) || d.nomeDispositivo.toLowerCase().includes(cliente.nome.toLowerCase())
            );

            return (
              <div 
                key={cliente.id}
                className={`bg-[#111113] border rounded-2xl p-5 shadow-xl transition-all space-y-4 ${
                  isClientActive ? 'border-[#27272A]' : 'border-red-500/40 bg-red-950/10'
                }`}
              >
                {/* Client Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white">{cliente.nome}</h3>
                      <span className="font-mono text-[10px] bg-[#18181B] text-[#D4AF37] px-2 py-0.5 rounded-md border border-[#27272A]">
                        #{cliente.id}
                      </span>

                      {isClientActive ? (
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> ATIVO
                        </span>
                      ) : (
                        <span className="bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <ShieldAlert size={11} /> REVOGADO / BLOQUEADO
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[#A1A1AA]">
                      {cliente.cpfCnpj && <span><strong>CPF/CNPJ:</strong> {cliente.cpfCnpj}</span>}
                      <span><strong>Telefone:</strong> {cliente.telefone}</span>
                      {cliente.email && <span><strong>E-mail:</strong> {cliente.email}</span>}
                    </div>
                  </div>

                  {/* Client Level Actions */}
                  <div>
                    {isClientActive ? (
                      <button
                        onClick={() => handleRevokeClient(cliente)}
                        className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX size={14} />
                        <span>Revogar Acesso do Cliente</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestoreClient(cliente)}
                        className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck size={14} />
                        <span>Restaurar Acesso</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Associated Registered Users / Devices */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono font-bold text-[#71717A] uppercase tracking-wider block">
                    Usuários e Dispositivos Autorizados Vinculados ({clientDevices.length}):
                  </span>

                  {clientDevices.length === 0 ? (
                    <p className="text-xs text-[#71717A] italic bg-[#0A0A0B] p-3 rounded-xl border border-[#27272A]">
                      Nenhum dispositivo ou usuário especificamente cadastrado sob esta conta.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {clientDevices.map((dev) => {
                        const isDevApproved = dev.status === 'APROVADO';

                        return (
                          <div
                            key={dev.id}
                            className="bg-[#0A0A0B] border border-[#27272A] p-3 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Smartphone size={13} className="text-[#D4AF37]" />
                                <span className="font-bold text-white">{dev.nomeDispositivo}</span>
                              </div>
                              <p className="text-[10px] text-[#71717A] font-mono">
                                ID: {dev.hardwareId.substring(0, 16)}...
                              </p>
                              <p className="text-[10px] text-[#A1A1AA]">
                                Status: <strong className={isDevApproved ? 'text-emerald-400' : 'text-red-400'}>{dev.status}</strong>
                              </p>
                            </div>

                            <div>
                              {isDevApproved ? (
                                <button
                                  onClick={() => handleRevokeDevice(dev)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Revogar Acesso do Dispositivo"
                                >
                                  <Lock size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveDevice(dev)}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Aprovar/Restaurar Dispositivo"
                                >
                                  <Unlock size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
