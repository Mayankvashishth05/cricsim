import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Team, Player, Match } from '../../types';
import { Trophy, TrendingUp, Users, Target, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { seedSampleData } from '../../lib/SampleData';
import Scorecard from '../matches/Scorecard';

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [topBatters, setTopBatters] = useState<Player[]>([]);
  const [topBowlers, setTopBowlers] = useState<Player[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [playoffMatches, setPlayoffMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedSampleData();
      alert("Sample data added!");
    } catch (e) {
      alert("Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    // Show all teams sorted for global standings
    const teamsUnsubscribe = onSnapshot(
      collection(db, 'teams'), 
      (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        const sortedTeams = teamsData.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
        setTeams(sortedTeams);

        // Fetch top players from all teams
        const fetchPlayers = async () => {
          let allPlayers: (Player & { teamName: string })[] = [];
          for (const team of sortedTeams) {
            const playersSnap = await getDocs(collection(db, `teams/${team.id}/squad`));
            const players = playersSnap.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(), 
              teamName: team.name 
            } as Player & { teamName: string }));
            allPlayers = [...allPlayers, ...players];
          }
          setTopBatters([...allPlayers].sort((a, b) => b.runs - a.runs).slice(0, 3));
          setTopBowlers([...allPlayers].sort((a, b) => b.wickets - a.wickets).slice(0, 3));
        };
        fetchPlayers();
      }
    );

    const matchesUnsubscribe = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => {
        const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
        setMatches(allMatches.sort((a, b) => {
           const dateA = (a as any).createdAt?.toDate?.() || new Date(0);
           const dateB = (b as any).createdAt?.toDate?.() || new Date(0);
           return dateB - dateA;
        }).slice(0, 5));
        
        setPlayoffMatches(allMatches.filter(m => m.matchType !== 'League'));
      }
    );

    return () => {
      teamsUnsubscribe();
      matchesUnsubscribe();
    };
  }, []);

  const getPlayoffMatch = (type: string) => playoffMatches.find(m => m.matchType === type);

  const finalMatch = playoffMatches.find(m => m.matchType === 'Final' && m.status === 'completed');
  const winner = finalMatch ? teams.find(t => t.id === finalMatch.winnerId) : null;

  return (
    <div className="space-y-8">
      {/* Winner Celebration Banner */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 p-1 rounded-[3rem] shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <motion.div 
            animate={{ x: [-1000, 1000], opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-32 h-full bg-white/20 skew-x-12 -z-0"
          />
          
          <div className="bg-[#0B0E14] rounded-[2.8rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
             <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                <div className="flex items-center gap-4">
                   <div className="px-5 py-2 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-yellow-500/20">
                      Season Finale Winner
                   </div>
                   <div className="h-0.5 w-12 bg-slate-800" />
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-2xl">
                   {winner.name} <span className="text-yellow-500 underline decoration-yellow-500/30">Kings</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs mt-2">
                   Immortalized in the Hall of Fame
                </p>
             </div>
             
             <div className="relative group">
                <div className="absolute inset-0 bg-yellow-500/20 blur-[80px] rounded-full group-hover:bg-yellow-500/30 transition-all" />
                <motion.div 
                   animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                   transition={{ duration: 5, repeat: Infinity }}
                   className="relative"
                >
                   <Trophy className="w-32 h-32 md:w-48 md:h-48 text-yellow-500 drop-shadow-[0_20px_50px_rgba(234,179,8,0.5)]" />
                   <div className="absolute -top-4 -right-4 bg-white text-black font-black px-4 py-2 rounded-2xl rotate-12 shadow-2xl uppercase text-[10px] tracking-widest">
                      CHAMPIONS
                   </div>
                </motion.div>
             </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Teams', value: teams.length, icon: Users, color: 'text-blue-400' },
          { label: 'Matches Played', value: matches.length > 0 ? teams.reduce((acc, t) => acc + t.matches, 0) / 2 : 0, icon: Target, color: 'text-emerald-400' },
          { label: 'Highest Points', value: teams[0]?.points || 0, icon: Trophy, color: 'text-amber-400' },
          { label: 'Avg. NRR', value: (teams.reduce((acc, t) => acc + t.nrr, 0) / (teams.length || 1)).toFixed(3), icon: TrendingUp, color: 'text-indigo-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Playoff Bracket (Conditional) */}
      {playoffMatches.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#1A1F2B] to-[#11151D] p-8 rounded-3xl border border-yellow-500/20 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 uppercase italic tracking-tighter">
            <Trophy className="text-yellow-500 w-6 h-6" />
            Playoff Summit
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
             {/* Connectors (Desktop) */}
             <div className="hidden md:block absolute top-[50%] left-[30%] right-[30%] h-px bg-slate-800 -z-10" />

             {/* Round 1 */}
             <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Qualifier 1 & Eliminator</p>
                {[getPlayoffMatch('Qualifier 1'), getPlayoffMatch('Eliminator')].map((m, i) => m && (
                   <div key={m.id} className={`p-4 rounded-2xl border ${m.status === 'completed' ? 'bg-slate-800/40 border-slate-700' : 'bg-yellow-500/5 border-yellow-500/20 shadow-lg shadow-yellow-500/5'} transition-all`}>
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{m.matchType}</span>
                         {m.status === 'completed' && <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">FT</span>}
                      </div>
                      <div className="space-y-2">
                         <div className={`flex items-center justify-between ${m.winnerId === m.team1Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-xs font-bold truncate max-w-[100px]">{teams.find(t => t.id === m.team1Id)?.name}</span>
                            <span className="font-black tabular-nums">{m.innings1?.score || '-'}</span>
                         </div>
                         <div className={`flex items-center justify-between ${m.winnerId === m.team2Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-xs font-bold truncate max-w-[100px]">{teams.find(t => t.id === m.team2Id)?.name}</span>
                            <span className="font-black tabular-nums">{m.innings2?.score || '-'}</span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             {/* Round 2 */}
             <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Qualifier 2</p>
                {getPlayoffMatch('Qualifier 2') ? (
                   <div className={`p-4 rounded-2xl border ${getPlayoffMatch('Qualifier 2')?.status === 'completed' ? 'bg-slate-800/40 border-slate-700' : 'bg-orange-500/5 border-orange-500/20 shadow-lg shadow-orange-500/5'} transition-all`}>
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Qualifier 2</span>
                      </div>
                      <div className="space-y-2">
                         <div className={`flex items-center justify-between ${getPlayoffMatch('Qualifier 2')?.winnerId === getPlayoffMatch('Qualifier 2')?.team1Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-xs font-bold truncate max-w-[100px]">{teams.find(t => t.id === getPlayoffMatch('Qualifier 2')?.team1Id)?.name}</span>
                            <span className="font-black tabular-nums">{getPlayoffMatch('Qualifier 2')?.innings1?.score || '-'}</span>
                         </div>
                         <div className={`flex items-center justify-between ${getPlayoffMatch('Qualifier 2')?.winnerId === getPlayoffMatch('Qualifier 2')?.team2Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-xs font-bold truncate max-w-[100px]">{teams.find(t => t.id === getPlayoffMatch('Qualifier 2')?.team2Id)?.name}</span>
                            <span className="font-black tabular-nums">{getPlayoffMatch('Qualifier 2')?.innings2?.score || '-'}</span>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="p-8 rounded-2xl border border-dashed border-slate-800 flex items-center justify-center text-center">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Awaiting Stage 1 Conclusion</p>
                   </div>
                )}
             </div>

             {/* Final */}
             <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Grand Final</p>
                {getPlayoffMatch('Final') ? (
                   <div className={`p-6 rounded-3xl border ${getPlayoffMatch('Final')?.status === 'completed' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-500/5 border-yellow-500/20 shadow-2xl shadow-yellow-500/5'} transition-all relative overflow-hidden`}>
                      <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest italic">Ultimate Conflict</span>
                      </div>
                      <div className="space-y-3">
                         <div className={`flex items-center justify-between ${getPlayoffMatch('Final')?.winnerId === getPlayoffMatch('Final')?.team1Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-sm font-black truncate max-w-[120px]">{teams.find(t => t.id === getPlayoffMatch('Final')?.team1Id)?.name}</span>
                            <span className="text-lg font-black tabular-nums">{getPlayoffMatch('Final')?.innings1?.score || '-'}</span>
                         </div>
                         <div className={`flex items-center justify-between ${getPlayoffMatch('Final')?.winnerId === getPlayoffMatch('Final')?.team2Id ? 'text-white' : 'text-slate-500'}`}>
                            <span className="text-sm font-black truncate max-w-[120px]">{teams.find(t => t.id === getPlayoffMatch('Final')?.team2Id)?.name}</span>
                            <span className="text-lg font-black tabular-nums">{getPlayoffMatch('Final')?.innings2?.score || '-'}</span>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="p-8 rounded-3xl border border-dashed border-slate-800 flex items-center justify-center text-center">
                      <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Path to Final Pending</p>
                   </div>
                )}
             </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Points Table */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#151921] rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                Standings Table
              </h3>
              {teams.length === 0 && (
                <button
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-xl hover:brightness-110 transition-all text-xs font-black uppercase tracking-widest"
                >
                  <Database size={14} />
                  {isSeeding ? 'Seeding...' : 'Seed Data'}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800 bg-slate-800/20">
                    <th className="px-6 py-4 font-black w-[35%]">Team</th>
                    <th className="px-4 py-4 font-black text-center w-[10%]">P</th>
                    <th className="px-4 py-4 font-black text-center w-[10%]">W</th>
                    <th className="px-4 py-4 font-black text-center text-rose-500 w-[10%]">L</th>
                    <th className="px-6 py-4 font-black text-right w-24">NRR</th>
                    <th className="px-6 py-4 font-black text-center text-yellow-500 w-20">Pts</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {teams.map((team, idx) => (
                    <tr key={team.id} className="border-b border-slate-800/40 hover:bg-slate-800/10 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600 text-xs font-black w-4">{idx + 1}</span>
                          <div 
                            className="w-1 h-5 rounded-full shadow-lg shadow-black/40" 
                            style={{ backgroundColor: team.color }}
                          ></div>
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors">
                            {team.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-400">{team.matches}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-500/80">{team.wins}</td>
                      <td className="px-4 py-4 text-center font-bold text-rose-500/80">{team.losses}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500 text-xs font-bold">
                        {team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-500 font-black text-base drop-shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                          {team.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                        Waiting for tournament data...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-[#151921] rounded-2xl border border-slate-800/60 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Recent Results</h3>
            <div className="space-y-4">
              {matches.map((match) => (
                <div 
                  key={match.id} 
                  onClick={() => match.status === 'completed' && setSelectedMatch(match)}
                  className={`bg-[#0B0E14] p-5 rounded-2xl border border-slate-800/50 flex items-center justify-between group transition-all ${match.status === 'completed' ? 'hover:border-yellow-500/30 cursor-pointer' : ''}`}
                >
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between pr-8">
                       <span className="font-bold text-slate-400 text-xs uppercase tracking-wide">
                         {teams.find(t => t.id === match.team1Id)?.name || 'Team A'}
                       </span>
                       <span className="text-white font-black text-lg">
                          {match.innings1?.score}<span className="text-slate-600 text-sm ml-0.5">/{match.innings1?.wickets}</span>
                       </span>
                    </div>
                    <div className="flex items-center justify-between pr-8">
                       <span className="font-bold text-slate-400 text-xs uppercase tracking-wide">
                         {teams.find(t => t.id === match.team2Id)?.name || 'Team B'}
                       </span>
                       <span className="text-white font-black text-lg">
                          {match.innings2?.score}<span className="text-slate-600 text-sm ml-0.5">/{match.innings2?.wickets}</span>
                       </span>
                    </div>
                  </div>
                  <div className="text-right border-l border-slate-800 pl-8 shrink-0 min-w-[140px]">
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">
                      {match.winnerId ? 'Official Result' : 'Postponed'}
                    </div>
                    <div className="text-xs font-black text-white uppercase tracking-tight leading-relaxed max-w-[120px]">
                      {match.margin || 'Match Scheduled'}
                    </div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-[10px] items-center gap-2 font-black text-slate-600 uppercase tracking-widest">No match results available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performers Sidebar */}
        <div className="space-y-8">
          {/* Orange Cap */}
          <div className="bg-[#151921] rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl">
             <div className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                   <Trophy className="w-4 h-4 text-white" />
                 </div>
                 <h4 className="font-black text-xs uppercase tracking-widest text-orange-400">Orange Cap</h4>
               </div>
               <span className="text-[9px] font-black text-slate-600 uppercase">Top 3</span>
             </div>
             <div className="p-4 space-y-1">
               {topBatters.map((p, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-3 rounded-xl transition-all ${idx === 0 ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-orange-500' : 'hover:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300">
                          {p.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white leading-none">{p.name}</p>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{(p as any).teamName}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-lg font-black ${idx === 0 ? 'text-orange-500' : 'text-slate-300'}`}>{p.runs}</span>
                       <p className="text-[9px] font-black text-slate-600 uppercase leading-none">Runs</p>
                    </div>
                 </div>
               ))}
               {topBatters.length === 0 && <p className="text-[10px] text-slate-600 p-4 text-center">No batting data yet</p>}
             </div>
          </div>
 
          {/* Purple Cap */}
          <div className="bg-[#151921] rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl">
             <div className="p-4 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                   <Trophy className="w-4 h-4 text-white" />
                 </div>
                 <h4 className="font-black text-xs uppercase tracking-widest text-purple-400">Purple Cap</h4>
               </div>
               <span className="text-[9px] font-black text-slate-600 uppercase">Top 3</span>
             </div>
             <div className="p-4 space-y-1">
               {topBowlers.map((p, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-3 rounded-xl transition-all ${idx === 0 ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-purple-500' : 'hover:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300">
                          {p.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white leading-none">{p.name}</p>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{(p as any).teamName}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-lg font-black ${idx === 0 ? 'text-purple-500' : 'text-slate-300'}`}>{p.wickets}</span>
                       <p className="text-[9px] font-black text-slate-600 uppercase leading-none">Wkts</p>
                    </div>
                 </div>
               ))}
               {topBowlers.length === 0 && <p className="text-[10px] text-slate-600 p-4 text-center">No bowling data yet</p>}
             </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedMatch && (
          <Scorecard 
            match={selectedMatch} 
            teams={teams} 
            onClose={() => setSelectedMatch(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
