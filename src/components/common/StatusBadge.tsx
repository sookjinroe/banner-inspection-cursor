import { InspectionStatus } from '../../types';

interface StatusBadgeProps {
  status: InspectionStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<InspectionStatus, { label: string; color: string }> = {
    not_inspected: { label: 'Not Inspected', color: 'bg-gray-200 text-gray-700' },
    inspecting: { label: 'Inspecting', color: 'bg-blue-100 text-blue-700' },
    inspected: { label: 'Inspected', color: 'bg-green-100 text-green-700' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
