import express from 'express';
import db from '../config/database.js';
import finnhubService from '../services/finnhub.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const positions = await db.allAsync(`SELECT id, symbol, quantity, entry_price, current_price, (quantity * current_price) as value, ((current_price - entry_price) * quantity) as gain, (((current_price - entry_price) / entry_price) * 100) as gain_pct, last_updated FROM portfolios ORDER BY added_date DESC`);
  res.json(positions);
});

router.get('/summary', async (req, res) => {
  const s = await db.getAsync('SELECT SUM(quantity * current_price) as total_value, SUM((current_price - entry_price) * quantity) as total_gain, MAX(last_updated) as last_updated FROM portfolios WHERE current_price IS NOT NULL');
  const inv = (await db.getAsync('SELECT SUM(quantity * entry_price) as invested FROM portfolios')).invested || 0;
  res.json({total_value: s.total_value || 0, total_gain: s.total_gain || 0, total_gain_pct: inv > 0 ? (s.total_gain/inv)*100 : 0, last_updated: s.last_updated});
});

router.post('/add', async (req, res) => {
  const {symbol, quantity, entry_price} = req.body;
  if (!symbol || !quantity || !entry_price) return res.status(400).json({error: 'Missing fields'});
  let current_price = entry_price;
  try { current_price = (await finnhubService.getQuote(symbol.toUpperCase())).price; } catch(e) {}
  try {
    const result = await db.runAsync('INSERT INTO portfolios (symbol, quantity, entry_price, current_price) VALUES (?, ?, ?, ?)', [symbol.toUpperCase(), parseFloat(quantity), parseFloat(entry_price), current_price]);
    res.status(201).json({id: result.lastID, symbol: symbol.toUpperCase(), quantity, entry_price, current_price});
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({error: 'Symbol already exists'});
    res.status(500).json({error: e.message});
  }
});

router.delete('/:id', async (req, res) => {
  const result = await db.runAsync('DELETE FROM portfolios WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({error: 'Not found'});
  res.json({message: 'Deleted', id: parseInt(req.params.id)});
});

export default router;
