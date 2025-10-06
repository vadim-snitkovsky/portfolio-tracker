import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeDefined();
  });

  it('should render title when provided', () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText('Card Title')).toBeDefined();
  });

  it('should render subtitle when provided', () => {
    render(<Card subtitle="Card Subtitle">Content</Card>);
    expect(screen.getByText('Card Subtitle')).toBeDefined();
  });

  it('should render with default styling', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('card');
  });

  it('should render rightSlot when provided', () => {
    render(<Card rightSlot={<button>Action</button>}>Content</Card>);
    expect(screen.getByText('Action')).toBeDefined();
  });
});
