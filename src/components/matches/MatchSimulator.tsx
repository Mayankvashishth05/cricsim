import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc,
  query,
  where,
  getDocs,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Team, Player, Match, CommentaryEntry, League } from '../../types';
import { Play, RotateCcw, Target, Trophy, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { simulateMatch, calculateNRR } from '../../services/simulation';

interface MatchSimulatorProps {
  onClose?: () => void;
  matchId?: string;
  leagueId?: string;
}

export default function MatchSimulator({ onClose, matchId, leagueId }: MatchSimulatorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<Partial<Match> | null>(null);
  const [leagueRules, setLeagueRules] = useState<{ overCount: number; pointsForWin: number } | null>(null);
  const [category, setCategory] = useState<'League' | 'Playoffs'>('League');

  useEffect(() => {
    if (leagueId) {
      onSnapshot(doc(db, 'leagues', leagueId), (d) => {
        const data = d.data() as League;
        if (data?.rules) {
          setLeagueRules({
            overCount: data.rules.overCount,
            pointsForWin: data.rules.pointsForWin
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `leagues/${leagueId}`);
      });
    }
  }, [leagueId]);

  const rulesPointsWin = leagueRules?.pointsForWin || 2;
  const matchOvers = leagueRules?.overCount || 20;

  useEffect(() => {
    const teamsPath = leagueId ? `leagues/${leagueId}/teams` : 'teams';
    const matchesPath = leagueId ? `leagues/${leagueId}/matches` : 'matches';

    const unsubTeams = onSnapshot(collection(db, teamsPath), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, teamsPath);
    });
    const unsubMatches = onSnapshot(
      query(collection(db, matchesPath), where('status', '==', 'scheduled')),
      (snap) => {
        setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, matchesPath);
      }
    );
    return () => { unsubTeams(); unsubMatches(); };
  }, [leagueId]);

  const filteredMatches = matches.filter(m => 
    category === 'League' ? m.matchType === 'League' : m.matchType !== 'League'
  );

  const [liveCommentary, setLiveCommentary] = useState<CommentaryEntry[]>([]);
  const [currentBallIdx, setCurrentBallIdx] = useState(-1);

  const handleSimulate = async () => {
    const idToUse = selectedMatchId || matchId;
    const match = matches.find(m => m.id === idToUse);
    if (!match) return;

    setIsSimulating(true);
    setLiveCommentary([]);
    setCurrentBallIdx(-1);

    try {
      // 1. Fetch squads
      const squadPath1 = leagueId ? `leagues/${leagueId}/teams/${match.team1Id}/squad` : `teams/${match.team1Id}/squad`;
      const squadPath2 = leagueId ? `leagues/${leagueId}/teams/${match.team2Id}/squad` : `teams/${match.team2Id}/squad`;

      const squad1Snap = await getDocs(collection(db, squadPath1)).catch(e => handleFirestoreError(e, OperationType.GET, squadPath1));
      const squad2Snap = await getDocs(collection(db, squadPath2)).catch(e => handleFirestoreError(e, OperationType.GET, squadPath2));

      if (!squad1Snap || !squad2Snap) return;
      
      const squad1 = squad1Snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      const squad2 = squad2Snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));

      if (squad1.length < 11 || squad2.length < 11) {
        alert("Each team must have at least 11 players to simulate.");
        setIsSimulating(false);
        return;
      }

      const team1 = teams.find(t => t.id === match.team1Id)!;
      const team2 = teams.find(t => t.id === match.team2Id)!;

      // Check for playoff placeholders before transaction
      let q2PlaceholderId = null;
      let finalPlaceholderId = null;
      if (leagueId && match.phase === 'playoffs') {
         const matchesRef = collection(db, `leagues/${leagueId}/matches`);
         if (match.matchType === 'Eliminator') {
            const q2Snap = await getDocs(query(matchesRef, where('matchType', '==', 'Qualifier 2'), where('status', '==', 'scheduled')));
            if (!q2Snap.empty) q2PlaceholderId = q2Snap.docs[0].id;
         } else if (match.matchType === 'Qualifier 2') {
            const finalSnap = await getDocs(query(matchesRef, where('matchType', '==', 'Final'), where('status', '==', 'scheduled')));
            if (!finalSnap.empty) finalPlaceholderId = finalSnap.docs[0].id;
         }
      }

      // 2. Run simulation
      const result = simulateMatch(team1, team2, squad1, squad2);
      
      // Real-time commentary emulation
      if (result.commentary) {
        for (let i = 0; i < result.commentary.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per ball for simulation feel
          setCurrentBallIdx(i);
          setLiveCommentary(prev => [result.commentary![i], ...prev.slice(0, 19)]); // Keep last 20
        }
      }

      setSimulationResult(result);

      // 3. Update Database (Atomic Transaction)
      await runTransaction(db, async (transaction) => {
        // Update Match
        const matchRef = doc(db, leagueId ? `leagues/${leagueId}/matches` : 'matches', match.id);
        transaction.update(matchRef, { ...result, status: 'completed' });

        // Update Teams
        const t1Ref = doc(db, leagueId ? `leagues/${leagueId}/teams` : 'teams', team1.id);
        const t2Ref = doc(db, leagueId ? `leagues/${leagueId}/teams` : 'teams', team2.id);

        const winnerId = result.winnerId;
        const score1 = result.innings1!.score;
        const score2 = result.innings2!.score;

        if (match.matchType === 'League') {
          const nrr1 = calculateNRR(team1, score1, matchOvers, score2, matchOvers);
          const nrr2 = calculateNRR(team2, score2, matchOvers, score1, matchOvers);

          transaction.update(t1Ref, {
            matches: increment(1),
            wins: winnerId === team1.id ? increment(1) : increment(0),
            losses: winnerId === team2.id ? increment(1) : increment(0),
            points: winnerId === team1.id ? increment(rulesPointsWin) : increment(0),
            nrr: nrr1
          });

          transaction.update(t2Ref, {
            matches: increment(1),
            wins: winnerId === team2.id ? increment(1) : increment(0),
            losses: winnerId === team1.id ? increment(1) : increment(0),
            points: winnerId === team2.id ? increment(rulesPointsWin) : increment(0),
            nrr: nrr2
          });
        }

        // Playoff progression
        if (leagueId && match.phase === 'playoffs') {
          const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;
          const matchesRef = collection(db, `leagues/${leagueId}/matches`);

          if (match.matchType === 'Qualifier 1') {
            // Next: Final and Q2 placeholders
            const finalRef = doc(matchesRef);
            transaction.set(finalRef, {
              team1Id: winnerId,
              team2Id: 'TBD',
              status: 'scheduled',
              matchType: 'Final',
              phase: 'playoffs',
              createdAt: new Date()
            });

            const q2Ref = doc(matchesRef);
            transaction.set(q2Ref, {
              team1Id: loserId,
              team2Id: 'TBD',
              status: 'scheduled',
              matchType: 'Qualifier 2',
              phase: 'playoffs',
              createdAt: new Date()
            });
          } else if (match.matchType === 'Eliminator' && q2PlaceholderId) {
             const q2Ref = doc(db, `leagues/${leagueId}/matches`, q2PlaceholderId);
             transaction.update(q2Ref, { team2Id: winnerId });
          } else if (match.matchType === 'Qualifier 2' && finalPlaceholderId) {
             const finalRef = doc(db, `leagues/${leagueId}/matches`, finalPlaceholderId);
             transaction.update(finalRef, { team2Id: winnerId });
          }
        }

        // Update All Players Stats
        const battingFirstId = (result.toss!.winnerId === match.team1Id && result.toss!.decision === 'bat') || 
                              (result.toss!.winnerId === match.team2Id && result.toss!.decision === 'bowl') 
                              ? match.team1Id : match.team2Id;
        const bowlingFirstId = battingFirstId === match.team1Id ? match.team2Id : match.team1Id;
        const squadBattingFirst = battingFirstId === match.team1Id ? squad1 : squad2;
        const squadBowlingFirst = bowlingFirstId === match.team1Id ? squad1 : squad2;

        const allInningsStats = [
          { teamId: battingFirstId, inn: result.innings1!, squad: squadBattingFirst, oppId: bowlingFirstId },
          { teamId: bowlingFirstId, inn: result.innings2!, squad: squadBowlingFirst, oppId: battingFirstId }
        ];

        const squadPath = (tid: string) => leagueId ? `leagues/${leagueId}/teams/${tid}/squad` : `teams/${tid}/squad`;

        for (const { teamId, inn, squad, oppId } of allInningsStats) {
          // Batting Updates (Updates players in teamId's squad)
          for (const s of inn.battingStats) {
            const playerRef = doc(db, squadPath(teamId), s.playerId);
            const historyRef = doc(collection(db, `${squadPath(teamId)}/${s.playerId}/history`));
            
            // New history log (Batting side)
            transaction.set(historyRef, {
              matchId: match.id,
              date: new Date().toISOString(),
              oppositionId: oppId,
              batting: { runs: s.runs, balls: s.balls, isOut: s.isOut },
              bowling: inn.bowlingStats.find(b => b.playerId === s.playerId) || { overs: 0, runs: 0, wickets: 0 }
            });

            // Career stats increment
            transaction.update(playerRef, {
              runs: increment(s.runs),
              mvpPoints: increment(s.runs * 0.1 + (s.isOut ? 0 : 5)),
              "careerStats.matches": increment(1),
              "careerStats.innings": increment(1),
              "careerStats.runs": increment(s.runs),
              "careerStats.balls": increment(s.balls),
              "careerStats.thirties": increment(s.runs >= 30 && s.runs < 50 ? 1 : 0),
              "careerStats.fifties": increment(s.runs >= 50 && s.runs < 100 ? 1 : 0),
              "careerStats.hundreds": increment(s.runs >= 100 ? 1 : 0),
            });
          }

          // Bowling Updates (Updates players in oppId's squad)
          for (const s of inn.bowlingStats) {
            const playerRef = doc(db, squadPath(oppId), s.playerId);
            transaction.update(playerRef, {
              wickets: increment(s.wickets),
              mvpPoints: increment(s.wickets * 20),
              "careerStats.wickets": increment(s.wickets),
              "careerStats.overs": increment(s.overs),
              "careerStats.runsConceded": increment(s.runs),
              "careerStats.threeWicketHauls": increment(s.wickets >= 3 && s.wickets < 5 ? 1 : 0),
              "careerStats.fiveWicketHauls": increment(s.wickets >= 5 ? 1 : 0),
            });
          }
        }
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `leagues/${leagueId}/matches/${match.id}`));
    } catch (error) {
      console.error("Simulation failed", error);
      alert("Simulation failed. Check console for details.");
    } finally {
      setIsSimulating(false);
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  const content = (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selection Panel */}
        {!matchId && (
          <div className="space-y-6">
            <div className="bg-[#151921] p-8 rounded-2xl border border-slate-800/60 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
               <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                 <RotateCcw className="w-5 h-5 text-yellow-500" />
                 Select Fixture
               </h3>

               {/* Category Selection */}
               <div className="flex gap-2 mb-6">
                 <button 
                   onClick={() => { setCategory('League'); setSelectedMatchId(''); }}
                   className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     category === 'League' 
                     ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' 
                     : 'bg-slate-800/40 text-slate-500 border border-slate-800 hover:bg-slate-800'
                   }`}
                 >
                   League
                 </button>
                 <button 
                   onClick={() => { setCategory('Playoffs'); setSelectedMatchId(''); }}
                   className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     category === 'Playoffs' 
                     ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10' 
                     : 'bg-slate-800/40 text-slate-500 border border-slate-800 hover:bg-slate-800'
                   }`}
                 >
                   Playoffs
                 </button>
               </div>

               <div className="space-y-4">
                 <div className="relative group">
                   <select
                     value={selectedMatchId}
                     onChange={(e) => setSelectedMatchId(e.target.value)}
                     className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-yellow-500/30 transition-all appearance-none cursor-pointer"
                   >
                     <option value="" disabled className="text-slate-600">Choose a {category} match...</option>
                     {filteredMatches.map(match => {
                       const t1 = teams.find(t => t.id === match.team1Id);
                       const t2 = teams.find(t => t.id === match.team2Id);
                       return (
                         <option key={match.id} value={match.id} className="bg-[#151921]">
                           {match.matchType}: {t1?.name} vs {t2?.name}
                         </option>
                       );
                     })}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown size={18} />
                   </div>
                 </div>

                 {filteredMatches.length === 0 && (
                   <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                      <p className="text-[9px] items-center gap-2 font-black text-slate-600 uppercase tracking-widest leading-relaxed px-4">
                        No active {category.toLowerCase()} fixtures detected.<br/>Check the Fixtures portal to schedule.
                      </p>
                   </div>
                 )}
               </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={!selectedMatchId || isSimulating}
              className="w-full py-5 bg-gradient-to-tr from-yellow-500 to-orange-600 hover:brightness-110 disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 text-black font-black rounded-2xl transition-all shadow-xl shadow-orange-500/10 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm"
            >
              {isSimulating ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  Simulate Match
                </>
              )}
            </button>
          </div>
        )}

        {/* Live Preview / Result / Commentary */}
        <div className={`relative min-h-[440px] flex flex-col gap-6 ${matchId ? 'lg:col-span-2' : ''}`}>
           {matchId && !isSimulating && !simulationResult && (
             <div className="flex justify-center mb-6">
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="px-12 py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-2xl shadow-2xl shadow-yellow-500/20 flex items-center gap-3 uppercase tracking-widest"
                >
                  <Play size={20} fill="currentColor" />
                  Commence Play
                </button>
             </div>
           )}
           <AnimatePresence mode="wait">
              {selectedMatch && !simulationResult && (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`bg-[#151921] p-10 rounded-2xl border border-slate-800/60 flex-1 flex flex-col items-center justify-center text-center space-y-10 shadow-2xl relative ${isSimulating ? 'opacity-50' : ''}`}
                >
                  <div className="absolute top-6 left-6 flex items-center gap-2">
                     <div className={`w-2 h-2 bg-yellow-500 rounded-full ${isSimulating ? 'animate-ping' : 'animate-pulse'}`} />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                       {isSimulating ? 'Simulating Ball-by-Ball' : 'Awaiting Logic Input'}
                     </span>
                  </div>

                  <div className="flex items-center gap-12 sm:gap-20">
                    <div className="flex flex-col items-center gap-5">
                       <div className="w-24 h-24 rounded-[2rem] bg-[#0B0E14] border-4 border-slate-800/50 flex items-center justify-center text-4xl font-black text-white shadow-2xl group transition-all">
                         {teams.find(t => t.id === selectedMatch.team1Id)?.name[0]}
                       </div>
                       <span className="text-sm font-black text-slate-300 uppercase tracking-widest">{teams.find(t => t.id === selectedMatch.team1Id)?.name}</span>
                    </div>
                    <div className="text-5xl font-black text-rose-500/10 italic select-none">VS</div>
                    <div className="flex flex-col items-center gap-5">
                       <div className="w-24 h-24 rounded-[2rem] bg-[#0B0E14] border-4 border-slate-800/50 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                         {teams.find(t => t.id === selectedMatch.team2Id)?.name[0]}
                       </div>
                       <span className="text-sm font-black text-slate-300 uppercase tracking-widest">{teams.find(t => t.id === selectedMatch.team2Id)?.name}</span>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-500/5 px-6 py-2.5 rounded-full border border-yellow-500/10 inline-flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-[0.2em] shadow-inner">
                    <Info size={14} />
                    Circuitry Primed for Selection
                  </div>
                </motion.div>
              )}

              {isSimulating && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0B0E14] rounded-2xl border border-slate-800 p-6 shadow-2xl flex-1 flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                     <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Live Commentary Feed</h4>
                     <span className="text-[10px] font-black text-slate-600 uppercase">Real-time Simulation</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                     {liveCommentary.map((c, i) => (
                       <motion.div 
                         initial={{ x: -10, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         key={`${c.over}.${c.ball}-${i}`} 
                         className={`p-3 rounded-xl border border-slate-800/50 text-sm ${c.isWicket ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[#151921]'}`}
                       >
                          <div className="flex gap-3">
                             <span className="font-black text-slate-500 min-w-[30px]">{c.over}.{c.ball}</span>
                             <p className="text-slate-300 leading-relaxed">
                               {c.text}
                               {c.runs > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-black ${c.runs === 4 ? 'bg-blue-500/20 text-blue-400' : c.runs === 6 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400'}`}>{c.runs} Runs</span>}
                             </p>
                          </div>
                       </motion.div>
                     ))}
                     {liveCommentary.length === 0 && (
                       <div className="h-full flex items-center justify-center opacity-20 italic text-slate-500">
                         Initializing engine...
                       </div>
                     )}
                  </div>
                </motion.div>
              )}

              {simulationResult && !isSimulating && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#151921] p-10 rounded-3xl border border-yellow-500/20 h-full flex flex-col items-center relative overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.05)]"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
                  
                  <div className="relative mb-6">
                     <Trophy className="w-20 h-20 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
                     <motion.div 
                       initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}
                       className="absolute -top-2 -right-2 w-8 h-8 bg-orange-600 text-black flex items-center justify-center rounded-full font-black text-[10px]"
                     >
                        WIN
                     </motion.div>
                  </div>

                  <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">Match Concluded</h2>
                  <p className="text-yellow-500 font-black uppercase tracking-[0.3em] text-[10px] mb-10 text-center leading-relaxed max-w-[280px]">
                     {simulationResult.margin}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6 w-full max-w-sm mb-10">
                    <div className="bg-[#0B0E14] p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shadow-xl">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">T1 Score</p>
                       <p className="text-3xl font-black text-white">{simulationResult.innings1?.score}<span className="text-slate-600 text-sm ml-0.5">/{simulationResult.innings1?.wickets}</span></p>
                       <p className="text-[10px] font-bold text-slate-500 mt-2">{matchOvers}.0 OVS</p>
                    </div>
                    <div className="bg-[#0B0E14] p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shadow-xl">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">T2 Score</p>
                       <p className="text-3xl font-black text-white">{simulationResult.innings2?.score}<span className="text-slate-600 text-sm ml-0.5">/{simulationResult.innings2?.wickets}</span></p>
                       <p className="text-[10px] font-bold text-slate-500 mt-2">{matchOvers}.0 OVS</p>
                    </div>
                  </div>

                  <div className="w-full bg-[#1C222D]/50 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                           <Target className="w-4 h-4 text-yellow-500" />
                        </div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Player Of Match</span>
                     </div>
                     <span className="text-xs font-black text-white uppercase bg-slate-800 px-3 py-1.5 rounded-lg tracking-widest">
                        {simulationResult.mvpName || simulationResult.mvpId?.slice(0, 8)}
                     </span>
                  </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl bg-[#0B0E14] border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
         >
            <div className="p-6 border-b border-slate-800/60 flex items-center justify-between">
               <h3 className="text-xs font-black text-white uppercase tracking-widest">Manual Simulation Protocol</h3>
               <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
               </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
               {content}
            </div>
         </motion.div>
      </div>
    );
  }

  return content;
}

function X({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
