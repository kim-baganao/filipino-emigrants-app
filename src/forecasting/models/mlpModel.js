import * as tf from '@tensorflow/tfjs';

/**
 * Build MLP (Multi-Layer Perceptron) Model for Time Series Forecasting
 * Architecture:
 * - Input: Flattened sequence [lookback * features]
 * - Dense Layer 1: 64 units, ReLU activation, dropout 0.2
 * - Dense Layer 2: 32 units, ReLU activation, dropout 0.2
 * - Dense Output: 1 unit (emigrants prediction)
 * - Loss: MSE (Mean Squared Error)
 * - Optimizer: Adam (lr=0.001)
 * - Metrics: MAE (Mean Absolute Error)
 */
export function buildMLPModel(lookback = 9, features = 2) {
  const model = tf.sequential();

  const inputSize = lookback * features;

  // First Dense layer/////
  model.add(tf.layers.dense({
    units: 56,
    activation: 'tanh',
    inputShape: [inputSize]
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Second Dense layer
  model.add(tf.layers.dense({
    units: 74,
    activation: 'tanh'
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

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
 * Flatten sequences for MLP input
 * MLP expects 2D input: [samples, features]
 * We flatten the 3D sequences to 2D
 */
function flattenSequences(X) {
  return X.map(seq => seq.flat());
}

/**
 * Train MLP Model
 * @param {tf.Sequential} model - The MLP model
 * @param {Array} X - Input sequences (will be flattened)
 * @param {Array} y - Target values
 * @param {Function} onEpochEnd - Callback for epoch progress
 * @param {number} epochs - Number of training epochs (default: 100)
 * @param {number} validationSplit - Validation split ratio (default: 0.2)
 */
export async function trainMLPModel(model, X, y, onEpochEnd, epochs = 100, validationSplit = 0.2) {
  // Flatten sequences for MLP
  const flatX = flattenSequences(X);

  // Convert to tensors
  const xs = tf.tensor2d(flatX);
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
 * Make predictions using MLP model
 */
export async function predictMLP(model, X) {
  const flatX = flattenSequences(X);
  const xs = tf.tensor2d(flatX);
  const predictions = model.predict(xs);
  const result = await predictions.array();

  xs.dispose();
  predictions.dispose();

  return result.map(r => r[0]);
}

/**
 * Save MLP model to IndexedDB
 */
export async function saveMLPModel(model, metadata) {
  await model.save('indexeddb://emigrants-mlp-model');
  localStorage.setItem('mlp-metadata', JSON.stringify(metadata));
}

/**
 * Load MLP model from IndexedDB
 */
export async function loadMLPModel() {
  try {
    const model = await tf.loadLayersModel('indexeddb://emigrants-mlp-model');
    const metadata = JSON.parse(localStorage.getItem('mlp-metadata'));
    return { model, metadata };
  } catch (error) {
    console.error('Error loading MLP model:', error);
    return null;
  }
}

/**
 * Delete MLP model from IndexedDB
 */
export async function deleteMLPModel() {
  try {
    await tf.io.removeModel('indexeddb://emigrants-mlp-model');
    localStorage.removeItem('mlp-metadata');
    return true;
  } catch (error) {
    console.error('Error deleting MLP model:', error);
    return false;
  }
}

/**
 * Download MLP model files
 */
export async function downloadMLPModel(model, metadata) {
  // Save model to downloads
  await model.save('downloads://emigrants-mlp-model');

  // Download metadata
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(metadataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mlp-metadata.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Upload MLP model from downloaded files (metadata JSON, model JSON, weights BIN)
 * Reconstructs and restores the model from these files
 */
export async function uploadMLPModelFromJSON(metadataFile, modelJsonFile, weightsFile) {
  if (!metadataFile) throw new Error('Metadata file required');

  let model = null;
  let metadata = null;
  let modelJsonData = null;

  try {
    // Parse metadata
    const metadataText = await metadataFile.text();
    metadata = JSON.parse(metadataText);
    console.log('MLP metadata loaded');

    // Store metadata
    localStorage.setItem('mlp-metadata', JSON.stringify(metadata));

    if (modelJsonFile && weightsFile) {
      try {
        console.log('Loading MLP model from provided files');

        // Read model JSON
        const modelJsonText = await modelJsonFile.text();
        modelJsonData = JSON.parse(modelJsonText);
        console.log('MLP model JSON data:', modelJsonData);

        // Read weights binary
        const weightsBinary = await weightsFile.arrayBuffer();
        console.log('MLP weights binary size:', weightsBinary.byteLength);

        // Extract layer configuration
        const modelTopology = modelJsonData.modelTopology || modelJsonData;
        const layers = [];

        if (modelTopology.config && modelTopology.config.layers) {
          for (let i = 0; i < modelTopology.config.layers.length; i++) {
            const layerConfig = modelTopology.config.layers[i];
            console.log(`Processing MLP layer ${i}:`, layerConfig.class_name);

            if (layerConfig.class_name === 'Dense') {
              const denseConfig = { ...layerConfig.config };
              if (i === 0 && layerConfig.config.batch_input_shape) {
                denseConfig.inputShape = layerConfig.config.batch_input_shape.slice(1);
              }
              layers.push(tf.layers.dense(denseConfig));
            } else if (layerConfig.class_name === 'Dropout') {
              layers.push(tf.layers.dropout({ ...layerConfig.config }));
            }
          }
        }

        // Fallback architecture if config missing
        if (layers.length === 0) {
          const lookback = metadata?.lookback || 3;
          const featureCount = (metadata?.features?.length) || 1;
          const inputSize = lookback * featureCount;
          console.warn('Could not extract layers from config, using default MLP architecture');
          layers.push(
            tf.layers.dense({ units: 56, activation: 'tanh', inputShape: [inputSize] }),
            tf.layers.dropout({ rate: 0.2 }),
            tf.layers.dense({ units: 74, activation: 'tanh' }),
            tf.layers.dropout({ rate: 0.2 }),
            tf.layers.dense({ units: 1 })
          );
        }

        model = tf.sequential({ layers });

        // Compile model
        model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'meanSquaredError',
          metrics: ['mae']
        });

        // Load weights using weight specs
        const weightSpecs = modelJsonData.weightSpecs || [];
        console.log('MLP weight specs:', weightSpecs);
        console.log('MLP expected weights:', model.getWeights().map(w => w.shape));

        if (weightSpecs.length > 0) {
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

          console.log('Setting MLP weights:', weightTensors.map(t => t.shape));
          model.setWeights(weightTensors);
          weightTensors.forEach(t => t.dispose());
        } else {
          console.warn('No weight specs found in MLP model JSON');
        }

        console.log('MLP model loaded successfully from files');
      } catch (fileError) {
        console.error('Error loading MLP model from files:', fileError);
        console.error('MLP model JSON structure:', modelJsonData);
        throw new Error('Failed to load MLP model from files: ' + fileError.message);
      }
    } else {
      throw new Error('Model JSON and weights files are required');
    }

  } catch (error) {
    console.error('Error in uploadMLPModelFromJSON:', error);
    throw error;
  }

  return { model, metadata };
}
