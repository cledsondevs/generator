import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateSlides, generateImages, generatePDF } from './services.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Servir arquivos PDF estaticamente
app.use('/pdfs', express.static('/opt/generator'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-presentation', async (req, res) => {
  try {
    const { prompt, slideCount } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    const numberOfSlides = slideCount || 3;

    if (numberOfSlides < 1 || numberOfSlides > 10) {
      return res.status(400).json({ error: 'Número de slides deve ser entre 1 e 10' });
    }

    const slides = await generateSlides(genAI, prompt, numberOfSlides);
    const slidesWithImages = await generateImages(genAI, slides);
    const pdfPath = await generatePDF(slidesWithImages);

    // Extrair apenas o nome do arquivo para criar URL pública
    const fileName = path.basename(pdfPath);
    const publicUrl = `http://200.98.64.133:${port}/pdfs/${fileName}`;

    res.json({
      message: 'Apresentação gerada com sucesso',
      pdfPath,
      downloadUrl: publicUrl,
      slides: slidesWithImages,
      slideCount: numberOfSlides
    });

  } catch (error) {
    console.error('Erro ao gerar apresentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});