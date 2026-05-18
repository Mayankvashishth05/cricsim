import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Team, Player, Match } from '../../types';
import { Trophy, TrendingUp, Users, Target, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { seedSampleData } from '../../lib/SampleData';

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [topBatters, setTopBatters] = useState<Player[]>([]);
  const [topBowlers, setTopBowlers] = useState<Player[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

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
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Filter by userId for current user's tournament
    const teamsUnsubscribe = onSnapshot(
      query(collection(db, 'teams'), where('userId', '==', userId)), 
      (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData.sort((a, b) => b.points - a.points || b.nrr - a.nrr));
      }
    );

    const matchesUnsubscribe = onSnapshot(
      query(
        collection(db, 'matches'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'), 
        limit(5)
      ),
      (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
      }
    );

    return () => {
      teamsUnsubscribe();
      matchesUnsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Teams', value: teams.length, icon: Users, color: 'text-blue-400' },
          { label: 'Matches Played', value: teams.reduce((acc, t) => acc + t.matches, 0) / 2, icon: Target, color: 'text-emerald-400' },
          { label: 'Highest Points', value: teams[0]?.points || 0, icon: Trophy, color: 'text-amber-400' },
          { label: 'Avg. NRR', value: (teams.reduce((acc, t) => acc + t.nrr, 0) / (teams.length || 1)).toFixed(2), icon: TrendingUp, color: 'text-indigo-400' },
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800 bg-slate-800/20">
                    <th className="px-6 py-4 font-black">Team</th>
                    <th className="px-4 py-4 font-black text-center">P</th>
                    <th className="px-4 py-4 font-black text-center">W</th>
                    <th className="px-4 py-4 font-black text-center text-rose-500">L</th>
                    <th className="px-6 py-4 font-black text-right">NRR</th>
                    <th className="px-6 py-4 font-black text-center text-yellow-500">Pts</th>
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
                <div key={match.id} className="bg-[#0B0E14] p-5 rounded-2xl border border-slate-800/50 flex items-center justify-between group hover:border-slate-700 transition-all">
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
               {[
                 { name: 'Virat Kohli', runs: 741, team: 'RCB', initials: 'VK' },
                 { name: 'Ruturaj Gaikwad', runs: 583, team: 'CSK', initials: 'RG' },
                 { name: 'Travis Head', runs: 567, team: 'SRH', initials: 'TH' }
               ].map((p, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-3 rounded-xl transition-all ${idx === 0 ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-orange-500' : 'hover:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300">
                          {p.initials}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white leading-none">{p.name}</p>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{p.team}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-lg font-black ${idx === 0 ? 'text-orange-500' : 'text-slate-300'}`}>{p.runs}</span>
                       <p className="text-[9px] font-black text-slate-600 uppercase leading-none">Runs</p>
                    </div>
                 </div>
               ))}
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
               {[
                 { name: 'Harshal Patel', wkts: 24, team: 'PBKS', initials: 'HP' },
                 { name: 'Jasprit Bumrah', wkts: 20, team: 'MI', initials: 'JB' },
                 { name: 'Varun CV', wkts: 19, team: 'KKR', initials: 'VC' }
               ].map((p, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-3 rounded-xl transition-all ${idx === 0 ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-l-4 border-purple-500' : 'hover:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-300">
                          {p.initials}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white leading-none">{p.name}</p>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{p.team}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className={`text-lg font-black ${idx === 0 ? 'text-purple-500' : 'text-slate-300'}`}>{p.wkts}</span>
                       <p className="text-[9px] font-black text-slate-600 uppercase leading-none">Wkts</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
