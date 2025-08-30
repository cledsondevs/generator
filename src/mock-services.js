import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

export async function generateSlides(genAI, prompt) {
  console.log(`Gerando slides para o prompt: "${prompt}"`);
  
  return {
    slides: [
      {
        title: "Inteligência Artificial: Uma Nova Era",
        content: "A inteligência artificial está revolucionando a forma como trabalhamos, oferecendo oportunidades únicas para aumentar a produtividade e criar soluções inovadoras."
      },
      {
        title: "Benefícios da IA no Ambiente de Trabalho",
        content: "Automação de tarefas repetitivas, análise de dados em tempo real, suporte na tomada de decisões e otimização de processos são alguns dos principais benefícios da IA."
      },
      {
        title: "O Futuro do Trabalho com IA",
        content: "A colaboração entre humanos e IA criará novas profissões, aumentará a eficiência organizacional e permitirá que as pessoas foquem em tarefas mais estratégicas e criativas."
      }
    ]
  };
}

export async function generateImages(genAI, slides) {
  console.log('Gerando imagens para os slides...');
  
  const slidesWithImages = slides.slides.map((slide, index) => ({
    ...slide,
    imageUrl: `https://via.placeholder.com/800x600/4A90E2/ffffff?text=${encodeURIComponent(slide.title)}`
  }));
  
  return { slides: slidesWithImages };
}

export async function generatePDF(slidesData) {
  console.log('Gerando PDF...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .slide {
          width: 1024px;
          height: 768px;
          background: white;
          margin: 0;
          padding: 60px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
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
          background: linear-gradient(90deg, #4A90E2, #7B68EE, #9A4FE8);
        }
        .slide h1 {
          color: #2c3e50;
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 40px;
          text-align: center;
          line-height: 1.2;
        }
        .slide-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .slide p {
          font-size: 24px;
          line-height: 1.6;
          color: #34495e;
          max-width: 800px;
          margin: 20px 0;
        }
        .image-placeholder {
          width: 400px;
          height: 250px;
          background: linear-gradient(45deg, #e3f2fd, #bbdefb);
          border: 3px solid #4A90E2;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 30px 0;
          font-size: 18px;
          font-weight: 600;
          color: #4A90E2;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(74, 144, 226, 0.2);
        }
        .slide-number {
          position: absolute;
          bottom: 20px;
          right: 30px;
          background: #4A90E2;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
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
          <div class="image-placeholder">
            🤖 ${slide.title}
          </div>
          <p>${slide.content}</p>
        </div>
        <div class="slide-number">${index + 1} / ${slidesData.slides.length}</div>
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const userDir = os.homedir();
  const fileName = `apresentacao-ia-${Date.now()}.pdf`;
  const pdfPath = path.join(userDir, fileName);
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();
  console.log(`PDF salvo em: ${pdfPath}`);
  return pdfPath;
}