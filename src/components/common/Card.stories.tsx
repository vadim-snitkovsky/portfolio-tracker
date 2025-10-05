import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta = {
  title: 'Components/Common/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Content to display inside the card',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a default card',
  },
};

export const WithComplexContent: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>Card Title</h3>
        <p style={{ margin: 0, color: '#666' }}>
          This card contains more complex content with multiple elements.
        </p>
      </div>
    ),
  },
};

export const WithMetrics: Story = {
  args: {
    children: (
      <div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
          Total Value
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>$125,430.50</div>
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
          +$5,230.50 (4.35%)
        </div>
      </div>
    ),
  },
};

