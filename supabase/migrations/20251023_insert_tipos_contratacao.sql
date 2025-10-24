-- Insert tipos de contratação
INSERT INTO tipos_contratacao (nome) VALUES
  ('Dispensa de Licitação'),
  ('Inexigibilidade'),
  ('Pregão Eletrônico'),
  ('Pregão Eletrônico - SRP'),
  ('Adesão a Ata de Registro de Preços'),
  ('Chamamento Público'),
  ('Concorrência'),
  ('Tomada de Preços'),
  ('Convite'),
  ('Leilão'),
  ('Concurso'),
  ('Contratação Emergencial'),
  ('Contratação Direta'),
  ('Credenciamento'),
  ('Acordo de Cooperação'),
  ('Termo de Colaboração'),
  ('Termo de Fomento'),
  ('Contrato de Gestão')
ON CONFLICT (nome) DO NOTHING;
