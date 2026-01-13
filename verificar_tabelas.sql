-- ============================================
-- VERIFICAR E CORRIGIR ESTRUTURA DAS TABELAS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Verificar estrutura da tabela valores_processos
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'valores_processos'
ORDER BY ordinal_position;

-- Se a tabela não existir ou estiver errada, execute:
CREATE TABLE IF NOT EXISTS valores_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL UNIQUE,
  valor_estimado DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_contratado DECIMAL(15,2),
  tipo_contratacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar trigger para updated_at se não existir
DROP TRIGGER IF EXISTS update_valores_processos_updated_at ON valores_processos;
CREATE TRIGGER update_valores_processos_updated_at
    BEFORE UPDATE ON valores_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar estrutura da tabela nucleo_processos
SELECT 
    'nucleo_processos' as tabela,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'nucleo_processos'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela nucleos_cecomp
SELECT 
    'nucleos_cecomp' as tabela,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'nucleos_cecomp'
ORDER BY ordinal_position;

-- Contar registros
SELECT 
    'nucleos_cecomp' as tabela,
    COUNT(*) as total_registros
FROM nucleos_cecomp;




