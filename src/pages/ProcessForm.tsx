import React, { useState } from 'react';
import { MODALITIES } from '../constants';
import { Modality, Process } from '../types';
import { FilePlus } from 'lucide-react';

interface ProcessFormProps {
    // Fix: Omitted 'status' as it is handled by the parent component on submission
    onSubmit: (process: Omit<Process, 'id' | 'createdAt' | 'status'>) => void;
}

const ProcessForm: React.FC<ProcessFormProps> = ({ onSubmit }) => {
    const [number, setNumber] = useState('');
    const [object, setObject] = useState('');
    const [modality, setModality] = useState<Modality>(Modality.PREGAO);
    const [value, setValue] = useState('');

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) val = val.slice(0, 5) + '.' + val.slice(5);
        if (val.length > 11) val = val.slice(0, 12) + '/' + val.slice(12);
        if (val.length > 15) val = val.slice(0, 17) + '-' + val.slice(17, 19);
        setNumber(val.slice(0, 20));
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value.replace(/\D/g, ''));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ number, object, modality, estimatedValue: parseFloat(value) / 100 });
        setNumber(''); setObject(''); setValue('');
        alert('Processo registrado com sucesso na base SESAU!');
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-600/10 p-2 rounded-xl text-blue-600">
                            <FilePlus size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-blue-950 dark:text-white">Registrar Nova Demanda</h2>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Cadastre processos para monitoramento e controle da SESAU/RO.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Número do Processo SEI</label>
                            <input type="text" value={number} onChange={handleNumberChange} placeholder="00000.000000/2024-00" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Valor Estimado</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-600 font-bold">R$</span>
                                <input type="text" value={value ? (parseFloat(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''} onChange={handleValueChange} placeholder="0,00" className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all" required />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Modalidade</label>
                            <select value={modality} onChange={(e) => setModality(e.target.value as Modality)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none" required>
                                {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Objeto da Contratação</label>
                            <textarea value={object} onChange={(e) => setObject(e.target.value)} placeholder="Descreva sucintamente a necessidade hospitalar ou administrativa..." rows={4} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none" required />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-5 px-6 rounded-2xl shadow-xl shadow-blue-800/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                        Salvar Registro SESAU
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProcessForm;