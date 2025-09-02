# 📊 Presentation Generator

Backend simples para gerar apresentações em PDF usando StackSpot AI (texto) e DALL-E 3 (imagens).

## 🚀 Funcionalidades

- ✅ Geração de slides com StackSpot AI
- ✅ Imagens profissionais com DALL-E 3
- ✅ Export para PDF com Puppeteer
- ✅ Número dinâmico de slides (1-10)
- ✅ Controle de geração de imagens
- ✅ API REST simples

## 📋 Requisitos

- Node.js 18+
- Credenciais StackSpot AI + OpenAI

## ⚙️ Instalação

### Desenvolvimento (Windows/Mac):
```bash
npm install
cp .env.example .env
# Configure suas chaves no .env
npm start
```



## 🔧 Configuração

Edite o arquivo `.env`:
```env
STACKSPOT_CLIENT_ID=
STACKSPOT_CLIENT_SECRET=
STACKSPOT_REALM=stackspot-freemium
STACKSPOT_AGENT_ID=
OPENAI_API_KEY=sua_chave_openai  
PORT=3003
```

## 📖 API

### POST `/generate-presentation`

**Request:**
```json
{
  "prompt": "Apresentação sobre IA",
  "slideCount": 3,
  "generateImages": true
}
```

**Response:**
```json
{
  "message": "Apresentação gerada com sucesso",
  "pdfPath": "/path/to/apresentacao.pdf",
  "downloadUrl": "http://server/pdfs/apresentacao.pdf",
  "slides": [...],
  "slideCount": 3,
  "imagesGenerated": true
}
```

## 🎯 Parâmetros

- `prompt` (string, obrigatório): Tópico da apresentação
- `slideCount` (number, opcional): Número de slides (1-10, padrão: 3)  
- `generateImages` (boolean, opcional): Gerar imagens (padrão: true)

## 🌐 Produção

O servidor serve PDFs estaticamente em `/pdfs/`

Exemplo: `http://seu-servidor:3003/pdfs/apresentacao-123456.pdf`

 curl -X POST
  http://localhost:3003/generate-presentation \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Inteligência Artificial e
  Machine Learning",
      "slideCount": 5,
      "generateImages": true
    }'