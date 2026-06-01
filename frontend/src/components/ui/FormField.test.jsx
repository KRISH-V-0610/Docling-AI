import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Mail } from 'lucide-react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders a label and input', () => {
    render(<FormField label="Email Address" placeholder="you@x.com" />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@x.com')).toBeInTheDocument();
  });

  it('shows an inline error with role=alert and marks the input invalid', () => {
    render(<FormField label="Email" error="Enter a valid email" placeholder="x" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter a valid email');
    expect(screen.getByPlaceholderText('x')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders no error / not-invalid when error is absent', () => {
    render(<FormField label="Email" icon={Mail} placeholder="x" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('x')).toHaveAttribute('aria-invalid', 'false');
  });
});
