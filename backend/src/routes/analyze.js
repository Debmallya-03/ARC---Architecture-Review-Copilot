import express from 'express';
import multer from 'multer';
import { analyzeGithubRepository, analyzeZipBuffer } from '../services/repoAnalyzer.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/github', async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    const result = await analyzeGithubRepository(repoUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/zip', upload.single('projectZip'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('ZIP file is required');
      error.status = 400;
      throw error;
    }
    const result = await analyzeZipBuffer(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
      error.publicMessage = 'ZIP is too large for the MVP limit of 50 MB';
    }
    next(error);
  }
});

export default router;
