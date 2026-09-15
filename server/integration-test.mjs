import Database from 'better-sqlite3';

const base = 'http://127.0.0.1:3210/api';
const json = (value) => JSON.stringify(value);
const signIn = await fetch(`${base}/auth/sign-in`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ email: 'admin@ligadokapsy.cz', password: 'password' }) });
if (!signIn.ok) throw new Error('Seeded admin sign-in failed');
const { token } = await signIn.json();
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const userSignIn = await fetch(`${base}/auth/sign-in`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ email: 'user@ligadokapsy.cz', password: 'password' }) });
if (!userSignIn.ok) throw new Error('Seeded user sign-in failed');
const { token: userToken } = await userSignIn.json();
const ownUpdate = await fetch(`${base}/users/user-demo`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: json({ displayName: 'Demo User' }) });
const adminUpdate = await fetch(`${base}/users/user-demo`, { method: 'PATCH', headers, body: json({ role: 'user' }) });
if (!ownUpdate.ok || !adminUpdate.ok) throw new Error(`Profile update authorization failed (self ${ownUpdate.status}, admin ${adminUpdate.status})`);

const temporaryTournament = await fetch(`${base}/tournaments`, { method: 'POST', headers, body: json({ name: 'Integration Cup', sport: 'football', location: 'Test Pitch', start_date: '2027-01-01', logo_url: null }) }).then((response) => response.json());
for (const teamId of ['team-lions', 'team-wolves', 'team-bears']) await fetch(`${base}/tournaments/${temporaryTournament.id}/teams`, { method: 'POST', headers, body: json({ teamId }) });
const generated = await fetch(`${base}/tournaments/${temporaryTournament.id}/generate-schedule`, { method: 'POST', headers, body: json({}) }).then((response) => response.json());
const generatedMatches = await fetch(`${base}/matches?tournamentId=${temporaryTournament.id}`).then((response) => response.json());
const firstMatch = generatedMatches[0];
const scoreUpdate = await fetch(`${base}/matches/${firstMatch.id}`, { method: 'PATCH', headers, body: json({ status: 'live', home_score: 2, away_score: 1 }) });
const matchDelete = await fetch(`${base}/matches/${firstMatch.id}`, { method: 'DELETE', headers });
const tournamentDelete = await fetch(`${base}/tournaments/${temporaryTournament.id}`, { method: 'DELETE', headers });
if (generated.created !== 3 || generatedMatches.length !== 3 || !scoreUpdate.ok || !matchDelete.ok || !tournamentDelete.ok) throw new Error('Match CRUD or round-robin integration failed');
const temporaryUser = await fetch(`${base}/auth/sign-up`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ displayName: 'Delete Test', email: `delete-${Date.now()}@test.local`, password: 'password' }) }).then((response) => response.json());
const userDelete = await fetch(`${base}/users/${temporaryUser.profile.id}`, { method: 'DELETE', headers });
if (!userDelete.ok) throw new Error('Hard delete user failed');
const temporaryTeam = await fetch(`${base}/teams`, { method: 'POST', headers, body: json({ name: 'Delete Team', short_name: 'DEL', primary_sport: 'football', color: '#10B981', logo_url: null }) }).then((response) => response.json());
const teamDelete = await fetch(`${base}/teams/${temporaryTeam.id}`, { method: 'DELETE', headers });
if (!teamDelete.ok) throw new Error('Hard delete team failed');

const scorekeeperMatch = (await fetch(`${base}/matches?tournamentId=tournament-spring`).then((response) => response.json()))[0];
const accessResponse = await fetch(`${base}/matches/${scorekeeperMatch.id}/access`, { method: 'POST', headers });
if (!accessResponse.ok) throw new Error(`Access generation failed (${accessResponse.status})`);
const access = await accessResponse.json();
const accessCheck = await fetch(`${base}/scorekeeper/access`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ secret: access.pin }) });
const scoreEvent = await fetch(`${base}/scorekeeper/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ secret: access.pin, event_type: 'score', team_id: 'team-lions', player_name: 'Integration Player' }) });
const undoEvent = await fetch(`${base}/scorekeeper/undo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json({ secret: access.pin }) });
const sports = await fetch(`${base}/sports`).then((response) => response.json());
if (!accessCheck.ok || !scoreEvent.ok || !undoEvent.ok || sports.length < 5) throw new Error(`Sports or scorekeeper integration failed (${accessCheck.status}, ${scoreEvent.status}, ${undoEvent.status}, ${sports.length})`);
const [users, teams, tournaments, assigned, matches, metrics] = await Promise.all([
  fetch(`${base}/users`, { headers }).then((response) => response.json()),
  fetch(`${base}/teams`).then((response) => response.json()),
  fetch(`${base}/tournaments`).then((response) => response.json()),
  fetch(`${base}/tournaments/tournament-spring/teams`).then((response) => response.json()),
  fetch(`${base}/matches`).then((response) => response.json()),
  fetch(`${base}/admin/metrics`, { headers }).then((response) => response.json()),
]);
const db = new Database('data/database.sqlite', { readonly: true });
const foreignKeys = db.pragma('foreign_keys', { simple: true });
const migrations = db.prepare('SELECT count(*) AS count FROM schema_migrations').get().count;
db.close();
if (users.length < 2 || teams.length < 4 || tournaments.length < 2 || assigned.length < 2 || matches.length < 1 || metrics.databaseBytes < 1 || foreignKeys !== 1 || migrations < 4) throw new Error('SQLite integration assertions failed');
console.log(`SQLite verified: ${users.length} users, ${teams.length} teams, ${tournaments.length} tournaments, ${matches.length} matches, round-robin generated ${generated.created}, foreign keys enabled, ${migrations} migrations applied.`);
