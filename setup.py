#!/usr/bin/env python3
"""PORTFOLIO TRACKER - ONE-CLICK SETUP"""
import os, sys, subprocess, json
from pathlib import Path

BASE = Path(__file__).parent

def run(cmd, cwd=None):
    subprocess.run(cmd, shell=True, cwd=cwd or BASE, check=True)

def write(path, content):
    p = BASE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
    print(f'✓ {path}')

print('🚀 PORTFOLIO TRACKER - AUTO SETUP')
print('='*50)

# Backend files
write('backend/package.json', '''{
  "name": "portfolio-tracker-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {"start": "node src/server.js", "dev": "nodemon src/server.js"},
  "dependencies": {"express": "^4.18.2", "cors": "^2.8.5", "better-sqlite3": "^9.2.2", "node-cron": "^3.0.3", "dotenv": "^16.3.1", "axios": "^1.6.5"},
  "devDependencies": {"nodemon": "^3.0.2"}
}''')

write('backend/.env.example', 'FINNHUB_API_KEY=your_key_here\nPORT=3001')

write('backend/src/server.js', '''import express from 'express';
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

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  priceUpdater.startCron();
});
''')

write('backend/src/config/database.js', '''import Database from 'better-sqlite3';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../portfolio.db');
const db = new Database(dbPath);

const schema = fs.readFileSync(join(__dirname, '../models/schema.sql'), 'utf8');
schema.split(';').forEach(stmt => { if(stmt.trim()) db.exec(stmt); });

console.log('✅ Database initialized');
export default db;
''')

write('backend/src/models/schema.sql', '''CREATE TABLE IF NOT EXISTS portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT UNIQUE NOT NULL,
  quantity REAL NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  price REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(symbol) REFERENCES portfolios(symbol)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
''')

write('backend/src/services/finnhub.js', '''import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

class FinnhubService {
  async getQuote(symbol) {
    const {data} = await axios.get(`${BASE_URL}/quote`, {params: {symbol, token: API_KEY}});
    if (data && data.c) return {symbol, price: data.c, change: data.d, changePercent: data.dp};
    throw new Error(`No data for ${symbol}`);
  }
  
  async getMultipleQuotes(symbols) {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)));
    return results.map((r, i) => r.status === 'fulfilled' ? r.value : {symbol: symbols[i], price: null, error: r.reason.message});
  }
}

export default new FinnhubService();
''')

write('backend/src/services/priceUpdater.js', '''import cron from 'node-cron';
import db from '../config/database.js';
import finnhubService from './finnhub.js';

class PriceUpdater {
  async updateAllPrices() {
    console.log('🔄 Updating prices...');
    const positions = db.prepare('SELECT symbol FROM portfolios').all();
    if (!positions.length) return;
    
    const quotes = await finnhubService.getMultipleQuotes(positions.map(p => p.symbol));
    const updateStmt = db.prepare('UPDATE portfolios SET current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?');
    const historyStmt = db.prepare('INSERT INTO price_history (symbol, price) VALUES (?, ?)');
    
    const tx = db.transaction(quotesData => {
      for (const q of quotesData) {
        if (q.price) { updateStmt.run(q.price, q.symbol); historyStmt.run(q.symbol, q.price); }
      }
    });
    tx(quotes);
    console.log('✅ Prices updated');
  }
  
  startCron() {
    cron.schedule('0 * * * *', () => this.updateAllPrices());
    setTimeout(() => this.updateAllPrices(), 5000);
    console.log('✅ Cron job active (hourly)');
  }
}

export default new PriceUpdater();
''')

write('backend/src/routes/portfolio.js', '''import express from 'express';
import db from '../config/database.js';
import finnhubService from '../services/finnhub.js';

const router = express.Router();

router.get('/', (req, res) => {
  const positions = db.prepare(`
    SELECT id, symbol, quantity, entry_price, current_price,
           (quantity * current_price) as value,
           ((current_price - entry_price) * quantity) as gain,
           (((current_price - entry_price) / entry_price) * 100) as gain_pct,
           last_updated
    FROM portfolios ORDER BY added_date DESC
  `).all();
  res.json(positions);
});

router.get('/summary', (req, res) => {
  const s = db.prepare('SELECT SUM(quantity * current_price) as total_value, SUM((current_price - entry_price) * quantity) as total_gain, MAX(last_updated) as last_updated FROM portfolios WHERE current_price IS NOT NULL').get();
  const inv = db.prepare('SELECT SUM(quantity * entry_price) as invested FROM portfolios').get().invested || 0;
  res.json({total_value: s.total_value || 0, total_gain: s.total_gain || 0, total_gain_pct: inv > 0 ? (s.total_gain/inv)*100 : 0, last_updated: s.last_updated});
});

router.post('/add', async (req, res) => {
  const {symbol, quantity, entry_price} = req.body;
  if (!symbol || !quantity || !entry_price) return res.status(400).json({error: 'Missing fields'});
  
  let current_price = entry_price;
  try { current_price = (await finnhubService.getQuote(symbol.toUpperCase())).price; } catch(e) {}
  
  try {
    const stmt = db.prepare('INSERT INTO portfolios (symbol, quantity, entry_price, current_price) VALUES (?, ?, ?, ?)');
    const info = stmt.run(symbol.toUpperCase(), parseFloat(quantity), parseFloat(entry_price), current_price);
    res.status(201).json({id: info.lastInsertRowid, symbol: symbol.toUpperCase(), quantity, entry_price, current_price});
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({error: 'Symbol already exists'});
    res.status(500).json({error: e.message});
  }
});

router.delete('/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM portfolios WHERE id = ?');
  const info = stmt.run(req.params.id);
  if (!info.changes) return res.status(404).json({error: 'Not found'});
  res.json({message: 'Deleted', id: parseInt(req.params.id)});
});

export default router;
''')

print('\n📦 Installing backend dependencies...')
os.chdir(BASE / 'backend')
run('npm install')

print('\n✅ SETUP COMPLETE!')
print('\n🚀 TO START:')
print('  cd backend')
print('  npm start')
print('\n⚠️  Remember: Add your FINNHUB_API_KEY to backend/.env')
input('\nPress ENTER to exit...')
