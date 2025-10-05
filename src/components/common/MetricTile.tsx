interface MetricTileProps {
  label: string;
  value: string;
  trend?: {
    label: string;
    positive: boolean;
  };
}

export const MetricTile: React.FC<MetricTileProps> = ({ label, value, trend }) => (
  <div className="metric-tile">
    <span className="metric-tile__label">{label}</span>
    <span className="metric-tile__value">{value}</span>
    {trend && (
      <span
        className={`metric-tile__trend ${trend.positive ? 'metric-tile__trend--positive' : 'metric-tile__trend--negative'}`}
      >
        {trend.label}
      </span>
    )}
  </div>
);
