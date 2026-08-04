@echo off
cd /d "%~dp0"
echo Corrigiendo la conexion de los rankings con el Dashboard...
echo.
python arreglar_rankings.py
echo.
pause
