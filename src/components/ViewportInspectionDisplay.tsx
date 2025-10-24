import { ViewportInspection } from '../types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ViewportInspectionDisplayProps {
  inspection: ViewportInspection;
  viewportName: string;
}

export function ViewportInspectionDisplay({
  inspection,
  viewportName,
}: ViewportInspectionDisplayProps) {
  const getStatusColor = (status: '준수' | '위반') => {
    return status === '준수'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800';
  };

  const getStatusBadgeColor = (status: '준수' | '위반') => {
    return status === '준수'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusDotColor = (status: '준수' | '위반') => {
    return status === '준수' ? 'bg-green-500' : 'bg-red-500';
  };

  const getOverallStatusBadge = (status: '적합' | '부적합' | '준수') => {
    if (status === '적합' || status === '준수') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">적합</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
        <AlertCircle className="w-5 h-5" />
        <span className="font-semibold">부적합</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {viewportName} Inspection Results
        </h3>
        {getOverallStatusBadge(inspection.overallStatus)}
      </div>

      {inspection.issues && inspection.issues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Issues Found
          </h4>
          <ul className="space-y-1">
            {inspection.issues.map((issue, index) => (
              <li key={index} className="text-sm text-red-800">
                <span className="font-medium">{issue.category}:</span> {issue.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Detailed Report</h4>
        {inspection.detailedReport.map((item, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getStatusColor(item.status)}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(item.status)}`} />
                  <span className="text-sm font-semibold text-gray-900">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm text-gray-700 ml-5 leading-relaxed">
                  {item.comment}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${getStatusBadgeColor(item.status)}`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
