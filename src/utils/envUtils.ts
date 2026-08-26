// Utilitário de Identificação de Ambiente e Configurações (AI Studio Editor vs. Produção Web)

export type EnvironmentType = 'editor' | 'preview' | 'production';

export interface EnvironmentInfo {
  type: EnvironmentType;
  label: string;
  isEditor: boolean;
  isPreview: boolean;
  isProduction: boolean;
  isIframe: boolean;
  hostname: string;
  nodeEnv: string;
  appEnv: string;
  isOverridden: boolean;
  appUrl?: string;
}

const LOCAL_STORAGE_ENV_KEY = 'acervus_app_env_override';

/**
 * Obtém a sobreposição de ambiente armazenada no localStorage com segurança
 */
export function getAppEnvOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LOCAL_STORAGE_ENV_KEY);
  } catch (e) {
    console.warn('Não foi possível ler VITE_APP_ENV override do localStorage:', e);
    return null;
  }
}

/**
 * Define ou remove a sobreposição manual da variável de ambiente VITE_APP_ENV
 */
export function setAppEnvOverride(env: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!env || env === 'auto') {
      localStorage.removeItem(LOCAL_STORAGE_ENV_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_ENV_KEY, env);
    }
  } catch (e) {
    console.warn('Não foi possível salvar VITE_APP_ENV override no localStorage:', e);
  }
  
  try {
    window.dispatchEvent(new CustomEvent('app_env_changed', { detail: env }));
  } catch (_) {}
}

/**
 * Detecta o tipo de ambiente de execução atual
 */
export function getEnvironmentType(): EnvironmentType {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production' ? 'production' : 'editor';
  }

  // 1. Verificar se há sobreposição manual salva pelo desenvolvedor
  const override = getAppEnvOverride();
  if (override) {
    if (override === 'development' || override === 'editor') return 'editor';
    if (override === 'staging' || override === 'preview') return 'preview';
    if (override === 'production') return 'production';
  }

  const hostname = window.location.hostname || '';
  const isIframe = window.self !== window.top;

  // 2. URL de desenvolvimento do AI Studio (Dev Server)
  if (hostname.includes('ais-dev-') || import.meta.env.DEV) {
    return 'editor';
  }

  // 3. URL de preview compartilhado do AI Studio
  if (hostname.includes('ais-pre-')) {
    return 'preview';
  }

  // 4. iFrame de edição no AI Studio
  if (isIframe) {
    return 'editor';
  }

  // 5. Produção Web Publicada (Cloud Run ou domínio customizado)
  return 'production';
}

/**
 * Retorna se o ambiente atual é o Editor do AI Studio
 */
export function isAIStudioEditor(): boolean {
  return getEnvironmentType() === 'editor';
}

/**
 * Retorna se o ambiente atual é um Preview Compartilhado
 */
export function isAIStudioPreview(): boolean {
  return getEnvironmentType() === 'preview';
}

/**
 * Retorna se o ambiente atual é a Publicação em Produção Web
 */
export function isProductionWeb(): boolean {
  return getEnvironmentType() === 'production';
}

/**
 * Retorna diagnósticos completos do ambiente de execução
 */
export function getEnvironmentInfo(): EnvironmentInfo {
  const type = getEnvironmentType();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'server';
  const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false;
  const nodeEnv = import.meta.env.MODE || process.env.NODE_ENV || 'development';
  const appUrl = (import.meta.env.VITE_APP_URL as string) || (process.env.APP_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '');
  const override = getAppEnvOverride();
  const appEnv = override || (import.meta.env.VITE_APP_ENV as string) || (type === 'production' ? 'production' : 'development');

  const labels: Record<EnvironmentType, string> = {
    editor: 'AI Studio Editor (Desenvolvimento)',
    preview: 'AI Studio Preview (Homologação/Staging)',
    production: 'Produção Web (Publicado)',
  };

  return {
    type,
    label: override ? `${labels[type]} (Sobreposição Manual)` : labels[type],
    isEditor: type === 'editor',
    isPreview: type === 'preview',
    isProduction: type === 'production',
    isIframe,
    hostname,
    nodeEnv,
    appEnv,
    isOverridden: !!override,
    appUrl,
  };
}

