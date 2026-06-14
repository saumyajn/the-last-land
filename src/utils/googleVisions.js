import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase'; // Import your firebase app instance
import {
  shouldUseFirebaseEmulators
} from './firebaseEnv';

const functions = getFunctions(app);
const emulatorOcrUrl =
  process.env.REACT_APP_EMULATOR_OCR_URL ||
  "https://us-central1-image-to-data-9a90b.cloudfunctions.net/extract_text_from_image";

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const callOcrFunction = async (payload) => {
  if (shouldUseFirebaseEmulators) {
    const response = await fetch(emulatorOcrUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: payload.image }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const ocrError = new Error(data.error || `OCR request failed with ${response.status}`);
      ocrError.name = "OcrError";
      throw ocrError;
    }

    return data;
  }

  // This "calls" the 'process_image_ocr' function in main.py
  const ocrFunction = httpsCallable(functions, 'process_image_ocr'); 
  
  try {
    const result = await ocrFunction(payload);
    return result.data || {};
  } catch (error) {
    console.error("Cloud OCR failed:", error);
    const message = error?.message || error?.details || "Cloud OCR failed.";
    const ocrError = new Error(message);
    ocrError.name = "OcrError";
    throw ocrError;
  }
};

export const detectText = async (base64Image) => {
  // result contains the {"text": "..."} object from Python
  const data = await callOcrFunction({ image: base64Image });
  return data.text || "No text found.";
};

export const detectTextWithWords = async (base64Image) => {
  const data = await callOcrFunction({ image: base64Image, includeWords: true });
  return {
    text: data.text || "No text found.",
    words: Array.isArray(data.words) ? data.words : [],
  };
};
