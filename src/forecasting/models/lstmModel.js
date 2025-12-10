import * as tf from '@tensorflow/tfjs';

/**
 * Build LSTM Model for Time Series Forecasting
 * Architecture:
 * - Input: [lookback, features] e.g., [3, 2] for 3 years × 2 features
 * - LSTM Layer 1: 50 units with dropout 0.2
 * - LSTM Layer 2: 50 units with dropout 0.2
 * - Dense Output: 1 unit (emigrants prediction)
 * - Loss: MSE (Mean Squared Error)
 * - Optimizer: Adam (lr=0.001)
 * - Metrics: MAE (Mean Absolute Error)
 */
export function buildLSTMModel(lookback = 7, features = 2) {
  const model = tf.sequential();

  // First LSTM layer
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: true,
    inputShape: [lookback, features],
    dropout: 0.2
  }));

  // Second LSTM layer
  model.add(tf.layers.lstm({
    units: 50,
    dropout: 0.2
  }));

  // Output layer
  model.add(tf.layers.dense({
    units: 1
  }));

  // Compile model
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

/**
 * Train LSTM Model
 * @param {tf.Sequential} model - The LSTM model
 * @param {Array} X - Input sequences
 * @param {Array} y - Target values
 * @param {Function} onEpochEnd - Callback for epoch progress
 * @param {number} epochs - Number of training epochs (default: 100)
 * @param {number} validationSplit - Validation split ratio (default: 0.2)
 */
export async function trainLSTMModel(model, X, y, onEpochEnd, epochs = 100, validationSplit = 0.2) {
  // Convert to tensors
  const xs = tf.tensor3d(X);
  const ys = tf.tensor2d(y, [y.length, 1]);

  // Determine batch size
  const batchSize = Math.min(32, X.length);

  // Train model
  const history = await model.fit(xs, ys, {
    epochs,
    batchSize,
    validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (onEpochEnd && epoch % 20 === 0) {
          onEpochEnd(epoch, logs);
        }
      }
    }
  });

  // Cleanup tensors
  xs.dispose();
  ys.dispose();

  return history;
}

/**
 * Make predictions using LSTM model
 */
export async function predictLSTM(model, X) {
  const xs = tf.tensor3d(X);
  const predictions = model.predict(xs);
  const result = await predictions.array();

  xs.dispose();
  predictions.dispose();

  return result.map(r => r[0]);
}

/**
 * Save LSTM model to IndexedDB
 */
export async function saveLSTMModel(model, metadata) {
  await model.save('indexeddb://emigrants-lstm-model');
  localStorage.setItem('lstm-metadata', JSON.stringify(metadata));
}

/**
 * Load LSTM model from IndexedDB
 */
export async function loadLSTMModel() {
  try {
    const model = await tf.loadLayersModel('indexeddb://emigrants-lstm-model');
    const metadata = JSON.parse(localStorage.getItem('lstm-metadata'));
    return { model, metadata };
  } catch (error) {
    console.error('Error loading LSTM model:', error);
    return null;
  }
}

/**
 * Delete LSTM model from IndexedDB
 */
export async function deleteLSTMModel() {
  try {
    await tf.io.removeModel('indexeddb://emigrants-lstm-model');
    localStorage.removeItem('lstm-metadata');
    return true;
  } catch (error) {
    console.error('Error deleting LSTM model:', error);
    return false;
  }
}

/**
 * Download LSTM model files (3 separate files: 2 JSON + 1 BIN)
 */
