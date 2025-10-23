-- Add unique constraint to numero_processo
ALTER TABLE nucleo_processos ADD CONSTRAINT nucleo_processos_numero_processo_key UNIQUE (numero_processo);

