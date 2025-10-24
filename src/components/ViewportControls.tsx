type PreviewMode = 'desktop' | 'mobile';

interface ViewportControlsProps {
  currentMode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}

export function ViewportControls({ currentMode, onModeChange }: ViewportControlsProps) {
  const ViewportButton = ({ mode, children, icon }: { mode: PreviewMode; children: React.ReactNode; icon: React.ReactNode }) => (
    <button
      onClick={() => onModeChange(mode)}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 flex items-center gap-2 ${
        currentMode === mode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-slate-700/70'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-2 p-1 bg-slate-800/70 rounded-lg self-center">
      <ViewportButton
        mode="desktop"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      >
        데스크톱
      </ViewportButton>
      <ViewportButton
        mode="mobile"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
      >
        모바일
      </ViewportButton>
    </div>
  );
}
