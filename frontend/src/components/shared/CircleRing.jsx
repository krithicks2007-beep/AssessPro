import React from 'react';

/**
 * Reusable SVG Circular Progress Ring
 * Used across Student and Staff dashboards for performance visualization
 */
export default function CircleRing({ percentage = 0, color = '#1d72fe', size = 68, strokeWidth = 6 }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ transform: 'rotate(-90deg)', width: size, height: size }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', fontSize: `${size * 0.22}px`, fontWeight: 800, color: '#111827' }}>
        {percentage}%
      </div>
    </div>
  );
}

/**
 * Staff-style ring (viewBox-based, used in StaffDashboard)
 */
export function StaffCircleRing({ percentage = 0, color = '#1d72fe' }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="ring-circle">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} stroke="#f1f5f9" strokeWidth="7" fill="none" />
        <circle
          cx="40" cy="40" r={radius}
          stroke={color} strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="ring-circle-val">{percentage}%</span>
    </div>
  );
}
