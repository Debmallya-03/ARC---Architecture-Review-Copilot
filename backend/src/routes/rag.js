import express from 'express';
import { answerRepoQuestion } from '../services/rag/ragChatService.js';

const router = express.Router();

router.post('/chat', async (req, res, next) => {
  try {
    const { question, repoContext, report } = req.body;
    const answer = await answerRepoQuestion({ question, repoContext, report });
    res.json(answer);
  } catch (error) {
    next(error);
  }
});

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'local',
    vectorStore: 'in-memory-per-request'
  });
});

export default router;
