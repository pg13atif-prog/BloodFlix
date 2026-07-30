import './SkeletonLoader.css';

export const Skeleton = ({ width, height, borderRadius, style, className = '' }) => {
  return (
    <div
      className={`skeleton-base ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius: borderRadius || '4px',
        ...style
      }}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="skeleton-card">
      <Skeleton height="100%" borderRadius="12px" />
    </div>
  );
};

export const MovieRowSkeleton = () => {
  return (
    <div className="skeleton-row-container">
      <div className="skeleton-row-header">
        <Skeleton width="200px" height="2rem" borderRadius="8px" />
      </div>
      <div className="skeleton-row-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const HeroSkeleton = () => {
  return (
    <div className="skeleton-hero">
      <div className="skeleton-hero-content">
        <Skeleton width="65%" height="3.2rem" borderRadius="12px" style={{ marginBottom: '1.2rem' }} />
        <Skeleton width="35%" height="1.4rem" borderRadius="8px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="45%" height="1.2rem" borderRadius="6px" style={{ marginBottom: '1.5rem' }} />
        <Skeleton width="85%" height="3.5rem" borderRadius="8px" style={{ marginBottom: '2rem' }} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Skeleton width="180px" height="3rem" borderRadius="12px" />
          <Skeleton width="140px" height="3rem" borderRadius="12px" />
        </div>
      </div>
    </div>
  );
};
