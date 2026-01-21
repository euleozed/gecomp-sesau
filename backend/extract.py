import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import subprocess
import re
import requests
import zipfile
import os
import time
from io import StringIO
import re
from dotenv import load_dotenv



load_dotenv()  # Carrega variáveis do arquivo .env
# Verifica se o motor `openpyxl` está disponível para ler arquivos .xlsx
try:
    import openpyxl  # noqa: F401
except ImportError:
    print("Módulo 'openpyxl' não está instalado. Instale com: pip install openpyxl")
    raise SystemExit(1)
# Configuração do WebDriver para o Edge
service = Service(ChromeDriverManager().install())
chrome_options = webdriver.ChromeOptions()

# Diretório de downloads
download_dir = r"./backend/downloads"
chrome_options.add_experimental_option('prefs', {
    'download.default_directory': download_dir,
    'download.prompt_for_download': False,
    'download.directory_upgrade': True,
    'safebrowsing.enabled': True
})


# Inicializando o WebDriver do Edge
driver = webdriver.Chrome(service=service, options=chrome_options)
driver.maximize_window()
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
df_documentos = pd.read_excel(csv_path, dtype={'Processo': str}, engine='openpyxl')


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
    

# Verificar e exibir processos duplicados
duplicados = df_documentos[df_documentos.duplicated(['Processo'], keep=False)]
if not duplicados.empty:
    print("\nProcessos duplicados encontrados:")
    for processo in duplicados['Processo'].unique():
        count = duplicados[duplicados['Processo'] == processo].shape[0]
        print(f"Processo {processo} aparece {count} vezes")
    
    # Remover duplicatas mantendo apenas a primeira ocorrência
    df_documentos = df_documentos.drop_duplicates(subset=['Processo'], keep='first')
    print("\nDuplicatas removidas. Mantida apenas a primeira ocorrência de cada processo.")

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
        alternar_para_iframe('ifrConteudoVisualizacao')

        # Alternar para o iframe onde está a tabela
        alternar_para_iframe('ifrVisualizacao')

        # Tentar clicar no link "Ver histórico resumido"
        try:
            botao_historico_resumido = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.ID, 'ancTipoHistorico'))
                or EC.element_to_be_clickable((By.XPATH, '//*[@id="ancTipoHistorico" and contains(text(), "Ver histórico resumido")]'))
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
                (By.XPATH, '//a[@id="ancTipoHistorico" and text()="Ver histórico completo"]')
                botao_historico_completo = WebDriverWait(driver, 30).until(
                    EC.element_to_be_clickable((By.XPATH, '//a[@id="ancTipoHistorico" and text()="Ver histórico completo"]'))
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

# import os
# import time
# import re
# import logging
# import pandas as pd
# from io import StringIO
# from dotenv import load_dotenv
# from selenium import webdriver
# from selenium.webdriver.chrome.service import Service
# from selenium.webdriver.common.by import By
# from selenium.webdriver.common.keys import Keys
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
# from selenium.common.exceptions import TimeoutException, NoSuchElementException
# from webdriver_manager.chrome import ChromeDriverManager

# # Configuração de logging
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(message)s",
#     handlers=[logging.StreamHandler()]
# )

# # Carregar variáveis de ambiente
# load_dotenv()
# usuario_env = os.getenv('USUARIO')
# senha_env = os.getenv('SENHA')
# orgao_env = os.getenv('ORGAO')

# # Configuração do WebDriver
# service = Service(ChromeDriverManager().install())
# chrome_options = webdriver.ChromeOptions()
# download_dir = r"./downloads"
# chrome_options.add_experimental_option('prefs', {
#     'download.default_directory': download_dir,
#     'download.prompt_for_download': False,
#     'download.directory_upgrade': True,
#     'safebrowsing.enabled': True
# })
# driver = webdriver.Chrome(service=service, options=chrome_options)
# driver.maximize_window()

# logging.info("Iniciando login no SEI...")
# driver.get('https://sei.sistemas.ro.gov.br/sip/login.php?sigla_orgao_sistema=RO&sigla_sistema=SEI')
# driver.find_element(By.ID, 'txtUsuario').send_keys(usuario_env)
# driver.find_element(By.ID, 'pwdSenha').send_keys(senha_env)
# driver.find_element(By.ID, 'selOrgao').send_keys(orgao_env)
# driver.find_element(By.ID, 'pwdSenha').send_keys(Keys.RETURN)
# logging.info("Login realizado com sucesso.")

# # Carregar processos do Excel
# df_documentos = pd.read_excel("backend/objetos.xlsx", dtype={'Processo': str}, engine="openpyxl")
# df_documentos = df_documentos.drop_duplicates(subset=['Processo']).dropna(subset=['Processo'])
# df_documentos = df_documentos[df_documentos['Processo'].astype(str).str.strip() != ""]
# logging.info(f"{len(df_documentos)} processos carregados do Excel.")

# def substituir_caracteres_especiais(nome):
#     return re.sub(r'[^\w\s]', '_', nome)

# def alternar_para_iframe(id_iframe):
#     logging.debug(f"Tentando alternar para iframe '{id_iframe}'...")
#     WebDriverWait(driver, 30).until(EC.frame_to_be_available_and_switch_to_it((By.ID, id_iframe)))
#     logging.info(f"Alternado para iframe '{id_iframe}'.")

# def pesquisar_processo(processo):
#     try:
#         pesquisa = WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.ID, 'txtPesquisaRapida')))
#         pesquisa.clear()
#         pesquisa.send_keys(processo)
#         pesquisa.send_keys(Keys.RETURN)
#         logging.info(f"Processo {processo} pesquisado.")
#         time.sleep(2)
#     except Exception as e:
#         logging.error(f"Erro ao pesquisar processo {processo}: {e}")

# def extrair_dados_tabela(processo, nome_arquivo):
#     df_todos_dados = pd.DataFrame()
#     pagina = 1
#     while True:
#         try:
#             tabela = WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.CLASS_NAME, 'infraTable')))
#             tabela_html = tabela.get_attribute('outerHTML')
#             df_tabela = pd.read_html(StringIO(tabela_html))[0]
#             df_tabela['Processo'] = processo
#             df_todos_dados = pd.concat([df_todos_dados, df_tabela], ignore_index=True)
#             logging.info(f"Página {pagina} extraída para processo {processo}.")
#             pagina += 1

#             try:
#                 botao_proxima = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.ID, 'lnkInfraProximaPaginaSuperior')))
#                 if botao_proxima.is_displayed():
#                     driver.execute_script("arguments[0].click();", botao_proxima)
#                     WebDriverWait(driver, 30).until(EC.staleness_of(tabela))
#                     logging.debug("Navegando para próxima página...")
#                 else:
#                     break
#             except (TimeoutException, NoSuchElementException):
#                 break
#         except Exception as e:
#             logging.error(f"Erro ao extrair tabela do processo {processo}: {e}")
#             break

#     if not df_todos_dados.empty:
#         output_csv = os.path.join(download_dir, f"processo_{nome_arquivo}.csv")
#         df_todos_dados.to_csv(output_csv, index=False, encoding="utf-8")
#         logging.info(f"Tabela do processo {processo} salva em {output_csv}.")
#     else:
#         logging.warning(f"Nenhum dado extraído para {processo}.")

# # Loop pelos processos
# for _, row in df_documentos.iterrows():
#     processo = str(row['Processo']).strip()
#     nome_arquivo = substituir_caracteres_especiais(processo)

#     try:
#         logging.info(f"Iniciando busca do processo {processo}.")
#         pesquisar_processo(processo)

#         # Alternar para iframe da árvore e clicar em "Consultar Andamento"
#         alternar_para_iframe('ifrArvore')
#         botao_consultar = WebDriverWait(driver, 30).until(
#             EC.element_to_be_clickable((By.CSS_SELECTOR, '#divConsultarAndamento > a'))
#         )
#         driver.execute_script("arguments[0].click();", botao_consultar)
#         logging.info("Botão 'Consultar Andamento' clicado.")

#         # Voltar ao conteúdo principal e alternar para iframe da visualização
#         driver.switch_to.default_content()
#         alternar_para_iframe('ifrConteudoVisualizacao')

#         try:
#             # Primeiro tenta o histórico resumido
#             botao_resumido = WebDriverWait(driver, 5).until(
#                 EC.element_to_be_clickable((By.XPATH, '//a[@id="ancTipoHistorico" and contains(text(), "resumido")]'))
#             )
#             driver.execute_script("arguments[0].scrollIntoView(true);", botao_resumido)
#             botao_resumido.click()
#             logging.info(f"Link 'Ver histórico resumido' clicado para o processo {processo}.")
#             extrair_dados_tabela(processo, nome_arquivo)

#         except TimeoutException:
#             logging.warning(f"Link 'Ver histórico resumido' não encontrado para o processo {processo}. Tentando 'Ver histórico completo'.")

#             try:
#                 # Agora tenta o histórico completo
#                 botao_completo = WebDriverWait(driver, 30).until(
#                     EC.element_to_be_clickable((By.XPATH, '//a[@id="ancTipoHistorico" and contains(text(), "completo")]'))
#                 )
#                 driver.execute_script("arguments[0].scrollIntoView(true);", botao_completo)
#                 botao_completo.click()
#                 logging.info(f"Link 'Ver histórico completo' clicado para o processo {processo}.")
#                 extrair_dados_tabela(processo, nome_arquivo)

#             except TimeoutException:
#                 logging.error(f"Link 'Ver histórico completo' também não encontrado para o processo {processo}.")
#             except Exception as e:
#                 logging.error(f"Erro ao processar {processo}: {e}")

#     finally:
#         # Sempre volta para a página inicial para o próximo processo
#         driver.get('https://sei.sistemas.ro.gov.br')

# driver.quit()
# logging.info("Execução finalizada.")