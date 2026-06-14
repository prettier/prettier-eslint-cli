import { vi } from 'vitest';

const findUpSync = vi.fn((filename: string) => `/${filename}`);

export { findUpSync };
