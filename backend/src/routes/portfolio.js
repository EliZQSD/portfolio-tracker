import express from 'express';
import db from '../config/database.js';
import finnhubService from '../services/finnhub.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const positions = await new Promise((resolve, reject) => {
    db.all(`SELECT id, symbol, quantity, entry_price, current_price, 
            (quantity * current_price) as current_value, 
            ((current_price - entry_price) * quantity) as gain_loss,
            (((current_price - entry_price) / entry_price) * 100) as gain_loss_percent 
            FROM portfolios`, 
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  res.json(positions);
});

router.get('/summary', async (req, res) => {
  const summary = await new Promise((resolve, reject) => {
    db.get(`SELECT 
            SUM(quantity * current_price) as total_value, 
            SUM((current_price - entry_price) * quantity) as total_gain
            FROM portfolios`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row || {total_value: 0, total_gain: 0});
      }
    );
  });
  
  const inv = await new Promise((resolve, reject) => {
    db.get('SELECT SUM(quantity * entry_price) as invested FROM portfolios', 
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  const totalGainPct = inv && inv.invested > 0 ? (summary.total_gain / inv.invested) * 100 : 0;
  
  res.json({
    total_value: summary.total_value || 0, 
    total_gain: summary.total_gain || 0, 
    total_gain_pct: totalGainPct,
    last_updated: new Date()
  });
});

router.post('/add', async (req, res) => {
  const {symbol, quantity, entry_price} = req.body;
  
  if (!symbol || !quantity || !entry_price) {
    return res.status(400).json({error: 'Missing fields'});
  }
  
  let current_price = entry_price;
  
  try {
    const quote = await finnhubService.getQuote(symbol.toUpperCase());
    if (quote && quote.c) {
      current_price = quote.c;
    }
  } catch(e) {
    console.log('Could not fetch price for', symbol);
  }
  
  try {
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO portfolios (symbol, quantity, entry_price, current_price) VALUES (?, ?, ?, ?)',
        [symbol.toUpperCase(), quantity, entry_price, current_price],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Symbol already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
    
    const asset = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM portfolios WHERE symbol = ?', [symbol.toUpperCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    res.status(201).json(asset);
  } catch(e) {
    if (e.message === 'Symbol already exists') {
      return res.status(409).json({error: 'Symbol already exists'});
    }
    res.status(500).json({error: e.message});
  }
});

router.delete('/:id', async (req, res) => {
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM portfolios WHERE id = ?', [req.params.id],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
  res.json({message: 'Deleted'});
});

export default router;
