const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Force Metro to use CommonJS builds instead of ESM
// This fixes "Cannot use 'import.meta' outside a module" errors
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Also handle node_modules that use import.meta
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
