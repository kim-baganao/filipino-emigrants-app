import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getEmigrantsBySex } from '../services/emigrantsService'
import './ForecastingPage.css'

// Error boundary for LSTM component
class LSTMErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'LSTM component error' }
  }
  componentDidCatch(error, info) {
    console.error('LSTM render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#fee', padding: '12px', borderRadius: '8px', color: '#b91c1c', marginTop: '12px' }}>
          <p style={{ margin: 0 }}><strong>LSTM crashed:</strong> {this.state.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

class MLPErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'MLP component error' }
  }
  componentDidCatch(error, info) {
    console.error('MLP render error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#fee', padding: '12px', borderRadius: '8px', color: '#b91c1c', marginTop: '12px' }}>
          <p style={{ margin: 0 }}><strong>MLP crashed:</strong> {this.state.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ForecastingPage() {
  console.log('ForecastingPage component rendering...')
  const [data, setData] = useState([])
  const [maleData, setMaleData] = useState([])
  const [femaleData, setFemaleData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [LSTMComponent, setLSTMComponent] = useState(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState(null)
  const [MLPComponent, setMLPComponent] = useState(null)
  const [mlpLoading, setMlpLoading] = useState(false)
  const [mlpError, setMlpError] = useState(null)

  useEffect(() => {
    console.log('ForecastingPage useEffect triggered')
    let mounted = true
    const loadData = async () => {
      try {
        setError(null)
        const docs = await getEmigrantsBySex()
        console.log('ForecastingPage raw Firestore docs (emigrantsBySex):', docs)
        const prepared = docs
          .map(d => ({
            year: d.year,
            male: Number(d.male) || 0,
            female: Number(d.female) || 0,
            emigrants: (Number(d.male) || 0) + (Number(d.female) || 0)
          }))
          .filter(d => d.year != null && !Number.isNaN(d.emigrants))
          .sort((a, b) => (a.year > b.year ? 1 : -1))
        console.log('ForecastingPage prepared data:', prepared)

        const male = prepared.map(d => ({ year: d.year, value: d.male }))
        const female = prepared.map(d => ({ year: d.year, value: d.female }))

        if (mounted) {
          setData(prepared)
          setMaleData(male)
          setFemaleData(female)
          if (prepared.length === 0) {
            setError('No data found in the "emigrantsBySex" collection (missing year/male/female fields).')
          }
        }
      } catch (error) {
        console.error('Error loading data from Firestore:', error)
        if (mounted) setError(`Firebase error: ${error.message}`)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [])

  const loadLSTM = async () => {
    setModelLoading(true)
    setModelError(null)
    try {
      const mod = await import('./components/LSTMForecast')
      setLSTMComponent(() => mod.default)
    } catch (err) {
      console.error('Error loading LSTM component:', err)
      setModelError(err.message)
    } finally {
      setModelLoading(false)
    }
  }

  const loadMLP = async () => {
    setMlpLoading(true)
    setMlpError(null)
    try {
      const mod = await import('./components/MLPForecast')
      setMLPComponent(() => mod.default)
    } catch (err) {
      console.error('Error loading MLP component:', err)
      setMlpError(err.message)
    } finally {
      setMlpLoading(false)
    }
  }


  if (loading) {
    console.log('ForecastingPage: showing loading state')
    return (
      <div style={{ padding: '24px', background: 'white', minHeight: '400px' }}>
        <h1 style={{ color: '#333' }}>Loading forecasting data...</h1>
        <p style={{ color: '#666' }}>Please wait while we fetch data from Firebase.</p>
      </div>
    )
  }

  if (error) {
    console.log('ForecastingPage: showing error state:', error)
    return (
      <div style={{ padding: '24px', background: 'white', minHeight: '400px' }}>
        <h1 style={{ color: '#333' }}>Forecasting Page - Error</h1>
        <div style={{ background: '#fee', padding: '16px', borderRadius: '8px', color: '#b91c1c', marginTop: '16px' }}>
          <p><strong>Error:</strong> {error}</p>
          <p>Please verify Firebase connection, Firestore rules, and that documents contain numeric `year`, `male`, and `female` fields in the `emigrantsBySex` collection.</p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    console.log('ForecastingPage: showing no-data state')
    return (
      <div style={{ padding: '24px', background: 'white', minHeight: '400px' }}>
        <h1 style={{ color: '#333' }}>Forecasting Page - No Data</h1>
        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', color: '#92400e', marginTop: '16px' }}>
          <p><strong>No data loaded.</strong></p>
          <p>Please add documents to the `emigrantsBySex` collection with `year`, `male`, and `female` numeric fields.</p>
          <p>Data count: {data?.length || 0}</p>
        </div>
      </div>
    )
  }

  console.log('ForecastingPage: rendering main content with', data.length, 'records')

  return (
    <div className="app">
      <h1>Emigrant Population Analysis & Forecasting</h1>

      <section className="original-section">
        <h2>Historical Data: Emigration Trends</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'Emigrants', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="emigrants"
                stroke="#10b981"
                strokeWidth={2}
                name="Total"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="male"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Male"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="female"
                stroke="#ec4899"
                strokeWidth={2}
                name="Female"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="info">
          <p>Data shows emigrant trends from {data[0]?.year} to {data[data.length - 1]?.year}</p>
          <p>Total data points: {data.length}</p>
        </div>
      </section>

      <section className="forecast-section">
        <div className="chart-container">
          <h3>Forecast models</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
              <h4 style={{ marginTop: 0 }}>LSTM Model</h4>
              {!LSTMComponent && (
                <button
                  onClick={loadLSTM}
                  disabled={modelLoading}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}
                >
                  {modelLoading ? 'Loading LSTM...' : 'Load LSTM model'}
                </button>
              )}

              {modelError && <p style={{ color: '#c00', marginTop: '8px' }}>Model load error: {modelError}</p>}

              {LSTMComponent && (
                <div style={{ marginTop: '16px' }}>
                  <LSTMErrorBoundary>
                    <LSTMComponent data={data} maleData={maleData} femaleData={femaleData} />
                  </LSTMErrorBoundary>
                </div>
              )}

              {!LSTMComponent && !modelLoading && (
                <p style={{ color: '#555', marginTop: '12px' }}>Click to load the LSTM model.</p>
              )}
            </div>

            <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
              <h4 style={{ marginTop: 0 }}>MLP Model</h4>
              {!MLPComponent && (
                <button
                  onClick={loadMLP}
                  disabled={mlpLoading}
                  style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer' }}
                >
                  {mlpLoading ? 'Loading MLP...' : 'Load MLP model'}
                </button>
              )}

              {mlpError && <p style={{ color: '#c00', marginTop: '8px' }}>Model load error: {mlpError}</p>}

              {MLPComponent && (
                <div style={{ marginTop: '16px' }}>
                  <MLPErrorBoundary>
                    <MLPComponent data={data} maleData={maleData} femaleData={femaleData} />
                  </MLPErrorBoundary>
                </div>
              )}

              {!MLPComponent && !mlpLoading && (
                <p style={{ color: '#555', marginTop: '12px' }}>Click to load the MLP model.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

