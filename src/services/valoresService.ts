import { supabase } from '@/lib/supabase';
import { ValorProcesso, ValorProcessoForm } from '@/types/valores';

const TABLE_NAME = 'valores_processos';

// Função auxiliar para sanitizar o número do processo
function sanitizeProcessNumber(numero: string): string {
  // Remove espaços extras e codifica caracteres especiais
  return encodeURIComponent(numero.trim());
}

function desanitizeProcessNumber(numero: string): string {
  // Decodifica caracteres especiais
  return decodeURIComponent(numero);
}

export const valoresService = {
  async create(data: ValorProcessoForm): Promise<ValorProcesso | null> {
    try {
      // Insere usando o texto exato, sem sanitização
      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .insert({
          ...data,
          numero_processo: data.numero_processo.trim()
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

  async getByProcesso(numeroProcesso: string): Promise<ValorProcesso | null> {
    try {
      // Busca usando o texto exato, sem sanitização
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select()
        .eq('numero_processo', numeroProcesso)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Registro não encontrado
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
  },

  async update(id: string, data: Partial<ValorProcessoForm>): Promise<ValorProcesso | null> {
    try {
      const updateData = data.numero_processo 
        ? { ...data, numero_processo: data.numero_processo.trim() }
        : data;

      const { data: result, error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('id', id)
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
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir registro:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      throw error;
    }
  },

  async list(): Promise<ValorProcesso[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select()
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar registros:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Erro ao listar registros:', error);
      return [];
    }
  }
};
