const OPENCV_SCRIPT_ID = "opencv-js";
const LOCAL_OPENCV_SCRIPT_URL = `${process.env.PUBLIC_URL || ""}/opencv/opencv.js`;
const FALLBACK_OPENCV_SCRIPT_URL = "https://docs.opencv.org/4.x/opencv.js";
const DEFAULT_TIMEOUT_MS = 30000;

let openCvReadyPromise = null;

export const isOpenCvReady = () =>
  Boolean(
    window.cv &&
      typeof window.cv.imread === "function" &&
      typeof window.cv.Mat === "function" &&
      typeof window.cv.matchTemplate === "function",
  );

const waitForOpenCvReady = (timeoutMs = DEFAULT_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (isOpenCvReady()) {
        resolve(window.cv);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("OpenCV did not finish initializing."));
        return;
      }

      window.setTimeout(checkReady, 100);
    };

    checkReady();
  });

export const ensureOpenCvReady = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  if (isOpenCvReady()) {
    return Promise.resolve(window.cv);
  }

  if (openCvReadyPromise) {
    return openCvReadyPromise;
  }

  openCvReadyPromise = new Promise((resolve, reject) => {
    let fallbackAttempted = false;
    const existingScript =
      document.getElementById(OPENCV_SCRIPT_ID) ||
      document.querySelector(`script[src="${LOCAL_OPENCV_SCRIPT_URL}"]`) ||
      document.querySelector(`script[src="${FALLBACK_OPENCV_SCRIPT_URL}"]`);
    const script = existingScript || document.createElement("script");

    const handleError = () => {
      if (!fallbackAttempted && script.src !== FALLBACK_OPENCV_SCRIPT_URL) {
        fallbackAttempted = true;
        script.src = FALLBACK_OPENCV_SCRIPT_URL;
        return;
      }

      openCvReadyPromise = null;
      reject(new Error("Could not load OpenCV.js."));
    };

    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.id = OPENCV_SCRIPT_ID;
      script.async = true;
      script.src = LOCAL_OPENCV_SCRIPT_URL;
      document.head.appendChild(script);
    }

    waitForOpenCvReady(timeoutMs)
      .then(resolve)
      .catch((error) => {
        openCvReadyPromise = null;
        reject(error);
      });
  });

  return openCvReadyPromise;
};
