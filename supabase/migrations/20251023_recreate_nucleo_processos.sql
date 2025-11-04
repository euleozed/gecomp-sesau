-- Drop existing table if exists
DROP TABLE IF EXISTS nucleo_processos;

-- Create nucleo_processos table with sanitized numero_processo
CREATE TABLE IF NOT EXISTS nucleo_processos (
  id SERIAL PRIMARY KEY,
  numero_processo VARCHAR(255) NOT NULL,
  nucleo VARCHAR(10) NOT NULL,
  valor_estimado DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT nucleo_processos_nucleo_check CHECK (nucleo IN ('CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB'))
);

-- Create unique index on sanitized numero_processo
CREATE UNIQUE INDEX idx_nucleo_processos_numero_processo ON nucleo_processos(numero_processo);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_nucleo_processos_updated_at ON nucleo_processos;
CREATE TRIGGER update_nucleo_processos_updated_at
    BEFORE UPDATE ON nucleo_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


