-- Drop existing table if exists
DROP TABLE IF EXISTS processos;

-- Create processos table
CREATE TABLE IF NOT EXISTS processos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  objeto TEXT NOT NULL,
  data_abertura TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  tipo_contratacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT processos_numero_processo_key UNIQUE (numero_processo)
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_processos_updated_at ON processos;
CREATE TRIGGER update_processos_updated_at
    BEFORE UPDATE ON processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert test data
INSERT INTO processos (numero_processo, objeto, tipo_contratacao)
VALUES 
  ('0036.069326/2023-11', 'Aquisição de medicamentos', 'Dispensa'),
  ('0036.069327/2023-12', 'Contratação de serviços médicos', 'Pregão Eletrônico')
ON CONFLICT (numero_processo) DO NOTHING;
