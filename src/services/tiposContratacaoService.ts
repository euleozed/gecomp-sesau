import { supabase } from '@/lib/supabase';

interface TipoContratacao {
  id: string;
  nome: string;
}

export const tiposContratacaoService = {
  async list(): Promise<string[]> {
    try {
      // Primeiro tenta buscar da tabela
      const { data: tiposDB, error } = await supabase
        .from('tipos_contratacao')
        .select('nome')
        .order('nome');

      if (!error && tiposDB?.length > 0) {
        return tiposDB.map(t => t.nome);
      }

      // Se não encontrar na tabela, busca do CSV
      const response = await fetch('/backend/df.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      // Usar Set para garantir valores únicos
      const tiposSet = new Set<string>();
      
      // Parse CSV manualmente para pegar apenas a coluna tipo_tr
      const lines = csvText.split('\n');
      const header = lines[0].split(',');
      const tipoTrIndex = header.findIndex(col => col.trim() === 'tipo_tr');
      
      if (tipoTrIndex === -1) {
        return [];
      }

      lines.slice(1).forEach(line => {
        const columns = line.split(',');
        if (columns[tipoTrIndex]) {
          const tipo = columns[tipoTrIndex].trim();
          if (tipo && tipo !== 'tipo_tr') {
            tiposSet.add(tipo);
          }
        }
      });

      // Converter Set para array e ordenar
      const tipos = Array.from(tiposSet).sort();

      // Salvar os tipos encontrados na tabela
      if (tipos.length > 0) {
        const { error: insertError } = await supabase
          .from('tipos_contratacao')
          .upsert(
            tipos.map(nome => ({ nome })),
            { onConflict: 'nome' }
          );

        if (insertError) {
          console.error('Erro ao salvar tipos de contratação:', insertError);
        }
      }

      return tipos;
    } catch (error) {
      console.error('Erro ao listar tipos de contratação:', error);
      return [];
    }
  }
};
