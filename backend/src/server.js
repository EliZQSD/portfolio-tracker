import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './config/database.js';
import portfolioRoutes from './routes/portfolio.js';
import priceUpdater from './services/priceUpdater.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/portfolio', portfolioRoutes);

app.get('/', (req, res) => {
  res.json({ message: '✅ Portfolio Tracker API running!', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  priceUpdater.startCron();
});