export async function downloadLSTMModel(model, metadata) {
  // Save model using TensorFlow's downloads:// handler (creates 3 files automatically)
  await model.save('downloads://emigrants-lstm-model');

  // Download metadata separately as JSON
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(metadataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lstm-metadata.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload LSTM model from downloaded files (3 files: metadata JSON, model JSON, weights BIN)
 * Reconstructs and restores the model from these files
 */
export async function uploadLSTMModelFromJSON(metadataFile, modelJsonFile, weightsFile) {
  if (!metadataFile) throw new Error('Metadata file required');
  
  let model = null;
  let metadata = null;
  let modelJsonData = null;
  
  try {
    // Parse metadata
    const metadataText = await metadataFile.text();
    metadata = JSON.parse(metadataText);
    console.log('Metadata loaded successfully');
    
    // Store metadata in localStorage
    localStorage.setItem('lstm-metadata', JSON.stringify(metadata));
    
    // Try to load model from provided files
    if (modelJsonFile && weightsFile) {
      try {
        console.log('Loading model from provided files');
        
        // Read model JSON
        const modelJsonText = await modelJsonFile.text();
        modelJsonData = JSON.parse(modelJsonText);
        console.log('Model JSON data:', modelJsonData);
        
        // Read weights binary
        const weightsBinary = await weightsFile.arrayBuffer();
        console.log('Weights binary size:', weightsBinary.byteLength);
        
        // Extract layer configuration from modelTopology
        const modelTopology = modelJsonData.modelTopology || modelJsonData;
        const layers = [];
        
        if (modelTopology.config && modelTopology.config.layers) {
          // Rebuild model from layer configuration
          for (let i = 0; i < modelTopology.config.layers.length; i++) {
            const layerConfig = modelTopology.config.layers[i];
            console.log(`Processing layer ${i}:`, layerConfig.class_name);
            
            if (layerConfig.class_name === 'LSTM') {
              const lstmConfig = { ...layerConfig.config };
              if (i === 0) {
                lstmConfig.inputShape = layerConfig.config.batch_input_shape?.slice(1);
              }
              lstmConfig.returnSequences = layerConfig.config.return_sequences !== false;
              layers.push(tf.layers.lstm(lstmConfig));
            } else if (layerConfig.class_name === 'Dense') {
              layers.push(tf.layers.dense({ ...layerConfig.config }));
            }
          }
        }
        
        // If we couldn't extract layers, use default architecture
        if (layers.length === 0) {
          console.warn('Could not extract layers from config, using default architecture');
          layers.push(
            tf.layers.lstm({
              units: 80,
              returnSequences: true,
              inputShape: [3, 1],
              dropout: 0
            }),
            tf.layers.lstm({
              units: 20,
              dropout: 0
            }),
            tf.layers.dense({
              units: 1
            })
          );
        }
        
        // Create model with extracted layers
        model = tf.sequential({ layers });
        
        // Compile model
        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'meanSquaredError',
          metrics: ['mae']
        });
        
        // Now load weights from binary file
        // Parse weights from the binary data using weight specs
        const weightSpecs = modelJsonData.weightSpecs || [];
        console.log('Weight specs:', weightSpecs);
        console.log('Expected weights:', model.getWeights().map(w => w.shape));
        
        if (weightSpecs.length > 0) {
          // Reconstruct weights from binary data using weight specs
          const weightTensors = [];
          let offset = 0;
          const view = new Float32Array(weightsBinary);
          
          for (const spec of weightSpecs) {
            const size = spec.shape.reduce((a, b) => a * b, 1);
            const weightData = view.slice(offset, offset + size);
            const tensor = tf.tensor(weightData, spec.shape);
            weightTensors.push(tensor);
            offset += size;
          }
          
          console.log('Setting weights:', weightTensors.map(t => t.shape));
          model.setWeights(weightTensors);
          weightTensors.forEach(t => t.dispose());
        } else {
          console.warn('No weight specs found in model JSON');
        }
        
        console.log('Model loaded successfully from files');
      } catch (fileError) {
        console.error('Error loading model from files:', fileError);
        console.error('Model JSON structure:', modelJsonData);
        throw new Error('Failed to load model from files: ' + fileError.message);
      }
    } else {
      throw new Error('Model JSON and weights files are required');
    }
    
  } catch (error) {
    console.error('Error in uploadLSTMModelFromJSON:', error);
    throw error;
  }
  
  return { model, metadata };
}

