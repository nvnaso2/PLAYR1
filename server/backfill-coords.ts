import { db } from "./db";
import { teamClubs, leagues, trainerProfiles, userProfiles } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { cityStateToCoords, zipToCoords } from "./geo";

async function backfillCoordinates() {
  console.log("Backfilling coordinates...");

  const teams = await db.select().from(teamClubs).where(isNull(teamClubs.latitude));
  let teamCount = 0;
  for (const team of teams) {
    if (team.city && team.state) {
      const coords = cityStateToCoords(team.city, team.state);
      if (coords) {
        await db.update(teamClubs).set({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).where(eq(teamClubs.id, team.id));
        teamCount++;
      }
    }
  }
  console.log(`Updated ${teamCount} teams with coordinates`);

  const leagueList = await db.select().from(leagues).where(isNull(leagues.latitude));
  let leagueCount = 0;
  for (const league of leagueList) {
    if (league.city && league.state) {
      const coords = cityStateToCoords(league.city, league.state);
      if (coords) {
        await db.update(leagues).set({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).where(eq(leagues.id, league.id));
        leagueCount++;
      }
    }
  }
  console.log(`Updated ${leagueCount} leagues with coordinates`);

  const trainers = await db.select().from(trainerProfiles).where(isNull(trainerProfiles.latitude));
  let trainerCount = 0;
  for (const trainer of trainers) {
    if (trainer.city && trainer.state) {
      const coords = cityStateToCoords(trainer.city, trainer.state);
      if (coords) {
        await db.update(trainerProfiles).set({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).where(eq(trainerProfiles.id, trainer.id));
        trainerCount++;
      }
    }
  }
  console.log(`Updated ${trainerCount} trainer profiles with coordinates`);

  const profiles = await db.select().from(userProfiles).where(isNull(userProfiles.latitude));
  let profileCount = 0;
  for (const profile of profiles) {
    if (profile.zipCode) {
      const coords = zipToCoords(profile.zipCode);
      if (coords) {
        await db.update(userProfiles).set({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).where(eq(userProfiles.id, profile.id));
        profileCount++;
      }
    }
  }
  console.log(`Updated ${profileCount} user profiles with coordinates`);

  console.log("Backfill complete!");
  process.exit(0);
}

backfillCoordinates().catch(console.error);
