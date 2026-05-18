import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Calendar, 
  PlayCircle, 
  Settings,
  Trophy,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/dashboard/Dashboard';
import TeamManagement from './components/teams/TeamManagement';
import SquadManagement from './components/squad/SquadManagement';
import FixturesManagement from './components/fixtures/FixturesManagement';
import MatchSimulator from './components/matches/MatchSimulator';
import SettingsComponent from './components/settings/Settings';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

type Tab = 'dashboard' | 'teams' | 'squad' | 'fixtures' | 'simulate' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setIsLoggingIn(false);
        setLoginError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid automatic failures in some iframe scenarios
    provider.setCustomParameters({ prompt: 'select_account' });
    
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      // Handle the specific error with a more helpful message
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('The login window was closed before completion. Please try again and keep the window open.');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('The login popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setLoginError(error.message || 'An unexpected error occurred during login.');
      }
      setIsLoggingIn(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'squad', label: 'Squads', icon: UserCircle },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'simulate', label: 'Simulate', icon: PlayCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 selection:bg-yellow-500/30">
        <div className="max-w-md w-full text-center space-y-8 bg-[#11151D] p-10 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
          <div className="flex justify-center">
            <div className="p-5 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              CRIC<span className="text-yellow-500">SIM</span>
            </h1>
            <p className="mt-3 text-slate-400 font-medium leading-relaxed">The ultimate professional cricket tournament simulator.</p>
          </div>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
            >
              <p className="text-xs font-bold text-rose-500 leading-relaxed uppercase tracking-tight">
                {loginError}
              </p>
            </motion.div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-tr from-yellow-500 to-orange-600 text-black font-black rounded-2xl hover:brightness-110 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 uppercase tracking-widest text-sm ${isLoggingIn ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Get Started'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 bg-[#11151D] border-r border-slate-800/60 transition-all duration-300 z-50 flex flex-col`}
      >
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center font-black text-black text-xs shadow-lg shadow-orange-500/20">
              CS
            </div>
            {isSidebarOpen && (
              <span className="text-xl font-black tracking-tighter text-white">
                CRIC<span className="text-yellow-500">SIM</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800/50 rounded-lg text-slate-500 transition-colors"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                ? 'bg-yellow-500/10 text-yellow-500 shadow-inner' 
                : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'
              }`}
            >
              <item.icon size={20} className={`${activeTab === item.id ? 'text-yellow-500' : 'text-slate-500 group-hover:text-slate-400'} transition-colors`} />
              {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
              {activeTab === item.id && isSidebarOpen && (
                <div className="ml-auto w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/60 ">
          <div className="bg-[#1C222D] p-4 rounded-2xl border border-slate-700/30 text-center mb-4">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Tournament Status</p>
             {isSidebarOpen && <p className="text-xs font-bold text-yellow-500 mt-1">League Phase Active</p>}
          </div>
          
          <div className="flex items-center gap-3 p-2 group transition-all">
             <img 
               src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=eab308&color=000`} 
               alt="Avatar" 
               className="w-9 h-9 rounded-xl border-2 border-slate-800 group-hover:border-yellow-500/50 transition-all shadow-lg shadow-black/40"
               referrerPolicy="no-referrer"
             />
             {isSidebarOpen && (
               <div className="min-w-0 flex-1">
                 <p className="text-xs font-bold text-white truncate leading-tight tracking-tight">{user.displayName}</p>
                 <button 
                  onClick={() => auth.signOut()}
                  className="text-[10px] text-slate-600 hover:text-rose-500 transition-colors font-black uppercase tracking-widest mt-0.5"
                 >
                   Sign Out
                 </button>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        } min-h-screen relative overflow-y-auto selection:bg-yellow-500/30`}
      >
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#11151D]/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800/60">
           <div className="flex items-center gap-4">
              <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest">
                 {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <div className="h-4 w-px bg-slate-800" />
              <span className="px-2.5 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full border border-green-500/20 uppercase tracking-tighter">
                 Sim Engine v1.4.2
              </span>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden sm:flex flex-col text-right">
                 <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Last Synced</span>
                 <span className="text-xs font-bold text-slate-300">Just Now</span>
              </div>
           </div>
        </header>

        <div className="max-w-7xl mx-auto p-6 md:p-10 xl:p-12 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'teams' && <TeamManagement />}
              {activeTab === 'squad' && <SquadManagement />}
              {activeTab === 'fixtures' && <FixturesManagement />}
              {activeTab === 'simulate' && <MatchSimulator />}
              {activeTab === 'settings' && <SettingsComponent />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
