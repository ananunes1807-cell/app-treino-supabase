const SUPABASE_CONFIG = {
  url: "https://wkxfaogfwowdauxlscux.supabase.co",
  anonKey: "sb_publishable_NdscXIppRgUHxFCUg2qb-w_gMmgKFYh"
};

const CONFIG_STORAGE_KEY = "gym-tracker-supabase-config";

/**
 * Lê a configuração salva no navegador ou usa os valores deste arquivo.
 */
function getSupabaseConfig() {
  const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);

  if (!savedConfig) {
    return SUPABASE_CONFIG;
  }

  try {
    return { ...SUPABASE_CONFIG, ...JSON.parse(savedConfig) };
  } catch (error) {
    console.warn("Configuração local do Supabase inválida.", error);
    return SUPABASE_CONFIG;
  }
}

/**
 * Salva URL e chave pública para testar o app sem alterar o código.
 */
function saveSupabaseConfig(config) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Verifica se a configuração já foi preenchida.
 */
function hasValidSupabaseConfig(config = getSupabaseConfig()) {
  return Boolean(
    config.url &&
      config.anonKey &&
      !config.url.includes("COLE_AQUI") &&
      !config.anonKey.includes("COLE_AQUI")
  );
}

/**
 * Cria o cliente Supabase usado por todo o aplicativo.
 */
function createSupabaseClient() {
  const config = getSupabaseConfig();

  if (!hasValidSupabaseConfig(config)) {
    return null;
  }

  return supabase.createClient(config.url, config.anonKey);
}

window.GymSupabase = {
  CONFIG_STORAGE_KEY,
  createSupabaseClient,
  getSupabaseConfig,
  hasValidSupabaseConfig,
  saveSupabaseConfig
};
