import pandas as pd
import json
import os

def create_metadata():
    # Carrega o CSV da pasta public
    df = pd.read_csv('public/backend/df.csv')
    
    # Calcula os tipos de processo
    tipos_count = {}
    if 'tipo_tr' in df.columns:
        print("Coluna tipo_tr encontrada!")
        print("Primeiros valores da coluna tipo_tr:", df['tipo_tr'].head(10).tolist())
        print("Valores únicos em tipo_tr:", df['tipo_tr'].value_counts())
        
        # Conta processos únicos por tipo
        for tipo in ['Dispensa', 'Emergencial', 'Inexigibilidade', 'Licitatório', 'Licitatório SRP', 'Organização Social']:
            count = df[df['tipo_tr'] == tipo]['Processo'].nunique()
            tipos_count[tipo] = count
            print(f'{tipo}: {count} processos únicos')
        
        # Salva os metadados
        metadata = {
            'tipos_processo': tipos_count,
            'total_processos': df['Processo'].nunique(),
            'total_registros': len(df)
        }
        
        with open('public/backend/metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        print('Metadata salvo em public/backend/metadata.json')
        print(f'Total de processos: {metadata["total_processos"]}')
        print(f'Total de registros: {metadata["total_registros"]}')
    else:
        print('Coluna tipo_tr não encontrada')
        print('Colunas disponíveis:', df.columns.tolist())

if __name__ == "__main__":
    create_metadata() 