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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Papa from 'papaparse';
import Layout from '@/components/Layout';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProcessoPorTipo {
  numero_processo: string;
  objeto: string;
  tipo_tr: string;
  data_ultima_movimentacao: string;
  dias_desde_ultima_movimentacao: number;
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

const ProcessosPorTipo = () => {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoPorTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarProcessos = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Carregando processos para tipo:', tipo);
        
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
            
            // Filtrar dados pelo tipo_tr especificado
            const dadosFiltrados = results.data.filter((row: any) => 
              row['tipo_tr'] === tipo && row['Processo']
            ) as CsvHistoricoItem[];
            
            console.log(`Processos encontrados para tipo ${tipo}:`, dadosFiltrados.length);
            
            // Agrupar por processo e encontrar a última movimentação
            const processosMap = new Map<string, {
              processo: string;
              objeto: string;
              tipo_tr: string;
              ultimaData: Date;
              ultimaDataFormatada: string;
            }>();
            
            dadosFiltrados.forEach((row) => {
              const processo = row['Processo'];
              const dataMovimentacao = new Date(row['Data/Hora']);
              
              if (!processosMap.has(processo) || 
                  processosMap.get(processo)!.ultimaData < dataMovimentacao) {
                processosMap.set(processo, {
                  processo: processo,
                  objeto: row['Objeto'] || 'Objeto não informado',
                  tipo_tr: row['tipo_tr'],
                  ultimaData: dataMovimentacao,
                  ultimaDataFormatada: dataMovimentacao.toLocaleDateString('pt-BR')
                });
              }
            });
            
            // Calcular dias desde a última movimentação
            const dataHoje = new Date();
            const processosComDias = Array.from(processosMap.values()).map(processo => {
              const diffTime = Math.abs(dataHoje.getTime() - processo.ultimaData.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              return {
                numero_processo: processo.processo,
                objeto: processo.objeto,
                tipo_tr: processo.tipo_tr,
                data_ultima_movimentacao: processo.ultimaDataFormatada,
                dias_desde_ultima_movimentacao: diffDays
              };
            });
            
            // Ordenar por dias desde última movimentação (decrescente)
            processosComDias.sort((a, b) => b.dias_desde_ultima_movimentacao - a.dias_desde_ultima_movimentacao);
            
            console.log('Processos processados:', processosComDias);
            setProcessos(processosComDias);
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

    if (tipo) {
      carregarProcessos();
    }
  }, [tipo]);

  const getTipoDisplayName = (tipo: string | undefined) => {
    switch (tipo) {
      case 'Dispensa': return 'Dispensa';
      case 'Emergencial': return 'Emergencial';
      case 'Inexigibilidade': return 'Inexigibilidade';
      case 'Licitatório': return 'Licitatório';
      case 'Licitatório SRP': return 'Licitatório SRP';
      case 'Organização Social': return 'Organização Social';
      default: return tipo || 'Tipo não identificado';
    }
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

    const headers = ['Número do Processo', 'Objeto do Processo', 'Tipo', 'Último Andamento', 'Dias'];
    const colWidths = [50, 120, 35, 40, 25]; // Larguras ajustadas para paisagem
    
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
    const title = `Relatório de Processos GECOMP - ${getTipoDisplayName(tipo)}`;
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
      
      // Destacar processos atrasados
      if (processo.dias_desde_ultima_movimentacao > 15) {
        pdf.setFillColor(255, 235, 235); // Fundo vermelho claro
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F');
      }
      
      // Dados da linha
      const rowData = [
        processo.numero_processo,
        processo.objeto, // Objeto completo, será quebrado automaticamente
        processo.tipo_tr,
        processo.data_ultima_movimentacao,
        processo.dias_desde_ultima_movimentacao.toString()
      ];
      
      let xPosition = margin;
      rowData.forEach((data, dataIndex) => {
        // Destacar dias em vermelho se for atrasado
        if (dataIndex === 4 && processo.dias_desde_ultima_movimentacao > 15) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(220, 53, 69); // Vermelho
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
    const fileName = `processos_${getTipoDisplayName(tipo).replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
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
            Processos - {getTipoDisplayName(tipo)}
          </h1>
           
        </div>
        
        {/* <Button
          onClick={exportToPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          disabled={loading || processos.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button> */}
      </div>
      
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Processos do tipo "{getTipoDisplayName(tipo)}" ({processos.length} processos)
              </CardTitle>
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
                        <TableHead className="border p-2 min-w-[140px] bg-blue-50">Último Andamento</TableHead>
                        <TableHead className="border p-2 min-w-[100px] text-center bg-blue-50">Dias desde Última Movimentação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {processos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="border p-4 text-center">
                          Nenhum processo encontrado para este tipo
                        </TableCell>
                      </TableRow>
                    ) : (
                      processos.map((processo, index) => (
                        <TableRow 
                          key={index}
                          className={processo.dias_desde_ultima_movimentacao > 15 ? 'bg-red-50' : ''}
                        >
                          <TableCell className="border p-2 font-medium">{processo.numero_processo}</TableCell>
                          <TableCell className="border p-2">
                            <div className="max-w-[300px] break-words" title={processo.objeto}>
                              {processo.objeto}
                            </div>
                          </TableCell>
                          <TableCell className="border p-2">{processo.tipo_tr}</TableCell>
                          <TableCell className="border p-2">{processo.data_ultima_movimentacao}</TableCell>
                          <TableCell className={`border p-2 text-center ${processo.dias_desde_ultima_movimentacao > 15 ? 'text-red-600 font-semibold' : ''}`}>
                            {processo.dias_desde_ultima_movimentacao}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProcessosPorTipo; 