function normalize(options) {
  return Object.entries(options).reduce(
    (optionsAccumulator, [key, value]) =>
      key.includes('-')
        ? optionsAccumulator
        : { ...optionsAccumulator, [key]: value },
    {},
  );
}

export default normalize;
