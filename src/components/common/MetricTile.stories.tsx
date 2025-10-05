import type { Meta, StoryObj } from '@storybook/react';
import { MetricTile } from './MetricTile';

const meta = {
  title: 'Components/Common/MetricTile',
  component: MetricTile,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label for the metric',
    },
    value: {
      control: 'text',
      description: 'Value to display',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof MetricTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Total Value',
    value: '$125,430.50',
  },
};

export const WithPositiveChange: Story = {
  args: {
    label: 'Total Return',
    value: '+$5,230.50',
    className: 'text-green-600',
  },
};

export const WithNegativeChange: Story = {
  args: {
    label: 'Unrealized Loss',
    value: '-$1,234.56',
    className: 'text-red-600',
  },
};

export const WithPercentage: Story = {
  args: {
    label: 'ROI',
    value: '12.45%',
  },
};

export const LongLabel: Story = {
  args: {
    label: 'Year-to-Date Dividend Income',
    value: '$8,432.10',
  },
};

export const LargeValue: Story = {
  args: {
    label: 'Portfolio Value',
    value: '$1,234,567.89',
  },
};

