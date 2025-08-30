import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

export async function generateSlides(genAI, prompt, slideCount = 3) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const slidePrompt = `
    Baseado no prompt: "${prompt}"
    
    Gere exatamente ${slideCount} slides para uma apresentação. Retorne apenas um JSON válido no formato:
    {
      "slides": [
        ${Array.from({ length: slideCount }, (_, i) => `
        {
          "title": "Título do Slide ${i + 1}",
          "content": "Conteúdo detalhado do slide ${i + 1}"
        }`).join(',')}
      ]
    }
    
    Importante: 
    - Responda apenas com o JSON, sem texto adicional
    - Gere exatamente ${slideCount} slides
    - Cada slide deve ter conteúdo único e relevante
    - O conteúdo deve ser detalhado e informativo
  `;

  const result = await model.generateContent(slidePrompt);
  const response = await result.response;
  const text = response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  }
}

export async function generateImages(genAI, slides) {
  const openai = new OpenAI({
    apiKey: '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'
  });

  const slidesWithImages = [];

  for (const slide of slides.slides) {
    const imagePrompt = `Professional business presentation image for a slide titled "${slide.title}". Content: "${slide.content}". Create a clean, modern, corporate-style illustration suitable for business presentations. Use professional colors and layout.`;

    try {
      console.log(`Gerando imagem com DALL-E para: ${slide.title}`);
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });

      const imageUrl = response.data[0].url;
      console.log(`Imagem gerada com sucesso: ${imageUrl}`);

      slidesWithImages.push({
        ...slide,
        imageUrl: imageUrl
      });
    } catch (error) {
      console.log('Erro ao gerar imagem com DALL-E, usando placeholder:', error.message);
      slidesWithImages.push({
        ...slide,
        imageUrl: 'https://via.placeholder.com/800x600/4A90E2/ffffff?text=' + encodeURIComponent(slide.title)
      });
    }
  }

  return { slides: slidesWithImages };
}

export async function generatePDF(slidesData) {
  // Detectar ambiente e configurar Puppeteer adequadamente
  const isProduction = process.platform === 'linux';
  
  let puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ]
  };

  // Em produção, tentar diferentes caminhos para o Chrome
  if (isProduction) {
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ];

    let chromeFound = false;
    for (const chromePath of possiblePaths) {
      try {
        // Verificar se o executável existe
        await fs.access(chromePath);
        puppeteerConfig.executablePath = chromePath;
        chromeFound = true;
        console.log(`Chrome encontrado em: ${chromePath}`);
        break;
      } catch (error) {
        // Continuar tentando próximo caminho
        continue;
      }
    }

    if (!chromeFound) {
      console.log('Chrome não encontrado, usando Puppeteer padrão');
      // Remover executablePath para usar o Chrome bundled do Puppeteer
      delete puppeteerConfig.executablePath;
    }
  }

  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage();

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .slide {
          width: 800px;
          height: 600px;
          background: white;
          margin-bottom: 50px;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          page-break-after: always;
          display: flex;
          flex-direction: column;
        }
        .slide:last-child {
          page-break-after: avoid;
        }
        .slide h1 {
          color: #333;
          font-size: 36px;
          margin-bottom: 30px;
          text-align: center;
          border-bottom: 3px solid #007acc;
          padding-bottom: 15px;
        }
        .slide-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .slide p {
          font-size: 18px;
          line-height: 1.6;
          color: #555;
          max-width: 100%;
        }
        .image-placeholder {
          width: 100%;
          height: 200px;
          background: linear-gradient(45deg, #e3f2fd, #bbdefb);
          border: 2px dashed #2196f3;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
          font-size: 14px;
          color: #666;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
  `;

  slidesData.slides.forEach((slide, index) => {
    const imageElement = slide.imageUrl && !slide.imageUrl.includes('placeholder') 
      ? `<img src="${slide.imageUrl}" alt="${slide.title}" style="width: 400px; height: 300px; object-fit: cover; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">`
      : `<div class="image-placeholder">[Imagem: ${slide.title}]</div>`;

    htmlContent += `
      <div class="slide">
        <h1>${slide.title}</h1>
        <div class="slide-content">
          <div>
            ${imageElement}
            <p>${slide.content}</p>
          </div>
        </div>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  await page.setContent(htmlContent);

  const userDir = "/opt/generator/";
  const fileName = `apresentacao-${Date.now()}.pdf`;
  const pdfPath = path.join(userDir, fileName);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  return pdfPath;
}