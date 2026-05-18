import React, { useState, useEffect } from 'react';
import { Match, Team, Player, Inning } from '../../types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { X, Trophy, Swords, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScorecardProps {
  match: Match;
  teams: Team[];
  onClose: () => void;
}

export default function Scorecard({ match, teams, onClose }: ScorecardProps) {
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      const playerMap: Record<string, Player> = {};
      
      const team1Players = await getDocs(collection(db, `teams/${match.team1Id}/squad`));
      const team2Players = await getDocs(collection(db, `teams/${match.team2Id}/squad`));
      
      team1Players.docs.forEach(d => playerMap[d.id] = { id: d.id, ...d.data() } as Player);
      team2Players.docs.forEach(d => playerMap[d.id] = { id: d.id, ...d.data() } as Player);
      
      setPlayers(playerMap);
      setLoading(false);
    };
    fetchPlayers();
  }, [match]);

  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  const winner = teams.find(t => t.id === match.winnerId);

  const currentInnings = activeInnings === 1 ? match.innings1 : match.innings2;
  const battingTeam = activeInnings === 1 ? team1 : team2;
  const bowlingTeam = activeInnings === 1 ? team2 : team1;

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#11151D] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-gradient-to-br from-slate-800/50 to-transparent">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em]">{match.matchType} Result</span>
                 <div className="h-px w-12 bg-slate-700" />
              </div>
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                 {team1?.name} <Swords className="text-rose-500 w-5 h-5" /> {team2?.name}
              </h2>
           </div>
           <button 
             onClick={onClose}
             className="p-3 bg-slate-800/50 text-slate-400 hover:text-white rounded-2xl transition-all"
           >
              <X size={20} />
           </button>
        </div>

        {/* Quick Result Banner */}
        <div className="bg-yellow-500/10 p-4 border-b border-yellow-500/10 flex items-center justify-center gap-4">
           <Trophy className="text-yellow-500 w-5 h-5" />
           <p className="text-xs font-black text-yellow-500 uppercase tracking-widest italic">
              {match.winnerId ? `${winner?.name} won ${match.margin}` : 'Match Drawn / No Result'}
           </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           {/* Innings Tabs */}
           <div className="flex gap-4">
              <button 
                onClick={() => setActiveInnings(1)}
                className={`flex-1 py-4 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${
                  activeInnings === 1 
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' 
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                 {team1?.name} Innings ({match.innings1?.score}/{match.innings1?.wickets})
              </button>
              <button 
                onClick={() => setActiveInnings(2)}
                className={`flex-1 py-4 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${
                  activeInnings === 2 
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20' 
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                 {team2?.name} Innings ({match.innings2?.score}/{match.innings2?.wickets})
              </button>
           </div>

           {currentInnings && (
             <div className="space-y-10">
                {/* Batting Stats */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <Zap className="text-orange-500" size={16} />
                      <h3 className="text-xs font-black text-white uppercase tracking-widest italic">{battingTeam?.name} Batting Operations</h3>
                   </div>
                   <div className="bg-[#0B0E14] rounded-2x border border-slate-800/60 overflow-hidden">
                      <table className="w-full text-left table-fixed">
                         <thead>
                            <tr className="bg-slate-800/30 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                               <th className="px-6 py-4 w-[35%]">Batter</th>
                               <th className="px-6 py-4 w-[30%]">Status</th>
                               <th className="px-6 py-4 text-center w-[12%]">Runs</th>
                               <th className="px-6 py-4 text-center w-[12%]">Balls</th>
                               <th className="px-6 py-4 text-center w-[11%]">SR</th>
                            </tr>
                         </thead>
                         <tbody className="text-xs">
                            {currentInnings.battingStats.map((s, idx) => (
                               <tr key={idx} className="border-b border-slate-800/30">
                                  <td className="px-6 py-4 font-bold text-slate-200">{players[s.playerId]?.name || 'N/A'}</td>
                                  <td className="px-6 py-4 text-slate-500 italic font-medium">{s.isOut ? 'Caught / Bowled' : 'Not Out'}</td>
                                  <td className="px-6 py-4 text-center font-black text-white">{s.runs}</td>
                                  <td className="px-6 py-4 text-center text-slate-400">{s.balls}</td>
                                  <td className="px-6 py-4 text-center text-slate-500 font-mono">{(s.runs / (s.balls || 1) * 100).toFixed(1)}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Bowling Stats */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <Activity className="text-indigo-500" size={16} />
                      <h3 className="text-xs font-black text-white uppercase tracking-widest italic">{bowlingTeam?.name} Bowling Deployment</h3>
                   </div>
                   <div className="bg-[#0B0E14] rounded-2x border border-slate-800/60 overflow-hidden">
                      <table className="w-full text-left table-fixed">
                         <thead>
                            <tr className="bg-slate-800/30 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                               <th className="px-6 py-4 w-[35%]">Bowler</th>
                               <th className="px-6 py-4 text-center w-[15%]">Overs</th>
                               <th className="px-6 py-4 text-center w-[15%]">Runs</th>
                               <th className="px-6 py-4 text-center w-[15%]">Wkts</th>
                               <th className="px-6 py-4 text-center w-[20%]">Econ</th>
                            </tr>
                         </thead>
                         <tbody className="text-xs">
                            {currentInnings.bowlingStats.map((s, idx) => (
                               <tr key={idx} className="border-b border-slate-800/30">
                                  <td className="px-6 py-4 font-bold text-slate-200">{players[s.playerId]?.name || 'N/A'}</td>
                                  <td className="px-6 py-4 text-center text-white font-black">{s.overs}</td>
                                  <td className="px-6 py-4 text-center text-slate-400">{s.runs}</td>
                                  <td className="px-6 py-4 text-center text-emerald-500 font-black">{s.wickets}</td>
                                  <td className="px-6 py-4 text-center text-slate-500 font-mono">
                                     {(() => {
                                        const oversStr = s.overs.toString();
                                        const [fullOvers, balls] = oversStr.split('.').map(Number);
                                        const totalBalls = (fullOvers * 6) + (balls || 0);
                                        return totalBalls > 0 ? ((s.runs / totalBalls) * 6).toFixed(2) : '0.00';
                                     })()}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-800 bg-[#0B0E14] flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
           <div className="flex gap-10">
              <div className="space-y-1">
                 <p className="text-slate-600">Total Score</p>
                 <p className="text-lg text-white italic tracking-tighter">{currentInnings?.score}/{currentInnings?.wickets} ({currentInnings?.overs})</p>
              </div>
              <div className="space-y-1">
                 <p className="text-slate-600">Match MVP</p>
                 <p className="text-lg text-yellow-500 italic tracking-tighter">{match.mvpName || players[match.mvpId || '']?.name || 'TBD'}</p>
              </div>
           </div>
           <button 
             onClick={onClose}
             className="px-10 py-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all font-black"
           >
              Dismiss Intelligence
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
