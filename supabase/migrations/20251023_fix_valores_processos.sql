-- Drop existing table
DROP TABLE IF EXISTS valores_processos;

-- Create valores_processos table with text ID
CREATE TABLE IF NOT EXISTS valores_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  valor_estimado DECIMAL(15,2) NOT NULL,
  valor_contratado DECIMAL(15,2),
  tipo_contratacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valores_processos_numero_processo_key UNIQUE (numero_processo)
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_valores_processos_updated_at ON valores_processos;
CREATE TRIGGER update_valores_processos_updated_at
    BEFORE UPDATE ON valores_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
