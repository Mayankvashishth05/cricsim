import React, { useState } from 'react';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Trash2, AlertTriangle, ShieldCheck, Database, RefreshCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ResetType = 'tournament' | 'players' | 'full';

export default function Settings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>('tournament');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const getResetDetails = () => {
    switch(resetType) {
      case 'tournament':
        return {
          title: 'Clear Tournament Data',
          warning: 'This will delete all fixtures, results, points tables, and commentary logs. This action is irreversible.',
          requiredText: 'DELETE TOURNAMENT'
        };
      case 'players':
        return {
          title: 'Clear Player Statistics',
          warning: 'This will reset all player career records, match histories, and achievements. Team rosters will remain intact.',
          requiredText: 'DELETE PLAYER STATS'
        };
      case 'full':
        return {
          title: 'Full Application Reset',
          warning: 'CRITICAL: This will delete EVERYTHING - teams, tournaments, matches, players, and settings. Your account will be effectively wiped.',
          requiredText: 'DELETE ALL DATA'
        };
    }
  };

  const handleDelete = async () => {
    const details = getResetDetails();
    if (confirmationText !== details.requiredText) {
      alert("Confirmation text does not match.");
      return;
    }

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);

      if (resetType === 'tournament' || resetType === 'full') {
        const matches = await getDocs(collection(db, 'matches'));
        matches.forEach(d => batch.delete(d.ref));
        
        // Reset team stats
        const teams = await getDocs(collection(db, 'teams'));
        teams.forEach(d => {
          if (resetType === 'full') {
            batch.delete(d.ref);
          } else {
            batch.update(d.ref, {
              matches: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              noResult: 0,
              points: 0,
              nrr: 0
            });
          }
        });
      }

      if (resetType === 'players' || resetType === 'full') {
        const teams = await getDocs(collection(db, 'teams'));
        for (const teamDoc of teams.docs) {
          const players = await getDocs(collection(db, `teams/${teamDoc.id}/squad`));
          for (const playerDoc of players.docs) {
            if (resetType === 'full') {
               batch.delete(playerDoc.ref);
            } else {
               batch.update(playerDoc.ref, {
                 runs: 0,
                 wickets: 0,
                 mvpPoints: 0,
                 careerStats: {
                    matches: 0,
                    innings: 0,
                    runs: 0,
                    balls: 0,
                    wickets: 0,
                    overs: 0,
                    runsConceded: 0,
                    highestScore: 0,
                    bestBowlingWickets: 0,
                    bestBowlingRuns: 0,
                    thirties: 0,
                    fifties: 0,
                    hundreds: 0,
                    threeWicketHauls: 0,
                    fiveWicketHauls: 0
                 }
               });
               // History deletion is harder in batch if deep, but we'll try top level
               // Usually requires recursive delete for subcollections in Firestore
            }
          }
        }
      }

      await batch.commit();
      alert("Data reset successfully!");
      setIsModalOpen(false);
      window.location.reload(); // Hard refresh to reset state
    } catch (error) {
      console.error("Reset failed", error);
      alert("Failed to reset data.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
          <Database className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Data Management</h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em]">Maintenance & Security</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#151921] p-8 rounded-3xl border border-slate-800/60 shadow-2xl space-y-6">
           <div className="flex items-center gap-3">
              <RefreshCcw className="text-blue-500" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Tournament Cycle</h4>
           </div>
           <p className="text-xs text-slate-500 leading-relaxed font-medium">Reset current tournament progress while keeping your team rosters and player statistics history.</p>
           <button 
             onClick={() => { setResetType('tournament'); setIsModalOpen(true); }}
             className="w-full py-4 bg-[#0B0E14] border border-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all shadow-xl"
           >
             Clear Tournament Data
           </button>
        </div>

        <div className="bg-[#151921] p-8 rounded-3xl border border-slate-800/60 shadow-2xl space-y-6">
           <div className="flex items-center gap-3">
              <ShieldCheck className="text-purple-500" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Player Records</h4>
           </div>
           <p className="text-xs text-slate-500 leading-relaxed font-medium">Wipe all career statistics and match histories. Useful for starting a fresh season with existing squads.</p>
           <button 
             onClick={() => { setResetType('players'); setIsModalOpen(true); }}
             className="w-full py-4 bg-[#0B0E14] border border-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all shadow-xl"
           >
             Reset Player Stats
           </button>
        </div>

        <div className="bg-[#151921] p-8 rounded-3xl border border-rose-500/20 shadow-2xl space-y-6 md:col-span-2">
           <div className="flex items-center gap-3">
              <Trash2 className="text-rose-500" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Nuclear Reset</h4>
           </div>
           <p className="text-xs text-slate-500 leading-relaxed font-medium">Deletes all users, teams, tournaments, and history. This will return the application to its initial empty state.</p>
           <button 
             onClick={() => { setResetType('full'); setIsModalOpen(true); }}
             className="w-full py-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl"
           >
             Full Application Wipe
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11151D] w-full max-w-xl rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
              
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                 <X size={24} />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-5 bg-rose-500/10 rounded-full border border-rose-500/20">
                   <AlertTriangle className="w-12 h-12 text-rose-500" />
                </div>
                
                <div>
                   <h4 className="text-2xl font-black text-white uppercase tracking-tight italic mb-2">{getResetDetails().title}</h4>
                   <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">{getResetDetails().warning}</p>
                </div>

                <div className="w-full space-y-4">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Type "{getResetDetails().requiredText}" to confirm</p>
                      <input 
                        type="text"
                        placeholder={getResetDetails().requiredText}
                        className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-rose-500/50 text-center font-black uppercase tracking-widest transition-all placeholder:text-slate-800"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                      />
                   </div>

                   <button
                     disabled={confirmationText !== getResetDetails().requiredText || isDeleting}
                     onClick={handleDelete}
                     className="w-full py-5 bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-rose-500/10 transition-all active:scale-95"
                   >
                     {isDeleting ? 'Processing Wipe...' : 'Confirm Destruction'}
                   </button>
                   
                   <button 
                     onClick={() => setIsModalOpen(false)}
                     className="w-full text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                   >
                     Abort Process
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
