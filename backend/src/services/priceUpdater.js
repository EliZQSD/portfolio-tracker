import cron from 'node-cron';
import db from '../config/database.js';
import finnhubService from './finnhub.js';

class PriceUpdater {
  async updateAllPrices() {
    console.log('🔄 Updating prices...');
    const positions = await db.allAsync('SELECT symbol FROM portfolios');
    if (!positions.length) return;
    const quotes = await finnhubService.getMultipleQuotes(positions.map(p => p.symbol));
    for (const q of quotes) {
      if (q.price) {
        await db.runAsync('UPDATE portfolios SET current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE symbol = ?', [q.price, q.symbol]);
        await db.runAsync('INSERT INTO price_history (symbol, price) VALUES (?, ?)', [q.symbol, q.price]);
        console.log(`  ✅ ${q.symbol}: ${q.price} USD`);
      }
    }
    console.log('✅ Prices updated');
  }
  startCron() {
    cron.schedule('0 * * * *', () => this.updateAllPrices());
    setTimeout(() => this.updateAllPrices(), 5000);
    console.log('✅ Cron job active (hourly)');
  }
}

export default new PriceUpdater();
