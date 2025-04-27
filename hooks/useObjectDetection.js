import { useState, useEffect } from "react";
import labels from "../assets/mobilenet_label";
import { loadTensorflowModel } from "react-native-fast-tflite";
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native'
import * as tf from "@tensorflow/tfjs";

// Global model state to ensure model is loaded only once across the app
let globalTflite = null;
let isGlobalModelLoading = true;
let globalModelError = null;
let globalModelLoaded = false;

// Initialize model loading on app startup - this happens only once
const initializeModel = async () => {
  if (globalTflite !== null) return; // Already initialized
  
  try {
    console.log("Initializing TensorFlow model globally...");
    await tf.ready();
    const model = await loadTensorflowModel(
      require("../assets/mobilenet_v1_1.0_224.tflite")
    );
    
    if (model) {
      globalTflite = model;
      console.log("Model loaded globally");
      globalModelLoaded = true;
      isGlobalModelLoading = false;
    } else {
      console.log("Model not loaded");
      globalModelError = "Failed to load model";
      isGlobalModelLoading = false;
    }
  } catch (error) {
    console.error("Error initializing model:", error);
    globalModelError = `Failed to load model: ${error.message}`;
    isGlobalModelLoading = false;
  }
};

// Start initializing the model immediately when this file is imported
initializeModel();

export const useObjectDetection = () => {
  // Use state to sync with the global values
  const [tflite, setTflite] = useState(globalTflite);
  const [isLoadingModel, setIsLoadingModel] = useState(isGlobalModelLoading);
  const [modelError, setModelError] = useState(globalModelError);
  const [modelLoaded, setModelLoaded] = useState(globalModelLoaded);

  // Sync local state with global state
  useEffect(() => {
    // Only set up a polling interval if the model isn't loaded yet
    if (!globalModelLoaded && isGlobalModelLoading) {
      const checkInterval = setInterval(() => {
        if (globalTflite !== tflite) {
          setTflite(globalTflite);
        }
        
        if (globalModelLoaded !== modelLoaded) {
          setModelLoaded(globalModelLoaded);
        }
        
        if (isGlobalModelLoading !== isLoadingModel) {
          setIsLoadingModel(isGlobalModelLoading);
        }
        
        if (globalModelError !== modelError) {
          setModelError(globalModelError);
        }
        
        // Clear interval once model is loaded or there's an error
        if (globalModelLoaded || globalModelError) {
          clearInterval(checkInterval);
        }
      }, 500);
      
      return () => clearInterval(checkInterval);
    }
  }, [tflite, modelLoaded, isLoadingModel, modelError]);

  const loadImageAsTensor = async (img64) => {
    const imgBuffer = tf.util.encodeString(img64, 'base64').buffer;
    const raw = new Uint8Array(imgBuffer);
    let imgTensor = decodeJpeg(raw);
    const scalar = tf.scalar(255);
    imgTensor = imgTensor.cast('float32');
    imgTensor = tf.image.resizeNearestNeighbor(imgTensor, [224, 224]);
    const tensorScaled = imgTensor.div(scalar);
    const img = tf.reshape(tensorScaled, [1, 224, 224, 3]);
    return img;
  };
  
  const runModelOnImage = async (img64) => {
    // Use the global tflite instance
    if (!globalTflite) {
      console.log("Model not loaded yet");
      return {
        label: "Loading model...",
        confidence: 0
      };
    }

    console.log("Using globally loaded model");

    try {
      await tf.ready();

      let tensor = await loadImageAsTensor(img64);
      let inputArray = tensor.dataSync();  // Using dataSync() to get a typed array instead
      let result = await globalTflite.run([inputArray]);
      
      if (result) {
        // Find max index of the result array 
        let resultArray = result[0];
        const maxProbabilityIndex = resultArray.indexOf(Math.max(...resultArray));
        let maxIndex = maxProbabilityIndex;
        console.log("Max Index:", maxIndex);
        let confidence = resultArray[maxIndex];
        let predictedLabel = labels[maxIndex];
        
        return {
          label: predictedLabel,
          confidence: confidence
        };
      }
    } catch (error) {
      console.log("Error during inference:", error);
      return {
        label: "Error detecting object",
        confidence: 0
      };
    }
    
    return {
      label: "Unknown",
      confidence: 0
    };
  };

  return {
    runModelOnImage,
    isLoadingModel,
    modelLoaded,
    modelError,
  };
};
