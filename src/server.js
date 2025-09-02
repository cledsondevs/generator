import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { generateSlides, generateImages, generatePDF } from './services.js';
import StackSpotClient from './stackspot.js';

dotenv.config({ path: '../../.env' });

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Servir arquivos PDF estaticamente
const pdfDir = process.platform === 'linux' ? '/opt/generator' : os.homedir();
app.use('/pdfs', express.static(pdfDir));

const stackSpotClient = new StackSpotClient();

app.post('/generate-presentation', async (req, res) => {
  try {
    const { prompt, slideCount, generateImages: shouldGenerateImages } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    const numberOfSlides = slideCount || 3;
    const enableImages = shouldGenerateImages === undefined ? true : shouldGenerateImages;

    if (numberOfSlides < 1 || numberOfSlides > 10) {
      return res.status(400).json({ error: 'Número de slides deve ser entre 1 e 10' });
    }

    const slides = await generateSlides(stackSpotClient, prompt, numberOfSlides);
    const slidesData = enableImages ? await generateImages(slides) : slides;
    const pdfPath = await generatePDF(slidesData);
    
    const fileName = path.basename(pdfPath);
    const publicUrl = `http://localhost:${port}/pdfs/${fileName}`;

    res.json({
      message: 'Apresentação gerada com sucesso',
      pdfPath,
      downloadUrl: publicUrl,
      slides: slidesData,
      slideCount: numberOfSlides,
      imagesGenerated: enableImages
    });

  } catch (error) {
    console.error('Erro ao gerar apresentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});