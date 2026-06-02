import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import analyzeRoutes from './routes/analyze.js';
import reportRoutes from './routes/report.js';
import ragRoutes from './routes/rag.js';
import { connectMongo } from './services/reportStore.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/.test(origin)) return callback(null, true);
    return callback(null, false);
  }
}));
app.use(express.json({ limit: '8mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ARC API' });
});

app.use('/api/analyze', analyzeRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/rag', ragRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || err.message || 'Unexpected server error'
  });
});

await connectMongo();

app.listen(port, () => {
  console.log(`ARC backend running on http://localhost:${port}`);
});
