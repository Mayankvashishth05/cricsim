import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Match, Team } from '../../types';
import { Target, Trophy, ChevronRight, Search, SlidersHorizontal, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Scorecard from './Scorecard';

export default function MatchResults() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<Match['matchType'] | 'All'>('All');

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });

    const q = query(
      collection(db, 'matches'), 
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubMatches = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
      setLoading(false);
    });

    return () => {
      unsubTeams();
      unsubMatches();
    };
  }, []);

  const filteredMatches = filter === 'All' 
    ? matches 
    : matches.filter(m => m.matchType === filter);

  if (loading) return (
     <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Parsing Result Registry...</p>
     </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Result Intelligence</h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em] mt-1">Combat Logs & Scorecards</p>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 bg-[#151921] rounded-2xl border border-slate-800/60 shadow-xl overflow-x-auto max-w-full">
           {['All', 'League', 'Qualifier 1', 'Eliminator', 'Qualifier 2', 'Final'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type as any)}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === type 
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' 
                  : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                {type}
              </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredMatches.map((match, idx) => {
          const t1 = teams.find(t => t.id === match.team1Id);
          const t2 = teams.find(t => t.id === match.team2Id);
          const winner = teams.find(t => t.id === match.winnerId);
          const isT1Winner = match.winnerId === match.team1Id;

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedMatch(match)}
              className="group bg-[#151921] rounded-[2.5rem] border border-slate-800/60 p-8 hover:border-yellow-500/30 transition-all cursor-pointer relative overflow-hidden shadow-2xl"
            >
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-500/10 transition-all" />
               
               <div className="flex justify-between items-center mb-10">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] bg-slate-800/40 px-3 py-1 rounded-lg">
                     {match.matchType} Log
                  </span>
                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                     <Calendar size={12} className="text-slate-800" />
                     {match.createdAt?.toDate ? match.createdAt.toDate().toLocaleDateString() : 'Historical'}
                  </div>
               </div>

               <div className="flex flex-col gap-6">
                  <div className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isT1Winner ? 'bg-yellow-500/5 border border-yellow-500/10' : ''}`}>
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm ${isT1Winner ? 'text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-slate-500'}`}>
                           {t1?.name.charAt(0)}
                        </div>
                        <span className={`font-black text-lg tracking-tighter uppercase italic ${isT1Winner ? 'text-white' : 'text-slate-500'}`}>{t1?.name}</span>
                     </div>
                     <div className="text-right">
                        <p className={`text-xl font-black tabular-nums ${isT1Winner ? 'text-white' : 'text-slate-600'}`}>
                           {match.innings1?.score}<span className="text-xs text-slate-500">/{match.innings1?.wickets}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{match.innings1?.overs} Overs</p>
                     </div>
                  </div>

                  <div className={`flex items-center justify-between p-4 rounded-2xl transition-all ${!isT1Winner ? 'bg-yellow-500/5 border border-yellow-500/10' : ''}`}>
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm ${!isT1Winner ? 'text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'text-slate-500'}`}>
                           {t2?.name.charAt(0)}
                        </div>
                        <span className={`font-black text-lg tracking-tighter uppercase italic ${!isT1Winner ? 'text-white' : 'text-slate-500'}`}>{t2?.name}</span>
                     </div>
                     <div className="text-right">
                        <p className={`text-xl font-black tabular-nums ${!isT1Winner ? 'text-white' : 'text-slate-600'}`}>
                           {match.innings2?.score}<span className="text-xs text-slate-500">/{match.innings2?.wickets}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{match.innings2?.overs} Overs</p>
                     </div>
                  </div>
               </div>

               <div className="mt-10 pt-8 border-t border-slate-800/60 flex items-center justify-between">
                  <div>
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Combat Result</p>
                     <p className="text-xs font-black text-yellow-500 uppercase tracking-tight italic">
                        {winner?.name} won {match.margin}
                     </p>
                  </div>
                  <div className="w-10 h-10 bg-[#0B0E14] rounded-xl flex items-center justify-center text-slate-500 group-hover:text-yellow-500 group-hover:bg-yellow-500/10 transition-all border border-slate-800 group-hover:border-yellow-500/20">
                     <ChevronRight size={20} />
                  </div>
               </div>
            </motion.div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="md:col-span-2 text-center p-20 bg-[#11151D] rounded-[3rem] border border-slate-800/60 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-30" />
             <Target className="w-20 h-20 text-slate-800 mx-auto mb-6 opacity-20" />
             <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight italic">No Results Decoded</h3>
             <p className="text-slate-600 text-sm font-medium mt-2">Finish matches in the Simulate tab to see intelligence reports here.</p>
          </div>
        )}
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
