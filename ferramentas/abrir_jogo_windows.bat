@echo off
chcp 65001 >nul
REM Abre o jogo num "servidor" no seu computador (http://localhost:8080).
REM Assim o MICROFONE funciona (o navegador só libera o microfone em https:// ou em localhost).
REM Precisa do Python 3 (python.org). Deixe esta janela aberta enquanto joga; para parar, feche a janela.
cd /d "%~dp0\.."
start "" "http://localhost:8080/index.html"
py -m http.server 8080 2>nul || python -m http.server 8080
