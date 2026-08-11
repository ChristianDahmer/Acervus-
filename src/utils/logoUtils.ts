import React from 'react';

export const acervusLogo = '/acervus_core_logo_transparent.png';

/**
 * Retorna a URL oficial do logotipo do sistema Acervus Core em PNG transparente.
 */
export const getAppLogoUrl = (customLogoUrl?: string): string => {
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    return customLogoUrl;
  }
  return acervusLogo;
};

/**
 * Handler de erro para elementos <img> do logo. Em caso de falha, restaura o logo oficial.
 */
export const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  if (!target.src.endsWith(acervusLogo)) {
    target.onerror = null;
    target.src = acervusLogo;
  } else {
    target.style.display = 'none';
  }
};







