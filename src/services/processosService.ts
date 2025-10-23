import Papa from 'papaparse';
import { ProcessoInfo } from '@/types/valores';

interface ProcessoData {
  processo: string;
  data_hora: Date;
  unidade: string;
  tipo_tr: string;
  objeto: string;
}

export const processosService = {
  async getProcessoInfo(numeroProcesso: string): Promise<ProcessoInfo | null> {
    try {
      const response = await fetch('/backend/df.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Encontra todas as linhas do processo
            const processRows = results.data
              .filter((row: any) => row['Processo'] === numeroProcesso)
              .map((row: any) => ({
                processo: row['Processo'],
                data_hora: new Date(row['Data/Hora']),
                unidade: row['Unidade'],
                tipo_tr: row['tipo_tr'],
                objeto: row['Objeto']
              }))
              .sort((a: ProcessoData, b: ProcessoData) => b.data_hora.getTime() - a.data_hora.getTime());

            // Pega a linha mais recente com objeto
            const row = processRows.find(row => row.objeto);

            if (!row) {
              resolve(null);
              return;
            }

            // Get tipo_contratacao from tipo_tr
            const tipoContratacao = row['tipo_tr'] || 'Não especificado';

            // Get data_abertura from the earliest Data/Hora for this processo
            const processoDatas = results.data
              .filter((r: any) => r['Processo'] === numeroProcesso)
              .map((r: any) => new Date(r['Data/Hora']))
              .sort((a: Date, b: Date) => a.getTime() - b.getTime());

            const dataAbertura = processoDatas[0]?.toISOString().split('T')[0] || 'Não encontrada';

            resolve({
              objeto: row['Objeto'],
              tipo_contratacao: tipoContratacao,
              data_abertura: dataAbertura
            });
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Erro ao buscar informações do processo:', error);
      return null;
    }
  }
};
