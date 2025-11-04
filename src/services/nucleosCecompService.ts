import { supabase } from '@/lib/supabase';

export interface NucleoCecomp {
  id: string;
  sigla: string;
  nome: string;
}

export const nucleosCecompService = {
  async list(): Promise<NucleoCecomp[]> {
    try {
      const { data, error } = await supabase
        .from('nucleos_cecomp')
        .select('*')
        .order('sigla');

      if (error) {
        console.error('Erro ao buscar núcleos CECOMP:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao listar núcleos CECOMP:', error);
      return [];
    }
  }
};

