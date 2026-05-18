import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { Team } from '../../types';
import { Plus, Trash2, Edit2, Upload, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { query, where } from 'firebase/firestore';

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', color: '#6366f1' });
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, 'teams'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddTeam = async () => {
    if (!newTeam.name || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'teams'), {
        ...newTeam,
        userId: auth.currentUser.uid,
        matches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        noResult: 0,
        points: 0,
        nrr: 0
      });
      setNewTeam({ name: '', color: '#6366f1' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teams');
    }
  };

  const handleBulkAdd = async () => {
    if (!auth.currentUser) return;
    const lines = bulkInput.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const name = line.trim();
      if (!name) continue;
      try {
        await addDoc(collection(db, 'teams'), {
          name,
          userId: auth.currentUser.uid,
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
          matches: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          noResult: 0,
          points: 0,
          nrr: 0
        });
      } catch (error) {
        console.error("Bulk add failed for", name, error);
      }
    }
    setBulkInput('');
    setIsBulkAdding(false);
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">League Franchises</h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em] mt-1">Management Portal</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsBulkAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#151921] text-slate-400 rounded-2xl border border-slate-800 hover:text-slate-200 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl"
          >
            <Upload size={16} className="text-yellow-500" />
            Bulk Process
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-tr from-yellow-500 to-orange-600 text-black rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"
          >
            <Plus size={16} strokeWidth={3} />
            Register Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151921] border-2 border-dashed border-yellow-500/30 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2">
                 <button onClick={() => setIsAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>
              <h4 className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em]">Identity Config</h4>
              <div className="space-y-5">
                <div className="space-y-2">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Franchise Name</p>
                   <input
                     type="text"
                     placeholder="e.g. Mumbai Indians"
                     className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-500/50 transition-all font-bold placeholder:text-slate-700"
                     value={newTeam.name}
                     onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                   />
                </div>
                <div className="space-y-2">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Brand Signature</p>
                   <div className="flex items-center gap-4 bg-[#0B0E14] p-3 rounded-2xl border border-slate-800">
                     <input
                       type="color"
                       className="w-12 h-12 bg-transparent border-none cursor-pointer p-0 rounded-xl"
                       value={newTeam.color}
                       onChange={e => setNewTeam({ ...newTeam, color: e.target.value })}
                     />
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{newTeam.color}</span>
                   </div>
                </div>
              </div>
              <button
                onClick={handleAddTeam}
                className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-xl active:scale-95"
              >
                Assemble Franchise
              </button>
            </motion.div>
          )}

          {isBulkAdding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151921] border-2 border-dashed border-yellow-500/30 p-8 rounded-3xl space-y-6 lg:col-span-2 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsBulkAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              <h4 className="text-xs font-black text-yellow-500 uppercase tracking-[0.3em]">Bulk Import Matrix</h4>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Delimit entries with line breaks.</p>
              <textarea
                className="w-full h-40 bg-[#0B0E14] border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-500/50 transition-all font-bold placeholder:text-slate-700 resize-none"
                placeholder="Rajasthan Royals&#10;Kolkata Knight Riders&#10;Lucknow Super Giants"
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
              />
              <button
                onClick={handleBulkAdd}
                className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl active:scale-95"
              >
                Injest Dataset
              </button>
            </motion.div>
          )}

          {teams.map((team) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-[#151921] border border-slate-800/60 p-8 rounded-3xl hover:border-slate-700 transition-all shadow-2xl relative overflow-hidden"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-[0.03] rounded-full -mr-10 -mt-10"
                style={{ backgroundColor: team.color }}
              />
              
              <div className="flex justify-between items-start mb-8 relative">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-2xl relative"
                  style={{ backgroundColor: team.color }}
                >
                  <div className="absolute inset-0 bg-black/10 rounded-2xl" />
                  <span className="relative z-10">{team.name[0]}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <button className="p-2.5 bg-[#0B0E14] text-slate-500 hover:text-yellow-500 transition-colors rounded-xl shadow-lg border border-slate-800/50">
                    <Edit2 size={14} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTeam(team.id)}
                    className="p-2.5 bg-[#0B0E14] text-slate-500 hover:text-rose-500 transition-colors rounded-xl shadow-lg border border-slate-800/50"
                  >
                    <Trash2 size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
              
              <h4 className="text-xl font-black text-white mb-2 tracking-tight group-hover:text-yellow-500 transition-colors">{team.name}</h4>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">Series ID: {team.id.slice(0, 8)}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800/50 shadow-inner group-hover:border-slate-700 transition-all">
                   <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] leading-none mb-2">Points</p>
                   <p className="text-2xl font-black text-yellow-500">{team.points}</p>
                </div>
                <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800/50 shadow-inner group-hover:border-slate-700 transition-all">
                   <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] leading-none mb-2">Played</p>
                   <p className="text-2xl font-black text-white">{team.matches}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Wins</span>
                    <span className="text-xs font-black text-emerald-500">{team.wins}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Loss</span>
                    <span className="text-xs font-black text-rose-500">{team.losses}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 block">Net Run Rate</span>
                  <span className="text-xs font-black text-slate-300 font-mono tracking-tighter">
                    {team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
