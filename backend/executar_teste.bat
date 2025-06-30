@echo off
title Autenticador SEI - Rondônia
color 0a
echo #############################################
echo #  AUTENTICADOR SEI - GOVERNO DE RONDÔNIA   #
echo #############################################
echo.

:: Verifica se o Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python não está instalado ou não está no PATH
    echo Por favor, instale Python primeiro
    pause
    exit /b
)

:: Instala dependências automaticamente
echo Instalando dependências necessárias...
pip install selenium webdriver-manager pandas python-dotenv >nul
if %errorlevel% neq 0 (
    echo Falha ao instalar dependências
    pause
    exit /b
)

:: Executa o script Python
echo Iniciando autenticação no SEI...
python teste.py

pause