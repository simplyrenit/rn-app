const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  config.resolver.blockList,
  /[/\\]android[/\\](?:app[/\\])?build[/\\].*/,
  /[/\\]node_modules[/\\].+[/\\]android[/\\]build[/\\].*/,
];

module.exports = config;
