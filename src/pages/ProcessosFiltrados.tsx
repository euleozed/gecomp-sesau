import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, BarChart as BarChartIcon, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Papa from 'papaparse';
import Layout from '@/components/Layout';
import jsPDF from 'jspdf';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';

interface ProcessoFiltrado {
  numero_processo: string;
  objeto: string;
  tipo_tr: string;
  data_chegada: string;
  data_ultima_movimentacao: string;
  data_primeira_homologacao: string;
  duracao_ate_homologacao: number;
  dias_desde_ultima_movimentacao: number;
  status: string;
}

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

const ProcessosFiltrados = () => {
  const { filtro } = useParams<{ filtro: string }>();
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoFiltrado[]>([]);
  const [processosOriginal, setProcessosOriginal] = useState<ProcessoFiltrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicial, setDataInicial] = useState<Date | null>(null);
  const [dataFinal, setDataFinal] = useState<Date | null>(null);

  useEffect(() => {
    const carregarProcessos = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Carregando processos para filtro:', filtro);
        
        const response = await fetch('/backend/df.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Dados CSV carregados, colunas:', results.meta.fields);
            
            const dadosCompletos = results.data as CsvHistoricoItem[];
            
            // Agrupar por processo e coletar TODOS os documentos com suas datas
            const processosMap = new Map<string, {
              processo: string;
              objeto: string;
              tipo_tr: string;
              ultimaData: Date;
              ultimaDataFormatada: string;
              temHomologacao: boolean;
              temEncerramento: boolean;
              documentos: CsvHistoricoItem[];
            }>();
            
            dadosCompletos.forEach((row) => {
              if (!row['Processo']) return;
              
              const processo = row['Processo'];
              const dataMovimentacao = new Date(row['Data/Hora']);
              const temHomologacao = row['Documento']?.includes('Homologação') || false;
              const temEncerramento = row['Documento']?.includes('Termo de Encerramento') || false;
              
              if (!processosMap.has(processo)) {
                processosMap.set(processo, {
                  processo: processo,
                  objeto: row['Objeto'] || 'Objeto não informado',
                  tipo_tr: row['tipo_tr'] || 'Não informado',
                  ultimaData: dataMovimentacao,
                  ultimaDataFormatada: dataMovimentacao.toLocaleDateString('pt-BR'),
                  temHomologacao: temHomologacao,
                  temEncerramento: temEncerramento,
                  documentos: [row]
                });
              } else {
                const processoExistente = processosMap.get(processo)!;
                
                // Atualizar última data se for mais recente
                if (processoExistente.ultimaData < dataMovimentacao) {
                  processoExistente.ultimaData = dataMovimentacao;
                  processoExistente.ultimaDataFormatada = dataMovimentacao.toLocaleDateString('pt-BR');
                }
                
                // Marcar homologação e encerramento
                if (temHomologacao) {
                  processoExistente.temHomologacao = true;
                }
                if (temEncerramento) {
                  processoExistente.temEncerramento = true;
                }
                
                // Adicionar documento à lista
                processoExistente.documentos.push(row);
              }
            });
            
            // Calcular dias desde a última movimentação e aplicar filtros
            const dataHoje = new Date();
            let processosFiltrados = Array.from(processosMap.values()).map(processoData => {
              const processarDocumentos = (documentos: CsvHistoricoItem[]) => {
                // Ordenar documentos por data
                const docsOrdenados = [...documentos].sort(
                  (a, b) => new Date(a['Data/Hora']).getTime() - new Date(b['Data/Hora']).getTime()
                );

                // Encontrar a primeira homologação
                const homologacoes = docsOrdenados.filter(doc => doc.Documento?.includes('Homologação'));
                const primeiroDocumento = docsOrdenados[0];

                // Calcular duração até a homologação se houver
                let duracaoAteHomologacao = 0;
                let dataPrimeiraHomologacao = '';
                if (homologacoes.length > 0) {
                  const primeiraHomologacao = homologacoes[0];
                  dataPrimeiraHomologacao = new Date(primeiraHomologacao['Data/Hora']).toLocaleDateString('pt-BR');
                  duracaoAteHomologacao = Math.ceil(
                    (new Date(primeiraHomologacao['Data/Hora']).getTime() - new Date(primeiroDocumento['Data/Hora']).getTime()) / (1000 * 60 * 60 * 24)
                  );
                }

                // Encontrar a primeira ocorrência em GECOMP/CECOMP
                const primeiraChegada = docsOrdenados.find(doc => {
                  const isRemessaParaGecomp = doc.Documento?.toLowerCase().includes('remetido') &&
                    doc.Unidade?.toLowerCase().includes('gecomp');
                  const isRemessaParaCecomp = doc.Documento?.toLowerCase().includes('remetido') &&
                    doc.Unidade?.toLowerCase().includes('cecomp');
                  const isUnidadeGecompCecomp = doc.Unidade === 'SESAU-GECOMP' || doc.Unidade === 'SESAU-CECOMP';
                  
                  return isRemessaParaGecomp || isRemessaParaCecomp || isUnidadeGecompCecomp;
                });

                return {
                  data_chegada: primeiraChegada ? new Date(primeiraChegada['Data/Hora']).toLocaleDateString('pt-BR') : '-',
                  data_primeira_homologacao: dataPrimeiraHomologacao || '-',
                  duracao_ate_homologacao: duracaoAteHomologacao
                };
              };

              const dadosProcessados = processarDocumentos(processoData.documentos);
              const diffTime = Math.abs(dataHoje.getTime() - processoData.ultimaData.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const atrasado = diffDays > 15;
              
              let status = 'Em Andamento';
              
              // Verificar se realmente está encerrado
              let realmenteEncerrado = false;
              if (processoData.temEncerramento) {
                // Encontrar a data do termo de encerramento
                const termosEncerramento = processoData.documentos
                  .filter(doc => doc.Documento?.includes('Termo de Encerramento'))
                  .sort((a, b) => new Date(b['Data/Hora']).getTime() - new Date(a['Data/Hora']).getTime()); // Ordenar por data decrescente
                
                if (termosEncerramento.length > 0) {
                  const dataTermoEncerramento = new Date(termosEncerramento[0]['Data/Hora']);
                  
                  // Contar documentos após o termo de encerramento
                  const documentosAposTermo = processoData.documentos
                    .filter(doc => new Date(doc['Data/Hora']).getTime() > dataTermoEncerramento.getTime())
                    .length;
                  
                  // Considerar encerrado apenas se tiver menos de 2 documentos após o termo
                  realmenteEncerrado = documentosAposTermo < 2;
                }
              }
              
              if (realmenteEncerrado) {
                status = 'Encerrado';
              } else if (processoData.temHomologacao) {
                status = 'Homologado';
              } else if (atrasado) {
                status = 'Atrasado';
              }
              
              // Encontrar a primeira homologação
              const homologacoes = processoData.documentos
                .filter(doc => doc.Documento?.includes('Homologação'))
                .sort((a, b) => new Date(a['Data/Hora']).getTime() - new Date(b['Data/Hora']).getTime()); // Ordenar por data crescente

              // Encontrar o primeiro documento do processo
              const primeiroDocumento = processoData.documentos
                .sort((a, b) => new Date(a['Data/Hora']).getTime() - new Date(b['Data/Hora']).getTime())[0];

              // Calcular duração até a homologação se houver
              let duracaoAteHomologacao = 0;
              let dataPrimeiraHomologacao = '';
              if (homologacoes.length > 0) {
                const primeiraHomologacao = homologacoes[0];
                dataPrimeiraHomologacao = new Date(primeiraHomologacao['Data/Hora']).toLocaleDateString('pt-BR');
                duracaoAteHomologacao = Math.ceil(
                  (new Date(primeiraHomologacao['Data/Hora']).getTime() - new Date(primeiroDocumento['Data/Hora']).getTime()) / (1000 * 60 * 60 * 24)
                );
              }

              // Encontrar a primeira ocorrência em GECOMP/CECOMP
              const primeiraChegada = processoData.documentos
                .sort((a, b) => new Date(a['Data/Hora']).getTime() - new Date(b['Data/Hora']).getTime())
                .find(doc => {
                  // Verifica se o documento indica remessa para GECOMP/CECOMP
                  const isRemessaParaGecomp = doc.Documento?.toLowerCase().includes('remetido') &&
                    doc.Unidade?.toLowerCase().includes('gecomp');
                  
                  // Verifica se o documento indica remessa para CECOMP
                  const isRemessaParaCecomp = doc.Documento?.toLowerCase().includes('remetido') &&
                    doc.Unidade?.toLowerCase().includes('cecomp');
                  
                  // Verifica se é um documento na unidade GECOMP/CECOMP
                  const isUnidadeGecompCecomp = doc.Unidade === 'SESAU-GECOMP' || doc.Unidade === 'SESAU-CECOMP';
                  
                  return isRemessaParaGecomp || isRemessaParaCecomp || isUnidadeGecompCecomp;
                });

              return {
                numero_processo: processoData.processo,
                objeto: processoData.objeto,
                tipo_tr: processoData.tipo_tr,
                ...dadosProcessados,
                data_ultima_movimentacao: processoData.ultimaDataFormatada,
                dias_desde_ultima_movimentacao: diffDays,
                status: status
              };
            });

            // Depois aplicar o filtro baseado no parâmetro da URL
            switch (filtro) {
              case 'homologados':
                processosFiltrados = processosFiltrados.filter(p => p.status === 'Homologado');
                break;
              case 'encerrados':
                processosFiltrados = processosFiltrados.filter(p => p.status === 'Encerrado');
                break;
              case 'em-andamento':
                processosFiltrados = processosFiltrados.filter(p => p.status === 'Em Andamento');
                break;
              case 'atrasados':
                processosFiltrados = processosFiltrados.filter(p => p.status === 'Atrasado');
                break;
              case 'todos':
              default:
                // Mostrar todos os processos
                break;
            }
            
            // Ordenar por data de chegada (do mais recente para o mais antigo)
            processosFiltrados.sort((a, b) => {
              // Se algum dos processos não tem data de chegada, colocar no final
              if (a.data_chegada === '-') return 1;
              if (b.data_chegada === '-') return -1;
              
              // Converter as datas (formato dd/mm/yyyy) para objetos Date
              const dateA = new Date(a.data_chegada.split('/').reverse().join('-'));
              const dateB = new Date(b.data_chegada.split('/').reverse().join('-'));
              
              // Ordenar do mais recente para o mais antigo
              return dateB.getTime() - dateA.getTime();
            });
            
            console.log('Processos filtrados:', processosFiltrados);
            setProcessosOriginal(processosFiltrados);
            setProcessos(processosFiltrados);
            setLoading(false);
          },
          error: (error) => {
            console.error('Erro ao fazer parse do CSV:', error);
            setError('Erro ao processar o arquivo CSV');
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar os processos:', error);
        setError('Erro ao carregar os dados dos processos');
        setLoading(false);
      }
    };

    if (filtro) {
      carregarProcessos();
    }
  }, [filtro])
  ;

  // Efeito para filtrar processos baseado no termo de pesquisa
  useEffect(() => {
    let filtered = [...processosOriginal];

    // Aplicar filtro de texto
    if (searchTerm.trim() !== '') {
      const termLower = searchTerm.toLowerCase();
      filtered = filtered.filter(processo => 
        processo.numero_processo.toLowerCase().includes(termLower) ||
        processo.objeto.toLowerCase().includes(termLower) ||
        processo.tipo_tr.toLowerCase().includes(termLower)
      );
    }

    // Aplicar filtro de data
    if (dataInicial || dataFinal) {
      filtered = filtered.filter(processo => {
        const dataChegada = processo.data_chegada !== '-' ? new Date(processo.data_chegada.split('/').reverse().join('-')) : null;
        
        if (!dataChegada) return false;
        
        if (dataInicial && dataFinal) {
          return dataChegada >= dataInicial && dataChegada <= dataFinal;
        } else if (dataInicial) {
          return dataChegada >= dataInicial;
        } else if (dataFinal) {
          return dataChegada <= dataFinal;
        }
        
        return true;
      });
    }

    setProcessos(filtered);
  }, [searchTerm, processosOriginal, dataInicial, dataFinal]);

  const getFiltroDisplayName = (filtro: string | undefined) => {
    switch (filtro) {
      case 'todos': return 'Todos os Processos';
      case 'homologados': return 'Processos Homologados';
      case 'encerrados': return 'Processos Encerrados';
      case 'em-andamento': return 'Processos em Andamento';
      case 'atrasados': return 'Processos Atrasados';
      default: return 'Processos';
    }
  };

  const exportToExcel = () => {
    // Preparar os dados para o Excel
    const excelData = processos.map(processo => ({
      'Número do Processo': processo.numero_processo,
      'Objeto': processo.objeto,
      'Tipo': processo.tipo_tr,
      'Data de Chegada': processo.data_chegada,
      'Data da Homologação': processo.data_primeira_homologacao,
      'Duração até Homologação (dias)': processo.data_primeira_homologacao ? processo.duracao_ate_homologacao : '-',
      'Status': processo.status
    }));

    // Criar uma nova planilha
    const ws = XLSXUtils.json_to_sheet(excelData);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Processos');

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Número do Processo
      { wch: 50 }, // Objeto
      { wch: 15 }, // Tipo
      { wch: 15 }, // Data de Chegada
      { wch: 15 }, // Data da Homologação
      { wch: 15 }, // Duração
      { wch: 15 }, // Status
    ];
    ws['!cols'] = colWidths;

    // Salvar o arquivo
    XLSXWriteFile(wb, `processos_${filtro}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    // Formato A4 PAISAGEM
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' = landscape (paisagem)
    const pageWidth = pdf.internal.pageSize.getWidth(); // ~297mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm
    const margin = 15;
    
    // Helper function para quebra de linhas
    const splitTextToSize = (text: string, maxWidth: number) => {
      return pdf.splitTextToSize(text, maxWidth);
    };

    const headers = ['Número do Processo', 'Objeto do Processo', 'Tipo', 'Data de Chegada', 'Data da Homologação', 'Duração (dias)', 'Status'];
    const colWidths = [45, 90, 25, 30, 30, 25, 25]; // Larguras ajustadas para paisagem
    
    // Função para desenhar cabeçalho padronizado
    const drawTableHeader = (yPos: number) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0); // Texto preto
      
      let xPosition = margin;
      const headerHeight = 8;
      
      headers.forEach((header, index) => {
        // Desenhar apenas uma linha inferior para separar o cabeçalho
        pdf.line(xPosition, yPos + headerHeight, xPosition + colWidths[index], yPos + headerHeight);
        
        // Texto do cabeçalho
        pdf.text(header, xPosition + 2, yPos + 6);
        xPosition += colWidths[index];
      });
      
      return yPos + headerHeight + 2; // Retorna a nova posição Y
    };
    
    // Configurar fonte para negrito
    pdf.setFont('helvetica', 'bold');
    
    // Cabeçalho principal em azul
    pdf.setFontSize(20);
    pdf.setTextColor(41, 128, 185); // Azul
    const title = `Relatório GECOMP - ${getFiltroDisplayName(filtro)}`;
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, margin + 12);
    
    // Subtítulo
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    const subtitle = `Total de ${processos.length} processos | Data: ${new Date().toLocaleDateString('pt-BR')}`;
    const subtitleWidth = pdf.getTextWidth(subtitle);
    pdf.text(subtitle, (pageWidth - subtitleWidth) / 2, margin + 22);
    
    // Definir posição inicial da tabela
    let yPosition = margin + 35;
    
    // Desenhar cabeçalho da primeira página
    yPosition = drawTableHeader(yPosition);
    
    // Dados da tabela
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    
    processos.forEach((processo, index) => {
      // Calcular altura da linha baseada no objeto (que pode ter múltiplas linhas)
      const objetoLines = splitTextToSize(processo.objeto, colWidths[1] - 4);
      const rowHeight = Math.max(6, objetoLines.length * 4 + 2);
      
      // Verificar se precisa de nova página
      if (yPosition + rowHeight > pageHeight - 25) {
        pdf.addPage();
        yPosition = margin;
        
        // Repetir cabeçalho na nova página usando a função padronizada
        yPosition = drawTableHeader(yPosition);
        
        // Resetar configurações para dados da tabela
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
      }
      
      // Destacar processos com cores diferentes
      if (processo.status === 'Atrasado') {
        pdf.setFillColor(255, 235, 235); // Fundo vermelho claro
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      } else if (processo.status === 'Homologado') {
        pdf.setFillColor(235, 255, 235); // Fundo verde claro
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      } else if (processo.status === 'Encerrado') {
        pdf.setFillColor(245, 245, 245); // Fundo cinza claro
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      }
      
      // Dados da linha
      const rowData = [
        processo.numero_processo,
        processo.objeto, // Objeto completo, será quebrado automaticamente
        processo.tipo_tr,
        processo.data_chegada,
        processo.data_primeira_homologacao || '-',
        processo.data_primeira_homologacao ? processo.duracao_ate_homologacao.toString() : '-',
        processo.status
      ];
      
      let xPosition = margin;
      rowData.forEach((data, dataIndex) => {
        // Destacar dias em vermelho se for atrasado
        if (dataIndex === 4 && processo.status === 'Atrasado') {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(220, 53, 69); // Vermelho
        } else if (dataIndex === 5 && processo.status === 'Homologado') {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(40, 167, 69); // Verde
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
        }
        
        // Implementar quebra de linha para cada célula
        if (dataIndex === 1) { // Coluna do objeto
          const lines = splitTextToSize(data, colWidths[dataIndex] - 4);
          lines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, xPosition + 2, yPosition + 4 + (lineIndex * 4));
          });
        } else {
          // Para outras colunas, quebrar se necessário
          const lines = splitTextToSize(data, colWidths[dataIndex] - 4);
          lines.forEach((line: string, lineIndex: number) => {
            pdf.text(line, xPosition + 2, yPosition + 4 + (lineIndex * 4));
          });
        }
        
        xPosition += colWidths[dataIndex];
      });
      
      yPosition += rowHeight;
    });
    
    // Rodapé
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const footer = `Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Sistema GAD SESAU`;
    pdf.text(footer, margin, pageHeight - 10);
    
    // Salvar o PDF
    const fileName = `processos_${filtro}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-sei-800">
            {getFiltroDisplayName(filtro)}
          </h1>
        </div>
        <Button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          disabled={loading || processos.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>
      
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {getFiltroDisplayName(filtro)} ({processos.length} processos)
              </CardTitle>
              {filtro === 'todos' && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar processos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                          {dataInicial ? format(dataInicial, 'dd/MM/yyyy') : 'Data inicial'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataInicial}
                          onSelect={setDataInicial}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                          {dataFinal ? format(dataFinal, 'dd/MM/yyyy') : 'Data final'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataFinal}
                          onSelect={setDataFinal}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    {(dataInicial || dataFinal) && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setDataInicial(null);
                          setDataFinal(null);
                        }}
                        className="h-8 px-2"
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {!loading && processos.length > 0 && (
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-4">
                Carregando processos...
              </div>
            )}
            {error && (
              <div className="text-center py-4 text-red-500">
                {error}
              </div>
            )}
            
            {!loading && !error && (
              <div className="w-full overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table className="w-full border-collapse">
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="border p-2 min-w-[180px] bg-blue-50">Número do Processo</TableHead>
                        <TableHead className="border p-2 min-w-[300px] bg-blue-50">Objeto</TableHead>
                        <TableHead className="border p-2 min-w-[120px] bg-blue-50">Tipo</TableHead>
                        <TableHead className="border p-2 min-w-[120px] bg-blue-50">Data de Chegada</TableHead>
                        <TableHead className="border p-2 min-w-[140px] bg-blue-50">Data da Homologação</TableHead>
                        <TableHead className="border p-2 min-w-[100px] text-center bg-blue-50">Duração até Homologação (dias)</TableHead>
                        <TableHead className="border p-2 min-w-[120px] text-center bg-blue-50">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="border p-4 text-center">
                            Nenhum processo encontrado para este filtro
                          </TableCell>
                        </TableRow>
                      ) : (
                        processos.map((processo, index) => (
                          <TableRow 
                            key={index}
                            className={
                              processo.status === 'Atrasado' ? 'bg-red-50' : 
                              processo.status === 'Homologado' ? 'bg-green-50' : 
                              processo.status === 'Encerrado' ? 'bg-gray-50' : ''
                            }
                          >
                            <TableCell className="border p-2 font-medium">{processo.numero_processo}</TableCell>
                            <TableCell className="border p-2">
                              <div className="max-w-[300px] break-words" title={processo.objeto}>
                                {processo.objeto}
                              </div>
                            </TableCell>
                            <TableCell className="border p-2">{processo.tipo_tr}</TableCell>
                            {/* ordenar por data_chegada */}
                            <TableCell className="border p-2">{processo.data_chegada}</TableCell>
                            <TableCell className="border p-2">{processo.data_primeira_homologacao || '-'}</TableCell>
                            <TableCell className="border p-2 text-center">
                              {processo.data_primeira_homologacao ? processo.duracao_ate_homologacao : '-'}
                            </TableCell>
                            <TableCell className={`border p-2 text-center font-semibold ${
                              processo.status === 'Atrasado' ? 'text-red-600' : 
                              processo.status === 'Homologado' ? 'text-green-600' : 
                              processo.status === 'Encerrado' ? 'text-gray-600' : 'text-blue-600'
                            }`}>
                              {processo.status}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Gráfico de Média de Duração por Tipo */}
                {processos.length > 0 && filtro === 'homologados' && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChartIcon className="h-5 w-5" />
                        Média de Duração até Homologação por Tipo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(() => {
                              // Agrupar processos por tipo e calcular média
                              const groupedByType = processos.reduce((acc, processo) => {
                                if (!processo.data_primeira_homologacao) return acc;
                                
                                if (!acc[processo.tipo_tr]) {
                                  acc[processo.tipo_tr] = {
                                    total: processo.duracao_ate_homologacao,
                                    count: 1
                                  };
                                } else {
                                  acc[processo.tipo_tr].total += processo.duracao_ate_homologacao;
                                  acc[processo.tipo_tr].count += 1;
                                }
                                return acc;
                              }, {} as { [key: string]: { total: number; count: number } });

                              // Calcular médias e formatar para o gráfico
                              return Object.entries(groupedByType).map(([tipo, { total, count }]) => ({
                                tipo,
                                media: Math.round(total / count)
                              }));
                            })()}
                            margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                          >
                            <XAxis
                              dataKey="tipo"
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              interval={0}
                            />
                            <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
                            <Tooltip
                              formatter={(value) => [`${value} dias`, 'Média']}
                              labelFormatter={(label) => `Tipo: ${label}`}
                            />
                            <Bar
                              dataKey="media"
                              fill="#0c93e4"
                              name="Média de Dias"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProcessosFiltrados; 