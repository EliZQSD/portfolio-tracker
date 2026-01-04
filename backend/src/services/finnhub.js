import axios from 'axios';
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
