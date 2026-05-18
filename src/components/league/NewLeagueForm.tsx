import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Settings, 
  Calendar, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Target,
  Search
} from 'lucide-react';
import { League, LeagueType, MatchRules, Team, Player } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { generateRoundRobinFixtures } from '../../lib/FixtureGenerator';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_RULES: MatchRules = {
  overCount: 20,
  pointsForWin: 2,
  pointsForTie: 1,
  pointsForNR: 1,
  homeAway: false
};

const LEAGUE_TYPES: { value: LeagueType; label: string; description: string }[] = [
  { value: 'Round Robin', label: 'Round Robin', description: 'Every team plays every other team.' },
  { value: 'Knockout', label: 'Knockout', description: 'Single elimination tournament.' },
  { value: 'Group Stage + Knockout', label: 'Championship', description: 'Groups followed by elimination bracket.' },
  { value: 'Custom', label: 'Custom', description: 'Define your own fixture rules.' }
];

interface NewLeagueFormProps {
  onComplete: (leagueId: string) => void;
  onCancel: () => void;
}

export default function NewLeagueForm({ onComplete, onCancel }: NewLeagueFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State for league
  const [name, setName] = useState('');
  const [type, setType] = useState<LeagueType>('Round Robin');
  const [seasonName, setSeasonName] = useState(`Season ${new Date().getFullYear()}`);
  const [rules, setRules] = useState<MatchRules>(DEFAULT_RULES);
  
  // State for teams
  const [teams, setTeams] = useState<{ name: string; color: string; globalId?: string }[]>([
    { name: 'Titans XI', color: '#3b82f6' },
    { name: 'Warriors XI', color: '#ef4444' },
    { name: 'Kings XI', color: '#eab308' },
    { name: 'Royals XI', color: '#a855f7' }
  ]);

  const [globalTeams, setGlobalTeams] = useState<Team[]>([]);
  const [showGlobalSelector, setShowGlobalSelector] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchGlobalTeams = async () => {
        try {
          const q = query(collection(db, 'teams'));
          const snap = await getDocs(q);
          setGlobalTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
        } catch (err) {
          console.error("Error fetching global teams:", err);
        }
      };
      fetchGlobalTeams();
    }
  }, [user]);

  const addTeam = () => {
    setTeams([...teams, { name: `Team ${teams.length + 1}`, color: '#94a3b8' }]);
  };

  const importGlobalTeam = (team: Team) => {
    if (teams.find(t => t.globalId === team.id)) return;
    setTeams([...teams, { name: team.name, color: team.color, globalId: team.id }]);
    setShowGlobalSelector(false);
  };

  const removeTeam = (index: number) => {
    if (teams.length > 2) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  const updateTeam = (index: number, updates: Partial<{ name: string; color: string }>) => {
    const newTeams = [...teams];
    newTeams[index] = { ...newTeams[index], ...updates };
    setTeams(newTeams);
  };

  const handleSubmit = async () => {
    if (!user || loading) return;
    setLoading(true);
    
    try {
      const batch = writeBatch(db);
      
      // 1. Create League Doc
      const leagueRef = await addDoc(collection(db, 'leagues'), {
        name,
        type,
        teamCount: teams.length,
        rules,
        seasonName,
        status: 'active',
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'leagues'));

      if (!leagueRef) return;

      // 2. Add Teams
      const createdTeamIds: string[] = [];
      for (const teamData of teams) {
        const teamRef = doc(collection(db, `leagues/${leagueRef.id}/teams`));
        batch.set(teamRef, {
          name: teamData.name,
          color: teamData.color,
          matches: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          noResult: 0,
          points: 0,
          nrr: 0,
          createdAt: serverTimestamp()
        });

        // Copy squad if globalId exists
        if (teamData.globalId) {
          const squadSnap = await getDocs(collection(db, `teams/${teamData.globalId}/squad`));
          for (const playerDoc of squadSnap.docs) {
            const playerRef = doc(collection(db, `leagues/${leagueRef.id}/teams/${teamRef.id}/squad`));
            batch.set(playerRef, {
              ...playerDoc.data(),
              runs: 0,
              wickets: 0,
              mvpPoints: 0,
              "careerStats.matches": 0,
              "careerStats.innings": 0,
              "careerStats.runs": 0,
              "careerStats.balls": 0,
              "careerStats.wickets": 0,
              "careerStats.overs": 0,
              "careerStats.runsConceded": 0,
              "careerStats.thirties": 0,
              "careerStats.fifties": 0,
              "careerStats.hundreds": 0,
              "careerStats.threeWicketHauls": 0,
              "careerStats.fiveWicketHauls": 0,
            });
          }
        }
        
        createdTeamIds.push(teamRef.id);
      }

      // 3. Generate Fixtures
      let fixtures: any[] = [];
      if (type === 'Round Robin') {
        fixtures = generateRoundRobinFixtures(createdTeamIds, rules.homeAway);
      }

      for (const fixture of fixtures) {
        const matchRef = doc(collection(db, `leagues/${leagueRef.id}/matches`));
        batch.set(matchRef, {
          ...fixture,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, `leagues/${leagueRef.id}`));
      onComplete(leagueRef.id);
    } catch (error) {
      console.error('Error creating league:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-2">
           <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/20 rotate-3">
              <Trophy className="text-black w-6 h-6" />
           </div>
           <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">LEAGUE <span className="text-yellow-500">FORGE</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Deployment Phase {step} of 3</p>
           </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-8">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-yellow-500' : 'bg-slate-800'}`} />
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">League Designation</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Continental Premier Series"
                      className="w-full bg-[#11151D] border border-slate-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-4 block">Execution Format</label>
                    <div className="grid grid-cols-1 gap-3">
                      {LEAGUE_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setType(t.value)}
                          className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${type === t.value ? 'bg-yellow-500/10 border-yellow-500' : 'bg-[#11151D] border-slate-800 hover:border-slate-700'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${type === t.value ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'}`}>
                             {t.value === 'Round Robin' && <Zap size={20} />}
                             {t.value === 'Knockout' && <Shield size={20} />}
                             {t.value === 'Group Stage + Knockout' && <Trophy size={20} />}
                             {t.value === 'Custom' && <Settings size={20} />}
                          </div>
                          <div>
                            <p className={`text-sm font-black uppercase tracking-tight ${type === t.value ? 'text-yellow-500' : 'text-slate-200'}`}>{t.label}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{t.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
               </div>
               
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Season Namespace</label>
                    <input 
                      type="text"
                      value={seasonName}
                      onChange={(e) => setSeasonName(e.target.value)}
                      className="w-full bg-[#11151D] border border-slate-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                  </div>
                  
                  <div className="bg-[#11151D] rounded-3xl border border-slate-800 p-6 space-y-6">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <Settings className="w-4 h-4 text-yellow-500" />
                       Battle Rules
                    </h3>
                    
                    <div className="space-y-4">
                       <div>
                          <div className="flex justify-between items-center mb-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overs Per Inning</label>
                             <span className="text-xs font-black text-yellow-500">{rules.overCount}</span>
                          </div>
                          <input 
                             type="range" min="1" max="50" step="1"
                             value={rules.overCount}
                             onChange={(e) => setRules({...rules, overCount: parseInt(e.target.value)})}
                             className="w-full accent-yellow-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                          />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Win Points</label>
                            <input 
                              type="number"
                              value={rules.pointsForWin}
                              onChange={(e) => setRules({...rules, pointsForWin: parseInt(e.target.value)})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Draw Points</label>
                            <input 
                              type="number"
                              value={rules.pointsForTie}
                              onChange={(e) => setRules({...rules, pointsForTie: parseInt(e.target.value)})}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold"
                            />
                          </div>
                       </div>

                       <label className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={rules.homeAway}
                            onChange={(e) => setRules({...rules, homeAway: e.target.checked})}
                            className="w-5 h-5 rounded-lg border-slate-800 bg-slate-900 text-yellow-500 focus:ring-yellow-500"
                          />
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Home / Away Protocol</p>
                            <p className="text-[9px] text-slate-600 font-bold">Teams play each other twice (Double Round Robin)</p>
                          </div>
                       </label>
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
               <button onClick={onCancel} className="px-8 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-300">Abort</button>
               <button 
                  onClick={() => setStep(2)}
                  disabled={!name}
                  className="px-10 py-4 bg-yellow-500 disabled:opacity-50 text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 flex items-center gap-2 group"
               >
                  Next Phase
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                   <Users className="text-yellow-500" />
                   Team Deployment
                   <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black ml-2">{teams.length} Roster</span>
                 </h2>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setShowGlobalSelector(true)}
                      className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                    >
                       <Search size={14} /> Import Global
                    </button>
                    <button 
                      onClick={addTeam}
                      className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all"
                    >
                       <Plus size={14} /> New Division
                    </button>
                 </div>
              </div>

              {showGlobalSelector && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mb-8"
                >
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Global Blueprint</h3>
                      <button onClick={() => setShowGlobalSelector(false)} className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest">Close</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {globalTeams.map(gt => {
                        const isAdded = teams.some(t => t.globalId === gt.id);
                        return (
                          <button
                            key={gt.id}
                            disabled={isAdded}
                            onClick={() => importGlobalTeam(gt)}
                            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isAdded ? 'bg-slate-800/20 border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-900 border-slate-800 hover:border-yellow-500/50 text-white'}`}
                          >
                             <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black" style={{ backgroundColor: gt.color }}>
                                {gt.name[0]}
                             </div>
                             <span className="text-[10px] font-black truncate uppercase">{gt.name}</span>
                          </button>
                        );
                      })}
                      {globalTeams.length === 0 && (
                        <p className="col-span-full py-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">No global blueprints detected</p>
                      )}
                   </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team, index) => (
                  <motion.div 
                    layout
                    key={index}
                    className={`bg-[#11151D] border p-4 rounded-3xl flex items-center gap-4 group transition-all shadow-lg ${team.globalId ? 'border-emerald-500/30' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="relative group/color">
                       <div 
                         className="w-12 h-12 rounded-2xl shadow-inner flex items-center justify-center text-white font-black text-xs"
                         style={{ backgroundColor: team.color }}
                       >
                         {team.name ? team.name[0] : '?'}
                       </div>
                       {!team.globalId && (
                         <input 
                           type="color"
                           value={team.color}
                           onChange={(e) => updateTeam(index, { color: e.target.value })}
                           className="absolute inset-0 opacity-0 cursor-pointer"
                         />
                       )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={team.name}
                          readOnly={!!team.globalId}
                          onChange={(e) => updateTeam(index, { name: e.target.value })}
                          className={`w-full bg-transparent text-sm font-bold text-white focus:outline-none ${!team.globalId && 'focus:border-b border-yellow-500/50'}`}
                          placeholder="Division Name"
                        />
                        {team.globalId && <Shield size={12} className="text-emerald-500" />}
                      </div>
                      {team.globalId && <p className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest mt-1">Imported blueprint</p>}
                    </div>
                    <button 
                      onClick={() => removeTeam(index)}
                      className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-6">
               <button 
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 group"
               >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Previous Phase
               </button>
               <button 
                  onClick={() => setStep(3)}
                  className="px-10 py-4 bg-yellow-500 text-black rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 flex items-center gap-2 group"
               >
                  Next Phase
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
             <div className="bg-[#11151D] border border-slate-800 rounded-[2.5rem] p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-2xl shadow-emerald-500/10 rotate-12">
                   <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Initialize System?</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 font-bold leading-relaxed">
                   The league will be created with <span className="text-emerald-500">{teams.length} teams</span>. 
                   Fixture generation for <span className="text-emerald-500">{type}</span> will be automatic.
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                   <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-sm font-black text-white">{rules.overCount} Over</p>
                   </div>
                   <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mode</p>
                      <p className="text-sm font-black text-white truncate">{type}</p>
                   </div>
                   <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Teams</p>
                      <p className="text-sm font-black text-white">{teams.length}</p>
                   </div>
                </div>
             </div>

             <div className="flex justify-between pt-6">
                <button 
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 group"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Previous Phase
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-12 py-5 bg-emerald-500 disabled:opacity-50 text-black rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 flex items-center gap-3 group relative overflow-hidden"
                >
                   {loading ? (
                     <Zap className="w-5 h-5 animate-pulse" />
                   ) : (
                     <>
                        Launch League
                        <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                     </>
                   )}
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
