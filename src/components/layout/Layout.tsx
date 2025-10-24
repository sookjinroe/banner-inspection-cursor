import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Search } from 'lucide-react';
import { BackgroundJobNotification } from '../BackgroundJobNotification';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'collection' | 'inspection';
  onPageChange: (page: 'collection' | 'inspection') => void;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'collection', label: 'Collection', icon: Database, path: '/collection' },
    { id: 'inspection', label: 'Inspection', icon: Search, path: '/inspection' },
  ] as const;

  const isActivePage = (itemId: string) => {
    if (itemId === 'collection') {
      return location.pathname === '/collection';
    }
    if (itemId === 'inspection') {
      return location.pathname === '/inspection' || location.pathname.startsWith('/inspection/');
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        <aside className="w-48 min-h-screen border-r border-gray-200 bg-white">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-light tracking-tight">Banner Inspector</h1>
          </div>

          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePage(item.id);

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                    ${
                      isActive
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <BackgroundJobNotification />
    </div>
  );
}
