import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, rightSlot, children }) => (
  <section className="card">
    {(title || subtitle || rightSlot) && (
      <header className="card__header">
        <div>
          {title && <h3 className="card__title">{title}</h3>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {rightSlot && <div className="card__slot">{rightSlot}</div>}
      </header>
    )}
    <div className="card__body">{children}</div>
  </section>
);
