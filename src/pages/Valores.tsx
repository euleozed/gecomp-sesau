import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { maskCurrency, unmaskCurrency, parseCurrencyInput } from '@/utils/currencyMask';
import Layout from '@/components/Layout';
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
import { nucleoService } from '@/services/nucleoService';
import { tiposContratacaoService } from '@/services/tiposContratacaoService';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Valores() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterNucleo, setFilterNucleo] = useState('todos');
  const [processoInfo, setProcessoInfo] = useState<ProcessoInfo | null>(null);
  const [valorEstimado, setValorEstimado] = useState('');
  const [valores, setValores] = useState<ValorProcesso[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipoContratacao, setTipoContratacao] = useState('');
  const [nucleo, setNucleo] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<ValorProcesso | null>(null);

  const [tiposContratacao, setTiposContratacao] = useState<string[]>([]);

  const nucleos = ['CECOMP', 'NMP', 'NSC', 'NSM', 'NDJPL', 'NOSE', 'NPA', 'NMCHE', 'NMSG', 'NMN', 'NLAB'];

  useEffect(() => {
    loadValores();
    loadTiposContratacao();
  }, []);

  const loadTiposContratacao = async () => {
    try {
      const tipos = await tiposContratacaoService.list();
      setTiposContratacao(tipos);
    } catch (error) {
      console.error('Erro ao carregar tipos de contratação:', error);
    }
  };

  const handleSearch = async (numeroProcesso: string) => {
    if (!numeroProcesso) return;
    
    setLoading(true);
    try {
      const processoInfo = await processosService.getProcessoInfo(numeroProcesso);
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

      const valor = await valoresService.getByProcesso(numeroProcesso);
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
    if (!editingProcesso || !valorEstimado || !tipoContratacao || !nucleo) return;

    try {
      const valorNumber = unmaskCurrency(valorEstimado);
      
      // Salva o núcleo
      await nucleoService.save(editingProcesso.numero_processo, nucleo);

      // Salva os valores
      if (editingId) {
        await valoresService.update(editingId, {
          valor_estimado: valorNumber,
          tipo_contratacao: tipoContratacao,
        });
      } else {
        await valoresService.create({
          numero_processo: editingProcesso.numero_processo,
          valor_estimado: valorNumber,
          tipo_contratacao: tipoContratacao,
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Valor estimado salvo com sucesso',
      });

      setIsEditDialogOpen(false);
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
      console.log('Carregando valores...');
      const data = await valoresService.list();
      console.log('Dados carregados:', data);
      setValores(data);
    } catch (error) {
      console.error('Erro ao carregar valores:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar valores',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (valor: ValorProcesso) => {
    setEditingProcesso(valor);
    setEditingId(valor.id);
    setValorEstimado(valor.valor_estimado.toString());
    setTipoContratacao(valor.tipo_contratacao);

    // Buscar núcleo atual do processo
    try {
      const nucleoProcesso = await nucleoService.getNucleoByProcesso(valor.numero_processo);
      setNucleo(nucleoProcesso?.nucleo || '');
    } catch (error) {
      console.error('Erro ao buscar núcleo:', error);
      setNucleo('');
    }

    setIsEditDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Valores Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4">
              <div className="text-sm font-medium">Filtros:</div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  placeholder="Filtrar por processo ou objeto"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                />
                <Select 
                  value={filterTipo} 
                  onValueChange={setFilterTipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tiposContratacao.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={filterNucleo} 
                  onValueChange={setFilterNucleo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por núcleo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {nucleos.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Tipo de Contratação</TableHead>
                  <TableHead>Valor Estimado</TableHead>
                  <TableHead>Valor Contratado</TableHead>
                  <TableHead>Núcleo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Nenhum processo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  valores
                    .filter((valor) => {
                      const matchesTerm = filterTerm === '' || 
                        valor.numero_processo.toLowerCase().includes(filterTerm.toLowerCase()) ||
                        (valor.processos?.objeto || '').toLowerCase().includes(filterTerm.toLowerCase());
                      const matchesTipo = filterTipo === 'todos' || valor.tipo_contratacao === filterTipo;
                      const matchesNucleo = filterNucleo === 'todos' || valor.nucleo === filterNucleo;
                      return matchesTerm && matchesTipo && matchesNucleo;
                    })
                    .map((valor) => (
                      <TableRow key={valor.id}>
                        <TableCell>{valor.numero_processo}</TableCell>
                        <TableCell>{valor.processos?.objeto || '-'}</TableCell>
                        <TableCell>{valor.tipo_contratacao}</TableCell>
                        <TableCell>{formatCurrency(valor.valor_estimado)}</TableCell>
                        <TableCell>{valor.valor_contratado ? formatCurrency(valor.valor_contratado) : '-'}</TableCell>
                        <TableCell>{valor.nucleo || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(valor)}
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
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Processo</DialogTitle>
            <DialogDescription>
              {editingProcesso?.numero_processo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo de Contratação</label>
                <Select value={tipoContratacao} onValueChange={setTipoContratacao}>
                  <SelectTrigger className="w-full mt-2">
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
                <label className="text-sm font-medium">Núcleo</label>
                <Select value={nucleo} onValueChange={setNucleo}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Selecione o núcleo" />
                  </SelectTrigger>
                  <SelectContent>
                    {nucleos.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Valor Estimado</label>
              <Input
                type="text"
                value={valorEstimado}
                onChange={(e) => {
                  const value = e.target.value;
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
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}