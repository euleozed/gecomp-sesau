-- Clear existing tipos_contratacao and insert new ones
DELETE FROM tipos_contratacao;

-- Insert updated tipos de contratação
INSERT INTO tipos_contratacao (nome) VALUES
  ('Dispensa'),
  ('Adesão à Ata'),
  ('Inexigibilidade'),
  ('Pregão eletrônico'),
  ('Registro de Preços'),
  ('Chamamento Público'),
  ('Concorrência'),
  ('Emergencial'),
  ('Organização Social')
ON CONFLICT (nome) DO NOTHING;

