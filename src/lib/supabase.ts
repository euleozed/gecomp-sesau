import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas.');
  console.error('Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de produção.');
  
  // Em produção, você pode querer redirecionar para uma página de erro
  if (import.meta.env.PROD) {
    window.location.href = '/error?type=config';
  }
  
  throw new Error('Configuração do Supabase ausente. Verifique as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

