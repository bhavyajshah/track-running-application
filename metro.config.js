const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  'react-native-maps': 'react-native-maps/lib/index.web.js',
  'react-native-maps/lib/MapMarkerNativeComponent': 'react-native-web/dist/modules/UnimplementedView',
  'react-native/Libraries/Utilities/codegenNativeCommands': 'react-native-web/dist/modules/UnimplementedView',
};

module.exports = config;