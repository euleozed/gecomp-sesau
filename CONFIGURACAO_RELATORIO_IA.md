# Configuração da Funcionalidade de Relatórios IA

## Visão Geral
Foi implementada uma funcionalidade que permite gerar relatórios executivos automáticos para processos selecionados usando Inteligência Artificial (Hugging Face).

## Como Usar

1. **Acesse o Dashboard** e selecione um processo na lista suspensa
2. **Clique no botão "Gerar Relatório IA"** que aparece no canto superior direito do histórico do processo
3. **Aguarde** a geração do relatório (pode levar alguns segundos)
4. **Visualize** o relatório no modal que será aberto
5. **Faça download** do relatório em PDF se desejar

## Configuração (Opcional)

### Opção 1: Usar Gratuitamente (Recomendado)
A funcionalidade **funciona sem configuração adicional**! O sistema:
- Usa a API gratuita do Hugging Face quando possível
- Gera relatórios básicos automaticamente se a API estiver indisponível
- Não requer chaves de API para funcionar

### Opção 2: Configurar API do Hugging Face (Melhor Qualidade)
Para relatórios mais detalhados e personalizados, configure a API:

#### 1. Criar arquivo .env
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
VITE_HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. Obter Chave do Hugging Face
1. Acesse [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Crie uma conta ou faça login
3. Gere um novo Access Token
4. Substitua `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` pela sua chave real

#### 3. Vantagens da API (Gratuita!)
- **Totalmente gratuita** para uso moderado
- Relatórios mais detalhados e personalizados
- Melhor qualidade de análise
- Sem limites de billing

## Funcionalidades do Relatório

O relatório gerado inclui:

- **Resumo Executivo**: Visão geral do processo
- **Análise Temporal**: Tempo de tramitação e atrasos
- **Análise por Unidade**: Performance de cada setor
- **Documentos Analisados**: Sequência cronológica
- **Indicadores de Performance**: Métricas de eficiência
- **Recomendações**: Sugestões de melhorias

## Troubleshooting

### Relatório Básico Gerado
- **Isso é normal!** O sistema gera relatórios básicos automaticamente quando a API não está disponível
- Para relatórios mais detalhados, configure a API do Hugging Face (opcional)

### Erro "API key não configurada"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme se a variável `VITE_HUGGINGFACE_API_KEY` está correta
- Reinicie o servidor de desenvolvimento após criar o .env

### Erro de timeout/modelo ocupado
- A API do Hugging Face pode estar sobrecarregada
- O sistema automaticamente gera um relatório básico como fallback
- Tente novamente em alguns minutos

### Erro de CORS
- O código faz chamadas diretas para a API do Hugging Face
- Isso pode não funcionar em produção dependendo da configuração do servidor

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite o arquivo `.env` no Git
- A chave da API deve ser mantida em segredo
- Em produção, use variáveis de ambiente do servidor

## Exemplo de Uso

1. Selecione o processo "0036.001234.2024.67"
2. Clique em "Gerar Relatório IA"
3. Aguarde 5-15 segundos
4. Visualize o relatório (básico ou detalhado)
5. Baixe o PDF se necessário

## Tipos de Relatório

### Relatório Básico (Sempre Disponível)
- Gerado automaticamente com base nos dados
- Inclui métricas calculadas localmente
- Recomendações padronizadas
- Sempre funciona, mesmo offline

### Relatório Detalhado (Com API)
- Gerado pela IA do Hugging Face
- Análise mais sofisticada
- Insights personalizados
- Recomendações específicas

O relatório será personalizado com base nos dados específicos do processo selecionado. 