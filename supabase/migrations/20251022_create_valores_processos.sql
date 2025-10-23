-- Create valores_processos table
CREATE TABLE valores_processos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_processo TEXT NOT NULL UNIQUE,
    valor_estimado NUMERIC NOT NULL,
    tipo_contratacao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_valores_processos_updated_at
    BEFORE UPDATE ON valores_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
