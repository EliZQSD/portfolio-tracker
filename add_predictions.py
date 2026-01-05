import os
import sys
import json

# Ajouter le chemin du backend pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

print("\n" + "="*60)
print("   AJOUT DE LA FONCTIONNALITE DE PREDICTIONS")
print("="*60)

print("\n[1/5] Installation de la dependance 'axios' pour Node.js...")
os.system("cd backend && npm install axios")

print("\n[2/5] Verification du service de predictions...")
service_file = os.path.join('backend', 'src', 'services', 'predictionService.js')
if os.path.exists(service_file):
    print("   ✓ predictionService.js trouve")
else:
    print("   ✗ ERREUR: predictionService.js introuvable!")
    sys.exit(1)

print("\n[3/5] Creation du fichier de routes pour les predictions...")

route_content = """const express = require('express');
const router = express.Router();
const predictionService = require('../services/predictionService');

// Route pour generer une prediction pour un actif specifique
router.get('/predict/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const prediction = await predictionService.generatePrediction(symbol);
    res.json(prediction);
  } catch (error) {
    console.error('Error in /predict/:symbol:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Route pour generer des predictions pour tout le portefeuille
router.post('/predict-portfolio', async (req, res) => {
  try {
    const symbols = req.body.symbols;
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }
    const predictions = await predictionService.generatePortfolioPredictions(symbols);
    res.json({ predictions });
  } catch (error) {
    console.error('Error in /predict-portfolio:', error);
    res.status(500).json({ error: 'Failed to generate portfolio predictions' });
  }
});

module.exports = router;
"""

routes_dir = os.path.join('backend', 'src', 'routes')
os.makedirs(routes_dir, exist_ok=True)
route_file = os.path.join(routes_dir, 'predictions.js')

with open(route_file, 'w', encoding='utf-8') as f:
    f.write(route_content)

print("   ✓ predictions.js cree dans backend/src/routes/")

print("\n[4/5] Mise a jour du serveur backend...")

server_file = os.path.join('backend', 'src', 'server.js')
if os.path.exists(server_file):
    with open(server_file, 'r', encoding='utf-8') as f:
        server_content = f.read()
    
    if 'predictions' not in server_content:
        # Ajouter l'import de la route predictions
        import_line = "const predictionRoutes = require('./routes/predictions');\n"
        use_line = "app.use('/api/predictions', predictionRoutes);\n"
        
        # Trouver où insérer l'import (après les autres imports de routes)
        if "const portfolioRoutes" in server_content:
            server_content = server_content.replace(
                "const portfolioRoutes = require('./routes/portfolio');",
                "const portfolioRoutes = require('./routes/portfolio');\n" + import_line
            )
        else:
            # Insérer au début si pas d'autres routes
            lines = server_content.split('\n')
            for i, line in enumerate(lines):
                if 'require(' in line and './routes/' in line:
                    lines.insert(i+1, import_line.strip())
                    break
            else:
                # Si aucune route trouvée, insérer après express
                for i, line in enumerate(lines):
                    if "const app = express()" in line:
                        lines.insert(i+1, import_line.strip())
                        break
            server_content = '\n'.join(lines)
        
        # Trouver où insérer le use (après les autres app.use)
        if "app.use('/api/portfolio'" in server_content:
            server_content = server_content.replace(
                "app.use('/api/portfolio', portfolioRoutes);",
                "app.use('/api/portfolio', portfolioRoutes);\n" + use_line
            )
        else:
            # Insérer après le dernier app.use
            lines = server_content.split('\n')
            last_use_index = -1
            for i, line in enumerate(lines):
                if 'app.use(' in line:
                    last_use_index = i
            if last_use_index != -1:
                lines.insert(last_use_index + 1, use_line.strip())
                server_content = '\n'.join(lines)
        
        with open(server_file, 'w', encoding='utf-8') as f:
            f.write(server_content)
        
        print("   ✓ server.js mis a jour avec les routes de predictions")
    else:
        print("   ✓ Les routes de predictions sont deja configurees")
else:
    print("   ✗ ERREUR: server.js introuvable!")
    sys.exit(1)

print("\n[5/5] Mise a jour du frontend...")

frontend_file = os.path.join('frontend', 'script.js')
if os.path.exists(frontend_file):
    with open(frontend_file, 'r', encoding='utf-8') as f:
        frontend_content = f.read()
    
    if 'predictions' not in frontend_content.lower():
        # Ajouter une fonction pour obtenir les prédictions
        prediction_function = """\n\n// Fonction pour obtenir les predictions du portefeuille
async function loadPredictions() {
    try {
        const portfolio = await loadPortfolio();
        const symbols = portfolio.holdings.map(h => h.symbol);
        
        const response = await fetch('http://localhost:3001/api/predictions/predict-portfolio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbols })
        });
        
        const data = await response.json();
        return data.predictions;
    } catch (error) {
        console.error('Erreur lors du chargement des predictions:', error);
        return [];
    }
}

// Fonction pour afficher une prediction
function displayPrediction(prediction) {
    const signalColor = {
        'BUY': 'green',
        'SELL': 'red',
        'HOLD': 'orange'
    };
    
    return `
        <div class=\"prediction\" style=\"border: 2px solid ${signalColor[prediction.prediction] || 'gray'}; padding: 10px; margin: 10px 0; border-radius: 5px;\">
            <h3>${prediction.symbol}</h3>
            <p><strong>Signal:</strong> <span style=\"color: ${signalColor[prediction.prediction]}; font-weight: bold;\">${prediction.prediction}</span></p>
            <p><strong>Confiance:</strong> ${prediction.confidence}%</p>
            <p><strong>Prix actuel:</strong> $${prediction.currentPrice ? prediction.currentPrice.toFixed(2) : 'N/A'}</p>
            <p><strong>Prediction 7j:</strong> $${prediction.predicted7d ? prediction.predicted7d.toFixed(2) : 'N/A'}</p>
            <div class=\"indicators\">
                <p><strong>RSI:</strong> ${prediction.indicators?.rsi || 'N/A'}</p>
                <p><strong>MACD:</strong> ${prediction.indicators?.macd || 'N/A'}</p>
                <p><strong>SMA20:</strong> ${prediction.indicators?.sma20 || 'N/A'}</p>
            </div>
        </div>
    `;
}
"""
        
        frontend_content += prediction_function
        
        with open(frontend_file, 'w', encoding='utf-8') as f:
            f.write(frontend_content)
        
        print("   ✓ script.js mis a jour avec les fonctions de predictions")
    else:
        print("   ✓ Les fonctions de predictions sont deja presentes")
else:
    print("   ✗ AVERTISSEMENT: script.js introuvable (frontend non configure)")

print("\n" + "="*60)
print("   ✓ INSTALLATION TERMINEE AVEC SUCCES!")
print("="*60)
print("\nLa fonctionnalite de predictions a ete ajoutee!")
print("\nProchaines etapes:")
print("1. Redemarrer le serveur backend: cd backend && npm start")
print("2. Les predictions seront disponibles via:")
print("   - GET /api/predictions/predict/:symbol")
print("   - POST /api/predictions/predict-portfolio")
print("\nIndicateurs disponibles: RSI, MACD, SMA20")
print("Signaux: BUY, SELL, HOLD")
print("\n" + "="*60 + "\n")
