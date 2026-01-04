import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [portfolio, setPortfolio] = useState([])
  const [summary, setSummary] = useState({ totalValue: 0, totalGain: 0, totalGainPercent: 0 })
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get('/api/portfolio')
      setPortfolio(res.data)
      calculateSummary(res.data)
    } catch (err) {
      console.error('Error fetching portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (data) => {
    const totalValue = data.reduce((sum, item) => sum + item.current_value, 0)
    const totalGain = data.reduce((sum, item) => sum + item.gain_loss, 0)
    const totalGainPercent = data.reduce((sum, item) => sum + item.gain_loss_percent, 0) / (data.length || 1)
    setSummary({ totalValue, totalGain, totalGainPercent })
  }

  const addAsset = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/portfolio/add', {
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity),
        buy_price: parseFloat(buyPrice)
      })
      setSymbol('')
      setQuantity('')
      setBuyPrice('')
      fetchPortfolio()
    } catch (err) {
      alert('Erreur lors de l\'ajout: ' + (err.response?.data?.error || err.message))
    }
  }

  const deleteAsset = async (id) => {
    if (confirm('Supprimer cet actif?')) {
      try {
        await axios.delete(`/api/portfolio/${id}`)
        fetchPortfolio()
      } catch (err) {
        alert('Erreur lors de la suppression')
      }
    }
  }

  useEffect(() => {
    fetchPortfolio()
    const interval = setInterval(fetchPortfolio, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div style={{textAlign: 'center', marginTop: '100px', color: 'white', fontSize: '24px'}}>Chargement...</div>
  }

  return (
    <div style={{maxWidth: '1400px', margin: '0 auto', padding: '20px'}}>
      <h1 style={{color: 'white', fontSize: '36px', marginBottom: '30px', textAlign: 'center', textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>💼 Portfolio Tracker</h1>
      
      <div style={{background: 'white', borderRadius: '15px', padding: '25px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <h2 style={{marginBottom: '20px', color: '#333'}}>📊 Résumé du Portfolio</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'}}>
          <div style={{textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '10px', color: 'white'}}>
            <div style={{fontSize: '14px', opacity: '0.9'}}>Valeur Totale</div>
            <div style={{fontSize: '28px', fontWeight: 'bold', marginTop: '5px'}}>${summary.totalValue.toFixed(2)}</div>
          </div>
          <div style={{textAlign: 'center', padding: '20px', background: summary.totalGain >= 0 ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', borderRadius: '10px', color: 'white'}}>
            <div style={{fontSize: '14px', opacity: '0.9'}}>Gain/Perte</div>
            <div style={{fontSize: '28px', fontWeight: 'bold', marginTop: '5px'}}>{summary.totalGain >= 0 ? '+' : ''}
${summary.totalGain.toFixed(2)}</div>
          </div>
          <div style={{textAlign: 'center', padding: '20px', background: summary.totalGainPercent >= 0 ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', borderRadius: '10px', color: 'white'}}>
            <div style={{fontSize: '14px', opacity: '0.9'}}>% Global</div>
            <div style={{fontSize: '28px', fontWeight: 'bold', marginTop: '5px'}}>{summary.totalGainPercent >= 0 ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      <div style={{background: 'white', borderRadius: '15px', padding: '25px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <h2 style={{marginBottom: '20px', color: '#333'}}>➕ Ajouter un Actif</h2>
        <form onSubmit={addAsset} style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px'}}>
          <input
            type="text"
            placeholder="Symbole (ex: ENPH)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            style={{padding: '12px', borderRadius: '8px', border: '2px solid #ddd', fontSize: '16px'}}
          />
          <input
            type="number"
            step="any"
            placeholder="Quantité"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            style={{padding: '12px', borderRadius: '8px', border: '2px solid #ddd', fontSize: '16px'}}
          />
          <input
            type="number"
            step="any"
            placeholder="Prix d'achat"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            required
            style={{padding: '12px', borderRadius: '8px', border: '2px solid #ddd', fontSize: '16px'}}
          />
          <button
            type="submit"
            style={{padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}}
          >
            Ajouter
          </button>
        </form>
      </div>

      <div style={{background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <h2 style={{marginBottom: '20px', color: '#333'}}>📈 Mes Actifs</h2>
        {portfolio.length === 0 ? (
          <p style={{textAlign: 'center', color: '#999', padding: '40px'}}>Aucun actif dans votre portfolio. Ajoutez-en un ci-dessus!</p>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#f5f5f5', borderBottom: '2px solid #ddd'}}>
                <th style={{padding: '15px', textAlign: 'left', fontWeight: '600'}}>Symbole</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>Quantité</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>Prix Achat</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>Prix Actuel</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>Valeur</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>Gain/Perte</th>
                <th style={{padding: '15px', textAlign: 'right', fontWeight: '600'}}>%</th>
                <th style={{padding: '15px', textAlign: 'center', fontWeight: '600'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((asset) => (
                <tr key={asset.id} style={{borderBottom: '1px solid #f0f0f0'}}>
                  <td style={{padding: '15px', fontWeight: 'bold', color: '#667eea'}}>{asset.symbol}</td>
                  <td style={{padding: '15px', textAlign: 'right'}}>{asset.quantity}</td>
                  <td style={{padding: '15px', textAlign: 'right'}}>${asset.buy_price.toFixed(2)}</td>
                  <td style={{padding: '15px', textAlign: 'right'}}>${asset.current_price?.toFixed(2) || '---'}</td>
                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold'}}>${asset.current_value.toFixed(2)}</td>
                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: asset.gain_loss >= 0 ? '#38ef7d' : '#f45c43'}}>
                    {asset.gain_loss >= 0 ? '+' : ''}${asset.gain_loss.toFixed(2)}
                  </td>
                  <td style={{padding: '15px', textAlign: 'right', fontWeight: 'bold', color: asset.gain_loss_percent >= 0 ? '#38ef7d' : '#f45c43'}}>
                    {asset.gain_loss_percent >= 0 ? '+' : ''}{asset.gain_loss_percent.toFixed(2)}%
                  </td>
                  <td style={{padding: '15px', textAlign: 'center'}}>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      style={{padding: '8px 15px', borderRadius: '6px', border: 'none', background: '#f45c43', color: 'white', cursor: 'pointer', fontSize: '14px'}}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div style={{textAlign: 'center', marginTop: '30px', color: 'white', opacity: '0.8'}}>Mise à jour automatique toutes les minutes</div>
    </div>
  )
}

export default App
