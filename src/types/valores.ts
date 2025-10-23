export interface ValorProcesso {
  id: string;
  numero_processo: string;
  valor_estimado: number;
  tipo_contratacao: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessoInfo {
  objeto: string;
  tipo_contratacao: string;
  data_abertura: string;
}

export interface ValorProcessoForm {
  numero_processo: string;
  valor_estimado: number;
  tipo_contratacao: string;
}
