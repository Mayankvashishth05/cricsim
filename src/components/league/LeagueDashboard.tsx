import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { League, Team, Match } from '../../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Trophy, 
  Settings, 
  Plus, 
  ChevronRight, 
  Clock, 
  TrendingUp,
  Zap,
  Activity,
  Trash2,
  Edit3,
  Archive,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import NewLeagueForm from './NewLeagueForm';
import StandingsTable from './StandingsTable';
import CurrentLeagueView from './CurrentLeagueView';
import { useAuth } from '../../context/AuthContext';

export default function LeagueDashboard() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [activeLeague, setActiveLeague] = useState<League | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'leagues'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as League));
      setLeagues(data);
      if (data.length > 0 && !activeLeague) {
        const active = data.find(l => l.status === 'active') || data[0];
        setActiveLeague(active);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leagues');
    });

    return () => unsub();
  }, [user]);

  const handleDeleteLeague = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this league? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'leagues', id));
        if (activeLeague?.id === id) setActiveLeague(null);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
         <Zap className="w-8 h-8 text-yellow-500 animate-pulse" />
      </div>
    );
  }

  if (isCreating) {
    return <NewLeagueForm onComplete={(id) => {
      setIsCreating(false);
      // activeLeague will be set by the snapshot listener
    }} onCancel={() => setIsCreating(false)} />;
  }

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#0B0E14]">
      {/* Sidebar - League List */}
      <div className="w-full md:w-80 bg-[#11151D] border-r border-slate-800/60 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800/60 flex-1 flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Saved Leagues</h2>
              <button 
                onClick={() => setIsCreating(true)}
                className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform"
              >
                <Plus size={16} />
              </button>
           </div>

           <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setViewMode('active')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'active' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'bg-slate-900/50 text-slate-500 border border-slate-800'}`}
              >
                 Active
              </button>
              <button 
                onClick={() => setViewMode('archived')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'archived' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-slate-900/50 text-slate-500 border border-slate-800'}`}
              >
                 Archive
              </button>
           </div>
           
           <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {leagues.filter(l => viewMode === 'active' ? l.status !== 'completed' : l.status === 'completed').length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                   <Archive className="w-8 h-8 text-slate-800 mx-auto mb-3" />
                   <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Empty Storage</p>
                </div>
              ) : (
                leagues
                  .filter(l => viewMode === 'active' ? l.status !== 'completed' : l.status === 'completed')
                  .map(league => (
                  <div
                    key={league.id}
                    onClick={() => setActiveLeague(league)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveLeague(league)}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group cursor-pointer ${activeLeague?.id === league.id ? 'bg-yellow-500/10 border border-yellow-500/50' : 'bg-slate-900/50 border border-transparent hover:border-slate-800'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeLeague?.id === league.id ? (viewMode === 'active' ? 'bg-yellow-500 text-black' : 'bg-indigo-500 text-white') : 'bg-slate-800 text-slate-500'}`}>
                       {viewMode === 'active' ? <Shield size={18} /> : <Trophy size={18} />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                       <p className={`text-xs font-black uppercase tracking-tight truncate ${activeLeague?.id === league.id ? (viewMode === 'active' ? 'text-yellow-500' : 'text-indigo-400') : 'text-slate-300'}`}>{league.name}</p>
                       <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">
                         {viewMode === 'active' ? `${league.teamCount} Teams • ${league.type}` : `Winner: ${league.winnerTeamName || 'N/A'}`}
                       </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLeague(league.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
           </div>
        </div>
        
        {/* Active Stats Peek */}
        {activeLeague && (
          <div className="p-6 mt-auto">
             <div className="p-5 bg-gradient-to-br from-slate-900 to-[#11151D] border border-slate-800 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Activity size={40} className="text-yellow-500" />
                </div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Report</p>
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">In Progress</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Match Vol</p>
                      <p className="text-lg font-black text-white">48</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Phase</p>
                      <p className="text-lg font-black text-yellow-500">A1</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {activeLeague ? (
           <CurrentLeagueView league={activeLeague} />
         ) : (
           <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-8 border border-slate-800 shadow-2xl skew-y-3">
                 <Trophy className="w-10 h-10 text-slate-800" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase">No Deployment Selected</h2>
              <p className="text-slate-500 text-sm max-w-sm font-bold uppercase tracking-widest leading-relaxed mb-10">
                 Select an existing league from the perimeter or initialize a new sequence.
              </p>
              <button 
                onClick={() => setIsCreating(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-yellow-500/20 transition-all flex items-center gap-3 group"
              >
                Launch Protocol
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              </button>
           </div>
         )}
      </div>
    </div>
  );
}

function Shield({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
