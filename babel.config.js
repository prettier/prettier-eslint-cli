const config = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "12"
        },
        useBuiltIns: "usage",
        corejs: 3
      }
    ]
  ]
};

module.exports = config;
