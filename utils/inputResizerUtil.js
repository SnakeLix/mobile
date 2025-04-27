// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-react-native";
// import {
//   decodeJpeg,
//   fetch as rnFetchBlob,
// } from "@tensorflow/tfjs-react-native";
// import { readImageAsBuffer } from "./fileUtils";

// export const craftPreprocess = async (imageUri) => {
//   await tf.ready();
//   // Get image from uri
//   const imageData = await readImageAsBuffer(imageUri);
//   const imageTensor = decodeJpeg(new Uint8Array(imageData), 3);
//   const resized = tf.image.resizeBilinear(imageTensor, [800, 600]);

//   const normalized = tf.tidy(() => {
//     const mean = tf.tensor1d([0.485, 0.456, 0.406]);
//     const std = tf.tensor1d([0.229, 0.224, 0.225]);

//     return resized
//       .div(255.0)
//       .sub(mean)
//       .div(std)
//       .transpose([2, 0, 1]) // CHW
//       .expandDims(0); // Add batch dimension
//   });

//   // Return both the normalized tensor and the original image for post-processing
//   return {
//     normalizedTensor: normalized,
//     originalImage: imageTensor,
//     imageSize: {
//       width: imageTensor.shape[1],
//       height: imageTensor.shape[0],
//     },
//   };
// };

// // Execute CRAFT text detection model using react-native-fast-tflite
// export const craftTfliteModel = async (model, inputTensor) => {
//   try {
//     console.log("Input tensor shape:", inputTensor.shape);
//     const rawData = await inputTensor.data();
//     console.log("Raw tensor data length:", rawData.length);

//     // Pass as a single array (this is what the error message expects)
//     console.log("Trying model.run() with [rawData]");
//     const outputs = await model.run([rawData]);
//     console.log("Model inference completed successfully with [rawData]");

//     if (!outputs || outputs.length < 2) {
//       throw new Error("Model didn't return expected outputs array");
//     }
//     const outputData0 = outputs[0];
//     const outputData1 = outputs[1];
//     const outputLength0 = outputData0.length;
//     const outputElements = outputLength0 / 2;
//     const outputHeight = Math.sqrt(outputElements * 3/4);
//     const outputWidth = outputElements / outputHeight;
//     const height = Math.round(outputHeight);
//     const width = Math.round(outputWidth);
//     const y = tf.tensor(outputData0, [1, height, width, 2]);
//     const featureChannels = 32;
//     const feature = tf.tensor(outputData1, [1, height, width, featureChannels]);
//     return { y, feature };
//   } catch (error) {
//     console.error("Error running CRAFT model:", error);
//     if (error.message) console.error("Error message:", error.message);
//     if (error.stack) console.error("Error stack:", error.stack);
//     throw error;
//   }
// };

// // Simplified version of getDetBoxes_core for React Native
// // Note: This is a basic implementation and may need optimization
// export const getDetBoxes = (
//   scoreText,
//   scoreLink,
//   textThreshold = 0.7,
//   linkThreshold = 0.4,
//   lowText = 0.4
// ) => {
//   // Convert tensors to arrays for processing
//   const textMapArray = scoreText.arraySync();
//   const linkMapArray = scoreLink.arraySync();

//   // Get dimensions
//   const height = textMapArray.length;
//   const width = textMapArray[0].length;

//   // Create binary masks (simplified thresholding)
//   const textScore = [];
//   const linkScore = [];

//   for (let i = 0; i < height; i++) {
//     textScore[i] = [];
//     linkScore[i] = [];
//     for (let j = 0; j < width; j++) {
//       textScore[i][j] = textMapArray[i][j] >= lowText ? 1 : 0;
//       linkScore[i][j] = linkMapArray[i][j] >= linkThreshold ? 1 : 0;
//     }
//   }

//   // Combine scores (simplified connected components)
//   // Note: For a complete implementation, you would need a proper connected components algorithm

//   // For demonstration, we'll use a simplified approach to find text regions
//   const boxes = [];

//   // This is a placeholder - in a real implementation, you would:
//   // 1. Implement or use a library for connected components analysis
//   // 2. Filter components by size and text confidence
//   // 3. Create bounding boxes around valid text regions

//   // For testing, let's create mock text regions
//   // In a real app, replace this with actual text region detection
//   const mockRegions = findTextRegions(textScore, textMapArray, textThreshold);

