export function normalize(
  options: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(options).reduce<Record<string, unknown>>(
    (optionsAccumulator, [key, value]) =>
      key.includes('-')
        ? optionsAccumulator
        : { ...optionsAccumulator, [key]: value },
    {},
  );
}
