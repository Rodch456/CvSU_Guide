const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Keep the uploaded video filenames, including their uppercase extensions.
config.resolver.assetExts.push('MOV');

module.exports = config;
