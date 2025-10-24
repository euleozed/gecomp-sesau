import { supabase } from '@/lib/supabase';

interface NucleoProcesso {
  id: string;
  numero_processo: string;
  nucleo: string;
  valor_estimado?: number;
}

export const nucleoService = {
  async save(numeroProcesso: string, nucleo: string): Promise<NucleoProcesso | null> {
    try {
      // Sanitizar o número do processo
      const numeroProcessoSanitizado = numeroProcesso.trim();

      // Preparar os dados para inserção
      const nucleoData = {
        id: numeroProcessoSanitizado,
        numero_processo: numeroProcessoSanitizado,
        nucleo: nucleo.trim().toUpperCase()
      };

      // Tentar inserir/atualizar o registro
      const { data, error } = await supabase
        .from('nucleo_processos')
        .upsert(nucleoData)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao salvar núcleo:', {
          error,
          data: nucleoData
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao salvar núcleo:', error);
      throw error;
    }
  },

  async getNucleoByProcesso(numeroProcesso: string): Promise<NucleoProcesso | null> {
    try {
      // Sanitizar o número do processo
      const numeroProcessoSanitizado = numeroProcesso.trim();

      // Buscar o registro
      const { data, error } = await supabase
        .from('nucleo_processos')
        .select('*')
        .eq('numero_processo', numeroProcessoSanitizado)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Erro detalhado ao buscar núcleo:', {
          error,
          numeroProcesso: numeroProcessoSanitizado
        });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar núcleo:', error);
      throw error;
    }
  }
};