import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from './firebase'; 
import {
  firebaseEmulatorHost,
  firebaseEmulatorPorts,
  shouldUseFirebaseEmulators
} from './firebaseEnv'; 

const functions = getFunctions(app, 'us-central1');

if (shouldUseFirebaseEmulators) {
  const emulatorConnectionKey = "__imageToDataFunctionsEmulatorConnected";
  if (!window[emulatorConnectionKey]) {
    connectFunctionsEmulator(functions, firebaseEmulatorHost, firebaseEmulatorPorts.functions);
    window[emulatorConnectionKey] = true;
  }
}
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Extracts structured JSON data from a game screenshot using the backend Gemini pipeline.
 * @param {string} base64Image - The image data without the data:image/png;base64, prefix.
 * @param {string} expectedType - "REPORT" for table matrices, "STATS" for flat attributes.
 */
export const extractGameData = async (base64Image, expectedType = "STATS") => {
  // Target the new function name created in Step 2
  const extractionFunction = httpsCallable(functions, 'process_image_extraction'); 
  
  try {
    const result = await extractionFunction({ 
        image: base64Image, 
        expectedType 
    });
    
    if (!result.data || !result.data.success) {
        throw new Error(result?.data?.error || "Extraction failed on the server.");
    }
    
    // Returns the clean, structured JSON object ready for immediate use
    return result.data.data; 
  } catch (error) {
    const message =
      error?.message ||
      error?.details?.error ||
      error?.details ||
      error?.code ||
      "Image extraction failed.";
    console.error("Pipeline failure:", message, {
      code: error?.code,
      details: error?.details,
    });
    throw new Error(message);
  }
};

export const detectText = async (base64Image) => {
  const data = await extractGameData(base64Image, "STATS");
  return JSON.stringify(data, null, 2);
};

export const detectTextWithWords = async (base64Image) => {
  const data = await extractGameData(base64Image, "STATS");
  return {
    text: JSON.stringify(data, null, 2),
    data,
    words: [],
  };
};
