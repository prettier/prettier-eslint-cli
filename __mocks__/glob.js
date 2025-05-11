const glob = jest.fn(async function mockGlob(globString) {
  /* eslint complexity:0 */
  if (globString.includes('1')) {
    return [
      fredProject('index.js'),
      fredProject('start.js'),
      fredProject('stop/index.js'),
      fredProject('stop/log.js'),
    ];
  }

  if (globString.includes('2')) {
    return [
      fredProject('index.js'),
      fredProject('start.js'),
      fredProject('continue/index.js'),
      fredProject('continue/forever.js'),
    ];
  }

  if (globString.includes('node_modules')) {
    return [
      fredProject('foo/node_modules/stuff1.js'),
      fredProject('foo/node_modules/stuff2.js'),
      fredProject('foo/node_modules/stuff3.js'),
    ];
  }

  if (globString.includes('files-with-syntax-errors')) {
    return [fredProject('syntax-error1.js'), fredProject('syntax-error2.js')];
  }

  if (globString.includes('no-match')) {
    return [];
  }

  if (globString.includes('throw-error')) {
    throw new Error('something weird happened');
  }

  if (globString.includes('no-change')) {
    return [
      fredProject('no-change/1.js'),
      fredProject('no-change/2.js'),
      fredProject('no-change/3.js'),
    ];
  }

  if (globString.includes('eslintignored')) {
    return [
      fredProject('eslintignored1.js'),
      fredProject('eslintignored2.js'),
      fredProject('eslintignored3.js'),
      fredProject('applied4.js'),
    ];
  }

  if (globString.includes('prettierignored')) {
    return [
      fredProject('prettierignored1.js'),
      fredProject('prettierignored2.js'),
      fredProject('prettierignored3.js'),
      fredProject('applied4.js'),
    ];
  }

  if (globString.includes('no-ignore')) {
    return [
      barneyProject('no-ignore/1.js'),
      barneyProject('no-ignore/2.js'),
      barneyProject('no-ignore/3.js'),
    ];
  }

  if (globString.includes('eslint-config-error')) {
    return [
      fredProject('eslint-config-error/1.js'),
      fredProject('eslint-config-error/2.js'),
    ];
  }

  throw new Error(
    `Your test globString: "${globString}"` +
      " doesn't have associated mock data.",
  );
});

glob.glob = glob;

exports.glob = glob;

function fredProject(path) {
  return `/Users/fredFlintstone/Developer/top-secret/footless-carriage/${path}`;
}

function barneyProject(path) {
  return `/Users/barneyRubble/Developer/top-secret/tesla/${path}`;
}
