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
