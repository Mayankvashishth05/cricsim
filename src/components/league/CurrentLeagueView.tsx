import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, getDocs, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { League, Team, Match, Player } from '../../types';
import { 
  Trophy, 
  Calendar, 
  TrendingUp, 
  Zap, 
  Play, 
  BarChart3, 
  Filter, 
  Search,
  ChevronRight,
  Target,
  Award,
  History,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StandingsTable from './StandingsTable';
import Scorecard from '../matches/Scorecard';
import MatchSimulator from '../matches/MatchSimulator';
import StatsPanel from './StatsPanel';

interface CurrentLeagueViewProps {
  league: League;
}

export default function CurrentLeagueView({ league }: CurrentLeagueViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'results' | 'stats'>('standings');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatingMatch, setSimulatingMatch] = useState<Match | null>(null);

  useEffect(() => {
    setLoading(true);
    const teamsUnsub = onSnapshot(collection(db, `leagues/${league.id}/teams`), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `leagues/${league.id}/teams`);
    });

    const matchesUnsub = onSnapshot(query(collection(db, `leagues/${league.id}/matches`), orderBy('createdAt', 'desc')), (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `leagues/${league.id}/matches`);
    });

    return () => {
      teamsUnsub();
      matchesUnsub();
    };
  }, [league.id]);

  const nextMatch = matches.filter(m => m.status === 'scheduled')[0];

  const simulateRound = async () => {
     // Implementation for simulating all scheduled matches in the next round
     // For now, let's just simulate the next match
     if (nextMatch) {
       setSimulatingMatch(nextMatch);
       setIsSimulating(true);
     }
  };

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div>
            <div className="flex items-center gap-3 mb-3">
               <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">Active Deployment</span>
               <span className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">{league.seasonName}</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{league.name}</h1>
         </div>
         
         <div className="flex items-center gap-3">
            <button 
               onClick={simulateRound}
               disabled={!nextMatch}
               className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 transition-all transition-all group scale-100 hover:scale-105"
            >
               <Zap className="w-4 h-4 group-hover:animate-pulse" />
               Simulate Round
            </button>
            <button 
               onClick={() => {
                 if (nextMatch) {
                    setSimulatingMatch(nextMatch);
                    setIsSimulating(true);
                 }
               }}
               disabled={!nextMatch}
               className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest border border-slate-700 transition-all"
            >
               <Play className="w-4 h-4" />
               Play Next
            </button>
         </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard icon={<TrendingUp />} label="Matches Played" value={matches.filter(m => m.status === 'completed').length} sub={`${matches.length} Total`} color="blue" />
         <StatCard icon={<Trophy />} label="Leader" value={teams.sort((a, b) => b.points - a.points || b.nrr - a.nrr)[0]?.name || 'N/A'} sub="Rank 01" color="yellow" />
         <StatCard icon={<Target />} label="Avg Score" value="168.4" sub="Last 5 Matches" color="emerald" />
         <StatCard icon={<Calendar />} label="Tournament Progress" value={`${Math.round((matches.filter(m => m.status === 'completed').length / matches.length) * 100) || 0}%`} sub="Current Phase" color="orange" />
      </div>

      {/* Content Tabs */}
      <div className="space-y-6">
         <div className="flex items-center gap-8 border-b border-slate-800/60 overflow-x-auto custom-scrollbar">
            <TabButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} icon={<BarChart3 size={14} />} label="Standings" />
            <TabButton active={activeTab === 'fixtures'} onClick={() => setActiveTab('fixtures')} icon={<Calendar size={14} />} label="Fixtures" />
            <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<History size={14} />} label="Results" />
            <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Award size={14} />} label="League MVPs" />
         </div>

         <AnimatePresence mode="wait">
            {activeTab === 'standings' && (
              <motion.div 
                key="standings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                 <div className="lg:col-span-2 bg-[#11151D] border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
                       <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          League Table
                       </h3>
                    </div>
                    <StandingsTable teams={teams} />
                 </div>
                 
                 <div className="space-y-6">
                    {/* Top Performers Peek */}
                    <div className="bg-[#11151D] border border-slate-800/60 rounded-3xl p-6 shadow-2xl">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Top Battalion</h3>
                       <div className="space-y-4">
                          {teams.slice(0, 3).map((team, idx) => (
                             <div key={team.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 border border-slate-800/40">
                                <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white`} style={{ backgroundColor: team.color }}>
                                      {team.name[0]}
                                   </div>
                                   <div>
                                      <p className="text-xs font-bold text-white text-xs">{team.name}</p>
                                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{team.wins} WIN / {team.losses} LOSS</p>
                                   </div>
                                </div>
                                <span className="text-sm font-black text-yellow-500">{team.points}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    {/* Next Match Teaser */}
                    {nextMatch && (
                       <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl p-6 shadow-2xl shadow-yellow-500/10 relative overflow-hidden group cursor-pointer" onClick={() => { setSimulatingMatch(nextMatch); setIsSimulating(true); }}>
                          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
                             <Zap size={60} className="text-white" />
                          </div>
                          <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-4">Upcoming Engagement</p>
                          <div className="flex items-center justify-between gap-4 mb-6">
                             <TeamPeek team={teams.find(t => t.id === nextMatch.team1Id)!} />
                             <span className="text-xs font-black text-black/40 italic">VS</span>
                             <TeamPeek team={teams.find(t => t.id === nextMatch.team2Id)!} />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-black bg-white/20 w-fit px-3 py-1 rounded-full uppercase tracking-widest">
                             <Play size={10} /> Play Sequence
                          </div>
                       </div>
                    )}
                 </div>
              </motion.div>
            )}

            {activeTab === 'fixtures' && (
              <motion.div 
                key="fixtures"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {matches.filter(m => m.status !== 'completed').map(match => (
                   <div key={match.id} className="bg-[#11151D] border border-slate-800/60 p-5 rounded-3xl group hover:border-yellow-500/30 transition-all shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Scheduled Engagement</span>
                         <Target size={14} className="text-slate-800 group-hover:text-yellow-500 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                         <MatchTeamInfo team={teams.find(t => t.id === match.team1Id)!} />
                         <div className="text-center">
                            <span className="text-[10px] font-black text-slate-700 italic">VS</span>
                         </div>
                         <MatchTeamInfo team={teams.find(t => t.id === match.team2Id)!} align="right" />
                      </div>
                      <button 
                        onClick={() => { setSimulatingMatch(match); setIsSimulating(true); }}
                        className="w-full mt-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap size={12} /> Launch Simulation
                      </button>
                   </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {matches.filter(m => m.status === 'completed').map(match => (
                  <div 
                    key={match.id} 
                    onClick={() => setSelectedMatch(match)}
                    className="bg-[#11151D] border border-slate-800/60 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-yellow-500/30 transition-all cursor-pointer shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                    <div className="flex items-center gap-8">
                       <ResultTeam team={teams.find(t => t.id === match.team1Id)!} score={match.innings1?.score} wickets={match.innings1?.wickets} overs={match.innings1?.overs} isWinner={match.winnerId === match.team1Id} />
                       <span className="text-xs font-black text-slate-800 italic">VS</span>
                       <ResultTeam team={teams.find(t => t.id === match.team2Id)!} score={match.innings2?.score} wickets={match.innings2?.wickets} overs={match.innings2?.overs} isWinner={match.winnerId === match.team2Id} />
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-xs font-black text-white uppercase tracking-tight">{match.margin}</p>
                          <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest mt-1">Completion Confirmed</p>
                       </div>
                       <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-yellow-500 group-hover:border-yellow-500/30 transition-all">
                          <ChevronRight size={18} />
                       </div>
                    </div>
                  </div>
                ))}
                {matches.filter(m => m.status === 'completed').length === 0 && (
                   <div className="py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
                      <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-600 font-black uppercase tracking-widest">No historical data recorded</p>
                   </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                 <StatsPanel players={[]} teams={teams} />
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedMatch && (
          <Scorecard 
            match={selectedMatch} 
            onClose={() => setSelectedMatch(null)} 
            teams={teams}
          />
        )}
        {isSimulating && simulatingMatch && (
          <MatchSimulator 
            matchId={simulatingMatch.id}
            onClose={() => setIsSimulating(false)}
            leagueId={league.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
   const colorMap = {
      blue: 'from-blue-500/20 to-transparent border-blue-500/20 text-blue-500',
      yellow: 'from-yellow-500/20 to-transparent border-yellow-500/20 text-yellow-500',
      emerald: 'from-emerald-500/20 to-transparent border-emerald-500/20 text-emerald-500',
      orange: 'from-orange-500/20 to-transparent border-orange-500/20 text-orange-500'
   };
   
   return (
      <div className={`bg-gradient-to-br ${colorMap[color as keyof typeof colorMap]} border p-6 rounded-3xl shadow-xl`}>
         <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center">
               {React.cloneElement(icon, { size: 16 })}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{sub}</span>
         </div>
         <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">{label}</p>
         <p className="text-2xl font-black text-white truncate">{value}</p>
      </div>
   );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`pb-4 px-2 flex items-center gap-2 transition-all relative ${active ? 'text-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}
    >
       {icon}
       <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
       {active && (
         <motion.div 
           layoutId="activeTab"
           className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 rounded-full"
         />
       )}
    </button>
  );
}

function TeamPeek({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center gap-2">
       <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-black text-xs text-white">
          {team?.name[0]}
       </div>
       <p className="text-[9px] font-black text-black uppercase tracking-widest truncate max-w-[80px]">{team?.name}</p>
    </div>
  );
}

function MatchTeamInfo({ team, align = 'left' }: { team: Team, align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-4 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
       <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg" style={{ backgroundColor: team.color }}>
          {team?.name[0]}
       </div>
       <div>
          <p className="text-sm font-black text-white leading-none">{team?.name}</p>
          <p className="text-[9px] font-black text-slate-500 uppercase mt-1.5 tracking-widest">Rank #{Math.floor(Math.random() * 10) + 1}</p>
       </div>
    </div>
  );
}

function ResultTeam({ team, score, wickets, overs, isWinner }: any) {
  return (
    <div className={`flex items-center gap-4 ${isWinner ? '' : 'opacity-60'}`}>
       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg ${isWinner ? 'ring-2 ring-yellow-500/50 scale-110' : ''}`} style={{ backgroundColor: team?.color }}>
          {team?.name[0]}
       </div>
       <div>
          <p className={`text-sm font-black uppercase tracking-tight ${isWinner ? 'text-white' : 'text-slate-400'}`}>{team?.name}</p>
          <div className="flex items-baseline gap-2">
             <span className="text-lg font-black text-white">{score}/{wickets}</span>
             <span className="text-[10px] font-bold text-slate-500">({overs} ov)</span>
          </div>
       </div>
    </div>
  );
}
