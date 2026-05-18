import React from 'react';
import { motion } from 'motion/react';
import { Team } from '../../types';
import { Activity, Target, Trophy } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
  isCompact?: boolean;
}

export default function TeamCard({ team, onClick, isCompact = false }: TeamCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className={`bg-[#11151D] border border-slate-800/60 rounded-[2rem] p-6 shadow-xl cursor-pointer group hover:border-yellow-500/30 transition-all ${isCompact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-center gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-2xl skew-x-3 group-hover:skew-x-0 transition-transform"
          style={{ backgroundColor: team.color }}
        >
          {team.name[0]}
        </div>
        <div>
           <h3 className="text-xl font-black text-white tracking-tighter uppercase">{team.name}</h3>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Division Commander</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
         <StatsBox label="Wins" value={team.wins} color="emerald" />
         <StatsBox label="Loss" value={team.losses} color="rose" />
         <StatsBox label="PTS" value={team.points} color="yellow" />
      </div>

      {!isCompact && (
        <div className="mt-6 pt-6 border-t border-slate-800/40 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Activity size={14} className="text-slate-600" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Efficiency: 84%</span>
           </div>
           <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#11151D] bg-slate-800 flex items-center justify-center">
                   <Target size={10} className="text-slate-500" />
                </div>
              ))}
           </div>
        </div>
      )}
    </motion.div>
  );
}

function StatsBox({ label, value, color }: any) {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/5',
    rose: 'text-rose-500 bg-rose-500/5',
    yellow: 'text-yellow-500 bg-yellow-500/5'
  };
  
  return (
    <div className={`p-3 rounded-2xl border border-slate-800/40 text-center ${colors[color as keyof typeof colors]}`}>
       <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
       <p className="text-lg font-black">{value}</p>
    </div>
  );
}
