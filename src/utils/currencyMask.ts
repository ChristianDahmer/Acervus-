/**
 * Utilitários para máscara e formatação de valores monetários (BRL / R$)
 */

export function formatCurrencyBRL(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return 'R$ 0,00';
  }
  
  let numericValue: number;
  if (typeof value === 'number') {
    numericValue = value;
  } else {
    // Se já tiver formato de número simples, converte
    if (!isNaN(Number(value)) && !value.includes('R$') && !value.includes(',')) {
      numericValue = parseFloat(value);
    } else {
      // Remove todos os caracteres não-dígitos
      const cleanValue = value.replace(/\D/g, '');
      if (!cleanValue) return 'R$ 0,00';
      numericValue = parseFloat(cleanValue) / 100;
    }
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function parseCurrencyBRLToNumber(value: string): number {
  if (!value) return 0;
  // Se for um valor numérico padrão
  if (!isNaN(Number(value)) && !value.includes('R$') && !value.includes(',')) {
    return parseFloat(value) || 0;
  }
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
  return parseFloat(cleanValue) / 100;
}
