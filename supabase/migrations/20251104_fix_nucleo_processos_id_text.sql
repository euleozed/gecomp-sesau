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

