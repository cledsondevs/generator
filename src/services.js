import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import StackSpotClient from './stackspot.js';

export async function generateSlides(stackSpotClient, prompt, slideCount = 3) {
  console.log(`🎯 Gerando ${slideCount} slides para o prompt: "${prompt}"`);
  
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

  console.log('📡 Enviando prompt para StackSpot...');
  const response = await stackSpotClient.chat(slidePrompt);
  console.log('✅ Resposta recebida do StackSpot');
  
  // StackSpot retorna no formato { message: "JSON_string", ... }
  let text = response.message || response.response || response;

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    const cleanedText = String(text).replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedText);
  }
}

export async function generateImages(slides) {
  console.log(`🖼️  Gerando imagens para ${slides.slides.length} slides...`);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const slidesWithImages = [];

  for (const slide of slides.slides) {
    const imagePrompt = `Professional business presentation image for "${slide.title}". Clean, modern, corporate style illustration suitable for business presentations.`;

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      });

      slidesWithImages.push({
        ...slide,
        imageUrl: response.data[0].url
      });
    } catch (error) {
      slidesWithImages.push({
        ...slide,
        imageUrl: `https://via.placeholder.com/800x600/4A90E2/ffffff?text=${encodeURIComponent(slide.title)}`
      });
    }
  }

  return { slides: slidesWithImages };
}

export async function generatePDF(slidesData) {
  console.log('📄 Gerando PDF da apresentação...');
  const isProduction = process.platform === 'linux';
  
  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  };

  if (isProduction) {
    const chromePaths = ['/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
    
    for (const chromePath of chromePaths) {
      try {
        await fs.access(chromePath);
        puppeteerConfig.executablePath = chromePath;
        break;
      } catch (error) {
        continue;
      }
    }
  }

  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage();
  
  try {
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
    let imageElement = '';
    
    if (slide.imageUrl && !slide.imageUrl.includes('placeholder')) {
      // Imagem real do DALL-E
      imageElement = `<img src="${slide.imageUrl}" alt="${slide.title}" style="width: 400px; height: 300px; object-fit: cover; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">`;
    } else if (slide.imageUrl && slide.imageUrl.includes('placeholder')) {
      // Placeholder
      imageElement = `<div class="image-placeholder">[Imagem: ${slide.title}]</div>`;
    }
    // Se não há imageUrl, não mostra nenhuma imagem

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

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const userDir = process.platform === 'linux' ? '/opt/generator' : os.homedir();
  const fileName = `apresentacao-${Date.now()}.pdf`;
  const pdfPath = path.join(userDir, fileName);

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    return pdfPath;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}