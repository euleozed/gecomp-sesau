import { supabase } from '@/lib/supabase';

export interface NucleoProcesso {
  id: number;
  numero_processo: string;
  nucleo: string;
  valor_estimado: number | null;
  created_at: string;
  updated_at: string;
}

export const nucleos = {
  CECOMP: 'CENTRAL DE COMPRAS',
  NMP: 'NÚCLEO DE MATERIAIS PERMANENTES',
  NSC: 'NÚCLEO DE SERVIÇOS CONTINUADOS',
  NSM: 'NÚCLEO DE SERVIÇOS MÉDICOS',
  NDJPL: 'NÚCLEO DE DEMANDAS JUDICIAIS E PACIENTES NO LEITO',
  NOSE: 'NÚCLEO DE OBRAS E SERVIÇOS DE ENGENHARIA',
  NPA: 'NÚCLEO DE PROCEDIMENTOS ACESSÓRIOS',
  NMCHE: 'NÚCLEO DE MATERIAL DE CONSUMO, HOSPITALAR ESPECIALIDADES',
  NMSG: 'NÚCLEO DE MATERIAL E SERVIÇOS DE USO GERAL',
  NMN: 'NÚCLEO DE MEDICAMENTOS E NUTRIÇÃO',
  NLAB: 'NÚCLEO LABORATORIAL'
} as const;

export type NucleoKey = keyof typeof nucleos;

export const nucleoProcessosService = {
  async getNucleoByProcesso(numeroProcesso: string): Promise<NucleoProcesso | null> {
    try {
      const { data, error } = await supabase
        .from('nucleo_processos')
        .select()
        .eq('numero_processo', numeroProcesso)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar núcleo do processo:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar núcleo do processo:', error);
      return null;
    }
  },

  async updateNucleo(numeroProcesso: string, nucleo: NucleoKey): Promise<boolean> {
    try {
      // Primeiro verifica se o registro já existe
      const { data: existingData, error: searchError } = await supabase
        .from('nucleo_processos')
        .select('id')
        .eq('numero_processo', numeroProcesso)
        .maybeSingle();

      if (searchError) {
        console.error('Erro ao buscar núcleo do processo:', searchError);
        return false;
      }

      if (existingData?.id) {
        // Se existe, atualiza
        const { error: updateError } = await supabase
          .from('nucleo_processos')
          .update({ nucleo })
          .eq('id', existingData.id);

        if (updateError) {
          console.error('Erro ao atualizar núcleo do processo:', updateError);
          return false;
        }
      } else {
        // Se não existe, insere
        const { error: insertError } = await supabase
          .from('nucleo_processos')
          .insert({
            numero_processo: numeroProcesso,
            nucleo
          });

        if (insertError) {
          console.error('Erro ao inserir núcleo do processo:', insertError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar núcleo do processo:', error);
      return false;
    }
  }
};