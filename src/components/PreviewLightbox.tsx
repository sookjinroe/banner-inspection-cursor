import { useState, useEffect } from 'react';
import { BannerPreview } from './BannerPreview';
import { ViewportControls } from './ViewportControls';

type PreviewMode = 'desktop' | 'mobile';

interface PreviewLightboxProps {
  bannerHtml: string;
  css: string;
  baseUrl: string;
  onClose: () => void;
}

export function PreviewLightbox({ bannerHtml, css, baseUrl, onClose }: PreviewLightboxProps) {
  const [mode, setMode] = useState<PreviewMode>('desktop');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col z-50 p-4 sm:p-8 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <header className="flex-shrink-0 w-full flex justify-between items-center mb-4">
        <ViewportControls currentMode={mode} onModeChange={setMode} />
        <button
          onClick={onClose}
          className="bg-white/20 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-lg hover:bg-white/30 transition-all transform hover:scale-110"
          aria-label="미리보기 닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </header>
      <main
        className="flex-grow min-h-0 w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <BannerPreview
          bannerHtml={bannerHtml}
          css={css}
          baseUrl={baseUrl}
          mode={mode}
        />
      </main>
    </div>
  );
}
