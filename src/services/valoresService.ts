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
            }>();
            
            dadosCompletos.forEach((row) => {
              if (!row['Processo']) return;
              
              const processo = row['Processo'];
              
              if (!processosMap.has(processo)) {
                processosMap.set(processo, {
                  processo: processo,
                  objeto: row['Objeto'] || 'Objeto não informado',
                  tipo_tr: row['tipo_tr'] || 'Não informado',
                });
              }
            });

            // Buscar dados salvos no banco de dados
            const { data: valoresBD, error: errorBD } = await supabase
              .from(TABLE_NAME)
              .select('*');

            if (errorBD) {
              console.error('Erro ao buscar valores do banco:', errorBD);
            }

            // Criar um mapa dos valores do banco
            const valoresBDMap = new Map<string, any>();
            if (valoresBD) {
              valoresBD.forEach((valor) => {
                valoresBDMap.set(valor.numero_processo, valor);
              });
            }

            // Buscar núcleos salvos no banco
            const { data: nucleosBD, error: errorNucleos } = await supabase
              .from('nucleo_processos')
              .select('*');

            if (errorNucleos) {
              console.error('Erro ao buscar núcleos do banco:', errorNucleos);
            }

            // Criar um mapa dos núcleos
            const nucleosMap = new Map<string, string>();
            if (nucleosBD) {
              nucleosBD.forEach((nucleo) => {
                nucleosMap.set(nucleo.numero_processo, nucleo.nucleo);
              });
            }

            // Converter para o formato ValorProcesso, mesclando com dados do banco
            const valores: ValorProcesso[] = Array.from(processosMap.values()).map(p => {
              const valorBD = valoresBDMap.get(p.processo);
              const nucleoBD = nucleosMap.get(p.processo);
              
              return {
                id: valorBD?.id || p.processo,
                numero_processo: p.processo,
                objeto: p.objeto,
                tipo_contratacao: valorBD?.tipo_contratacao || p.tipo_tr,
                valor_estimado: valorBD?.valor_estimado || 0,
                valor_contratado: valorBD?.valor_contratado,
                nucleo: nucleoBD,
                created_at: valorBD?.created_at || new Date().toISOString(),
                updated_at: valorBD?.updated_at || new Date().toISOString(),
                processos: {
                  objeto: p.objeto
                }
              };
            });

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

      // Usar upsert para criar ou atualizar
      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .upsert({
          id: id,
          numero_processo: id,
          ...updateData
        })
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