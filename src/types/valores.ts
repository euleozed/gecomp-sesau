export interface ValorProcesso {
  id: string;
  numero_processo: string;
  objeto: string;
  valor_estimado: number;
  valor_contratado?: number | null;
  tipo_contratacao: string;
  nucleo?: string;
  created_at: string;
  updated_at: string;
  processos?: {
    objeto: string;
  };
}

export interface ProcessoInfo {
  objeto: string;
  tipo_contratacao: string;
  data_abertura: string;
}

export interface ValorProcessoForm {
  numero_processo: string;
  valor_estimado: number;
  valor_contratado?: number | null;
  tipo_contratacao: string;
}
