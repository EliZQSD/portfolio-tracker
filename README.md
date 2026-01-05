# 📊 Portfolio Tracker

> Mini-logiciel personnel de tracking d'investissements halal avec prédictions 7j, signaux BUY/SELL/HOLD et scan de pépites

## 🚀 Installation Ultra-Simple (ZÉRO EFFORT)

### ✅ Prérequis
- **Python 3.7+** (probablement déjà installé sur Windows)
- **Node.js 18+** ([Télécharger ici](https://nodejs.org/))
- **Git** ([Télécharger ici](https://git-scm.com/))

### 📦 Installation EN 3 COMMANDES

**1. Clone le repo:**
```bash
git clone https://github.com/EliZQSD/portfolio-tracker.git
cd portfolio-tracker
```

**2. Lance le script d'installation automatique:**
```bash
python setup.py
```

**OU si tu veux vraiment RIEN faire, double-clique sur `setup.py` dans l'explorateur Windows.**

Le script va:
- ✅ Créer toute la structure backend
- ✅ Installer toutes les dépendances npm
- ✅ Configurer la base de données SQLite
- ✅ Tout préparer pour que tu puisses lancer immédiatement

**3. Configure ta clé API Finnhub:**
```bash
cd backend
copy .env.example .env
```

Édite `backend/.env` et ajoute ta clé Finnhub (gratuite):
```
FINNHUB_API_KEY=ta_cle_ici
PORT=3001
```

**Obtenir une clé Finnhub gratuite:** [https://finnhub.io/register](https://finnhub.io/register)

## 🎯 Lancer l'App

```bash
cd backend
npm start
```

✅ Backend lancé sur **http://localhost:3001**

## 📋 Features (Itération 1 - Actuelle)

### ✅ Suivi du Portefeuille
- Liste complète des positions (ENPH, META, MSFT, SPUS)
- Prix actuels via Finnhub
- Calcul automatique: valeur totale, gain/perte $, gain/perte %
- Résumé global du portefeuille
- Update automatique des prix toutes les heures (cron job)
- Historique des prix stocké en base SQLite

### 📌 Endpoints API Disponibles

**GET `/api/portfolio`** - Liste toutes les positions  
**GET `/api/portfolio/summary`** - Résumé global (valeur totale, gain total)  
**POST `/api/portfolio/add`** - Ajouter une position  
```json
{
  "symbol": "AAPL",
  "quantity": 1.5,
  "entry_price": 150.00
}
```
**DELETE `/api/portfolio/:id`** - Supprimer une position


## 🔮 Ajouter les Prédictions (Fonctionnalité 2)

Pour ajouter la fonctionnalité de prédictions avec analyse technique:

```bash
python add_predictions.py
```

Ce script va automatiquement:
- ✅ Installer la dépendance axios
- ✅ Créer predictionService.js avec les indicateurs RSI, MACD et SMA20
- ✅ Créer les routes API pour les prédictions
- ✅ Mettre à jour le serveur backend
- ✅ Ajouter les fonctions frontend

### 📊 Endpoints Prédictions Disponibles

**GET** `/api/predictions/predict/:symbol` - Prédiction pour un actif spécifique

**POST** `/api/predictions/predict-portfolio` - Prédictions pour tout le portefeuille
```json
{
  "symbols": ["ENPH", "META", "MSFT", "SPUS"]
}
```

### 📈 Indicateurs Techniques

- **RSI (Relative Strength Index)**: Détecte les zones de surachat (>70) et survente (<30)
- **MACD (Moving Average Convergence Divergence)**: Identifie les tendances haussières/baissières
- **SMA20 (Simple Moving Average 20 jours)**: Moyenne mobile pour identifier le support/résistance

### 🎯 Signaux de Trading

- **BUY** 🟢: RSI < 30 (survente) + Prix > SMA20 (tendance haussière)
- **SELL** 🔴: RSI > 70 (surachat) + Prix < SMA20 (tendance baissière)
- **HOLD** 🟡: Conditions neutres, pas de signal clair

### 📊 Format de Réponse

```json
{
  "symbol": "ENPH",
  "currentPrice": 95.50,
  "predicted7d": 98.75,
  "prediction": "BUY",
  "confidence": 75,
  "indicators": {
    "rsi": "28.45",
    "macd": "1.23",
    "sma20": "92.30"
  },
  "timestamp": "2026-01-04T21:00:00.000Z"
}
```


## 🔜 Prochaines Itérations

### Itération 2: Prédictions 7 Jours
- Analyse technique (RSI, MACD, MA 20/50/200)
- Calcul du score de confiance (tendance 35% + support/résistance 30% + volatilité 20% + volume 15%)
- Prédiction prix à +7 jours avec corridor haut/bas
- API candles Finnhub pour historiques

### Itération 3: Signaux BUY/SELL/HOLD
- Règles BUY: prix proche support + RSI <40 + MACD haussier + confiance >65%
- Règles SELL: prix proche résistance + RSI >70 + MACD baissier + confiance >65%
- Notifications temps réel (Socket.io)
- Envoi Discord webhook + Email

### Itération 4: Scan Matinal de Pépites Halal
- Scan automatique à 9h30 (ouverture NYSE)
- Filtrage halal (secteurs tech, santé, énergie propre)
- Critères: <90% du 52-week high, support proche, potentiel +10-15%, confiance >65%
- Exclusion: penny stocks, micro-caps, secteurs haram

### Itération 5: Frontend React + Vite
- Dashboard complet avec graphiques
- Dark mode
- Composants: PortfolioTable, PortfolioSummary, AddPositionForm, PredictionCard

## 🏗️ Architecture

```
portfolio-tracker/
├── backend/
│   ├── src/
│   │   ├── config/          # database.js
│   │   ├── routes/          # portfolio.js
│   │   ├── services/        # finnhub.js, priceUpdater.js
│   │   ├── models/          # schema.sql
│   │   └── server.js
│   ├── package.json
│   ├── .env.example
│   └── portfolio.db         # Base SQLite (créée auto)
├── frontend/                # À venir (Itération 5)
├── setup.py                 # 🎯 Script d'installation automatique
└── README.md
```

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **API Marché**: Finnhub (gratuit, 60 calls/min)
- **Cron Jobs**: node-cron (update prix toutes les heures)
- **Frontend** (à venir): React + Vite + Tailwind CSS

## 🤝 Contribution

Ce projet est personnel mais ouvert aux suggestions. Si tu veux améliorer quelque chose:
1. Fork le repo
2. Crée une branch (`git checkout -b feature/amelioration`)
3. Commit tes changes (`git commit -m 'Ajout feature X'`)
4. Push (`git push origin feature/amelioration`)
5. Ouvre une Pull Request

## 📝 License

MIT © EliZQSD

---

**Made with 💚 by EliZQSD** | **Halal Trading & Tech**
