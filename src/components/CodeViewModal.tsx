import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Modal, Button } from './common';
import { resolveImageUrl } from '../utils/bannerUtils';

interface CodeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlCode: string;
  cssCode: string;
  imageUrls: string[];
  baseUrl: string;
  bannerTitle: string;
}

export function CodeViewModal({
  isOpen,
  onClose,
  htmlCode,
  cssCode,
  imageUrls,
  baseUrl,
  bannerTitle,
}: CodeViewModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex items-start justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-medium">Code View</h2>
          <p className="text-sm text-gray-500 mt-1">{bannerTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">HTML</h3>
            <Button
              onClick={() => handleCopy(htmlCode, 'html')}
              variant="secondary"
              size="sm"
            >
              {copiedField === 'html' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedField === 'html' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-xs overflow-x-auto">
            <code>{htmlCode}</code>
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">CSS</h3>
            {cssCode && (
              <Button
                onClick={() => handleCopy(cssCode, 'css')}
                variant="secondary"
                size="sm"
              >
                {copiedField === 'css' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedField === 'css' ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>
          {cssCode ? (
            <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-xs overflow-x-auto max-h-96">
              <code>{cssCode}</code>
            </pre>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-500">
              No CSS available
            </div>
          )}
        </div>

        {imageUrls.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Images ({imageUrls.length})
            </h3>
            <div className="space-y-2">
              {imageUrls.map((url, index) => {
                const resolvedUrl = resolveImageUrl(url, baseUrl) || url;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-3"
                  >
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {resolvedUrl}
                    </span>
                    <Button
                      onClick={() => handleCopy(resolvedUrl, `image-${index}`)}
                      variant="secondary"
                      size="sm"
                    >
                      {copiedField === `image-${index}` ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