//   return {
//     boxes: mockRegions,
//     labels: [], // Mock labels
//     mapper: [], // Mock mapper
//   };
// };

// // A simplified approach to find text regions (placeholder)
// const findTextRegions = (textScoreBinary, textMapOriginal, textThreshold) => {
//   // This is a simplified algorithm and not a complete implementation
//   // In a real app, you would use a proper connected components algorithm

//   const height = textScoreBinary.length;
//   const width = textScoreBinary[0].length;
//   const regions = [];

//   // Simple region growing approach (very simplified)
//   const visited = Array(height)
//     .fill(0)
//     .map(() => Array(width).fill(false));

//   for (let i = 0; i < height; i++) {
//     for (let j = 0; j < width; j++) {
//       if (textScoreBinary[i][j] === 1 && !visited[i][j]) {
//         // Found potential text region
//         const region = growRegion(
//           i,
//           j,
//           textScoreBinary,
//           visited,
//           textMapOriginal,
//           textThreshold
//         );
//         if (region.points.length >= 10) {
//           // Filter small regions
//           regions.push(region.box);
//         }
//       }
//     }
//   }

//   return regions;
// };

// // Helper function for region growing (placeholder)
// const growRegion = (
//   startI,
//   startJ,
//   binaryMap,
//   visited,
//   originalMap,
//   threshold
// ) => {
//   const queue = [{ i: startI, j: startJ }];
//   const points = [];
//   let minI = startI,
//     maxI = startI,
//     minJ = startJ,
//     maxJ = startJ;

//   while (queue.length > 0) {
//     const { i, j } = queue.shift();

//     if (
//       i < 0 ||
//       i >= binaryMap.length ||
//       j < 0 ||
//       j >= binaryMap[0].length ||
//       visited[i][j] ||
//       binaryMap[i][j] !== 1
//     ) {
//       continue;
//     }

//     visited[i][j] = true;
//     points.push({ i, j });

//     // Update bounding box
//     minI = Math.min(minI, i);
//     maxI = Math.max(maxI, i);
//     minJ = Math.min(minJ, j);
//     maxJ = Math.max(maxJ, j);

//     // Check neighbors (4-connected)
//     queue.push({ i: i + 1, j });
//     queue.push({ i: i - 1, j });
//     queue.push({ i, j: j + 1 });
//     queue.push({ i, j: j - 1 });
//   }

//   // Create bounding box
//   const box = [
//     [minJ, minI],
//     [maxJ, minI],
//     [maxJ, maxI],
//     [minJ, maxI],
//   ];

//   return {
//     points,
//     box,
//   };
// };

// // Adjust coordinates to original image size
// export const adjustResultCoordinates = (
//   boxes,
//   ratioW,
//   ratioH,
//   ratioNet = 2
// ) => {
//   if (!boxes || boxes.length === 0) return boxes;

//   return boxes.map((box) => {
//     return box.map((point) => [
//       point[0] * ratioW * ratioNet,
//       point[1] * ratioH * ratioNet,
//     ]);
//   });
// };

// // Post-process CRAFT output
// export const postprocessCraft = (y, feature, originalImage) => {
//   // Extract score maps
//   const yArray = y.arraySync();
//   const scoreText = tf.tensor(
//     yArray[0].map((row) => row.map((pixel) => pixel[0]))
//   );
//   const scoreLink = tf.tensor(
//     yArray[0].map((row) => row.map((pixel) => pixel[1]))
//   );

//   // Parameters
//   const textThreshold = 0.7;
//   const linkThreshold = 0.4;
//   const lowText = 0.4;

//   // Get original image dimensions
//   const imgHeight = originalImage.shape[0];
//   const imgWidth = originalImage.shape[1];

//   // Calculate ratio for coordinate adjustment
//   const ratioW = imgWidth / 800; // 800 is input width to the model
//   const ratioH = imgHeight / 600; // 600 is input height to the model

//   // Get text boxes
//   const { boxes } = getDetBoxes(
//     scoreText,
//     scoreLink,
//     textThreshold,
//     linkThreshold,
//     lowText
//   );

//   // Adjust coordinates to original image size
//   const adjustedBoxes = adjustResultCoordinates(boxes, ratioW, ratioH);

