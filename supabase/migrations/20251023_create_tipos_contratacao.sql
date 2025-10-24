-- Create tipos_contratacao table
CREATE TABLE IF NOT EXISTS tipos_contratacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tipos_contratacao_updated_at ON tipos_contratacao;
CREATE TRIGGER update_tipos_contratacao_updated_at
    BEFORE UPDATE ON tipos_contratacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
