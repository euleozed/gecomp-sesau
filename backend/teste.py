import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.microsoft import EdgeChromiumDriverManager
import os
import time
from io import StringIO
import re

def substituir_caracteres_especiais(nome):
    """Substitui caracteres especiais por underscores"""
    return re.sub(r'[^\w\s]', '_', nome)

def obter_credenciais():
    """Solicita credenciais e número do processo ao usuário via terminal"""
    print("\n=== Por favor, insira suas credenciais ===")
    usuario = input("Usuário: ")
    senha = input("Senha: ")
    orgao = input("Órgão: ")
    processo = input("\nNúmero do processo a ser pesquisado: ")
    return usuario, senha, orgao, processo.strip()

def alternar_para_iframe(driver, id_iframe):
    """Alterna para o iframe especificado"""
    WebDriverWait(driver, 30).until(EC.frame_to_be_available_and_switch_to_it((By.ID, id_iframe)))
    print(f"Alternando para o iframe '{id_iframe}'.")

def pesquisar_processo(driver, processo):
    """Realiza a pesquisa do processo no sistema"""
    try:
        pesquisa = WebDriverWait(driver, 90).until(
            EC.presence_of_element_located((By.ID, 'txtPesquisaRapida'))
        )
        pesquisa.clear()
        pesquisa.send_keys(processo)
        pesquisa.send_keys(Keys.RETURN)
        print(f"\nProcesso {processo} pesquisado com sucesso!")
        return True
    except Exception as e:
        print(f"\nErro ao pesquisar o processo {processo}: {str(e)}")
        return False

def main():
    # Configuração do WebDriver para o Edge
    service = Service(EdgeChromiumDriverManager().install())
    edge_options = webdriver.EdgeOptions()
    
    # Configurações básicas
    driver = webdriver.Edge(service=service, options=edge_options)
    driver.maximize_window()

    try:
        # Obter credenciais e número do processo
        usuario, senha, orgao, processo = obter_credenciais()

        # Acessar o site e realizar login
        print("\nAcessando o sistema SEI...")
        driver.get('https://sei.sistemas.ro.gov.br/sip/login.php?sigla_orgao_sistema=RO&sigla_sistema=SEI')

        # Preencher os campos de login
        print("Realizando login...")
        usuario_field = driver.find_element(By.ID, 'txtUsuario')
        senha_field = driver.find_element(By.ID, 'pwdSenha')
        orgao_field = driver.find_element(By.ID, 'selOrgao')

        usuario_field.send_keys(usuario)
        senha_field.send_keys(senha)
        orgao_field.send_keys(orgao)
        senha_field.send_keys(Keys.RETURN)

        # Aguardar login ser concluído
        time.sleep(2)

        # Pesquisar o processo
        if pesquisar_processo(driver, processo):
            print("\nAguardando 5 segundos com a página aberta...")
            time.sleep(5)
            
            # Tentar consultar o andamento (opcional)
            try:
                alternar_para_iframe(driver, 'ifrArvore')
                botao_consultar = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '#divConsultarAndamento > a')))
                print("Elemento 'Consultar Andamento' encontrado!")
            except:
                print("Elemento 'Consultar Andamento' não encontrado (opcional)")
            finally:
                # Fechar o iframe
                driver.switch_to.default_content()
                print("Iframe foi fechado.")

    except NoSuchElementException:
        print("\nErro: Elemento não encontrado na página. Verifique se a estrutura do site mudou.")
    except Exception as e:
        print(f"\nOcorreu um erro inesperado: {str(e)}")
    finally:
        # Fechar o navegador
        driver.quit()
        print("\n=== Processo concluído ===")
        print("Navegador foi fechado. Obrigado por utilizar o sistema!")

if __name__ == "__main__":
    main()