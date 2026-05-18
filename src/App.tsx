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
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import Dashboard from './components/dashboard/Dashboard';
import TeamManagement from './components/teams/TeamManagement';
import SquadManagement from './components/squad/SquadManagement';
import FixturesManagement from './components/fixtures/FixturesManagement';
import MatchSimulator from './components/matches/MatchSimulator';
import SettingsComponent from './components/settings/Settings';
import Archive from './components/archive/SeasonArchive';
import Profile from './components/profile/Profile';

type Tab = 'dashboard' | 'teams' | 'squad' | 'fixtures' | 'simulate' | 'settings' | 'archive' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'archive', label: 'Hall of Fame', icon: Trophy },
    { id: 'profile', label: 'Command Profile', icon: User },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'squad', label: 'Squads', icon: UserCircle },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'simulate', label: 'Simulate', icon: PlayCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const [tournamentStatus, setTournamentStatus] = useState('League Phase');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const matches = snap.docs.map(d => d.data() as any);
      if (matches.some(m => m.matchType === 'Final' && m.status === 'completed')) {
        setTournamentStatus('Tournament Finished');
      } else if (matches.some(m => m.matchType !== 'League')) {
        setTournamentStatus('Playoffs Active');
      } else {
        setTournamentStatus('League Phase Active');
      }
    });
    return () => unsub();
  }, []);

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
          <div className="bg-[#1C222D] p-4 rounded-2xl border border-slate-700/30 text-center">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Tournament Status</p>
             {isSidebarOpen && <p className="text-xs font-bold text-yellow-500 mt-1">{tournamentStatus}</p>}
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
              {activeTab === 'archive' && <Archive />}
              {activeTab === 'profile' && <Profile />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
