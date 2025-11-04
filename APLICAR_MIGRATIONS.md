# Como Aplicar as Migrations no Supabase

## 🚨 Problema Atual
A tabela `nucleo_processos` está com o campo `id` como INTEGER, mas precisa ser TEXT para aceitar números de processo.

## 📋 Migrations que Precisam Ser Aplicadas

Execute as seguintes migrations **na ordem** através do Supabase Dashboard:

### 1. Acesse o Supabase Dashboard
1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral

### 2. Execute as Migrations

#### Migration 1: Corrigir tabela nucleo_processos
📄 Arquivo: `supabase/migrations/20251104_fix_nucleo_processos_id_text.sql`

```sql
-- Drop existing table
DROP TABLE IF EXISTS nucleo_processos CASCADE;

-- Create nucleo_processos table with TEXT id
CREATE TABLE IF NOT EXISTS nucleo_processos (
  id TEXT PRIMARY KEY,
  numero_processo TEXT NOT NULL,
  nucleo TEXT NOT NULL,
  valor_estimado DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT nucleo_processos_numero_processo_key UNIQUE (numero_processo),
  CONSTRAINT nucleo_processos_nucleo_check CHECK (nucleo IN (
    'CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB', 'GPACC'
  ))
);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_nucleo_processos_updated_at ON nucleo_processos;
CREATE TRIGGER update_nucleo_processos_updated_at
    BEFORE UPDATE ON nucleo_processos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Migration 2: Criar tabela nucleos_cecomp
📄 Arquivo: `supabase/migrations/20251104_create_nucleos_cecomp.sql`

```sql
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
```

#### Migration 3: Inserir dados dos núcleos
📄 Arquivo: `supabase/migrations/20251104_insert_nucleos_cecomp.sql`

```sql
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
```

### 3. Verifique a Aplicação

Após executar cada migration, verifique se foi aplicada com sucesso:

```sql
-- Verificar estrutura da tabela nucleo_processos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nucleo_processos';

-- Verificar estrutura da tabela nucleos_cecomp
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'nucleos_cecomp';

-- Verificar dados inseridos
SELECT * FROM nucleos_cecomp ORDER BY sigla;
```

### 4. Resultado Esperado

Após a aplicação bem-sucedida:
- ✅ Tabela `nucleo_processos` com campo `id` do tipo TEXT
- ✅ Tabela `nucleos_cecomp` criada com 12 núcleos
- ✅ Sistema funcionando sem erros ao salvar núcleos

## 🔄 Testar o Sistema

1. Acesse a página de **Valores** na aplicação
2. Clique em **Editar** em qualquer processo
3. Selecione um núcleo no dropdown
4. Preencha os valores
5. Clique em **Salvar**

Se tudo estiver correto, a mensagem "Dados salvos com sucesso" deve aparecer! 🎉

