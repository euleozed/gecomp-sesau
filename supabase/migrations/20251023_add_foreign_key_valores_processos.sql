-- Add foreign key constraint to valores_processos
ALTER TABLE valores_processos
ADD CONSTRAINT valores_processos_numero_processo_fkey
FOREIGN KEY (numero_processo)
REFERENCES processos(numero_processo)
ON DELETE CASCADE;
