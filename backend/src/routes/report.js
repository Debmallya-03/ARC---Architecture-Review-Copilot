import express from 'express';
import { generateArchitectureReport } from '../services/reportGenerator.js';
import { getReport, saveReport } from '../services/reportStore.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { repoContext } = req.body;
    if (!repoContext) {
      const error = new Error('repoContext is required');
      error.status = 400;
      throw error;
    }

    const report = await generateArchitectureReport(repoContext);
    const saved = await saveReport(report);
    res.json(saved || report);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) {
      const error = new Error('Report not found or MongoDB is not configured');
      error.status = 404;
      throw error;
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
});

export default router;
