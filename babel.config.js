const config = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '8'
        },
        useBuiltIns: 'usage',
        corejs: 3
      }
    ]
  ]
};

module.exports = config;
