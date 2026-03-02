import { getFunctions, httpsCallable,connectFunctionsEmulator } from 'firebase/functions';
import { app } from './firebase'; // Import your firebase app instance

const functions = getFunctions(app);

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (window.location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export const detectText = async (base64Image) => {
  // This "calls" the 'process_image_ocr' function in main.py
  const ocrFunction = httpsCallable(functions, 'process_image_ocr'); 
  
  try {
    const result = await ocrFunction({ image: base64Image });
    // result.data contains the {"text": "..."} object from Python
    return result.data.text || "No text found.";
  } catch (error) {
    console.error("Cloud OCR failed:", error);
    return "Error during OCR";
  }
};