//   // Extract crops from boxes
//   const crops = [];
//   for (const box of adjustedBoxes) {
//     // Get min/max coordinates to create a rectangle
//     const allX = box.map((p) => p[0]);
//     const allY = box.map((p) => p[1]);

//     const minX = Math.min(...allX);
//     const maxX = Math.max(...allX);
//     const minY = Math.min(...allY);
//     const maxY = Math.max(...allY);

//     // Create crop coordinates
//     const minCo = [
//       Math.max(0, Math.floor(minX)),
//       Math.max(0, Math.floor(minY)),
//     ];
//     const maxCo = [
//       Math.min(imgWidth - 1, Math.ceil(maxX)),
//       Math.min(imgHeight - 1, Math.ceil(maxY)),
//     ];

//     crops.push([minCo, maxCo]);
//   }

//   // Clean up tensors
//   scoreText.dispose();
//   scoreLink.dispose();

//   return {
//     boxes: adjustedBoxes,
//     crops,
//   };
// };

// // Preprocess image for OCR
// export const preprocessOcr = async (imageUri, crop) => {
//   await tf.ready();

//   try {
//     console.log("Preprocessing OCR for crop:", crop);

//     // Use the same image loading method as craftPreprocess
//     // Instead of using rnFetchBlob which may cause network errors for file:// URIs
//     const imageData = await readImageAsBuffer(imageUri);
//     console.log("Image data loaded successfully, length:", imageData.length);

//     const imageTensor = decodeJpeg(new Uint8Array(imageData), 3);
//     console.log("Image tensor created, shape:", imageTensor.shape);

//     // Crop the image
//     const [minCo, maxCo] = crop;
//     console.log("Cropping from:", minCo, "to:", maxCo);

//     // Ensure crop coordinates are valid
//     const cropHeight = Math.max(1, maxCo[1] - minCo[1]);
//     const cropWidth = Math.max(1, maxCo[0] - minCo[0]);

//     // Ensure we don't exceed image dimensions
//     const startY = Math.min(minCo[1], imageTensor.shape[0] - 1);
//     const startX = Math.min(minCo[0], imageTensor.shape[1] - 1);

//     const croppedTensor = tf.slice(
//       imageTensor,
//       [startY, startX, 0],
//       [cropHeight, cropWidth, 3]
//     );

//     console.log("Cropped tensor shape:", croppedTensor.shape);

//     // Convert to grayscale
//     const grayscale = tf.tidy(() => {
//       // RGB to grayscale conversion weights
//       const weights = tf.tensor1d([0.2989, 0.587, 0.114]);
//       return tf.sum(tf.mul(croppedTensor, weights.reshape([1, 1, 3])), -1, true);
//     });

//     // Resize to OCR input size
//     const resized = tf.image.resizeBilinear(grayscale, [31, 200]);

//     // Normalize and prepare for model
//     const normalized = tf.tidy(() => {
//       return resized
//         .div(255.0) // Normalize to [0,1]
//         .expandDims(0); // Add batch dimension
//     });

//     // Clean up
//     imageTensor.dispose();
//     croppedTensor.dispose();
//     grayscale.dispose();
//     resized.dispose();

//     return normalized;
//   } catch (error) {
//     console.error("Error in preprocessOcr:", error);
//     if (error.message) console.error("Error message:", error.message);
//     if (error.stack) console.error("Error stack:", error.stack);
//     throw error;
//   }
// };

// // Run OCR model using react-native-fast-tflite
// export const runTfliteOcr = async (model, inputTensor) => {
//   try {
//     console.log("Running OCR model with input tensor shape:", inputTensor.shape);

//     // Get raw data from the input tensor
//     const rawData = await inputTensor.data();
//     console.log("OCR input raw data length:", rawData.length);

//     // Pass the raw Float32Array data inside an array, similar to CRAFT
//     console.log("Running OCR model with [rawData]");
//     const results = await model.run([rawData]); // Pass rawData inside an array

//     console.log("OCR model inference completed successfully");

//     // Check if results exist and have the expected structure
//     if (!results || results.length === 0) {
//       throw new Error("OCR model returned empty or invalid results");
//     }

