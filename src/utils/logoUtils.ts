import React from 'react';

export const acervusLogo = '/logo.png';

/**
 * Retorna a URL oficial do logotipo do sistema Acervus Core.
 * Mapeia URLs antigas ou inválidas para o novo logo.png.
 */
export const getAppLogoUrl = (customLogoUrl?: string): string => {
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    // Se for uma logo antiga/removida, normaliza para /logo.png
    if (
      customLogoUrl.includes('acervus_core_logo_transparent') ||
      customLogoUrl.includes('logo_acervus')
    ) {
      return acervusLogo;
    }
    return customLogoUrl;
  }
  return acervusLogo;
};

/**
 * Handler de erro para elementos <img> do logo. Em caso de falha, garante o uso de /logo.png.
 */
export const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (!target.src.endsWith('logo.png')) {
    target.src = acervusLogo;
  } else {
    // Se o logo.png padrão falhar por algum motivo, exibe um placeholder visual elegante em vez de esconder
    target.style.display = 'flex';
    target.style.alignItems = 'center';
    target.style.justifyContent = 'center';
  }
};








