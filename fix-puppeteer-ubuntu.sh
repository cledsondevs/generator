#!/bin/bash

echo "🔧 Corrigindo Puppeteer no Ubuntu/Debian..."

# Atualizar repositórios
apt-get update

# Instalar dependências específicas que estão faltando
echo "📦 Instalando bibliotecas específicas..."
apt-get install -y \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-dev \
    libdrm-common \
    libxkbcommon0 \
    libxkbcommon-x11-0 \
    libepoxy0 \
    libgtk-3-common

# Instalar Chrome diretamente (método mais confiável)
echo "🌐 Instalando Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update
apt-get install -y google-chrome-stable

# Verificar instalação
echo "✅ Verificando instalação..."
google-chrome --version

echo "🎉 Instalação concluída!"
echo "Agora teste novamente: node server.js"