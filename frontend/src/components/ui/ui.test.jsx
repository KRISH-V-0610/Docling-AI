import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Skeleton, SkeletonGrid } from './Skeleton';
import { Modal } from './Modal';

describe('Skeleton', () => {
  it('renders a placeholder block', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('SkeletonGrid renders the requested number of cards', () => {
    render(<SkeletonGrid count={5} />);
    const grid = screen.getByRole('status', { name: /loading/i });
    expect(grid.children).toHaveLength(5);
  });
});

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Hi">body</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title + children when open with dialog semantics', () => {
    render(<Modal open onClose={() => {}} title="Upload image">the body</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Upload image')).toBeInTheDocument();
    expect(screen.getByText('the body')).toBeInTheDocument();
  });

  it('calls onClose on Escape and on close-button click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="X">body</Modal>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
