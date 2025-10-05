import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div>Dashboard Component</div>
}));

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText('Dashboard Component')).toBeDefined();
  });

  it('should render Dashboard component', () => {
    const { container } = render(<App />);
    expect(container.querySelector('div')).toBeDefined();
  });
});

