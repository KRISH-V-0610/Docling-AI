// Vitest setup — registers jest-dom matchers + auto-cleans the DOM per test.
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
