import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { Team, Player, PlayerType, PlayerMatchHistory } from '../../types';
import { UserPlus, Trash2, Edit2, Upload, Search, ChevronDown, UserCircle, X, Target, History, TrendingUp, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDocs, getDoc } from 'firebase/firestore';

export default function SquadManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', type: 'Batter' as PlayerType });
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [history, setHistory] = useState<PlayerMatchHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!selectedPlayer || !selectedTeamId) return;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const hSnap = await getDocs(query(collection(db, `teams/${selectedTeamId}/squad/${selectedPlayer.id}/history`), orderBy('date', 'desc')));
        setHistory(hSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } catch (e) {
        console.error("History fetch failed", e);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedPlayer, selectedTeamId]);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, 'teams'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      if (teamsData.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamsData[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    const path = `teams/${selectedTeamId}/squad`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), orderBy('name')), 
      (snapshot) => {
        setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
      }
    );
    return () => unsubscribe();
  }, [selectedTeamId]);

  const handleAddPlayer = async () => {
    if (!newPlayer.name || !selectedTeamId) return;
    const path = `teams/${selectedTeamId}/squad`;
    try {
      await addDoc(collection(db, path), {
        ...newPlayer,
        runs: 0,
        wickets: 0,
        strikeRate: 0,
        economy: 0,
        mvpPoints: 0
      });
      setNewPlayer({ name: '', type: 'Batter' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleBulkAdd = async () => {
    if (!selectedTeamId) return;
    const path = `teams/${selectedTeamId}/squad`;
    const lines = bulkInput.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Expecting CSV: Name, Type
      const [name, type] = line.split(',').map(s => s.trim());
      if (!name) continue;
      
      const pType = (['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'].includes(type) ? type : 'Batter') as PlayerType;
      
      try {
        await addDoc(collection(db, path), {
          name,
          type: pType,
          runs: 0,
          wickets: 0,
          strikeRate: 0,
          economy: 0,
          mvpPoints: 0
        });
      } catch (error) {
        console.error("Bulk add failed for", name);
      }
    }
    setBulkInput('');
    setIsBulkAdding(false);
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Delete this player?')) return;
    const path = `teams/${selectedTeamId}/squad`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const currentTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-10">
      {/* Team Selector and Hero Card */}
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        <div className="w-full lg:w-72 space-y-3">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Team Authority</label>
          <div className="relative group">
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(e.target.value)}
              className="w-full bg-[#151921] border border-slate-800/60 text-slate-200 rounded-2xl px-6 py-4 appearance-none focus:outline-none focus:border-yellow-500/50 cursor-pointer font-bold shadow-2xl transition-all group-hover:border-slate-700"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-yellow-500 transition-colors">
               <ChevronDown size={18} strokeWidth={3} />
            </div>
          </div>
        </div>

        {currentTeam && (
          <div className="flex-1 bg-[#151921] p-8 rounded-[2rem] border border-slate-800/60 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-8">
            <div 
              className="absolute top-0 left-0 w-1.5 h-full" 
              style={{ backgroundColor: currentTeam.color }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                 <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">{currentTeam.name}</h3>
                 <span className="px-2 py-0.5 bg-yellow-500 text-black text-[9px] font-black rounded uppercase tracking-widest">Active</span>
              </div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{players.length} Operational Personnel</p>
            </div>
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setIsBulkAdding(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0B0E14] text-slate-400 rounded-xl border border-slate-800 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <Upload size={14} className="text-yellow-500" />
                Bulk Injest
              </button>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl hover:bg-yellow-500 transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5"
              >
                <UserPlus size={14} strokeWidth={3} />
                Draft Unit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals/Forms */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#151921] p-8 rounded-[2rem] border border-yellow-500/20 shadow-2xl relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setIsAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                   <X size={20} />
                </button>
             </div>
             <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-6">Unit Configuration</h4>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                <div className="sm:col-span-1 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jasprit Bumrah"
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-500/30 transition-all font-bold placeholder:text-slate-800"
                    value={newPlayer.name}
                    onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Tactical Role</label>
                  <select
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-yellow-500/30 transition-all font-bold appearance-none cursor-pointer"
                    value={newPlayer.type}
                    onChange={e => setNewPlayer({...newPlayer, type: e.target.value as PlayerType})}
                  >
                    <option>Batter</option>
                    <option>Bowler</option>
                    <option>All-rounder</option>
                    <option>Wicketkeeper</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddPlayer} 
                  className="bg-yellow-500 h-[58px] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  Deploy Player
                </button>
             </div>
          </motion.div>
        )}

        {isBulkAdding && (
           <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#151921] p-8 rounded-[2rem] border border-yellow-500/20 shadow-2xl relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setIsBulkAdding(false)} className="text-slate-600 hover:text-white transition-colors">
                   <X size={20} />
                </button>
             </div>
             <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Batch Registry Matrix</h4>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">CSV: Name, Role</p>
             </div>
             <textarea
               className="w-full h-48 bg-[#0B0E14] border border-slate-800 rounded-[2rem] px-6 py-6 text-slate-300 font-mono text-sm focus:outline-none focus:border-yellow-500/30 transition-all placeholder:text-slate-800 resize-none"
               placeholder="Virat Kohli, Batter&#10;Mohammad Shami, Bowler"
               value={bulkInput}
               onChange={e => setBulkInput(e.target.value)}
             />
             <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsBulkAdding(false)} className="px-8 py-3 bg-[#0B0E14] text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Abort</button>
                <button onClick={handleBulkAdd} className="px-10 py-3 bg-yellow-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-yellow-500/10 hover:brightness-110 transition-all">Commit Dataset</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {players.map(player => (
          <motion.div
            key={player.id}
            layout
            onClick={() => setSelectedPlayer(player)}
            className="bg-[#151921] border border-slate-800/60 p-6 rounded-3xl hover:border-yellow-500/30 transition-all group relative overflow-hidden shadow-xl cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id); }}
                className="opacity-0 group-hover:opacity-100 p-2 bg-[#0B0E14] text-slate-600 hover:text-rose-500 transition-all rounded-xl border border-slate-800"
              >
                <Trash2 size={14} strokeWidth={3} />
              </button>
            </div>

            <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 shadow-inner ${
              player.type === 'Batter' ? 'bg-blue-500/10 text-blue-400' :
              player.type === 'Bowler' ? 'bg-purple-500/10 text-purple-400' :
              player.type === 'All-rounder' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-amber-500/10 text-amber-500'
            }`}>
              {player.type}
            </span>

            <h5 className="font-black text-white text-lg tracking-tight mb-6 group-hover:text-yellow-500 transition-colors">{player.name}</h5>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-4 border-t border-slate-800/60 pt-6">
               <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/40">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Runs</p>
                  <p className="text-sm font-black text-slate-200">{player.runs || '0'}</p>
               </div>
               <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/40">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Wkts</p>
                  <p className="text-sm font-black text-slate-200">{player.wickets || '0'}</p>
               </div>
               <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/40">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">MVP</p>
                  <p className="text-sm font-black text-yellow-500">{player.mvpPoints || '0'}</p>
               </div>
               <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800/40">
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">SR</p>
                  <p className="text-sm font-black text-slate-400">{player.strikeRate || '0.00'}</p>
               </div>
            </div>
          </motion.div>
        ))}
        {players.length === 0 && selectedTeamId && (
          <div className="col-span-full py-24 text-center bg-[#0B0E14]/30 rounded-[3rem] border-2 border-dashed border-slate-800/40 flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-slate-800 animate-pulse">
                <UserCircle className="w-8 h-8 text-slate-700" />
             </div>
             <p className="text-slate-600 text-xs font-black uppercase tracking-[0.3em]">Operational Vacuum Detected</p>
             <p className="text-slate-700 text-[10px] mt-2 font-bold uppercase tracking-widest">No units assigned to current sector.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#11151D] w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div 
                className="absolute top-0 left-0 w-full h-1" 
                style={{ backgroundColor: currentTeam?.color }}
              />
              
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 bg-[#0B0E14] rounded-xl border border-slate-800"
              >
                 <X size={24} />
              </button>

              <div className="flex flex-col md:flex-row gap-10 overflow-y-auto pr-4 scrollbar-hide">
                {/* Left Column: Profile & Stats */}
                <div className="w-full md:w-80 space-y-8 shrink-0">
                  <div className="text-center md:text-left">
                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                       <Shield size={16} className="text-yellow-500" />
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">{selectedPlayer.type}</span>
                    </div>
                    <h4 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-1">{selectedPlayer.name}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{currentTeam?.name} Franchise</p>
                  </div>

                  <div className="space-y-4">
                     <h5 className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <TrendingUp size={12} />
                        Career Metrics
                     </h5>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Total Runs</p>
                           <p className="text-xl font-black text-white">{selectedPlayer.careerStats?.runs || selectedPlayer.runs || 0}</p>
                        </div>
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Total Wkts</p>
                           <p className="text-xl font-black text-white">{selectedPlayer.careerStats?.wickets || selectedPlayer.wickets || 0}</p>
                        </div>
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Innings</p>
                           <p className="text-xl font-black text-white">{selectedPlayer.careerStats?.innings || 0}</p>
                        </div>
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">High Score</p>
                           <p className="text-xl font-black text-yellow-500">{selectedPlayer.careerStats?.highestScore || 0}</p>
                        </div>
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Strike Rate</p>
                           <p className="text-xl font-black text-slate-300">{selectedPlayer.strikeRate || '0.0'}</p>
                        </div>
                        <div className="bg-[#0B0E14] p-4 rounded-2xl border border-slate-800 shadow-inner">
                           <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Economy</p>
                           <p className="text-xl font-black text-slate-300">{selectedPlayer.economy || '0.0'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-5 bg-gradient-to-tr from-yellow-500/10 to-orange-600/5 rounded-2xl border border-yellow-500/10 text-center">
                     <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">MVP Rating</p>
                     <p className="text-3xl font-black text-white">{selectedPlayer.mvpPoints || 0}</p>
                  </div>
                </div>

                {/* Right Column: Match History */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                     <h5 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] flex items-center gap-2">
                        <History size={14} />
                        Operational History
                     </h5>
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{history.length} Matches Logged</span>
                  </div>

                  <div className="space-y-3">
                    {history.map((h, i) => (
                      <div key={i} className="bg-[#0B0E14] p-5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 group hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                           <div className="w-10 h-10 bg-[#151921] rounded-xl flex items-center justify-center font-black text-xs text-slate-600 border border-slate-800">
                             #{history.length - i}
                           </div>
                           <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight">vs {teams.find(t => t.id === h.oppositionId)?.name || 'Unknown Unit'}</p>
                              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{new Date(h.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                        
                        <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/50 pt-4 sm:pt-0">
                           <div className="text-center">
                              <p className="text-[8px] text-slate-600 font-black uppercase mb-1">Batting</p>
                              <p className="text-sm font-black text-slate-200">{h.batting.runs}<span className="text-slate-600 font-medium">({h.batting.balls})</span>{h.batting.isOut ? '' : '*'}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[8px] text-slate-600 font-black uppercase mb-1">Bowling</p>
                              <p className="text-sm font-black text-slate-200">{h.bowling.wickets}<span className="text-slate-600 font-medium">/{h.bowling.runs}</span></p>
                           </div>
                           <div className="p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                              <Target size={14} className="text-yellow-500" />
                           </div>
                        </div>
                      </div>
                    ))}

                    {history.length === 0 && !isLoadingHistory && (
                      <div className="py-20 text-center opacity-30 italic text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                        No operational history available for this unit.
                      </div>
                    )}

                    {isLoadingHistory && (
                      <div className="py-20 flex justify-center">
                        <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
