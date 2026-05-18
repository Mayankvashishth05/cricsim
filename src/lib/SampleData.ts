import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function seedSampleData() {
  const teamsCollection = collection(db, 'teams');
  const teamsSnap = await getDocs(teamsCollection);
  if (teamsSnap.size > 0) return; // Already seeded

  const sampleTeams = [
    { name: 'Mumbai Masters', color: '#0369a1' },
    { name: 'Chennai Kings', color: '#eab308' },
    { name: 'Bangalore Blasters', color: '#be123c' },
    { name: 'Delhi Dynamites', color: '#1d4ed8' },
  ];

  for (const team of sampleTeams) {
    const teamDoc = await addDoc(teamsCollection, {
      ...team,
      matches: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      noResult: 0,
      points: 0,
      nrr: 0
    });

    // Add 11 players for each team
    const playersCollection = collection(db, `teams/${teamDoc.id}/squad`);
    const players = [
      'Rohit Sharma', 'Virat Kohli', 'MS Dhoni', 'Hardik Pandya', 
      'Rishabh Pant', 'Jasprit Bumrah', 'Ravindra Jadeja', 'KL Rahul', 
      'Shikhar Dhawan', 'Mohammed Shami', 'Yuzvendra Chahal'
    ];

    for (const name of players) {
      await addDoc(playersCollection, {
        name,
        type: name.includes('Bumrah') || name.includes('Shami') || name.includes('Chahal') ? 'Bowler' : 'Batter',
        runs: 0,
        wickets: 0,
        strikeRate: 0,
        economy: 0,
        mvpPoints: 0
      });
    }
  }
}
