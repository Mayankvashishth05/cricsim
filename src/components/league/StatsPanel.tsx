import React from 'react';
import { motion } from 'motion/react';
import { Player, Team } from '../../types';
import { Award, Zap, Target, TrendingUp } from 'lucide-react';

interface StatsPanelProps {
  players: Player[];
  teams: Team[];
}

export default function StatsPanel({ players, teams }: StatsPanelProps) {
  const topRunScorers = [...players].sort((a, b) => (b.runs || 0) - (a.runs || 0)).slice(0, 5);
  const topWicketTakers = [...players].sort((a, b) => (b.wickets || 0) - (a.wickets || 0)).slice(0, 5);
  const topMVPs = [...players].sort((a, b) => (b.mvpPoints || 0) - (a.mvpPoints || 0)).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <StatList title="Strategic Scorers" items={topRunScorers} metric="runs" label="Runs" icon={<Target className="text-blue-500" />} />
       <StatList title="Termination Squad" items={topWicketTakers} metric="wickets" label="Wickets" icon={<Zap className="text-rose-500" />} />
       <StatList title="Vanguard Leaders" items={topMVPs} metric="mvpPoints" label="MVP Points" icon={<Award className="text-yellow-500" />} />
    </div>
  );
}

function StatList({ title, items, metric, label, icon }: any) {
  return (
    <div className="bg-[#11151D] border border-slate-800/60 rounded-[2.5rem] p-8 shadow-2xl">
       <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none">{title}</h3>
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
             {icon}
          </div>
       </div>

       <div className="space-y-4">
          {items.map((player: Player, idx: number) => (
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: idx * 0.1 }}
               key={player.id} 
               className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-800/40 group hover:border-yellow-500/20 transition-all hover:bg-slate-900"
             >
                <div className="flex items-center gap-4">
                   <div className="text-[10px] font-black text-slate-700 w-4">0{idx + 1}</div>
                   <div>
                      <p className="text-xs font-black text-white uppercase tracking-tight">{player.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{player.type}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-yellow-500">{(player as any)[metric]}</p>
                   <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
                </div>
             </motion.div>
          ))}
          {items.length === 0 && (
             <div className="py-10 text-center text-slate-700">
                <p className="text-[10px] font-black uppercase tracking-widest italic">Awaiting Field Data</p>
             </div>
          )}
       </div>
    </div>
  );
}
