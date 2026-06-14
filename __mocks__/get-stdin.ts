import { vi, type Mock } from 'vitest';

interface MockGetStdin extends Mock<() => Promise<string>> {
  stdin: string;
}

const mockGetStdin = vi.fn(function getStdin() {
  return Promise.resolve(mockGetStdin.stdin);
}) as MockGetStdin;

mockGetStdin.stdin = '';

export default mockGetStdin;
