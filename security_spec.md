# Security Specification - CricSim Tournament Master

## Data Invariants
1. A Team must belong to an existing Tournament.
2. A Player must belong to an existing Team.
3. A Match must reference two existing Teams within the same Tournament.
4. Team statistics (wins, losses, points) must only be updated after a valid Match simulation.
5. Only the tournament creator (uid) can modify tournament structure (teams, fixtures).
6. Matches once completed are immutable (except by admin).

## The Dirty Dozen Payloads
1. **Unauth Create**: User tries to create a tournament without being signed in.
2. **Stats Spoof**: User tries to manually increment their team's points without a match.
3. **Invalid ID**: User tries to create a team with a 1MB string as ID.
4. **Player Hijack**: User authenticated as A tries to delete players from team B.
5. **State Skip**: Marking a match as 'completed' without any score data.
6. **Negative Runs**: Updating a player with -500 runs.
7. **Orphaned Team**: Creating a team with a non-existent tournament ID.
8. **NRR Poison**: Setting NRR to 999999.
9. **Duplicate Match**: Creating a match between the same team.
10. **Admin Claim**: Adding "isAdmin: true" to user profile (if profile exists).
11. **Future Match**: Updating a match with a timestamp from 2099.
12. **Cross-Tournament Match**: A match between Team A in Tourney 1 and Team B in Tourney 2.

## Test Runner (Draft)
```typescript
// firestore.rules.test.ts logic
// 1. Unauth tournament creation should fail
// 2. Auth user can create tournament
// 3. User can only edit their own tournament
// 4. Team stats update only on valid match completion batch (atomic)
```
