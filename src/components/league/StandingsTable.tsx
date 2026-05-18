import React from 'react';
import { motion } from 'motion/react';
import { Team } from '../../types';
import { TrendingUp, TrendingDown, Minus, Trophy, Star } from 'lucide-react';

interface StandingsTableProps {
  teams: Team[];
  isCompact?: boolean;
  winnerId?: string;
}

export default function StandingsTable({ teams, isCompact = false, winnerId }: StandingsTableProps) {
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800/60">
            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">#</th>
            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Division</th>
            <th className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">P</th>
            {!isCompact && (
              <>
                <th className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">W</th>
                <th className="px-2 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-12">L</th>
              </>
            )}
            <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">NRR</th>
            <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest w-16">PTS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {sortedTeams.map((team, idx) => (
            <motion.tr 
              layout
              key={team.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`group transition-colors ${team.id === winnerId ? 'bg-yellow-500/10' : (idx < 4 ? 'bg-slate-800/5' : '')} hover:bg-slate-800/20`}
            >
              <td className="px-4 py-4 text-center">
                {team.id === winnerId ? (
                   <Trophy size={14} className="text-yellow-500 mx-auto" />
                ) : (
                  <span className={`text-[10px] font-black ${idx < 4 ? 'text-yellow-500' : 'text-slate-600'}`}>{idx + 1}</span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-lg relative"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name ? team.name[0] : '?'}
                    {team.id === winnerId && (
                       <Star size={8} className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className={`text-sm font-bold ${team.id === winnerId ? 'text-yellow-500' : (idx < 4 ? 'text-white' : 'text-slate-300')}`}>{team.name}</p>
                       {team.id === winnerId && (
                          <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Champions</span>
                       )}
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                       {/* Simplified form indicators */}
                       {[1, 2, 3, 4, 5].map(i => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                       ))}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-2 py-4 text-center font-bold text-slate-400 text-xs">{team.matches}</td>
              {!isCompact && (
                <>
                  <td className="px-2 py-4 text-center font-bold text-emerald-500 text-xs">{team.wins}</td>
                  <td className="px-2 py-4 text-center font-bold text-rose-500 text-xs">{team.losses}</td>
                </>
              )}
              <td className="px-4 py-4 text-center">
                 <div className="flex items-center justify-center gap-1">
                   <span className={`text-[10px] font-black ${team.nrr > 0 ? 'text-emerald-500' : team.nrr < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                     {team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}
                   </span>
                 </div>
              </td>
              <td className="px-4 py-4 text-right">
                <span className={`text-sm font-black ${idx < 4 ? 'text-yellow-500' : 'text-slate-200'}`}>{team.points}</span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
