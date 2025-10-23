import { supabase } from '@/lib/supabase';

const TABLE_NAME = 'nucleo_processos';

export const nucleoService = {
  async save(numeroProcesso: string, nucleo: string) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .upsert({
          numero_processo: numeroProcesso,
          nucleo: nucleo,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao salvar núcleo:', error);
      throw error;
    }
  }
};
