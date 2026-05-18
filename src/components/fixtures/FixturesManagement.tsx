import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { Team, Match } from '../../types';
import { Plus, Trash2, Calendar, Wand2, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { where } from 'firebase/firestore';

export default function FixturesManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribeTeams = onSnapshot(
      query(collection(db, 'teams'), where('userId', '==', userId)), 
      (snapshot) => {
        setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
      }
    );
    const unsubscribeMatches = onSnapshot(
      query(
        collection(db, 'matches'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
      }
    );
    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  const handleGenerateFixtures = async () => {
    if (teams.length < 2) return alert('Need at least 2 teams');
    if (!auth.currentUser) return;
    if (!confirm('This will generate round-robin fixtures. Continue?')) return;

    const userId = auth.currentUser.uid;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        try {
          await addDoc(collection(db, 'matches'), {
            userId,
            team1Id: teams[i].id,
            team2Id: teams[j].id,
            status: 'scheduled',
            matchType: 'League',
            createdAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Match creation failed");
        }
      }
    }
  };

  const handleBulkAdd = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const lines = bulkInput.split('\n').filter(l => l.trim());
    for (const line of lines) {
      // Expecting: Team1 v/s Team2
      const [t1n, t2n] = line.split(/v\/s|vs|v/i).map(s => s.trim());
      const t1 = teams.find(t => t.name.toLowerCase() === t1n.toLowerCase());
      const t2 = teams.find(t => t.name.toLowerCase() === t2n.toLowerCase());
      
      if (t1 && t2) {
        await addDoc(collection(db, 'matches'), {
          userId,
          team1Id: t1.id,
          team2Id: t2.id,
          status: 'scheduled',
          matchType: 'League',
          createdAt: serverTimestamp()
        });
      }
    }
    setBulkInput('');
    setIsBulkAdding(false);
  };

  const handleDeleteMatch = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Combat Schedule</h3>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em] mt-1">Calendar & Logistics</p>
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
            onClick={handleGenerateFixtures}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:bg-yellow-500"
          >
            <Wand2 size={16} strokeWidth={3} />
            Auto Sequence
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isBulkAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-[#151921] p-10 rounded-[2.5rem] border border-yellow-500/20 shadow-2xl space-y-8 relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setIsBulkAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             <div>
                <h4 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em] mb-2">Fixture Registry Portal</h4>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Syntax: FranchiseAlpha v/s FranchiseBeta</p>
             </div>
             <textarea
               className="w-full h-48 bg-[#0B0E14] border border-slate-800 rounded-[2rem] px-8 py-8 text-slate-300 font-mono text-sm focus:outline-none focus:border-yellow-500/30 transition-all placeholder:text-slate-800 resize-none shadow-inner"
               placeholder="CSK v/s MI&#10;RCB v/s KKR"
               value={bulkInput}
               onChange={e => setBulkInput(e.target.value)}
             />
             <div className="flex gap-4 justify-end">
                <button onClick={() => setIsBulkAdding(false)} className="px-10 py-3 bg-[#0B0E14] text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Abort Process</button>
                <button onClick={handleBulkAdd} className="px-12 py-3 bg-yellow-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-yellow-500/10 hover:brightness-110 transition-all">Engage Scheduler</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#151921] rounded-[2rem] border border-slate-800/60 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800 bg-slate-800/20">
              <th className="px-8 py-5">Index</th>
              <th className="px-8 py-5">Combatants</th>
              <th className="px-8 py-5">Class</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Operational Logic</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {matches.map((match, idx) => (
              <tr key={match.id} className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-all group">
                <td className="px-8 py-5 text-slate-600 font-mono text-xs">#{matches.length - idx}</td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">
                      {teams.find(t => t.id === match.team1Id)?.name || 'Unknown Unit'}
                    </span>
                    <span className="text-[10px] font-black text-rose-500/20 italic select-none">VS</span>
                    <span className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">
                      {teams.find(t => t.id === match.team2Id)?.name || 'Unknown Unit'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-800/30 px-2.5 py-1 rounded-lg border border-slate-800/50">{match.matchType}</span>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                    match.status === 'completed' 
                    ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                    : 'bg-yellow-500/5 text-yellow-500 border-yellow-500/20 animate-pulse'
                  }`}>
                    {match.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleDeleteMatch(match.id)}
                    className="p-2.5 bg-[#0B0E14] text-slate-600 hover:text-rose-500 transition-all rounded-xl border border-slate-800/50 shadow-lg group-hover:border-slate-700"
                  >
                    <Trash2 size={14} strokeWidth={3} />
                  </button>
                </td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center text-slate-700">
                  <div className="w-16 h-16 bg-[#0B0E14] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-800">
                    <Calendar className="w-8 h-8 text-slate-800" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-1">Schedule Domain Offline</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Pending data population for current cycle.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
