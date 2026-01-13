-- Adiciona a coluna tipo_contratacao se ela não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'valores_processos' 
        AND column_name = 'tipo_contratacao'
    ) THEN
        ALTER TABLE valores_processos 
        ADD COLUMN tipo_contratacao TEXT NOT NULL DEFAULT 'Não especificado';
    END IF;
END $$;






