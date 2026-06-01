/*
  CONFIGURACAO DO SUPABASE

  Coloque aqui as credenciais publicas do projeto Supabase.

  SUPABASE_URL:
  - Supabase > Project Settings > API > Project URL

  SUPABASE_ANON_KEY:
  - Supabase > Project Settings > API > Project API keys > anon/public

  Observacao:
  - A anon/public key pode ficar no frontend, mas o banco deve ser protegido
    por Row Level Security (RLS) e policies no Supabase.
*/
const DEFAULT_SUPABASE_URL = "https://wkxfaogfwowdauxlscux.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_NdscXIppRgUHxFCUg2qb-w_gMmgKFYh";
const SUPABASE_CONFIG_STORAGE_KEY = "app-treino-supabase-config";
const PRODUCTION_APP_URL = "https://ananunes1807-cell.github.io/app-treino-supabase/";

/**
 * Retorna as credenciais salvas no navegador ou as credenciais padrao do arquivo.
 */
function getSupabaseConfig() {
  const savedConfig = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);

  if (!savedConfig) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY
    };
  }

  try {
    const parsedConfig = JSON.parse(savedConfig);
    return {
      url: parsedConfig.url || DEFAULT_SUPABASE_URL,
      anonKey: parsedConfig.anonKey || DEFAULT_SUPABASE_ANON_KEY
    };
  } catch (error) {
    console.warn("Configuracao local do Supabase invalida.", error);
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY
    };
  }
}

/**
 * Salva credenciais no navegador para testes do MVP pelo TI/Admin.
 */
function saveSupabaseConfig(config) {
  localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * URL publica usada nos e-mails do Supabase Auth.
 * Mantemos fixa em producao para evitar links apontando para localhost.
 */
function getAuthRedirectUrl() {
  return PRODUCTION_APP_URL;
}

/**
 * Cria o cliente Supabase usado pelo app inteiro.
 */
function createSupabaseClient() {
  const config = getSupabaseConfig();
  return supabase.createClient(config.url, config.anonKey);
}

/**
 * Cria um cliente isolado para fluxos auxiliares, como cadastrar o acesso inicial
 * de um aluno sem trocar a sessao atual do personal no navegador.
 */
function createEphemeralSupabaseClient() {
  const config = getSupabaseConfig();
  return supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

let supabaseClient = createSupabaseClient();
