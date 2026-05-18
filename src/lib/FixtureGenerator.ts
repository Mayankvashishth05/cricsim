import { Match } from '../types';

export function generateRoundRobinFixtures(teamIds: string[], homeAway: boolean = false): Partial<Match>[] {
  const fixtures: Partial<Match>[] = [];
  const n = teamIds.length;
  
  // If odd number of teams, add a dummy team for "bye"
  const teams = [...teamIds];
  if (n % 2 !== 0) {
    teams.push('BYE');
  }
  
  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;
  
  const leagueTeams = [...teams];
  
  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const team1 = leagueTeams[i];
      const team2 = leagueTeams[numTeams - 1 - i];
      
      if (team1 !== 'BYE' && team2 !== 'BYE') {
        fixtures.push({
          team1Id: team1,
          team2Id: team2,
          status: 'scheduled',
          matchType: 'League'
        });
      }
    }
    
    // Rotate teams
    leagueTeams.splice(1, 0, leagueTeams.pop()!);
  }
  
  if (homeAway) {
    const reverseFixtures = fixtures.map(f => ({
      ...f,
      team1Id: f.team2Id,
      team2Id: f.team1Id
    }));
    return [...fixtures, ...reverseFixtures];
  }
  
  return fixtures;
}

export function generateKnockoutFixtures(teamIds: string[]): Partial<Match>[] {
  // Simple knockout: logic depends on number of teams
  // For now, let's just pair up for a single round of eliminations
  const fixtures: Partial<Match>[] = [];
  for (let i = 0; i < teamIds.length; i += 2) {
    if (i + 1 < teamIds.length) {
      fixtures.push({
        team1Id: teamIds[i],
        team2Id: teamIds[i+1],
        status: 'scheduled',
        matchType: 'Eliminator'
      });
    }
  }
  return fixtures;
}
