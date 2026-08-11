import { db, schema } from './index';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface ReservaRequest {
  tenantId: string;
  reservaId: number;
  clienteId: number;
  dataRetirada: number;
  dataDevolucao: number;
  itens: Array<{ stockItemId: number; quantidade: number }>;
  origemPropostaId?: string;
  percentualCalcao?: number;
  valorCalcao?: number;
}

/**
 * Realiza a reserva de itens no estoque com garantia de integridade e isolamento de concorrência.
 * Utiliza transação atômica e lock pessimista (SELECT FOR UPDATE) no PostgreSQL.
 */
export async function realizarReservaAtomica(req: ReservaRequest) {
  return await db.transaction(async (tx) => {
    // 1. Lock nos itens do estoque envolvidos para evitar condições de corrida (Race Condition)
    const stockItemIds = req.itens.map((i) => i.stockItemId);
    
    // Consulta pessimista com FOR UPDATE
    const lockedStock = await tx
      .select()
      .from(schema.stockItems)
      .where(
        and(
          eq(schema.stockItems.tenantId, req.tenantId),
          sql`${schema.stockItems.id} IN ${stockItemIds}`
        )
      )
      .for('update'); // SELECT ... FOR UPDATE bloqueia concorrentes até o COMMIT/ROLLBACK

    // Verificar se todos os itens existem
    for (const itemReq of req.itens) {
      const stock = lockedStock.find((s) => s.id === itemReq.stockItemId);
      if (!stock) {
        throw new Error(`Item de estoque ID #${itemReq.stockItemId} não encontrado no acervo.`);
      }

      if (stock.statusManutencao === 'EM_MANUTENCAO') {
        throw new Error(`Item "${stock.nome}" está em manutenção e não pode ser reservado.`);
      }

      // 2. Checar reservas concorrentes ativas no mesmo período (Retirada <= NovaDevolucao AND Devolucao >= NovaRetirada)
      const reservasConcorrentes = await tx
        .select({
          bookingId: schema.bookings.id,
          quantidadeReservada: schema.bookingItems.quantidade,
        })
        .from(schema.bookings)
        .innerJoin(
          schema.bookingItems,
          and(
            eq(schema.bookingItems.tenantId, schema.bookings.tenantId),
            eq(schema.bookingItems.bookingId, schema.bookings.id)
          )
        )
        .where(
          and(
            eq(schema.bookings.tenantId, req.tenantId),
            eq(schema.bookingItems.stockItemId, itemReq.stockItemId),
            sql`${schema.bookings.status} NOT IN ('CANCELADA')`,
            lte(schema.bookings.dataRetirada, req.dataDevolucao),
            gte(schema.bookings.dataDevolucao, req.dataRetirada)
          )
        );

      const totalJaReservado = reservasConcorrentes.reduce(
        (acc, r) => acc + r.quantidadeReservada,
        0
      );

      const quantidadeDisponivel = stock.quantidadeTotal - stock.quantidadeManutencao - totalJaReservado;

      if (quantidadeDisponivel < itemReq.quantidade) {
        throw new Error(
          `Estoque insuficiente para "${stock.nome}". Disponível no período: ${quantidadeDisponivel}, Solicitado: ${itemReq.quantidade}.`
        );
      }
    }

    // 3. Inserir a Reserva na tabela principal
    await tx.insert(schema.bookings).values({
      tenantId: req.tenantId,
      id: req.reservaId,
      clienteId: req.clienteId,
      dataRetirada: req.dataRetirada,
      dataDevolucao: req.dataDevolucao,
      status: 'CONFIRMADA',
      origemPropostaId: req.origemPropostaId,
      propostaAprovada: true,
      percentualCalcao: (req.percentualCalcao ?? 30).toString(),
      valorCalcao: (req.valorCalcao ?? 0).toString(),
    });

    // 4. Inserir os itens vinculados à reserva
    for (const itemReq of req.itens) {
      await tx.insert(schema.bookingItems).values({
        tenantId: req.tenantId,
        bookingId: req.reservaId,
        stockItemId: itemReq.stockItemId,
        quantidade: itemReq.quantidade,
      });

      // Incrementar contador de aluguéis para manutenção preventiva
      await tx
        .update(schema.stockItems)
        .set({
          alugueisDesdeManutencao: sql`${schema.stockItems.alugueisDesdeManutencao} + 1`,
        })
        .where(
          and(
            eq(schema.stockItems.tenantId, req.tenantId),
            eq(schema.stockItems.id, itemReq.stockItemId)
          )
        );
    }

    return {
      sucesso: true,
      reservaId: req.reservaId,
      mensagem: 'Reserva realizada com sucesso e lock atômico de concorrência.',
    };
  });
}
