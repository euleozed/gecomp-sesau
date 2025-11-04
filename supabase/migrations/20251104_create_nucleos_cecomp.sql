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

