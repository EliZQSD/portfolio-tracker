const axios = require('axios');

class PredictionService {
  constructor() {
    this.API_KEY = process.env.FINNHUB_API_KEY;
    this.BASE_URL = 'https://finnhub.io/api/v1';
  }

  // Calcul du RSI (Relative Strength Index)
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    // Calculer les gains et pertes moyens
    for (let i = 1; i <= period; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculer RSI
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  // Calcul du MACD (Moving Average Convergence Divergence)
  calculateMACD(prices) {
    if (prices.length < 26) return null;
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    return {
      macd: macd,
      signal: 'NEUTRAL'
    };
  }

  // Calcul de la moyenne mobile exponentielle (EMA)
  calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  // Calcul de la moyenne mobile simple (SMA)
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // Obtenir les données historiques
  async getHistoricalData(symbol, days = 30) {
    try {
      const to = Math.floor(Date.now() / 1000);
      const from = to - (days * 24 * 60 * 60);
      
      const response = await axios.get(`${this.BASE_URL}/stock/candle`, {
        params: {
          symbol: symbol,
          resolution: 'D',
          from: from,
          to: to,
          token: this.API_KEY
        }
      });
      
      if (response.data.s === 'ok') {
        return response.data.c; // Closing prices
      }
      return null;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      return null;
    }
  }

  // Générer une prédiction pour un actif
  async generatePrediction(symbol) {
    try {
      const prices = await this.getHistoricalData(symbol, 30);
      
      if (!prices || prices.length < 26) {
        return {
          symbol: symbol,
          prediction: 'INSUFFICIENT_DATA',
          confidence: 0,
          indicators: {}
        };
      }
      
      const rsi = this.calculateRSI(prices);
      const macd = this.calculateMACD(prices);
      const sma20 = this.calculateSMA(prices, 20);
      const currentPrice = prices[prices.length - 1];
      
      // Logique de prédiction
      let signal = 'HOLD';
      let confidence = 50;
      
      // RSI: < 30 = oversold (BUY), > 70 = overbought (SELL)
      if (rsi < 30) {
        signal = 'BUY';
        confidence += 20;
      } else if (rsi > 70) {
        signal = 'SELL';
        confidence += 20;
      }
      
      // Price vs SMA20
      if (currentPrice > sma20) {
        if (signal === 'BUY') confidence += 15;
      } else {
        if (signal === 'SELL') confidence += 15;
      }
      
      // Prédiction de prix pour 7 jours
      const trendDirection = currentPrice > sma20 ? 1 : -1;
      const volatility = this.calculateVolatility(prices);
      const predicted7d = currentPrice + (currentPrice * 0.02 * trendDirection * volatility);
      
      return {
        symbol: symbol,
        currentPrice: currentPrice,
        predicted7d: predicted7d,
        prediction: signal,
        confidence: Math.min(confidence, 95),
        indicators: {
          rsi: rsi.toFixed(2),
          macd: macd.macd.toFixed(2),
          sma20: sma20.toFixed(2)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error generating prediction for ${symbol}:`, error.message);
      return {
        symbol: symbol,
        prediction: 'ERROR',
        confidence: 0,
        error: error.message
      };
    }
  }

  // Calculer la volatilité
  calculateVolatility(prices) {
    if (prices.length < 2) return 1;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0.5, Math.min(2, stdDev * 100));
  }

  // Générer des prédictions pour tout le portefeuille
  async generatePortfolioPredictions(symbols) {
    try {
      const predictions = [];
      
      for (const symbol of symbols) {
        const prediction = await this.generatePrediction(symbol);
        predictions.push(prediction);
        // Pause pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return predictions;
    } catch (error) {
      console.error('Error generating portfolio predictions:', error.message);
      return [];
    }
  }
}

module.exports = new PredictionService();