//     // Convert the raw output to a TensorFlow.js tensor
//     // Assuming the output shape is [1, sequence_length, num_characters]
//     // Example shape: [1, 50, 37] (sequence length 50, 36 chars + blank)
//     const outputData = results[0];
//     const sequenceLength = 50; // Adjust based on your OCR model's output
//     const numCharacters = alphabets.length + 1; // 36 chars + 1 blank
//     const expectedLength = 1 * sequenceLength * numCharacters;

//     console.log("OCR output data length:", outputData.length);
//     console.log("Expected OCR output length:", expectedLength);

//     // Dynamically determine sequence length if possible
//     const actualSequenceLength = outputData.length / numCharacters;
//     console.log("Actual sequence length based on data:", actualSequenceLength);

//     // Use the actual sequence length for the tensor shape
//     const ocrOutputTensor = tf.tensor(outputData, [1, actualSequenceLength, numCharacters]);

//     return ocrOutputTensor; // Return the tensor for postprocessing
//   } catch (error) {
//     console.error("Error running OCR model:", error);
//     if (error.message) console.error("OCR Error message:", error.message);
//     if (error.stack) console.error("OCR Error stack:", error.stack);
//     throw error;
//   }
// };

// // Alphabet for OCR post-processing
// const alphabets = "0123456789abcdefghijklmnopqrstuvwxyz";
// const blankIndex = alphabets.length;

// // Post-process OCR output
// export const postprocessOcr = (output, greedy = true) => {
//   // Convert output tensor to array
//   const outputArray = output.arraySync()[0];

//   // For greedy decoding, take the highest probability character at each position
//   if (greedy) {
//     let result = "";
//     let lastChar = -1;

//     for (let i = 0; i < outputArray.length; i++) {
//       // Find index of highest probability
//       let maxIndex = 0;
//       let maxValue = outputArray[i][0];

//       for (let j = 1; j < outputArray[i].length; j++) {
//         if (outputArray[i][j] > maxValue) {
//           maxValue = outputArray[i][j];
//           maxIndex = j;
//         }
//       }

//       // Apply CTC decoding - skip if blank or same as previous
//       if (maxIndex !== blankIndex && maxIndex !== lastChar) {
//         if (maxIndex < alphabets.length) {
//           result += alphabets[maxIndex];
//         }
//       }

//       lastChar = maxIndex;
//     }

//     return result;
//   } else {
//     // For more advanced beam search decoding, would need implementation here
//     console.warn("Beam search not implemented, using greedy decoding");
//     return postprocessOcr(output, true);
//   }
// };

// // Complete OCR pipeline
// export const runOcr = async (
//   imageUri,
//   craftModel,
//   ocrModel,
//   detector = "craft",
//   greedy = true
// ) => {
//   const startTime = performance.now();

//   try {
//     if (detector === "craft") {
//       // Preprocess image for CRAFT
//       const { normalizedTensor, originalImage } = await craftPreprocess(
//         imageUri
//       );

//       // return normalizedTensor.dispose();

//       // Run CRAFT model
//       const { y, feature } = await craftTfliteModel(
//         craftModel,
//         normalizedTensor
//       );

//       // Post-process to get text regions
//       const { crops } = postprocessCraft(y, feature, originalImage);

//       // Process each detected text region with OCR
//       const results = [];

//       for (let i = 0; i < crops.length; i++) {
//         // Preprocess the crop for OCR
//         const processedImage = await preprocessOcr(imageUri, crops[i]);

//         // Run OCR on the processed image
//         const ocrOutput = await runTfliteOcr(ocrModel, processedImage);

//         // Post-process OCR output
//         const text = postprocessOcr(ocrOutput, greedy);

//         // Store result
//         results.push({
//           crop: crops[i],
//           text,
//         });

//         // Clean up
//         processedImage.dispose();
//       }

//       // Clean up tensors
//       normalizedTensor.dispose();
//       originalImage.dispose();

//       const endTime = performance.now();
//       console.log(
//         `Time taken to run OCR with ${detector} detector: ${
//           (endTime - startTime) / 1000
//         }s`
//       );
//       console.log("Results:", JSON.stringify(results, null, 2));
//       return {
//         imageUri,
//         results,
//       };
//     } else {
//       console.error(
//         "Please provide a valid detector (currently only 'craft' is supported)"
//       );
//       throw new Error("Invalid detector");
//     }
//   } catch (error) {
//     console.error("Error in OCR pipeline:", error);
//     throw error;
//   }
// };
