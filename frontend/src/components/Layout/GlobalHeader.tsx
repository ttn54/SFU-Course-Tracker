import React, { useState } from 'react';
import { Info, HelpCircle, CheckCircle, Settings, LogOut, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { CompletedCoursesModal } from '../Prerequisites/CompletedCoursesModal';

export const GlobalHeader: React.FC = () => {
  const { email, logout } = useAuthStore();
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
            onClick={() => setShowInfoModal(true)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Information"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Help"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
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

<<<<<<< HEAD
=======
      {/* Info Modal */}
>>>>>>> 2e23994ec15f435229ed96a6369f9f40839d0d9b
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInfoModal(false)}>
          <div className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Info size={24} />
                <span>About SFU Course Tracker</span>
              </h3>
              <button onClick={() => setShowInfoModal(false)} className="p-2 hover:bg-gray-700 rounded transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                <strong className="text-white">SFU Course Tracker</strong> helps you plan your academic schedule at Simon Fraser University.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Search and add courses from available terms</li>
                <li>Drag and drop courses to schedule them on your calendar</li>
                <li>Track prerequisites and completed courses</li>
                <li>View enrollment statistics and professor ratings</li>
                <li>Export your schedule as JSON</li>
              </ul>
              <p className="text-sm text-gray-400 pt-4 border-t border-gray-700">
                Version 1.0 | Built for SFU Students
              </p>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
=======
      {/* Help Modal */}
>>>>>>> 2e23994ec15f435229ed96a6369f9f40839d0d9b
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowHelpModal(false)}>
          <div className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <HelpCircle size={24} />
                <span>Help & Guide</span>
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-gray-700 rounded transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6 text-gray-300">
              <div>
                <h4 className="font-semibold text-white mb-2">🔍 Finding Courses</h4>
                <p className="text-sm">Select a term and department, then search for courses by number or title. Click "Add" to add them to your list.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">📅 Scheduling Courses</h4>
                <p className="text-sm">Drag unscheduled courses from the right panel onto the calendar. Choose a specific section when prompted.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">✅ Managing Prerequisites</h4>
                <p className="text-sm">Click the checkmark icon to manage your completed courses. The system will show which courses you're eligible to take.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">💾 Saving Your Schedule</h4>
                <p className="text-sm">Your schedule is auto-saved to your browser. Use the "Export" button to download a JSON backup.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">🗑️ Removing Courses</h4>
                <p className="text-sm">Click the trash icon on any course card to remove it, or use "Clear All" to start fresh.</p>
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
=======
      {/* Settings Modal */}
>>>>>>> 2e23994ec15f435229ed96a6369f9f40839d0d9b
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-dark-card border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                <Settings size={24} />
                <span>Settings</span>
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-gray-700 rounded transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 text-gray-300">
              <div className="p-4 bg-dark-bg rounded-lg border border-gray-700">
                <p className="text-sm"><strong className="text-white">Account:</strong> {email}</p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                  <span className="text-sm">Show 24-hour time</span>
                  <input type="checkbox" className="w-4 h-4" />
                </label>
                <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                  <span className="text-sm">Show enrollment stats</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </label>
                <label className="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                  <span className="text-sm">Auto-save schedule</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </label>
              </div>
              <p className="text-xs text-gray-500 pt-4 border-t border-gray-700">
                Settings are saved locally in your browser
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
