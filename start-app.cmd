@echo off
rem Opens the editor in its own Edge app window; starts the dev server first if it isn't running.
rem loading.html shows a splash and switches to the editor once the server answers.
cd /d "%~dp0"
curl -s -o nul http://localhost:3000/ || start "" /b cmd /c "corepack pnpm dev"
start "" msedge --app="file:///%~dp0loading.html"
