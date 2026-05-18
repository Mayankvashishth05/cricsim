import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Season } from '../../types';
import { Trophy, Calendar, Target, TrendingUp, Users, Award, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SeasonArchive() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'seasons'), orderBy('createdAt', 'desc')),
      (snap) => {
        setSeasons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Season)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (loading) return (
     <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Opening the Vault...</p>
     </div>
  );

  if (seasons.length === 0) return (
     <div className="text-center p-20 bg-[#11151D] rounded-[3rem] border border-slate-800/60 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-30" />
        <Trophy className="w-20 h-20 text-slate-800 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight italic">The Archive is Empty</h3>
        <p className="text-slate-600 text-sm font-medium mt-2">Finish a season from Settings to immortalize your champions here.</p>
     </div>
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center gap-4">
         <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
            <Award className="w-8 h-8 text-yellow-500" />
         </div>
         <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Hall of Fame</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">CricSim Season Archives</p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {seasons.map((season, idx) => (
          <motion.div
            key={season.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative"
          >
             {/* Timeline Connector */}
             {idx < seasons.length - 1 && (
                <div className="absolute left-[2.5rem] bottom-[-3.5rem] w-px h-12 bg-gradient-to-b from-slate-800 to-transparent" />
             )}

             <div className="bg-[#11151D] rounded-[2.5rem] border border-slate-800/60 shadow-2xl overflow-hidden hover:border-yellow-500/30 transition-colors">
                <div className="flex flex-col lg:flex-row">
                   {/* Left Side: Winner Spotlight */}
                   <div className="lg:w-1/3 bg-gradient-to-br from-yellow-500/10 to-transparent p-10 flex flex-col justify-between border-r border-slate-800/60 relative">
                      <div className="absolute top-4 right-4 group-hover:scale-110 transition-transform">
                         <Star className="text-yellow-500/20 w-32 h-32 absolute -z-10 blur-xl" />
                         <Trophy className="text-yellow-500 w-16 h-16" />
                      </div>
                      
                      <div className="space-y-2">
                         <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Season {season.seasonNumber} Champion</span>
                         <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{season.winnerName}</h3>
                      </div>

                      <div className="mt-12 space-y-6">
                         <div className="flex items-center gap-3">
                            <Calendar className="text-slate-600" size={16} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               {season.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'Ancient Times'}
                            </span>
                         </div>
                         
                         <div className="p-4 bg-black/40 rounded-2xl border border-slate-800/40">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 text-center">Runner Up</span>
                            <p className="text-sm font-black text-slate-300 text-center uppercase tracking-tight">{season.runnerUpName}</p>
                         </div>
                      </div>
                   </div>

                   {/* Right Side: Details & Standings */}
                   <div className="flex-1 p-10 space-y-10">
                      {/* Top Performances */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         {[
                            { label: 'Tournament MVP', value: season.mvpName, icon: Award, color: 'text-purple-400' },
                            { label: 'Orange Cap', value: season.orangeCapName, icon: Target, color: 'text-orange-400' },
                            { label: 'Purple Cap', value: season.purpleCapName, icon: Users, color: 'text-indigo-400' },
                         ].map((item) => (
                            <div key={item.label} className="space-y-1">
                               <div className="flex items-center gap-2 mb-2">
                                  <item.icon size={12} className={item.color} />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                               </div>
                               <p className="text-sm font-black text-white uppercase tracking-tight truncate">{item.value}</p>
                            </div>
                         ))}
                      </div>

                      <div className="h-px bg-slate-800/40" />

                      {/* Final Standings Table */}
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Final Four Standings</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {season.topTeams.map((team, tIdx) => (
                               <div key={team.name} className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 group-hover:border-slate-700 transition-colors">
                                  <div className="flex items-center gap-2 mb-2">
                                     <span className="text-[9px] font-black text-slate-600">#{tIdx + 1}</span>
                                     <h5 className="text-xs font-black text-slate-300 uppercase truncate tracking-tight">{team.name}</h5>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                     <span className="text-slate-500 uppercase tracking-widest">{team.points} Points</span>
                                     <span className={team.nrr >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                        {team.nrr >= 0 ? '+' : ''}{team.nrr.toFixed(3)}
                                     </span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
