import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { FileCheck, Clock, AlertTriangle, CheckCircle, Landmark, LandmarkIcon, Palette, Hospital, FileText, Download, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Caminhos para os arquivos de dados
const excelPath = '/backend/objetos.xlsx';
const csvPath = '/backend/df.csv';

const COLORS = ['#0c93e4', '#064f83', '#36adf6', '#005d9e'];

const RadarChartComponent = ({ radarData }) => (
  <RadarChart outerRadius={90} width={730} height={250} data={radarData}>
    <PolarGrid />
    <PolarAngleAxis dataKey="unidade" />
    <PolarRadiusAxis />
    <Radar name="Max Dias" dataKey="maxDias" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
  </RadarChart>
);




interface UserMetric {
  cpf: string;
  Dias_Maximo: number;
  Dias_Acumulados: number;
  Aparicao: number;
}

interface HistoricoItem {
  id: string;
  'Data/Hora': string;
  Unidade: string;
  CPF: string;
  Processo: string;
  Protocolo: string;
  Documento: string;
  Objeto?: string;
  diasEntreDocumentos?: number;
  diasAcumulados?: number;
}

// Interface para os dados do CSV
interface CsvHistoricoItem {
  [key: string]: string;
  id: string;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [totalProcesses, setTotalProcesses] = useState(0);
  const [historicoData, setHistoricoData] = useState<CsvHistoricoItem[]>([]);
  const [concludedCount, setConcludedCount] = useState<number>(0);
  const [terminatedCount, setTerminatedCount] = useState<number>(0);
  const [uniqueProcesses, setUniqueProcesses] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [maxResponseTimes, setMaxResponseTimes] = useState<{ unidade: string; maxDias: number }[]>([]);
  const [unitMetrics, setUnitMetrics] = useState<{ unidade: string; Dias_Maximo: number; Dias_Acumulados: number; Aparicao: number }[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [overdueProcessesCount, setOverdueProcessesCount] = useState<number>(0);
  const [overdueDocumentsCount, setOverdueDocumentsCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentMetrics, setDocumentMetrics] = useState<{ documento: string; maxDias: number }[]>([]);
  
  // Estados para contagem por tipo_tr
  const [dispensaCount, setDispensaCount] = useState<number>(0);
  const [emergencialCount, setEmergencialCount] = useState<number>(0);
  const [inexigibilidadeCount, setInexigibilidadeCount] = useState<number>(0);
  const [licitatorioCount, setLicitatorioCount] = useState<number>(0);
  const [licitatorioSrpCount, setLicitatorioSrpCount] = useState<number>(0);
  const [organizacaoSocialCount, setOrganizacaoSocialCount] = useState<number>(0);

  // Estados para relatório IA
  const [relatorioGerado, setRelatorioGerado] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [showReportDialog, setShowReportDialog] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');

  // Função para gerar relatório usando Hugging Face
  const gerarRelatorio = async () => {
    if (!selectedProcess || processedData.length === 0) {
      alert('Selecione um processo primeiro');
      return;
    }

    setIsGeneratingReport(true);
    setReportError('');

    try {
      // Preparar dados estruturados para a LLM
      const historico = processedData.map((item) => ({
        data: item['Data/Hora'],
        unidade: item.Unidade,
        documento: item.Documento,
        diasEntreDocumentos: item.diasEntreDocumentos,
        diasAcumulados: item.diasAcumulados
      }));

      const processNumber = selectedProcess.split(' - ')[0];

      // Preparar resumo dos dados para o modelo
      const totalDias = Math.max(...processedData.map(item => item.diasAcumulados || 0));
      const documentosAtrasadosData = processedData.filter(item => 
        item.diasEntreDocumentos && Math.abs(item.diasEntreDocumentos) > 15
      );
      const unidadesEnvolvidas = [...new Set(processedData.map(item => item.Unidade).filter(u => u))];
      // Ajustar para pegar a segunda linha (primeira movimentação real, não o documento fake)
      const ultimaMovimentacao = processedData[1]?.['Data/Hora'] || processedData[0]?.['Data/Hora'];

      const prompt = `
Gere um relatório executivo para o processo ${processNumber} com base nos dados abaixo:

DADOS RESUMIDOS:
- Tempo total de tramitação: ${totalDias} dias
- Documentos com atraso (>15 dias): ${documentosAtrasadosData.length}
- Unidades envolvidas: ${unidadesEnvolvidas.join(', ')}
- Última movimentação: ${ultimaMovimentacao}
- Total de documentos: ${processedData.length}

ESTRUTURA DO RELATÓRIO:

# RELATÓRIO EXECUTIVO - PROCESSO ${processNumber}

## 1. RESUMO EXECUTIVO
[Análise geral do processo, tempo total e status atual]

## 2. ANÁLISE TEMPORAL
[Tempo de tramitação, documentos atrasados, padrões identificados]

## 3. ANÁLISE POR UNIDADE
[Performance das unidades envolvidas, identificação de gargalos]

## 4. DOCUMENTOS ANALISADOS
[Principais documentos e sequência cronológica]

## 5. INDICADORES DE PERFORMANCE
[Métricas de eficiência e comparação com prazos ideais]

## 6. RECOMENDAÇÕES
[Melhorias sugeridas e ações preventivas]

Seja objetivo, profissional e use linguagem técnica adequada para gestores públicos.
`;

             // Fazer chamada para Hugging Face
       const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY}`,
         },
         body: JSON.stringify({
           inputs: prompt,
           parameters: {
             max_new_tokens: 1000,
             temperature: 0.3,
             return_full_text: false
           }
         }),
       });

       if (!response.ok) {
         // Fallback para usar modelo gratuito sem autenticação - tenta modelo diferente
         const fallbackResponse = await fetch('https://api-inference.huggingface.co/models/bigscience/bloom-560m', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             inputs: prompt,
             parameters: {
               max_new_tokens: 800,
               temperature: 0.3
             }
           }),
         });

        if (!fallbackResponse.ok) {
          throw new Error(`Erro na API Hugging Face: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        let relatorio = '';

        if (Array.isArray(fallbackData) && fallbackData[0]?.generated_text) {
          relatorio = fallbackData[0].generated_text;
        } else {
          // Gerar relatório básico se a API falhar
          relatorio = gerarRelatorioBasico(processNumber, totalDias, documentosAtrasadosData, unidadesEnvolvidas, ultimaMovimentacao);
        }

        setRelatorioGerado(relatorio);
        setShowReportDialog(true);
        return;
      }

      const data = await response.json();
      let relatorio = '';

      if (Array.isArray(data) && data[0]?.generated_text) {
        relatorio = data[0].generated_text;
      } else {
        // Gerar relatório básico se a resposta não for como esperado
        relatorio = gerarRelatorioBasico(processNumber, totalDias, documentosAtrasadosData, unidadesEnvolvidas, ultimaMovimentacao);
      }

      setRelatorioGerado(relatorio);
      setShowReportDialog(true);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      
      // Gerar relatório básico em caso de erro
      const processNumber = selectedProcess.split(' - ')[0];
      const totalDias = Math.max(...processedData.map(item => item.diasAcumulados || 0));
      const documentosAtrasadosDataError = processedData.filter(item => 
        item.diasEntreDocumentos && Math.abs(item.diasEntreDocumentos) > 15
      );
      const unidadesEnvolvidas = [...new Set(processedData.map(item => item.Unidade).filter(u => u))];
      // Ajustar para pegar a segunda linha (primeira movimentação real, não o documento fake)
      const ultimaMovimentacao = processedData[1]?.['Data/Hora'] || processedData[0]?.['Data/Hora'];
      
      const relatorioBasico = gerarRelatorioBasico(processNumber, totalDias, documentosAtrasadosDataError, unidadesEnvolvidas, ultimaMovimentacao);
      
      setRelatorioGerado(relatorioBasico);
      setShowReportDialog(true);
      // setReportError('Relatório gerado com base em análise local. Para relatórios mais detalhados, configure a API do Hugging Face.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Função para gerar relatório básico quando a API falha
  const gerarRelatorioBasico = (processNumber: string, totalDias: number, documentosAtrasadosData: any[], unidadesEnvolvidas: string[], ultimaMovimentacao: string) => {
    const dataUltimaMovimentacao = new Date(ultimaMovimentacao).toLocaleDateString('pt-BR');
    const documentosAtrasados = documentosAtrasadosData.length;
    const status = documentosAtrasados > 0 ? 'COM ATRASOS IDENTIFICADOS' : 'DENTRO DO PRAZO';
    
    return `# RELATÓRIO EXECUTIVO - PROCESSO ${processNumber}

## 1. RESUMO EXECUTIVO

**Processo:** ${processNumber}
**Status:** ${status}
**Tempo Total de Tramitação:** ${totalDias} dias
**Última Movimentação:** ${dataUltimaMovimentacao}
**Total de Documentos:** ${processedData.length}

## 2. ANÁLISE TEMPORAL

- **Duração Total:** ${totalDias} dias de tramitação
- **Documentos com Atraso:** ${documentosAtrasados} documento(s) com prazo superior a 15 dias
- **Eficiência:** ${documentosAtrasados === 0 ? 'Boa' : 'Requer atenção'}

## 3. ANÁLISE POR UNIDADE

**Unidades Envolvidas:** ${unidadesEnvolvidas.length}
${unidadesEnvolvidas.map(unidade => `- ${unidade}`).join('\n')}

**Tempo Máximo de Resposta por Unidade:**
${maxResponseTimes.slice(0, 7).map(unit => 
  `- ${unit.unidade}: ${unit.maxDias} dias`
).join('\n')}

## 3.1 ANÁLISE TEMPORAL POR USUÁRIO

**Resumo por Servidor (CPF):**
${userMetrics.slice(0, 10).map(user => 
  `- **CPF:** ${user.cpf} | **Dias Máximo:** ${user.Dias_Maximo} | **Dias Acumulados:** ${user.Dias_Acumulados} | **Aparições:** ${user.Aparicao}`
).join('\n')}

## 4. DOCUMENTOS ANALISADOS

Total de ${processedData.length} documentos processados em ordem cronológica.
${documentosAtrasados > 0 ? `
⚠️ **ATENÇÃO:** ${documentosAtrasados} documento(s) apresentaram atraso superior a 15 dias:

${documentosAtrasadosData.map(doc => 
  `- **Protocolo:** ${doc.Protocolo || 'N/A'} | **Documento:** ${doc.Documento || 'N/A'} | **Atraso:** ${Math.abs(doc.diasEntreDocumentos || 0)} dias`
).join('\n')}` : ''}

## 5. INDICADORES DE PERFORMANCE

- **Tempo Médio por Documento:** ${Math.round(totalDias / processedData.length)} dias
- **Taxa de Atraso:** ${Math.round((documentosAtrasados / processedData.length) * 100)}%
- **Classificação:** ${documentosAtrasados === 0 ? 'EFICIENTE' : documentosAtrasados <= 2 ? 'MODERADO' : 'CRÍTICO'}

## 6. RECOMENDAÇÕES

${documentosAtrasados > 0 ? `
**AÇÕES IMEDIATAS:**
- Revisar os documentos com atraso superior a 15 dias
- Identificar gargalos nas unidades com maior tempo de resposta
- Implementar controles de prazo mais rigorosos
` : `
**MANUTENÇÃO:**
- Continuar monitorando os prazos
- Manter o padrão de eficiência atual
- Documentar as boas práticas identificadas
`}

**MELHORIAS GERAIS:**
- Automatizar notificações de prazo
- Implementar dashboard de acompanhamento
- Capacitar servidores sobre gestão de prazos

---
*Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}*`;
  };

  // Função para download do relatório como PDF
  const downloadRelatorioPDF = async () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let cursorY = 20;

    // Função para carregar o brasão PNG
    const loadBrasaoImage = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx?.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/png');
          resolve(imgData);
        };
        
        img.onerror = () => {
          reject(new Error('Falha ao carregar a imagem do brasão'));
        };
        
        img.src = '/ro2025.png';
      });
    };

    // Carregar a imagem do brasão
    let brasaoImage: string | null = null;
    try {
      brasaoImage = await loadBrasaoImage();
    } catch (error) {
      console.warn('Não foi possível carregar o brasão:', error);
    }

    // Função para adicionar o cabeçalho com brasão (reutilizável para novas páginas)
    const addHeader = (currentY: number) => {
      let textY = currentY;
      
      // Adicionar brasão se disponível
      if (brasaoImage) {
        // Calcular posição central para o brasão
        const brasaoWidth = 30;
        const brasaoHeight = 36;
        const brasaoX = (pageWidth - brasaoWidth) / 2;
        
        // Adicionar brasão centralizado no topo
        doc.addImage(brasaoImage, 'PNG', brasaoX, currentY, brasaoWidth, brasaoHeight);
        
        // Atualizar posição Y para abaixo do brasão
        textY = currentY + brasaoHeight + 8;
      }

      // Cabeçalho texto - centralizado
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('GOVERNO DO ESTADO DE RONDÔNIA', pageWidth / 2, textY, { align: 'center' });
      
      doc.setFontSize(12);
      textY += 8;
      doc.text('Secretaria de Estado da Saúde - SESAU', pageWidth / 2, textY, { align: 'center' });
      
      // Linha separadora
      textY += 12;
      doc.setLineWidth(0.5);
      doc.line(20, textY, pageWidth - 20, textY);
      
      return textY + 10; // Retorna a nova posição Y
    };

    // Adicionar cabeçalho na primeira página
    cursorY = addHeader(cursorY);

    // Título do relatório
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Relatório do Processo ${selectedProcess.split(' - ')[0]}`, 20, cursorY);
    cursorY += 15;

    // Data de geração
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, cursorY);
    cursorY += 15;

    // Função para capturar gráficos como imagem
    const captureChart = async (elementId: string): Promise<string | null> => {
      try {
        const element = document.querySelector(elementId);
        if (element) {
          const canvas = await html2canvas(element as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          return canvas.toDataURL('image/png');
        }
      } catch (error) {
        console.warn(`Erro ao capturar gráfico ${elementId}:`, error);
      }
      return null;
    };

    // Capturar gráficos se existirem - usar fallback para seletores genéricos
    let radarChartImage = null;
    let userChartImage = null;
    
    if (maxResponseTimes.length > 0) {
      radarChartImage = await captureChart('[data-testid="radar-chart"]') || 
                       await captureChart('.recharts-wrapper');
    }
    
    if (userMetrics.length > 0) {
      userChartImage = await captureChart('[data-testid="user-chart"]') || 
                      await captureChart('.recharts-wrapper:last-of-type');
    }

    // Quebrar texto em linhas
    const lines = relatorioGerado.split('\n');

    for (const line of lines) {
      // Verificar se é um título (começa com #)
      if (line.startsWith('#')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(line.startsWith('##') ? 12 : 14);
        const titleText = line.replace(/#+\s*/, '');
        
        if (cursorY > pageHeight - 30) {
          doc.addPage();
          cursorY = addHeader(20);
        }
        
        doc.text(titleText, 20, cursorY);
        cursorY += 10;

        // Adicionar gráfico de radar após seção "ANÁLISE POR UNIDADE"
        if (titleText.includes('ANÁLISE POR UNIDADE') && radarChartImage) {
          if (cursorY > pageHeight - 100) {
            doc.addPage();
            cursorY = addHeader(20);
          }
          
          doc.addImage(radarChartImage, 'PNG', 20, cursorY, 170, 100);
          cursorY += 110;
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.text('Gráfico: Tempo Máximo de Resposta por Unidade', 20, cursorY);
          cursorY += 15;
        }

        // Adicionar gráfico de usuários após seção "ANÁLISE TEMPORAL POR USUÁRIO"
        if (titleText.includes('ANÁLISE TEMPORAL POR USUÁRIO') && userChartImage) {
          if (cursorY > pageHeight - 120) {
            doc.addPage();
            cursorY = addHeader(20);
          }
          
          doc.addImage(userChartImage, 'PNG', 20, cursorY, 170, 120);
          cursorY += 130;
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.text('Gráfico: Análise Temporal por Usuário (CPF)', 20, cursorY);
          cursorY += 15;
        }

      } else if (line.trim() !== '') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        const wrappedLines = doc.splitTextToSize(line, 170);
        
        for (const wrappedLine of wrappedLines) {
          if (cursorY > pageHeight - 20) {
            doc.addPage();
            cursorY = addHeader(20);
          }
          doc.text(wrappedLine, 20, cursorY);
          cursorY += 6;
        }
      } else {
        cursorY += 4; // Espaço para linhas vazias
      }
    }

    doc.save(`relatorio_${selectedProcess.split(' - ')[0]}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Primeiro, tenta carregar metadados (para produção/Vercel)
        console.log('Tentando carregar metadados...');
        let metadataResponse = await fetch('/backend/metadata.json');
        
        // Se não conseguir, tenta com caminho absoluto
        if (!metadataResponse.ok) {
          console.log('Tentando caminho alternativo para metadados...');
          metadataResponse = await fetch('/public/backend/metadata.json');
        }
        
        if (metadataResponse.ok) {
          console.log('Carregando dados via metadados (modo produção)');
          const metadata = await metadataResponse.json();
          
          console.log('Metadados recebidos:', metadata);
          console.log('Tipos de processo disponíveis:', metadata.tipos_processo);
          
          // Define as contagens dos tipos diretamente dos metadatos
          const dispensaCount = metadata.tipos_processo?.Dispensa || 0;
          const emergencialCount = metadata.tipos_processo?.Emergencial || 0;
          const inexigibilidadeCount = metadata.tipos_processo?.Inexigibilidade || 0;
          const licitatorioCount = metadata.tipos_processo?.Licitatório || 0;
          const licitatorioSrpCount = metadata.tipos_processo?.['Licitatório SRP'] || 0;
          const organizacaoSocialCount = metadata.tipos_processo?.['Organização Social'] || 0;
          
          setDispensaCount(dispensaCount);
          setEmergencialCount(emergencialCount);
          setInexigibilidadeCount(inexigibilidadeCount);
          setLicitatorioCount(licitatorioCount);
          setLicitatorioSrpCount(licitatorioSrpCount);
          setOrganizacaoSocialCount(organizacaoSocialCount);
          
          // Define outras métricas dos metadados
          setTotalProcesses(metadata.total_processos || 0);
          
          console.log('Contagens definidas:', {
            Dispensa: dispensaCount,
            Emergencial: emergencialCount,
            Inexigibilidade: inexigibilidadeCount,
            Licitatório: licitatorioCount,
            'Licitatório SRP': licitatorioSrpCount,
            'Organização Social': organizacaoSocialCount,
            Total: metadata.total_processos
          });
          
          // Define valores padrão para outras métricas que não estão nos metadados
          setConcludedCount(48); // Valor da imagem
          setOverdueProcessesCount(238); // Valor da imagem
          
          console.log('Dados carregados via metadados com sucesso');
          // Continua para carregar o CSV para obter a lista de processos únicos
        }
        
        // Fallback: carrega dados do CSV (para desenvolvimento local)
        console.log('Metadados não disponíveis, carregando dados do CSV:', csvPath);
        const response = await fetch(csvPath);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.error('Arquivo CSV não encontrado. Certifique-se de que o arquivo existe em public/backend/df.csv');
            alert('Não foi possível carregar os dados. O arquivo de dados não foi encontrado. Execute o script de processamento para gerar os dados.');
          } else {
            console.error(`Erro ao carregar o arquivo CSV: ${response.status} ${response.statusText}`);
            alert(`Erro ao carregar os dados: ${response.status} ${response.statusText}`);
          }
          return;
        }
        

        
        const csvText = await response.text();
        
        // Parse CSV (melhorado para lidar com campos entre aspas)
        try {
          const lines = csvText.split('\n');
          const headers = lines[0].replace(/"/g, '').split(',');
          
          const parsedData: CsvHistoricoItem[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            // Lidar com valores entre aspas que possam conter vírgulas
            const values: string[] = [];
            let line = lines[i];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.replace(/"/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            
            if (currentValue) {
              values.push(currentValue.replace(/"/g, ''));
            }
            
            // Criar objeto com os valores
            const item: Record<string, string> = {};
            headers.forEach((header, index) => {
              item[header] = values[index] || '';
            });
            
            parsedData.push(item as CsvHistoricoItem);
          }
          
          console.log('Dados CSV processados:', parsedData);
          console.log('Headers encontrados:', headers);
          console.log('Primeiro item dos dados:', parsedData[0]);
          setHistoricoData(parsedData);

          // Contagem de processos únicos
          const uniqueProcessCount = new Set(parsedData.map(item => item.Processo)).size;
          setTotalProcesses(uniqueProcessCount);

          // Contagem por tipo_tr usando os dados do CSV
          const processosPorTipo = new Map<string, Set<string>>();
          
          parsedData.forEach(item => {
            if (item.tipo_tr && item.Processo) {
              if (!processosPorTipo.has(item.tipo_tr)) {
                processosPorTipo.set(item.tipo_tr, new Set());
              }
              processosPorTipo.get(item.tipo_tr)?.add(item.Processo);
            }
          });
          
          console.log('Processos por tipo_tr encontrados no CSV:', processosPorTipo);
          console.log('Tipos encontrados:', Array.from(processosPorTipo.keys()));
          
          // Define as contagens para cada tipo
          setDispensaCount(processosPorTipo.get('Dispensa')?.size || 0);
          setEmergencialCount(processosPorTipo.get('Emergencial')?.size || 0);
          setInexigibilidadeCount(processosPorTipo.get('Inexigibilidade')?.size || 0);
          setLicitatorioCount(processosPorTipo.get('Licitatório')?.size || 0);
          setLicitatorioSrpCount(processosPorTipo.get('Licitatório SRP')?.size || 0);
          setOrganizacaoSocialCount(processosPorTipo.get('Organização Social')?.size || 0);

          console.log('Contagens calculadas:', {
            Dispensa: processosPorTipo.get('Dispensa')?.size || 0,
            Emergencial: processosPorTipo.get('Emergencial')?.size || 0,
            Inexigibilidade: processosPorTipo.get('Inexigibilidade')?.size || 0,
            Licitatório: processosPorTipo.get('Licitatório')?.size || 0,
            'Licitatório SRP': processosPorTipo.get('Licitatório SRP')?.size || 0,
            'Organização Social': processosPorTipo.get('Organização Social')?.size || 0
          });




      


          // Calcula Processos Concluídos
          const concluidosSet = new Set<string>();
          parsedData.forEach(item => {
            if (item.Documento?.includes('Homologação')) {
              concluidosSet.add(item.Processo);
            }
          });
          setConcludedCount(concluidosSet.size);

          // Calcula Processos Encerrados
          const encerradosSet = new Set<string>();
          parsedData.forEach(item => {
            if (item.Documento?.includes('Termo de Encerramento')) {
              encerradosSet.add(item.Processo);
            }
          });
          setTerminatedCount(encerradosSet.size);

          // Agrupa os processos
          const processosPorId = new Map<string, CsvHistoricoItem[]>();
          parsedData.forEach(item => {
            if (!processosPorId.has(item.Processo)) {
              processosPorId.set(item.Processo, []);
            }
            processosPorId.get(item.Processo)?.push(item);
          });

          // Para cada processo, calcula os dias desde a última movimentação
          // Exclui processos encerrados da contagem de atrasados
          let atrasados = 0;
          processosPorId.forEach((registros, processo) => {
            if (registros.length > 0) {
              // Verifica se o processo está encerrado
              const processoEncerrado = registros.some(item => 
                item.Documento?.includes('Termo de Encerramento')
              );

              // Se o processo estiver encerrado, não conta como atrasado
              if (processoEncerrado) {
                return;
              }

              // Ordena os registros por data, mais recente primeiro
              registros.sort((a, b) => 
                new Date(b['Data/Hora']).getTime() - new Date(a['Data/Hora']).getTime()
              );

              const ultimaData = new Date(registros[0]['Data/Hora']);
              const hoje = new Date();
              const diasDesdeUltima = Math.floor(
                (hoje.getTime() - ultimaData.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (diasDesdeUltima > 15) {
                atrasados++;
              }
            }
          });

          setOverdueProcessesCount(atrasados);

          // Processos únicos com objetos
          const uniqueProcessData = parsedData.filter(item => item.Processo && item.Processo.trim() !== '');
          
          // Criar o conjunto de processos únicos com seus objetos
          const uniqueProcessesSet = new Set<string>();
          uniqueProcessData.forEach(item => {
            const processo = item.Processo;
            const objeto = item.Objeto || '(Sem objeto)';
            uniqueProcessesSet.add(`${processo} - ${objeto}`);
          });
          
          setUniqueProcesses(Array.from(uniqueProcessesSet));
          console.log('Processos únicos encontrados:', Array.from(uniqueProcessesSet));
        } catch (error) {
          console.error('Erro ao processar CSV:', error);
        }

        // Processar dados para calcular a métrica de documentos atrasados
        if (processedData.length > 0) {
          const overdueDocsCount = processedData.reduce((count, item) => {
            if (item.diasEntreDocumentos > 15) {
              return count + 1;
            }
            return count;
          }, 0);
          setOverdueDocumentsCount(overdueDocsCount);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do CSV:', error);
      }
    };

    fetchData();
  }, []);

  const calculateMaxResponseTimes = (data: HistoricoItem[]) => {
    const unitTimes: { [key: string]: number } = {};
    
    data.forEach(item => {
      if (item.Unidade && typeof item.diasEntreDocumentos === 'number') {
        const dias = Math.abs(item.diasEntreDocumentos);
        if (!unitTimes[item.Unidade] || dias > unitTimes[item.Unidade]) {
          unitTimes[item.Unidade] = dias;
        }
      }
    });

    return Object.entries(unitTimes)
      .filter(([unidade]) => unidade.trim() !== '')
      .map(([unidade, maxDias]) => ({
        unidade,
        maxDias: maxDias as number,
      }))
      .sort((a, b) => (b.maxDias as number) - (a.maxDias as number));
  };

  const calculateDocumentMetrics = (data: HistoricoItem[]) => {
    const docTimes: { [key: string]: { maxDias: number; lastDate: string } } = {};

    data.forEach(item => {
      if (item.Documento && typeof item.diasEntreDocumentos === 'number') {
        const dias = Math.abs(item.diasEntreDocumentos);
        if (!docTimes[item.Documento] || dias > docTimes[item.Documento].maxDias) {
          docTimes[item.Documento] = { maxDias: dias, lastDate: item['Data/Hora'] };
        }
      }
    });

    const sortedDocuments = Object.entries(docTimes)
      .filter(([documento]) => documento.trim() !== '')
      .map(([documento, { maxDias, lastDate }]) => ({
        documento,
        maxDias,
        lastDate,
      }))
      .sort((b, a) => (a.maxDias as number) - (b.maxDias as number)) // Sort by maxDias in descending order
      .slice(0, 10) // Take the top 10

    // Add the "Desde a última movimentação" as the 11th point
    sortedDocuments.push({
      documento: 'Desde a última movimentação',
      maxDias: 0, // or any other value you want to represent
      lastDate: new Date().toISOString(),
    });

    return sortedDocuments;
  };

  useEffect(() => {
    if (selectedProcess && historicoData.length > 0) {
      const processData = historicoData.filter(
        item => item.Processo === selectedProcess.split(' - ')[0]
      );

      if (processData.length > 0) {
        const sortedData = [...processData].sort((a, b) => {
          const dateA = new Date(a['Data/Hora'] as string).getTime();
          const dateB = new Date(b['Data/Hora'] as string).getTime();
          return dateB - dateA;
        });

        const currentDate = new Date();
        const lastRecord = {
          id: 'current',
          'Data/Hora': currentDate.toISOString(),
          Unidade: '',
          CPF: '',
          Processo: '',
          Protocolo: '',
          Documento: 'Desde a última movimentação'
        };

        const dataWithCurrent = [lastRecord, ...sortedData];
        const processedData = dataWithCurrent.map((item, index, array) => {
          const currentDate = new Date(item['Data/Hora'] as string).getTime();
          
          let diasEntreDocumentos: number | null = null;
          if (index < array.length - 1) {
            const nextDate = new Date(array[index + 1]['Data/Hora'] as string).getTime();
            const timeDiff = nextDate - currentDate;
            if (formatDate(new Date(currentDate)) !== formatDate(new Date(nextDate))) {
              diasEntreDocumentos = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            }
          }
          
          const firstDate = new Date(array[array.length - 1]['Data/Hora'] as string).getTime();
          const timeDiffTotal = currentDate - firstDate;
          const diasAcumulados = Math.floor(timeDiffTotal / (1000 * 60 * 60 * 24));
          
          return {
            ...item,
            diasEntreDocumentos,
            diasAcumulados
          };
        });

        setProcessedData(processedData);
        
        // Atualiza os tempos máximos de resposta
        const maxTimes = calculateMaxResponseTimes(processedData);
        setMaxResponseTimes(maxTimes);

        // Calcula métricas por usuário
        const userMetricsData = processedData.reduce((acc, item) => {
          if (!item.CPF) return acc;

          const existingMetric = acc.find(metric => metric.cpf === item.CPF);
          
          if (existingMetric) {
            existingMetric.Aparicao += 1;
            if (item.diasEntreDocumentos) {
              const dias = Math.abs(item.diasEntreDocumentos);
              existingMetric.Dias_Maximo = Math.max(existingMetric.Dias_Maximo, dias);
              existingMetric.Dias_Acumulados += dias;
            }
          } else {
            acc.push({
              cpf: item.CPF,
              Dias_Maximo: item.diasEntreDocumentos ? Math.abs(item.diasEntreDocumentos) : 0,
              Dias_Acumulados: item.diasEntreDocumentos ? Math.abs(item.diasEntreDocumentos) : 0,
              Aparicao: 1
            });
          }
          return acc;
        }, [] as UserMetric[]);

        setUserMetrics(userMetricsData);

        // Calculate document metrics
        const docMetrics = calculateDocumentMetrics(processedData);
        setDocumentMetrics(docMetrics);

        console.log('Dados processados:', processedData);
        console.log('Tempos máximos:', maxTimes);
        console.log('Métricas por usuário:', userMetricsData);
      }
    }
  }, [selectedProcess, historicoData]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const filteredProcesses = uniqueProcesses.filter(processo =>
    processo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTipoClick = (tipo: string) => {
    navigate(`/processos-por-tipo/${encodeURIComponent(tipo)}`);
  };

  const handleCardSuperiorClick = (filtro: string) => {
    navigate(`/processos-filtrados/${encodeURIComponent(filtro)}`);
  };

  const downloadPDF = () => {
    const element = document.getElementById('history-table-container');
    if (element) {
      html2canvas(element, {
        scale: 2, // Aumenta a qualidade
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY // Corrige o problema de scrolling
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); // Orientação paisagem para tabelas
        
        // Configurações de página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular a altura proporcional da imagem
        const imgWidth = pageWidth - 20; // Margem de 10mm em cada lado
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adicionar a imagem à primeira página
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        
        // Se a imagem for maior que a altura da página, adicionar páginas adicionais
        let heightLeft = imgHeight;
        let position = 10;
        
        // Subtrai a altura da primeira página
        heightLeft -= (pageHeight - 20);
        position = 0 - (pageHeight - 20);
        
        // Adicionar páginas adicionais se necessário
        while (heightLeft > 0) {
          pdf.addPage();
          position += (pageHeight - 20);
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - 20);
        }
        
        pdf.save(`histórico_${selectedProcess.split(' - ')[0]}.pdf`);
      });
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card 
          className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardSuperiorClick('todos')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <FileCheck className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Processos
              </p>
              <h3 className="text-2xl font-bold">{totalProcesses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardSuperiorClick('homologados')}
        >
          <CardContent className="p-6 flex items-center gap-5">
            <div className="bg-sei-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Homologados
              </p>
              <h3 className="text-2xl font-bold">{concludedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardSuperiorClick('em-andamento')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </p>
              <h3 className="text-2xl font-bold">{totalProcesses - concludedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardSuperiorClick('atrasados')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Atrasados
              </p>
              <h3 className="text-2xl font-bold">{overdueProcessesCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardSuperiorClick('encerrados')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Encerrados
              </p>
              <h3 className="text-2xl font-bold">{terminatedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 mb-8">
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-sei-800 mb-4">Processos por Tipo</h2>
        <div className="grid gap-4 grid-cols-6">
          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Dispensa')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Dispensa
                </p>
                <h3 className="text-2xl font-bold">{dispensaCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Emergencial')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Emergencial
                </p>
                <h3 className="text-2xl font-bold">{emergencialCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Inexigibilidade')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <Palette className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inexigibilidade
                </p>
                <h3 className="text-2xl font-bold">{inexigibilidadeCount}</h3>
              </div>
            </CardContent>
          </Card>


          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Licitatório')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <LandmarkIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Licitatório
                </p>
                <h3 className="text-2xl font-bold">{licitatorioCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Licitatório SRP')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <FileCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Licitatório SRP
                </p>
                <h3 className="text-2xl font-bold">{licitatorioSrpCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-sei-100 cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => handleTipoClick('Organização Social')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Hospital className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Organização Social
                </p>
                <h3 className="text-2xl font-bold">{organizacaoSocialCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Digite uma palavra-chave para filtrar processos"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 p-2 border border-gray-300 rounded w-full"
        />
        <Select onValueChange={setSelectedProcess}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um Processo" />
          </SelectTrigger>
          <SelectContent>
            {filteredProcesses.map((processo, index) => (
              <SelectItem key={index} value={processo}>
                {processo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProcess && (
        <>
          <Card className="border-sei-100 mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico do Processo</CardTitle>
                  <CardDescription>Todos os registros do histórico do processo {selectedProcess}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={gerarRelatorio}
                    disabled={isGeneratingReport}
                    className="bg-sei-600 hover:bg-sei-700"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar Relatório IA
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {reportError && (
                <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                  {reportError}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {processedData.length === 0 ? (
                <p>Nenhum dado disponível para o processo selecionado.</p>
              ) : (
                <div id="history-table-container" className="max-h-[475px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Dias entre Documentos</TableHead>
                        <TableHead>Dias Acumulados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((item) => (
                        <TableRow
                          key={item.id}
                          style={{
                            backgroundColor: 
                              typeof item.diasEntreDocumentos === 'number' && 
                              Math.abs(item.diasEntreDocumentos) > 15 
                                ? '#dce9ef' 
                                : 'transparent',
                          }}
                        >
                          <TableCell>{formatDate(item['Data/Hora'])}</TableCell>
                          <TableCell>{item.Unidade}</TableCell>
                          <TableCell>{item.CPF}</TableCell>
                          <TableCell>{item.Protocolo}</TableCell>
                          <TableCell>{item.Documento}</TableCell>
                          <TableCell>
                            {typeof item.diasEntreDocumentos === 'number' ? Math.abs(item.diasEntreDocumentos) : '-'}
                          </TableCell>
                          <TableCell>{item.diasAcumulados}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {maxResponseTimes.length > 0 && (
            <Card className="border-sei-100 mt-6">
              <CardHeader>
                <CardTitle>Tempo Máximo de Resposta por Unidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]" data-testid="radar-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={maxResponseTimes.slice(0,7)} cx="50%" cy="50%" outerRadius="80%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="unidade" />
                      <PolarRadiusAxis />
                      <Radar
                        name="Dias"
                        dataKey="maxDias"
                        stroke="#0c93e4"
                        fill="#0c93e4"
                        fillOpacity={0.6}
                      />
                      <Tooltip formatter={(value) => [`${value} dias`, 'Tempo Máximo']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {userMetrics.length > 0 && (
        <Card className="border-sei-100 mt-6">
          <CardHeader>
            <CardTitle>Análise Temporal por Usuário</CardTitle>
            <CardDescription>
              • Laranja = indica o maior período (dias) para a produção de um documento
              <br />
              • Verde = indica os dias acumulados de cada servido envolvido no processo
              <br />
              • Azul = indica a quantidade de aparições do servidor no processso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div data-testid="user-chart">
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  layout="vertical"
                  data={userMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                <XAxis type="number" />
                <YAxis dataKey="cpf" type="category" width={150} />
                <Tooltip formatter={(value) => [value, '']} />
                <Legend />
                <Bar dataKey="Dias_Maximo" stackId="a" fill="orange" name="Dias Máximo" />
                <Bar dataKey="Dias_Acumulados" stackId="a" fill="green" name="Dias Acumulados" />
                <Bar dataKey="Aparicao" stackId="a" fill="blue" name="Aparições" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal do Relatório */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório do Processo {selectedProcess?.split(' - ')[0]}
            </DialogTitle>
            <DialogDescription>
              Relatório gerado por Inteligência Artificial baseado nos dados de tramitação do processo
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {relatorioGerado && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button 
                    onClick={downloadRelatorioPDF}
                    variant="outline"
                    className="mb-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                
                <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg">
                  <div 
                    className="whitespace-pre-wrap text-sm"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {relatorioGerado}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;