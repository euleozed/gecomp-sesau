import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { maskCurrency, unmaskCurrency, parseCurrencyInput } from '@/utils/currencyMask';
import Layout from '../components/Layout';
import { processosService } from '@/services/processosService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { valoresService } from '@/services/valoresService';
import { ProcessoInfo, ValorProcesso } from '@/types/valores';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Valores() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [processoInfo, setProcessoInfo] = useState<ProcessoInfo | null>(null);
  const [valorEstimado, setValorEstimado] = useState('');
  const [valores, setValores] = useState<ValorProcesso[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipoContratacao, setTipoContratacao] = useState('');

  const tiposContratacao = [
    'Dispensa',
    'Emergencial',
    'Inexigibilidade',
    'Pregão Eletrônico',
    'Registro de Preços',
    'Organização Social'
  ];

  useEffect(() => {
    loadValores();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    try {
      const processoInfo = await processosService.getProcessoInfo(searchTerm);
      if (!processoInfo) {
        toast({
          title: 'Processo não encontrado',
          description: 'Não foi possível encontrar informações para este processo.',
          variant: 'destructive',
        });
        setProcessoInfo(null);
        return;
      }
      setProcessoInfo(processoInfo);
      setTipoContratacao(processoInfo.tipo_contratacao);

      const valor = await valoresService.getByProcesso(searchTerm);
      if (valor) {
        setValorEstimado(valor.valor_estimado.toString());
        setEditingId(valor.id);
      } else {
        setValorEstimado('');
        setEditingId(null);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao buscar processo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!searchTerm || !valorEstimado || !processoInfo || !tipoContratacao) return;

    try {
      const valorNumber = unmaskCurrency(valorEstimado);
      
      // Atualiza o processoInfo com o novo tipo de contratação
      setProcessoInfo({
        ...processoInfo,
        tipo_contratacao: tipoContratacao
      });

      if (editingId) {
        await valoresService.update(editingId, {
          valor_estimado: valorNumber,
          tipo_contratacao: tipoContratacao,
        });
      } else {
        await valoresService.create({
          numero_processo: searchTerm,
          valor_estimado: valorNumber,
          tipo_contratacao: tipoContratacao,
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Valor estimado salvo com sucesso',
      });

      loadValores();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar valor estimado',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await valoresService.delete(id);
      toast({
        title: 'Sucesso',
        description: 'Valor estimado excluído com sucesso',
      });
      loadValores();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir valor estimado',
        variant: 'destructive',
      });
    }
  };

  const loadValores = async () => {
    try {
      const data = await valoresService.list();
      setValores(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar valores',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>Buscar Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Número do Processo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {processoInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Objeto:</strong> {processoInfo.objeto}
              </div>
              <div>
                <strong>Tipo de Contratação:</strong>
                <Select value={tipoContratacao} onValueChange={setTipoContratacao}>
                  <SelectTrigger className="w-[280px] mt-2">
                    <SelectValue placeholder="Selecione o tipo de contratação" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposContratacao.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <strong>Data de Abertura:</strong>{' '}
                {new Date(processoInfo.data_abertura).toLocaleDateString()}
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Valor Estimado
                  </label>
                  <Input
                    type="text"
                    value={valorEstimado}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Remove tudo que não é número
                      const numericValue = value.replace(/\D/g, '');
                      if (numericValue) {
                        setValorEstimado(maskCurrency(numericValue));
                      } else {
                        setValorEstimado('');
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedValue = e.clipboardData.getData('text');
                      const newValue = parseCurrencyInput(pastedValue);
                      if (newValue !== null) {
                        setValorEstimado(newValue);
                      }
                    }}
                    placeholder="R$ 0,00"
                  />
                </div>
                <Button onClick={handleSave}>
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Valores Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo de Contratação</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valores.map((valor) => (
                <TableRow key={valor.id}>
                  <TableCell>{valor.numero_processo}</TableCell>
                  <TableCell>{valor.tipo_contratacao}</TableCell>
                  <TableCell>{formatCurrency(valor.valor_estimado)}</TableCell>
                  <TableCell>
                    {new Date(valor.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm(valor.numero_processo);
                          handleSearch();
                        }}
                      >
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este valor estimado?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(valor.id)}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}
