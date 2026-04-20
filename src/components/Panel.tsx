import type { PropsWithChildren, ReactNode } from 'react';

interface PanelProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export const Panel = ({ title, subtitle, rightSlot, children }: PanelProps) => (
  <section className="panel">
    <header className="panel-header">
      <div>
        <h3 className="panel-title">{title}</h3>
        {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div className="panel-right">{rightSlot}</div> : null}
    </header>
    <div className="panel-body">{children}</div>
  </section>
);
