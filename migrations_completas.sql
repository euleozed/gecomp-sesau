-- ============================================
-- MIGRATIONS COMPLETAS PARA SISTEMA DE VALORES
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. CORRIGIR TABELA NUCLEO_PROCESSOS
-- ============================================
-- Drop existing table
DROP TABLE IF EXISTS nucleo_processos CASCADE;

-- Create nucleo_processos table with TEXT id
CREATE TABLE IF NOT EXISTS nucleo_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  nucleo TEXT NOT NULL,
  valor_estimado DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT nucleo_processos_numero_processo_key UNIQUE (numero_processo),
  CONSTRAINT nucleo_processos_nucleo_check CHECK (nucleo IN (
    'CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB', 'GPACC'
  ))
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_nucleo_processos_updated_at ON nucleo_processos;
CREATE TRIGGER update_nucleo_processos_updated_at
    BEFORE UPDATE ON nucleo_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. CRIAR TABELA NUCLEOS_CECOMP
-- ============================================
-- Create nucleos_cecomp table
CREATE TABLE IF NOT EXISTS nucleos_cecomp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_nucleos_cecomp_updated_at ON nucleos_cecomp;
CREATE TRIGGER update_nucleos_cecomp_updated_at
    BEFORE UPDATE ON nucleos_cecomp
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. INSERIR DADOS DOS NÚCLEOS
-- ============================================
-- Insert núcleos CECOMP
INSERT INTO nucleos_cecomp (sigla, nome) VALUES
  ('CECOMP', 'Central de Compras'),
  ('NMP', 'Núcleo de Materiais Permanentes'),
  ('NSC', 'Núcleo de Serviços Continuados'),
  ('NSM', 'Núcleo de Serviços Médicos'),
  ('NDJPL', 'Núcleo de Demandas Judiciais e Pacientes no Leito'),
  ('NOSE', 'Núcleo de Obras e Serviços de Engenharia'),
  ('NPA', 'Núcleo de Procedimentos Acessórios'),
  ('NMCHE', 'Núcleo de Material de Consumo, Hospitalar Especialidades'),
  ('NMSG', 'Núcleo de Material e Serviços de Uso Geral'),
  ('NMN', 'Núcleo de Medicamentos e Nutrição'),
  ('NLAB', 'Núcleo Laboratorial'),
  ('GPACC', 'Gerência de Procedimentos Auxiliares às Compras e Contratações')
ON CONFLICT (sigla) DO NOTHING;

-- ============================================
-- 4. VERIFICAÇÕES
-- ============================================
-- Verificar estrutura das tabelas
SELECT 'nucleo_processos' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nucleo_processos'
UNION ALL
SELECT 'nucleos_cecomp' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nucleos_cecomp'
ORDER BY tabela, column_name;

-- Verificar dados inseridos
SELECT 'Total de núcleos cadastrados:' as info, COUNT(*)::text as valor FROM nucleos_cecomp;



