-- Drop existing table if exists
DROP TABLE IF EXISTS valores_processos;

-- Create valores_processos table
CREATE TABLE IF NOT EXISTS valores_processos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  valor_estimado DECIMAL(15,2) NOT NULL,
  valor_contratado DECIMAL(15,2),
  tipo_contratacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valores_processos_numero_processo_key UNIQUE (numero_processo)
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_valores_processos_updated_at ON valores_processos;
CREATE TRIGGER update_valores_processos_updated_at
    BEFORE UPDATE ON valores_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data
INSERT INTO valores_processos (numero_processo, valor_estimado, tipo_contratacao)
VALUES 
  ('0036.069326/2023-11', 150000.00, 'Dispensa'),
  ('0036.069327/2023-12', 250000.00, 'Pregão Eletrônico')
ON CONFLICT (numero_processo) DO NOTHING;
