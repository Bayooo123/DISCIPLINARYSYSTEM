import React from 'react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 mb-2 text-xs text-muted">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {b.to ? <Link to={b.to} className="hover:text-maroon transition-colors">{b.label}</Link>
                       : <span className="text-ink">{b.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h2 className="text-2xl font-serif font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 ml-4">{actions}</div>}
    </div>
  );
}
