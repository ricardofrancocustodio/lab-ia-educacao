@echo off
setlocal

set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set OUTPUT_FILE=project-context-for-ai.md

echo Gerando arquivo de contexto do projeto para IA...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%export-project-context.ps1" -OutputFile "%OUTPUT_FILE%"

if errorlevel 1 (
  echo.
  echo Falha ao gerar o arquivo de contexto.
  exit /b 1
)

echo.
echo Arquivo gerado em: %ROOT_DIR%\%OUTPUT_FILE%
echo.
echo Voce pode abrir esse .md e enviar para outra IA como contexto do projeto.
endlocal
