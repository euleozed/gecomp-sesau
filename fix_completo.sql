-- ============================================
-- FIX COMPLETO - TODAS AS TABELAS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. TABELA NUCLEO_PROCESSOS
-- ============================================
DROP TABLE IF EXISTS nucleo_processos CASCADE;

CREATE TABLE nucleo_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL UNIQUE,
  nucleo TEXT NOT NULL,
  valor_estimado DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT nucleo_processos_nucleo_check CHECK (nucleo IN (
    'CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB', 'GPACC'
  ))
);

DROP TRIGGER IF EXISTS update_nucleo_processos_updated_at ON nucleo_processos;
CREATE TRIGGER update_nucleo_processos_updated_at
    BEFORE UPDATE ON nucleo_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. TABELA VALORES_PROCESSOS
-- ============================================
DROP TABLE IF EXISTS valores_processos CASCADE;

CREATE TABLE valores_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL UNIQUE,
  valor_estimado DECIMAL(15,2) NOT NULL DEFAULT 0,
  valor_contratado DECIMAL(15,2),
  tipo_contratacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS update_valores_processos_updated_at ON valores_processos;
CREATE TRIGGER update_valores_processos_updated_at
    BEFORE UPDATE ON valores_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. TABELA NUCLEOS_CECOMP
-- ============================================
CREATE TABLE IF NOT EXISTS nucleos_cecomp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS update_nucleos_cecomp_updated_at ON nucleos_cecomp;
CREATE TRIGGER update_nucleos_cecomp_updated_at
    BEFORE UPDATE ON nucleos_cecomp
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir núcleos
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

-- 4. VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Núcleos cadastrados' as status, COUNT(*) as total FROM nucleos_cecomp;


