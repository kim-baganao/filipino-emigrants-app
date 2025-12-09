import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cleanData, sortData, normalizeData, denormalize, createSequences, calculateMetrics } from '../utils/dataPreparation';
import { buildLSTMModel, trainLSTMModel, predictLSTM, saveLSTMModel, loadLSTMModel, deleteLSTMModel, downloadLSTMModel, uploadLSTMModelFromJSON } from '../models/lstmModel';
import './ForecastPanel.css';

export default function LSTMForecast({ data, maleData, femaleData }) {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [forecastYears, setForecastYears] = useState(5);
  const [forecasts, setForecasts] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [uiError, setUiError] = useState('');
  const [uiInfo, setUiInfo] = useState('');

  const LOOKBACK = 3;
  const FEATURES = ['emigrants'];
  const TARGET = 'emigrants';
  const fileInputRef = useRef(null);

  const handleTrain = async () => {
    // Basic data guard to avoid silent failures
    if (!data || data.length < LOOKBACK + 1) {
      const msg = `Need at least ${LOOKBACK + 1} data points to train (have ${data?.length || 0}).`;
      setUiError(msg);
      alert(msg);
      return;
    }

    setIsTraining(true);
    setTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setMetrics(null);
    setUiError('');
    setUiInfo('Training LSTM...');

    try {
      let cleanedData = cleanData(data);
      cleanedData = sortData(cleanedData);

      const { normalized, mins, maxs } = normalizeData(cleanedData, FEATURES);
      const { X, y } = createSequences(normalized, LOOKBACK, FEATURES, TARGET);

      const newModel = buildLSTMModel(LOOKBACK, FEATURES.length);

      const onEpochEnd = (epoch, logs) => {
        setTrainingProgress({
          epoch: epoch + 1,
          loss: logs.loss.toFixed(6),
          mae: logs.mae.toFixed(6),
          val_loss: logs.val_loss?.toFixed(6),
          val_mae: logs.val_mae?.toFixed(6)
        });
      };

      await trainLSTMModel(newModel, X, y, onEpochEnd, 100, 0.2);

      const normalizedPredictions = await predictLSTM(newModel, X);

      const predictions = normalizedPredictions.map(pred =>
        denormalize(pred, mins[TARGET], maxs[TARGET])
      );

      const actualValues = y.map(val =>
        denormalize(val, mins[TARGET], maxs[TARGET])
      );

      // Create validation results table data (20% validation split for testing)
      const trainSize = Math.floor(actualValues.length * 0.8);
      const resultsData = actualValues.slice(trainSize).map((actual, index) => ({
        year: cleanedData[trainSize + index + LOOKBACK].year,
        actual: Math.round(actual),
        predicted: Math.round(predictions[trainSize + index]),
        error: Math.round(predictions[trainSize + index] - actual)
      }));
      setValidationResults(resultsData);

      const calculatedMetrics = calculateMetrics(actualValues, predictions);
      setMetrics(calculatedMetrics);

      const newMetadata = {
        modelType: 'LSTM',
        lookback: LOOKBACK,
        features: FEATURES,
        target: TARGET,
        mins,
        maxs,
        lastYear: cleanedData[cleanedData.length - 1].year,
        lastData: cleanedData.slice(-LOOKBACK),
        metrics: calculatedMetrics,
        trainedAt: new Date().toISOString()
      };

      await saveLSTMModel(newModel, newMetadata);

      setModel(newModel);
      setMetadata(newMetadata);

      alert(`LSTM model trained successfully!\nMAE: ${calculatedMetrics.mae}\nAccuracy: ${calculatedMetrics.accuracy}%`);
    } catch (error) {
      console.error('Training error:', error);
      setUiError(error.message);
      alert('Error training model: ' + error.message);
    } finally {
      setIsTraining(false);
      setUiInfo('');
    }
  };

  const handleLoadModel = async () => {
    try {
      setUiError('');
      const result = await loadLSTMModel();
      if (result) {
        setModel(result.model);
        setMetadata(result.metadata);
        setMetrics(result.metadata.metrics);
        alert('LSTM model loaded successfully!');
      } else {
        alert('No saved model found. Please train a model first.');
      }
    } catch (error) {
      console.error('Error loading model:', error);
      setUiError(error.message);
      alert('Error loading model: ' + error.message);
    }
  };

  const handleDeleteModel = async () => {
    if (!confirm('Are you sure you want to delete the saved LSTM model?')) return;

    try {
      await deleteLSTMModel();
      setModel(null);
      setMetadata(null);
      setMetrics(null);
      setForecasts([]);
      alert('LSTM model deleted successfully!');
    } catch (error) {
      console.error('Error deleting model:', error);
      setUiError(error.message);
      alert('Error deleting model: ' + error.message);
    }
  };

  const handleDownloadModel = async () => {
    if (!model || !metadata) {
      alert('No model to download. Please train a model first.');
      return;
    }

    try {
      await downloadLSTMModel(model, metadata);
      alert('LSTM model files downloaded!');
    } catch (error) {
      console.error('Error downloading model:', error);
      setUiError(error.message);
      alert('Error downloading model: ' + error.message);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadModel = async (event) => {
    const files = event.target.files;
    if (!files || !files.length) return;

    const jsonFile = files[0];
    if (!jsonFile.name.endsWith('.json')) {
      alert('Please select a JSON file (e.g., lstm-model-complete.json)');
      event.target.value = '';
      return;
    }

    try {
      setUiError('');
      const result = await uploadLSTMModelFromJSON(jsonFile);

      if (result.model && result.metadata) {
        setModel(result.model);
        setMetadata(result.metadata);
        if (result.metadata.metrics) {
          setMetrics(result.metadata.metrics);
        }
        alert('LSTM model uploaded and restored successfully!');
      } else {
        throw new Error('Failed to restore model from file');
      }
    } catch (error) {
      console.error('Error uploading model:', error);
      setUiError(error.message);
      alert('Error uploading model: ' + error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleForecast = async () => {
    if (!model || !metadata) {
      alert('Please train or load a model first.');
      return;
    }
    const yearsToForecast = Math.max(1, Math.min(10, Number(forecastYears) || 0));
    if (!Number.isFinite(yearsToForecast) || yearsToForecast <= 0) {
      alert('Please enter a valid number of years between 1 and 10.');
      return;
    }

    try {
      const { mins, maxs, lastData } = metadata;
      let currentSequence = lastData.map(row => ({
        year: row.year,
        emigrants: row.emigrants
      }));

      // Use the most recent historical male/female ratio for all forecast years
      const lastMale = maleData?.length ? maleData[maleData.length - 1].value : 0;
      const lastFemale = femaleData?.length ? femaleData[femaleData.length - 1].value : 0;
      const lastTotal = lastMale + lastFemale;
      const maleRatio = lastTotal > 0 ? lastMale / lastTotal : 0.5;
      const femaleRatio = lastTotal > 0 ? lastFemale / lastTotal : 0.5;

      const predictions = [];
      let currentYear = metadata.lastYear;

      for (let i = 0; i < yearsToForecast; i++) {
        const normalized = currentSequence.map(row => ({
          emigrants: (row.emigrants - mins.emigrants) / (maxs.emigrants - mins.emigrants)
        }));

        const input = [normalized.map(row => FEATURES.map(f => row[f]))];
        const normalizedPred = await predictLSTM(model, input);
        const predictedTotal = denormalize(normalizedPred[0], mins[TARGET], maxs[TARGET]);

        currentYear++;
        
        const predictedMale = Math.round(predictedTotal * maleRatio);
        const predictedFemale = Math.round(predictedTotal * femaleRatio);

        predictions.push({
          year: currentYear,
          male: predictedMale,
          female: predictedFemale,
          total: Math.round(predictedTotal),
          isForecast: true
        });

        currentSequence = [
          ...currentSequence.slice(1),
          {
            year: currentYear,
            emigrants: predictedTotal
          }
        ];
      }

      setForecasts(predictions);
      alert(`Generated ${forecastYears} year LSTM forecast!`);
    } catch (error) {
      console.error('Forecasting error:', error);
      alert('Error generating forecast: ' + error.message);
    }
  };

  const chartData = [
    ...(data || []).map(d => ({ year: d.year, male: d.male, female: d.female, total: d.emigrants })),
    ...forecasts
  ];

  return (
    <div className="forecast-panel lstm-panel">
      <h2>LSTM Forecast Results (Male, Female, Total)</h2>

      {uiError && (
        <div className="alert error">{uiError}</div>
      )}
      {uiInfo && (
        <div className="alert info">{uiInfo}</div>
      )}

      <div className="control-buttons">
        <button onClick={handleTrain} disabled={isTraining}>
          {isTraining ? 'Training...' : 'Train LSTM Model'}
        </button>
        <button onClick={handleLoadModel} disabled={isTraining}>
          Load Model
        </button>
        <button onClick={handleUploadClick} disabled={isTraining}>
          Upload Model
        </button>
        <button onClick={handleDeleteModel} disabled={isTraining || !model}>
          Delete Model
        </button>
        <button onClick={handleDownloadModel} disabled={isTraining || !model}>
          Download Model
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleUploadModel}
          style={{ display: 'none' }}
        />
      </div>

      {isTraining && trainingProgress && (
        <div className="training-progress">
          <h3>Training Progress</h3>
          <p>Epoch: {trainingProgress.epoch} / 100</p>
          <p>Loss: {trainingProgress.loss}</p>
          <p>MAE: {trainingProgress.mae}</p>
          {trainingProgress.val_loss && (
            <>
              <p>Val Loss: {trainingProgress.val_loss}</p>
              <p>Val MAE: {trainingProgress.val_mae}</p>
            </>
          )}
        </div>
      )}

      {metrics && !isTraining && (
        <>
          <div className="metrics">
            <h3>LSTM Model Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">MAE:</span>
                <span className="metric-value">{metrics.mae}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">RMSE:</span>
                <span className="metric-value">{metrics.rmse}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">MAPE:</span>
                <span className="metric-value">{metrics.mape}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">R²:</span>
                <span className="metric-value">{metrics.r2}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Accuracy:</span>
                <span className="metric-value">{metrics.accuracy}%</span>
              </div>
            </div>
          </div>

          {validationResults.length > 0 && (
            <div className="training-results">
              <h3>Testing Results - 20% Split (Actual vs Predicted)</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Actual Emigrants</th>
                      <th>Predicted Emigrants</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((row, i) => (
                      <tr key={i}>
                        <td>{row.year}</td>
                        <td>{row.actual.toLocaleString()}</td>
                        <td>{row.predicted.toLocaleString()}</td>
                        <td className={row.error >= 0 ? 'error-positive' : 'error-negative'}>
                          {row.error >= 0 ? '+' : ''}{row.error.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {model && !isTraining && (
        <div className="forecast-controls">
          <h3>Generate LSTM Forecast</h3>
          <div className="forecast-input">
            <label>
              Years to forecast:
              <input
                type="number"
                min="1"
                max="10"
                value={forecastYears}
                onChange={(e) => setForecastYears(parseInt(e.target.value))}
              />
            </label>
            <button onClick={handleForecast}>Generate Forecast</button>
          </div>
        </div>
      )}

      {forecasts.length > 0 && (
        <>
          <div className="chart-container">
            <h3>LSTM: Historical + Forecast by Sex</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  label={{ value: 'Emigrants', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? null : entry.male}
                  stroke="#60a5fa"
                  strokeWidth={2}
                  name="Male (Historical)"
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? null : entry.female}
                  stroke="#f472b6"
                  strokeWidth={2}
                  name="Female (Historical)"
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? entry.male : null}
                  stroke="#1d4ed8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Male (Forecast)"
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? entry.female : null}
                  stroke="#be185d"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Female (Forecast)"
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-results">
            <h3>LSTM Forecast Results (Male, Female, Total)</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Male</th>
                  <th>Female</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f, i) => (
                  <tr key={i}>
                    <td>{f.year}</td>
                    <td>{f.male?.toLocaleString() || '—'}</td>
                    <td>{f.female?.toLocaleString() || '—'}</td>
                    <td>{f.total?.toLocaleString() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="info-box">
        <h4>LSTM Model Configuration</h4>
        <ul>
          <li>Architecture: 2 LSTM layers (50 units each)</li>
          <li>Lookback window: {LOOKBACK} years</li>
          <li>Input features: Emigrants (historical values)</li>
          <li>Target: Emigrants (next year)</li>
          <li>Dropout: 0.2</li>
          <li>Epochs: 100 | Validation split: 20%</li>
        </ul>
      </div>
    </div>
  );
}
