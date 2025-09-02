import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
import StackSpotClient from './stackspot.js';
import axios from 'axios';

// Function to check if a URL is accessible
async function isUrlAccessible(url) {
  try {
    await axios.head(url);
    return true;
  } catch (error) {
    console.warn(`URL não acessível: ${url}`, error.message);
    return false;
  }
}

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
    const cleanedText = String(text).replace(/```json\\n?|\\n?```/g, '').trim();
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

export async function generatePPT(slidesData, colors = {}) {
  console.log('📊 Gerando PPT da apresentação...');
  
  // Cores padrão caso não sejam fornecidas
  const defaultColors = {
    primary: '#007acc',
    secondary: '#333',
    accent: '#007acc'
  };
  
  const templateColors = { ...defaultColors, ...colors };
  
  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apresentação PowerPoint</title>
    <style>
      body {
        font-family: 'Calibri', 'Arial', sans-serif;
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .slide {
        width: 1280px;
        height: 720px;
        background: white;
        margin: 20px auto;
        padding: 60px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        page-break-after: always;
        display: flex;
        flex-direction: column;
        position: relative;
        border: 1px solid #e0e0e0;
      }
      .slide:last-child {
        page-break-after: avoid;
      }
      .slide::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 8px;
        background: linear-gradient(90deg, ${templateColors.primary} 0%, ${templateColors.accent} 100%);
      }
      .slide h1 {
        color: ${templateColors.secondary};
        font-size: 48px;
        margin-bottom: 40px;
        text-align: center;
        font-weight: 600;
        line-height: 1.2;
      }
      .slide-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .slide p {
        font-size: 24px;
        line-height: 1.5;
        color: #444;
        max-width: 100%;
        margin: 0;
      }
      .image-placeholder {
        width: 100%;
        height: 300px;
        background: linear-gradient(45deg, ${templateColors.primary}20, ${templateColors.secondary}20);
        border: 3px dashed ${templateColors.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 30px 0;
        font-size: 18px;
        color: ${templateColors.secondary};
        border-radius: 12px;
        font-weight: 500;
      }
      .slide-number {
        position: absolute;
        bottom: 20px;
        right: 30px;
        font-size: 16px;
        color: ${templateColors.primary};
        font-weight: 500;
      }
    </style>
  </head>
  <body>
`;

  slidesData.slides.forEach((slide, index) => {
    let imageElement = '';
    
    if (slide.imageUrl && !slide.imageUrl.includes('placeholder')) {
      imageElement = `<img src="${slide.imageUrl}" alt="${slide.title}" style="width: 500px; height: 350px; object-fit: cover; border-radius: 15px; margin: 30px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.25);">`;
    } else if (slide.imageUrl && slide.imageUrl.includes('placeholder')) {
      imageElement = `<div class="image-placeholder">[Imagem: ${slide.title}]</div>`;
    }

    htmlContent += `
      <div class="slide">
        <h1>${slide.title}</h1>
        <div class="slide-content">
          <div>
            ${imageElement}
            <p>${slide.content}</p>
          </div>
        </div>
        <div class="slide-number">${index + 1} / ${slidesData.slides.length}</div>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  const userDir = process.platform === 'linux' ? '/opt/generator' : os.homedir();
  const fileName = `apresentacao-${Date.now()}.html`;
  const pptPath = path.join(userDir, fileName);
  
  try {
    await fs.writeFile(pptPath, htmlContent, 'utf8');
    return pptPath;
  } catch (error) {
    console.error('Erro ao gerar PPT:', error);
    throw error;
  }
}

export async function generatePDF(slidesData, colors = {}) {
  console.log('📄 Gerando PDF da apresentação...');
  const isProduction = process.platform === 'linux';
  
  // Cores padrão caso não sejam fornecidas
  const defaultColors = {
    primary: '#007acc',
    secondary: '#333',
    accent: '#007acc'
  };
  
  const templateColors = { ...defaultColors, ...colors };
  
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
          color: ${templateColors.secondary};
          font-size: 36px;
          margin-bottom: 30px;
          text-align: center;
          border-bottom: 3px solid ${templateColors.primary};
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
          background: linear-gradient(45deg, ${templateColors.primary}20, ${templateColors.secondary}20);
          border: 2px dashed ${templateColors.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
          font-size: 14px;
          color: ${templateColors.secondary};
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
  `;

  // Validate image URLs before using them
  for (const slide of slidesData.slides) {
    if (slide.imageUrl && !slide.imageUrl.includes('placeholder')) {
      const isAccessible = await isUrlAccessible(slide.imageUrl);
      if (!isAccessible) {
        // If the URL is not accessible, use a placeholder
        slide.imageUrl = `https://via.placeholder.com/800x600/4A90E2/ffffff?text=${encodeURIComponent(slide.title)}`;
      }
    }
  }

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

  // Write HTML content to a temporary file
  const tempHtmlPath = path.join(os.tmpdir(), `temp-${Date.now()}.html`);
  await fs.writeFile(tempHtmlPath, htmlContent, 'utf8');

  // Add error handling for page events
  page.on('error', (err) => {
    console.error('Erro na página:', err);
  });

  page.on('pageerror', (err) => {
    console.error('Erro na página (pageerror):', err);
  });

  page.on('requestfailed', (request) => {
    console.error('Falha na requisição:', request.url(), request.failure().errorText);
  });

  // Load the HTML file in the page
  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
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

    // Clean up the temporary file
    await fs.unlink(tempHtmlPath).catch(err => console.warn('Erro ao deletar arquivo temporário:', err));

    return pdfPath;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}