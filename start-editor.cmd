@echo off
cd /d "%~dp0"
call corepack pnpm dev --open
