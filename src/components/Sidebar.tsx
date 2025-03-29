import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ tabs, activeTab, onTabChange }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-[#0284c7] flex flex-col">
      <div className="p-4 border-b border-white/10">
        <img 
          src="https://i.ibb.co/Qp1Gq3K/prime-logo.png" 
          alt="Prime Gestão & Consultoria" 
          className="h-8"
        />
      </div>
      
      <nav className="flex-1 py-2">
        <div className="space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center px-4 py-2.5
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/90 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 mb-4 w-full p-2 rounded-lg hover:bg-white/5 transition-colors text-white"
        >
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.email?.split('@')[0]}
            </p>
          </div>
          <User className="w-4 h-4 text-white/80" />
        </button>
        <button
          onClick={signOut}
          className="flex items-center text-white/80 hover:text-white gap-2 text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;