import pandas as pd
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.edge.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import os
import time
from io import StringIO
import re
from dotenv import load_dotenv


load_dotenv()  # Carrega variáveis do arquivo .env

# Caminho fixo do driver
caminho_driver = "backend/edgedriver_win64/msedgedriver.exe"  # <== Ajuste conforme seu caso
service = Service(executable_path=caminho_driver)

# Diretório de downloads
download_dir = r"./backend/downloads"
edge_options = webdriver.EdgeOptions()
edge_options.add_experimental_option('prefs', {
    'download.default_directory': download_dir,
    'download.prompt_for_download': False,
    'download.directory_upgrade': True,
    'safebrowsing.enabled': True
})

# Inicializando o WebDriver do Edge
driver = webdriver.Edge(service=service, options=edge_options)
# Acessar o site e realizar login
driver.get('https://sei.sistemas.ro.gov.br/sip/login.php?sigla_orgao_sistema=RO&sigla_sistema=SEI')


# Obter valores das variáveis de ambiente
usuario_env = os.getenv('USUARIO')
senha_env = os.getenv('SENHA')
orgao_env = os.getenv('ORGAO')


# Preencher os campos de login com as variáveis carregadas
usuario = driver.find_element(By.ID, 'txtUsuario')
senha = driver.find_element(By.ID, 'pwdSenha')
orgao = driver.find_element(By.ID, 'selOrgao')

usuario.send_keys(usuario_env)
senha.send_keys(senha_env)
orgao.send_keys(orgao_env)
senha.send_keys(Keys.RETURN)

# Carregar os números de processo a partir do arquivo excel
base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, 'objetos.xlsx')
df_documentos = pd.read_excel(csv_path, dtype={'Processo': str})


# Função para substituir caracteres especiais por _
def substituir_caracteres_especiais(nome):
    return re.sub(r'[^\w\s]', '_', nome)

# Garantir que o diretório de download exista
if not os.path.exists(download_dir):
    os.makedirs(download_dir)

# Função para aguardar iframe e alternar
def alternar_para_iframe(id_iframe):
    WebDriverWait(driver, 30).until(EC.frame_to_be_available_and_switch_to_it((By.ID, id_iframe)))
    print(f"Alternando para o iframe '{id_iframe}'.")

# Função para extrair e salvar dados da tabela
def pesquisar_processo(Processo):
    try:
        pesquisa = WebDriverWait(driver, 90).until(
            EC.presence_of_element_located((By.ID, 'txtPesquisaRapida'))
        )
        pesquisa.clear()
        pesquisa.send_keys(Processo)
        pesquisa.send_keys(Keys.RETURN)
        print(f"Processo {Processo} pesquisado.")
        time.sleep(2)  # Espera adicional para garantir que o conteúdo carregue
    except Exception as e:
        print(f"Erro ao pesquisar o processo {Processo}: {str(e)}")

