import { Match, Inning, Team, Player, CommentaryEntry } from '../types';

export function simulateMatch(team1: Team, team2: Team, squad1: Player[], squad2: Player[]): Partial<Match> {
  const tossWinner = Math.random() > 0.5 ? team1 : team2;
  const decision = Math.random() > 0.5 ? 'bat' as const : 'bowl' as const;

  const battingFirst = (tossWinner === team1 && decision === 'bat') || (tossWinner === team2 && decision === 'bowl') ? team1 : team2;
  const bowlingFirst = battingFirst === team1 ? team2 : team1;

  const squadBattingFirst = battingFirst === team1 ? squad1 : squad2;
  const squadBowlingFirst = bowlingFirst === team1 ? squad1 : squad2;

  const allCommentary: CommentaryEntry[] = [];

  const simulateInning = (
    batters: Player[], 
    bowlers: Player[], 
    target?: number
  ): Inning => {
    let score = 0;
    let wickets = 0;
    let totalBalls = 0;
    
    const battingStats = batters.map(p => ({
      playerId: p.id,
      runs: 0,
      balls: 0,
      isOut: false
    }));

    const bowlingStats = bowlers.map(p => ({
      playerId: p.id,
      wickets: 0,
      overs: 0,
      runs: 0
    }));

    let currentBatters = [0, 1]; // Indices in battingStats
    let strikerIdx = 0; // Which one is on strike (0 or 1)

    // Simulate 20 overs (120 balls)
    for (let over = 0; over < 20; over++) {
      if (wickets >= 10) break;
      if (target !== undefined && score > target) break;

      const currentBowlerIdx = over % 5; // Simple rotation
      const bowler = bowlers[currentBowlerIdx];

      for (let ball = 1; ball <= 6; ball++) {
        if (wickets >= 10) break;
        if (target !== undefined && score > target) break;

        totalBalls++;
        const striker = batters[currentBatters[strikerIdx]];
        const ballResult = Math.random();
        
        let runs = 0;
        let isWicket = false;
        let wicketType = "";
        let text = "";

        if (ballResult < 0.05) {
          isWicket = true;
          wickets++;
          battingStats[currentBatters[strikerIdx]].isOut = true;
          wicketType = Math.random() > 0.3 ? "caught" : "bowled";
          text = `${bowler.name} to ${striker.name}: OUT! ${striker.name} ${wicketType === 'caught' ? 'is caught in the deep' : 'is clean bowled'}.`;
          
          if (wickets < 10) {
            currentBatters[strikerIdx] = wickets + 1; // Nest batter in
          }
        } else if (ballResult < 0.4) {
          runs = 0;
          text = `${bowler.name} to ${striker.name}: No run. Solid defensive shot.`;
        } else if (ballResult < 0.7) {
          runs = 1;
          text = `${bowler.name} to ${striker.name}: 1 run, tucked away to the leg side.`;
        } else if (ballResult < 0.85) {
          runs = 2;
          text = `${bowler.name} to ${striker.name}: 2 runs, great running between the wickets.`;
        } else if (ballResult < 0.95) {
          runs = 4;
          text = `${bowler.name} to ${striker.name}: FOUR! Beautifully timed through the covers.`;
        } else {
          runs = 6;
          text = `${bowler.name} to ${striker.name}: SIX! That is huge, right into the stands.`;
        }

        score += runs;
        battingStats[currentBatters[strikerIdx]].runs += runs;
        battingStats[currentBatters[strikerIdx]].balls += 1;
        
        bowlingStats[currentBowlerIdx].runs += runs;
        if (isWicket) bowlingStats[currentBowlerIdx].wickets += 1;

        allCommentary.push({
          over: over + 1,
          ball,
          batsmanId: striker.id,
          bowlerId: bowler.id,
          runs,
          isWicket,
          wicketType,
          text
        });

        // Change strike on odd runs
        if (runs % 2 !== 0 && !isWicket) {
          strikerIdx = 1 - strikerIdx;
        }
      }
      
      // End of over: bowling stats update
      bowlingStats[currentBowlerIdx].overs += 1;
      // Change strike at end of over
      strikerIdx = 1 - strikerIdx;
    }

    return {
      score,
      wickets,
      overs: parseFloat(`${Math.floor(totalBalls / 6)}.${totalBalls % 6}`),
      battingStats: battingStats.filter(s => s.balls > 0),
      bowlingStats: bowlingStats.filter(s => s.overs > 0 || s.runs > 0)
    };
  };

  const innings1 = simulateInning(squadBattingFirst, squadBowlingFirst);
  const innings2 = simulateInning(squadBowlingFirst, squadBattingFirst, innings1.score);

  let winnerId = '';
  let margin = '';

  if (innings1.score > innings2.score) {
    winnerId = battingFirst.id;
    margin = `${battingFirst.name} won by ${innings1.score - innings2.score} runs`;
  } else if (innings2.score > innings1.score) {
    winnerId = bowlingFirst.id;
    margin = `${bowlingFirst.name} won by ${10 - innings2.wickets} wickets`;
  } else {
    margin = 'Match Tied';
  }

  // Calculate MVP based on batting + bowling
  const getMVP = () => {
    let bestScore = -1;
    let mvpId = '';
    let mvpName = '';
    
    [...innings1.battingStats, ...innings2.battingStats].forEach(s => {
      const score = s.runs * 1 + (s.isOut ? 0 : 10);
      if (score > bestScore) {
        bestScore = score;
        mvpId = s.playerId;
        mvpName = [...squad1, ...squad2].find(p => p.id === s.playerId)?.name || 'Unknown';
      }
    });

    [...innings1.bowlingStats, ...innings2.bowlingStats].forEach(s => {
      const score = s.wickets * 20 - s.runs * 0.5;
      if (score > bestScore) {
        bestScore = score;
        mvpId = s.playerId;
        mvpName = [...squad1, ...squad2].find(p => p.id === s.playerId)?.name || 'Unknown';
      }
    });

    return { mvpId, mvpName };
  };

  const { mvpId, mvpName } = getMVP();

  return {
    status: 'completed',
    toss: {
      winnerId: tossWinner.id,
      decision
    },
    innings1,
    innings2,
    commentary: allCommentary,
    winnerId,
    margin,
    mvpId,
    mvpName
  };
}

export function calculateNRR(team: Team, teamScore: number, teamOvers: number, oppScore: number, oppOvers: number) {
  const matchNRR = (teamScore / 20) - (oppScore / 20);
  return (team.nrr * team.matches + matchNRR) / (team.matches + 1);
}
