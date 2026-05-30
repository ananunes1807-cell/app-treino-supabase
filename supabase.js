import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configure estas variáveis com as credenciais públicas do seu projeto Supabase.
// A URL e a anon key ficam em Project Settings > API no painel do Supabase.
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';

// Identifica se o projeto já recebeu credenciais reais antes de tentar consultas.
export const isSupabaseConfigured = () => (
  SUPABASE_URL.startsWith('https://')
  && !SUPABASE_URL.includes('SEU-PROJETO')
  && SUPABASE_ANON_KEY.length > 30
  && !SUPABASE_ANON_KEY.includes('SUA_CHAVE')
);

// Cliente único usado por todo o aplicativo para consumir dados reais do Supabase.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
