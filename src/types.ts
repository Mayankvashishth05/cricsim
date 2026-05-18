export type PlayerType = 'Batter' | 'Bowler' | 'All-rounder' | 'Wicketkeeper';

export interface PlayerStats {
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  wickets: number;
  overs: number;
  runsConceded: number;
  highestScore: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  threeWicketHauls: number;
  fiveWicketHauls: number;
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  runs: number;
  wickets: number;
  strikeRate: number;
  economy: number;
  mvpPoints: number;
  careerStats?: PlayerStats;
}

export interface PlayerMatchHistory {
  matchId: string;
  date: string;
  oppositionId: string;
  batting: {
    runs: number;
    balls: number;
    isOut: boolean;
  };
  bowling: {
    overs: number;
    runs: number;
    wickets: number;
  };
}

export interface Team {
  id: string;
  name: string;
  color: string;
  logoUrl?: string;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  noResult: number;
  points: number;
  nrr: number;
}

export interface CommentaryEntry {
  over: number;
  ball: number;
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isWicket: boolean;
  wicketType?: string;
  isExtra?: boolean;
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
  text: string;
}

export interface Inning {
  score: number;
  wickets: number;
  overs: number;
  battingStats: {
    playerId: string;
    runs: number;
    balls: number;
    isOut: boolean;
  }[];
  bowlingStats: {
    playerId: string;
    wickets: number;
    overs: number;
    runs: number;
  }[];
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  status: 'scheduled' | 'live' | 'completed' | 'abandoned';
  matchType: 'League' | 'Qualifier 1' | 'Eliminator' | 'Qualifier 2' | 'Semi-Final' | 'Final';
  phase?: 'league' | 'playoffs';
  result?: string;
  winnerId?: string;
  margin?: string;
  toss?: {
    winnerId: string;
    decision: 'bat' | 'bowl';
  };
  innings1?: Inning;
  innings2?: Inning;
  commentary?: CommentaryEntry[];
  mvpId?: string;
  mvpName?: string;
  createdAt?: any;
}

export interface Season {
  id: string;
  seasonNumber: number;
  winnerId: string;
  winnerName: string;
  runnerUpId: string;
  runnerUpName: string;
  mvpId: string;
  mvpName: string;
  orangeCapName: string;
  purpleCapName: string;
  createdAt: any;
  topTeams: { name: string; points: number; nrr: number }[];
}

export interface UserProfile {
  uid: string;
  username: string;
  avatarUrl: string;
  bio: string;
  createdAt: any;
  updatedAt: any;
}

export type LeagueType = 'Round Robin' | 'Knockout' | 'Group Stage + Knockout' | 'Custom';

export interface MatchRules {
  overCount: number;
  pointsForWin: number;
  pointsForTie: number;
  pointsForNR: number;
  homeAway: boolean;
}

export interface League {
  id: string;
  name: string;
  type: LeagueType;
  teamCount: number;
  rules: MatchRules;
  seasonName: string;
  status: 'active' | 'completed' | 'archived';
  phase: 'league' | 'playoffs';
  winnerTeamId?: string;
  winnerTeamName?: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Tournament {
  id: string;
  userId: string;
  name: string;
  status: 'league' | 'playoffs' | 'finished';
  createdAt: string;
}