# Função para extrair e salvar dados da tabela
def extrair_dados_tabela(Processo, nome_arquivo):
    # Criar um DataFrame vazio para armazenar todos os dados
    df_todos_dados = pd.DataFrame()

    while True:
        try:
            # Aguardar a tabela carregar
            tabela = WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.CLASS_NAME, 'infraTable'))
            )

            # Pegar o HTML da tabela para transformar em DataFrame
            tabela_html = tabela.get_attribute('outerHTML')
            tabela_io = StringIO(tabela_html)
            df_tabela = pd.read_html(tabela_io)[0]  # Converte HTML em DataFrame

            # Adicionar a coluna com o número do processo
            df_tabela['Processo'] = Processo

            # Adicionar os dados da tabela atual ao DataFrame total
            if not df_tabela.empty:
                df_todos_dados = pd.concat([df_todos_dados, df_tabela], ignore_index=True)
            else:
                print("Tabela vazia encontrada, encerrando a extração.")
                break

            # Verificar se há o botão "Próxima Página"
            try:
                botao_proxima_pagina = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, 'lnkInfraProximaPaginaSuperior'))
                )
                if botao_proxima_pagina.is_displayed():
                    # Clicar no botão "Próxima Página"
                    driver.execute_script("arguments[0].click();", botao_proxima_pagina)
                    print("Navegando para a próxima página...")
                    WebDriverWait(driver, 30).until(
                        EC.staleness_of(tabela)  # Esperar até que a tabela anterior seja substituída
                    )
                else:
                    print("Botão 'Próxima Página' não disponível, encerrando a extração.")
                    break
            except (TimeoutException, NoSuchElementException):
                print("Botão 'Próxima Página' não encontrado, encerrando a extração.")
                break

        except Exception as e:
            print(f"Erro ao extrair dados da tabela: {str(e)}")
            break

    # Salvar os dados extraídos em um arquivo CSV
    if not df_todos_dados.empty:
        nome_arquivo_csv = f'processo_{nome_arquivo}.csv'
        output_csv_path = os.path.join(download_dir, nome_arquivo_csv)
        df_todos_dados.to_csv(output_csv_path, index=False, encoding='utf-8')
        print(f"Tabela de andamento para o processo {Processo} salva em {output_csv_path}.")
        print(f"Tabela de andamento salva como '{output_csv_path}'.")
    else:
        print(f"Nenhum dado extraído para o processo {Processo}.")
    

# Filtrar linhas onde a coluna 'Processo' não está vazia
df_documentos = df_documentos[df_documentos['Processo'].notna()]
df_documentos = df_documentos[df_documentos['Processo'].astype(str).str.strip() != ""]

# Iterar pelos processos no CSV
for index, row in df_documentos.iterrows():
    Processo = str(row['Processo']).strip()
    
    if not Processo:  # Garantia extra de que o processo não está vazio
        print(f"Linha {index} ignorada: Processo vazio.")
        continue

    nome_arquivo = substituir_caracteres_especiais(Processo)

    try:
        print(f"Iniciando a busca do processo {Processo}.")
        pesquisar_processo(Processo)

        # Alternar para o iframe pai onde está o botão de "Consultar Andamento"
        alternar_para_iframe('ifrArvore')

        # Aguardar e clicar no botão "Consultar Andamento"
        print("Aguardando o link 'Consultar Andamento'.")
        botao_consultar = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '#divConsultarAndamento > a'))
        )
        driver.execute_script("arguments[0].click();", botao_consultar)
        print("Botão 'Consultar Andamento' clicado.")
        driver.switch_to.default_content()  # Voltar para o conteúdo principal

        # Alternar para o iframe onde está a tabela
        alternar_para_iframe('ifrVisualizacao')

        # Tentar clicar no link "Ver histórico resumido"
        try:
            botao_historico_resumido = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, '//*[@id="ancTipoHistorico" and contains(text(), "Ver histórico resumido")]'))
            )
            if botao_historico_resumido.is_displayed():
                print(f"Link 'Ver histórico resumido' encontrado para o processo {Processo}.")
                extrair_dados_tabela(Processo, nome_arquivo)
            else:
                print(f"Link 'Ver histórico resumido' não visível para o processo {Processo}.")
        except TimeoutException:
            print(f"Link 'Ver histórico resumido' não encontrado. Tentando 'Ver histórico completo'.")
            try:
                # Clicar no botão "Ver histórico completo"
                botao_historico_completo = WebDriverWait(driver, 30).until(
                    EC.presence_of_element_located((By.XPATH, '//*[@id="ancTipoHistorico"]'))
                )
                driver.execute_script("arguments[0].click();", botao_historico_completo)
                print(f"Botão 'Ver histórico completo' clicado para o processo {Processo}.")
                extrair_dados_tabela(Processo, nome_arquivo)
            except TimeoutException:
                print(f"Link 'Ver histórico completo' não encontrado para o processo {Processo}.")

    except Exception as e:
        print(f"Erro ao processar o processo {Processo}: {str(e)}")

    finally:
        driver.get('https://sei.sistemas.ro.gov.br')  # Retornar à página de pesquisa para o próximo processo

# Fechar o navegador
driver.quit()

