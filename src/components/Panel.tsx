import type { PropsWithChildren, ReactNode } from 'react';

interface PanelProps extends PropsWithChildren {
  className?: string;
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}

export const Panel = ({ className, title, subtitle, rightSlot, children }: PanelProps) => (
  <section className={['panel', className].filter(Boolean).join(' ')}>
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
