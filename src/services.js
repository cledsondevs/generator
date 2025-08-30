import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const slidesWithImages = [];

  for (const slide of slides.slides) {
    const imagePrompt = `Crie uma imagem ilustrativa para um slide de apresentação com o título: "${slide.title}" e conteúdo: "${slide.content}". A imagem deve ser profissional e adequada para uma apresentação de negócios.`;

    try {
      const result = await model.generateContent(imagePrompt);
      const response = await result.response;

      slidesWithImages.push({
        ...slide,
        imageUrl: 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(slide.title)
      });
    } catch (error) {
      console.log('Erro ao gerar imagem, usando placeholder:', error.message);
      slidesWithImages.push({
        ...slide,
        imageUrl: 'https://via.placeholder.com/800x600?text=' + encodeURIComponent(slide.title)
      });
    }
  }

  return { slides: slidesWithImages };
}

export async function generatePDF(slidesData) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
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
  });
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
    htmlContent += `
      <div class="slide">
        <h1>${slide.title}</h1>
        <div class="slide-content">
          <div>
            <div class="image-placeholder">
              [Imagem: ${slide.title}]
            </div>
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