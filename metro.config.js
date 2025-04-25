const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add .tflite to asset extensions
config.resolver.assetExts.push("tflite");

// Export config with NativeWind
module.exports = withNativeWind(config, { input: "./global.css" });
