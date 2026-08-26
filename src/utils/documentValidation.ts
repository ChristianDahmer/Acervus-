// Utilitário de Validação e Formatação de Documentos Brasileiros (CPF / CNPJ)
// Em conformidade com os algoritmos oficiais da Receita Federal do Brasil (RFB)
// Inclui suporte integral ao CNPJ Alfanumérico conforme a Instrução Normativa RFB nº 2.229/2024

/**
 * Normaliza e limpa o documento removendo pontuações e mantendo apenas caracteres válidos (A-Z, 0-9).
 */
export function limparDocumento(valor: string): string {
  return (valor || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Remove todos os caracteres não numéricos (exclusivo para CPF e campos puramente numéricos).
 */
export function apenasNumeros(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

/**
 * Valida se um número de CPF é matematicamente válido pelos dígitos verificadores.
 */
export function validarCPF(cpf: string): boolean {
  const limpo = apenasNumeros(cpf);
  if (limpo.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

/**
 * Retorna o valor numérico de um caractere para o cálculo do DV do CNPJ (IN RFB nº 2.229/2024).
 * '0'-'9' => 0..9 (ASCII - 48)
 * 'A'-'Z' => 17..42 (ASCII - 48)
 */
function obterValorCaractereCNPJ(caractere: string): number {
  const code = caractere.charCodeAt(0);
  return code - 48;
}

/**
 * Valida se um CNPJ (Numérico tradicional ou Alfanumérico IN RFB 2.229/2024) é matematicamente válido.
 */
export function validarCNPJ(cnpj: string): boolean {
  const limpo = limparDocumento(cnpj);
  if (limpo.length !== 14) return false;

  // As posições 1 a 12 aceitam números (0-9) e letras (A-Z).
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(limpo)) return false;

  // Rejeita CNPJs com todos os caracteres idênticos
  if (/^([A-Z0-9])\1{13}$/.test(limpo)) return false;

  // Primeiro dígito verificador (DV1)
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += obterValorCaractereCNPJ(limpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(limpo.charAt(12), 10)) return false;

  // Segundo dígito verificador (DV2)
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += obterValorCaractereCNPJ(limpo.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(limpo.charAt(13), 10)) return false;

  return true;
}

/**
 * Formata uma string de CPF ou CNPJ (Suporta Alfanumérico IN RFB 2.229/2024).
 */
export function formatarDocumento(valor: string): string {
  const limpo = limparDocumento(valor);

  // Se contiver apenas números e até 11 caracteres -> Formata como CPF
  if (/^\d+$/.test(limpo) && limpo.length <= 11) {
    return limpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  // Se possuir mais de 11 chars ou contiver letras -> Formata com máscara de CNPJ: XX.XXX.XXX/XXXX-XX
  return limpo
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3/$4')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})\/([A-Z0-9]{4})([0-9]{1,2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Valida e diagnostica um documento (CPF ou CNPJ Alfanumérico).
 */
export function validarDocumento(doc: string): {
  valido: boolean;
  tipo: 'CPF' | 'CNPJ' | 'INVALIDO';
  formatado: string;
  mensagemErro?: string;
  isAlfanumerico?: boolean;
} {
  const limpo = limparDocumento(doc);

  if (!limpo) {
    return { valido: true, tipo: 'INVALIDO', formatado: '' }; // Campo opcional vazio
  }

  if (/^\d{11}$/.test(limpo)) {
    const valido = validarCPF(limpo);
    return {
      valido,
      tipo: 'CPF',
      formatado: formatarDocumento(limpo),
      mensagemErro: valido ? undefined : 'CPF inválido (dígitos verificadores incorretos).',
    };
  }

  if (limpo.length === 14) {
    const valido = validarCNPJ(limpo);
    const isAlfanumerico = /[A-Z]/.test(limpo.substring(0, 12));
    return {
      valido,
      tipo: 'CNPJ',
      formatado: formatarDocumento(limpo),
      isAlfanumerico,
      mensagemErro: valido 
        ? undefined 
        : 'CNPJ inválido (Dígitos verificadores incorretos conforme IN RFB nº 2.229/2024).',
    };
  }

  return {
    valido: false,
    tipo: 'INVALIDO',
    formatado: doc,
    mensagemErro: `Documento deve ter 11 dígitos (CPF) ou 14 caracteres (CNPJ). Informados: ${limpo.length} caracteres.`,
  };
}

