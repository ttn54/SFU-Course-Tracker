import React, { useState } from 'react';
import { Info, HelpCircle, CheckCircle, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { CompletedCoursesModal } from '../Prerequisites/CompletedCoursesModal';

export const GlobalHeader: React.FC = () => {
  const { email, logout } = useAuthStore();
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  return (
    <>
      <header className="w-full bg-purple-600 text-white h-16 flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight">🎓 SFU Course Tracker</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">{email}</span>
          <button 
            onClick={() => setShowCompletedModal(true)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Completed Courses"
          >
            <CheckCircle size={20} />
          </button>
          <button 
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Information"
          >
            <Info size={20} />
          </button>
          <button 
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Help"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={logout}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      
      <CompletedCoursesModal 
        isOpen={showCompletedModal} 
        onClose={() => setShowCompletedModal(false)} 
      />
    </>
  );
};
