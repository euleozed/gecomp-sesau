-- Insert núcleos CECOMP
INSERT INTO nucleos_cecomp (sigla, nome) VALUES
  ('CECOMP', 'Central de Compras'),
  ('NMP', 'Núcleo de Materiais Permanentes'),
  ('NSC', 'Núcleo de Serviços Continuados'),
  ('NSM', 'Núcleo de Serviços Médicos'),
  ('NDJPL', 'Núcleo de Demandas Judiciais e Pacientes no Leito'),
  ('NOSE', 'Núcleo de Obras e Serviços de Engenharia'),
  ('NPA', 'Núcleo de Procedimentos Acessórios'),
  ('NMCHE', 'Núcleo de Material de Consumo, Hospitalar Especialidades'),
  ('NMSG', 'Núcleo de Material e Serviços de Uso Geral'),
  ('NMN', 'Núcleo de Medicamentos e Nutrição'),
  ('NLAB', 'Núcleo Laboratorial'),
  ('GPACC', 'Gerência de Procedimentos Auxiliares às Compras e Contratações')
ON CONFLICT (sigla) DO NOTHING;



