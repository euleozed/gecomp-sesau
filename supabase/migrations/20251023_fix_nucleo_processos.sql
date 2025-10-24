-- Drop existing table
DROP TABLE IF EXISTS nucleo_processos;

-- Create nucleo_processos table with text ID
CREATE TABLE IF NOT EXISTS nucleo_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  nucleo VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT nucleo_processos_numero_processo_key UNIQUE (numero_processo),
  CONSTRAINT nucleo_processos_nucleo_check CHECK (nucleo IN ('CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB'))
);
