// Smoke test — proves the Vitest + Testing Library + jsdom pipeline works.
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('renders and queries DOM', () => {
    render(<button>click me</button>);
    expect(screen.getByText('click me')).toBeInTheDocument();
  });
});
