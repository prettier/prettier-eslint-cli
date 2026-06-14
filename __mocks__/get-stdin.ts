interface MockGetStdin extends jest.Mock<Promise<string>, []> {
  stdin: string;
}

const mockGetStdin = jest.fn(function getStdin() {
  return Promise.resolve(mockGetStdin.stdin);
}) as MockGetStdin;

mockGetStdin.stdin = '';

export = mockGetStdin;
