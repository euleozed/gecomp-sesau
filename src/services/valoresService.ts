import { supabase } from '@/lib/supabase';
import { ValorProcesso, ValorProcessoForm } from '@/types/valores';
import Papa from 'papaparse';

const TABLE_NAME = 'valores_processos';

interface CsvHistoricoItem {
  [key: string]: string;
  'Data/Hora': string;
  Unidade: string;
  CPF: string;
  Processo: string;
  Protocolo: string;
  Documento: string;
  Objeto: string;
  Descrição: string;
  tipo_tr: string;
}

export const valoresService = {
  async list(): Promise<ValorProcesso[]> {
    try {
      // Buscar dados do CSV
      const response = await fetch('/backend/df.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const dadosCompletos = results.data as CsvHistoricoItem[];
            
            // Agrupar por processo
            const processosMap = new Map<string, {
              processo: string;
              objeto: string;
              tipo_tr: string;
              valor_estimado: number;
            }>();
            
            dadosCompletos.forEach((row) => {
              if (!row['Processo']) return;
              
              const processo = row['Processo'];
              
              if (!processosMap.has(processo)) {
                processosMap.set(processo, {
                  processo: processo,
                  objeto: row['Objeto'] || 'Objeto não informado',
                  tipo_tr: row['tipo_tr'] || 'Não informado',
                  valor_estimado: 0, // Valor estimado será atualizado depois
                });
              }
            });

            // Converter para o formato ValorProcesso
            const valores: ValorProcesso[] = Array.from(processosMap.values()).map(p => ({
              id: p.processo, // Usando o número do processo como ID
              numero_processo: p.processo,
              objeto: p.objeto,
              tipo_contratacao: p.tipo_tr,
              valor_estimado: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              processos: {
                objeto: p.objeto
              }
            }));

            resolve(valores);
          },
          error: (error) => {
            console.error('Erro ao fazer parse do CSV:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Erro ao listar registros:', error);
      return [];
    }
  },

  async create(data: ValorProcessoForm): Promise<ValorProcesso | null> {
    try {
      const numeroProcesso = data.numero_processo.trim();
      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          id: numeroProcesso,
          ...data,
          numero_processo: numeroProcesso
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar registro:', error);
        throw error;
      }
      return result;
    } catch (error) {
      console.error('Erro ao criar registro:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<ValorProcessoForm>): Promise<ValorProcesso | null> {
    try {
      const updateData = data.numero_processo 
        ? { ...data, numero_processo: data.numero_processo.trim() }
        : data;

      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('numero_processo', id) // Usando numero_processo ao invés de id
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar registro:', error);
        throw error;
      }
      return result;
    } catch (error) {
      console.error('Erro ao atualizar registro:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('numero_processo', id); // Usando numero_processo ao invés de id

      if (error) {
        console.error('Erro ao excluir registro:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      throw error;
    }
  },

  async getByProcesso(numeroProcesso: string): Promise<ValorProcesso | null> {
    try {
      const numeroProcessoSanitizado = numeroProcesso.trim();
      
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select()
        .eq('numero_processo', numeroProcessoSanitizado)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Erro ao buscar processo:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar processo:', error);
      return null;
    }
  }
};