import { 
  drills, type Drill, type InsertDrill,
  trainingLogs, type TrainingLog, type InsertTrainingLog,
  userProfiles, type UserProfile, type InsertUserProfile,
  userVideos, type UserVideo, type InsertUserVideo,
  drillProgress, type DrillProgress, type InsertDrillProgress,
  benchmarks, type Benchmark,
  drillMetrics, type DrillMetric, type InsertDrillMetric,
  trainingLogMetrics, type TrainingLogMetric, type InsertTrainingLogMetric,
  videoLibrary, type VideoLibrary, type InsertVideoLibrary,
  pdfLibrary, type PdfLibrary, type InsertPdfLibrary,
  metricTemplates, type MetricTemplate, type InsertMetricTemplate,
  LOCATION_CLASSIFICATIONS, type ShotLocation,
  workouts, type Workout, type InsertWorkout,
  workoutDrills, type WorkoutDrill, type InsertWorkoutDrill,
  careerProfiles, type CareerProfile, type InsertCareerProfile,
  careerAchievements, type CareerAchievement, type InsertCareerAchievement,
  userAchievements, type UserAchievement, type InsertUserAchievement,
  challenges, type Challenge, type InsertChallenge,
  userChallenges, type UserChallenge, type InsertUserChallenge,
  personalRecords, type PersonalRecord, type InsertPersonalRecord,
  teamAwards, type TeamAward, type InsertTeamAward,
  seasons, type Season, type InsertSeason,
  games, type Game, type InsertGame,
  drillRatings, type DrillRating,
  playerProfiles, type PlayerProfile, type InsertPlayerProfile,
  trainerTeams, type TrainerTeam, type InsertTrainerTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  drillAssignments, type DrillAssignment, type InsertDrillAssignment,
  teamClubs, type TeamClub, type InsertTeamClub,
  leagues, type League, type InsertLeague,
  messages, type Message, type InsertMessage,
  playerInvitations, type PlayerInvitation, type InsertPlayerInvitation,
  sharedVideos, type SharedVideo,
  coachPlayers, type CoachPlayer, type InsertCoachPlayer,
  coachPlayerAssignments, type CoachPlayerAssignment, type InsertCoachPlayerAssignment,
  trainerPlayers, type TrainerPlayer, type InsertTrainerPlayer,
  trainerPlayerAssignments, type TrainerPlayerAssignment, type InsertTrainerPlayerAssignment,
  playerTeamAssignments, type PlayerTeamAssignment,
  chatThreads, type ChatThread, type InsertChatThread,
  chatThreadMembers, type ChatThreadMember, type InsertChatThreadMember,
  chatThreadMessages, type ChatThreadMessage, type InsertChatThreadMessage,
  tutorialVideos, type TutorialVideo, type InsertTutorialVideo,
  trainerProfiles, type TrainerProfile, type InsertTrainerProfile,
  trainingLocations, type TrainingLocation, type InsertTrainingLocation,
  trainerProfileLocations, type TrainerProfileLocation, type InsertTrainerProfileLocation,
  trainingSessions, type TrainingSession, type InsertTrainingSession,
  evaluationAttributes, type EvaluationAttribute, type InsertEvaluationAttribute,
  playerEvaluations, type PlayerEvaluation, type InsertPlayerEvaluation,
  playerEvaluationRatings, type PlayerEvaluationRating, type InsertPlayerEvaluationRating,
  playerTrainerFavorites, type PlayerTrainerFavorite,
  userFavoriteDrills,
  playerTrainerConnections, type PlayerTrainerConnection, type InsertConnection,
  parentLinks, type ParentLink,
  pushSubscriptions, type PushSubscription,
  nativePushTokens, type NativePushToken,
  shotLocations, type ShotLocationDB, type InsertShotLocation,
  shotTypes, type ShotTypeDB, type InsertShotType,
  feedbackPosts, type FeedbackPost, type InsertFeedbackPost,
  feedbackVotes, type FeedbackVote,
  analyticsEvents,
  dailyChallenges, type DailyChallenge,
  dailyCompletions, type DailyCompletion,
  userStreaks, type UserStreak,
  programs, type Program, type InsertProgram,
  programItems, type ProgramItem, type InsertProgramItem,
  programEnrollments, type ProgramEnrollment, type InsertProgramEnrollment,
  programItemCompletions, type ProgramItemCompletion, type InsertProgramItemCompletion,
  events, type Event, type InsertEvent,
  eventParticipants, type EventParticipant,
  type EventStatus,
  featureFlags, type FeatureFlag, type InsertFeatureFlag,
  journalEntries, type JournalEntry, type InsertJournalEntry,
  weeklyGameDays, type WeeklyGameDay, type InsertWeeklyGameDay,
  gameDayChallengeAttempts, type GameDayChallengeAttempt, type InsertGameDayChallengeAttempt,
  archetypes, userArchetypes, archetypeXpLog, archetypeRoadmapItems, archetypeItemCompletions,
  archetypeTierPrograms, archetypeTierChallenges, archetypeChallengeCompletions,
  type Archetype, type UserArchetype, type ArchetypeXpLog, type InsertArchetypeXpLog,
  type ArchetypeRoadmapItem, type InsertArchetypeRoadmapItem, type ArchetypeItemCompletion,
  type ArchetypeTierProgram, type InsertArchetypeTierProgram,
  type ArchetypeTierChallenge, type InsertArchetypeTierChallenge,
  type ArchetypeChallengeCompletion,
  ARCHETYPE_TIER_XP, ARCHETYPE_TIER_ITEM_COUNTS, ARCHETYPE_TIERS, type ArchetypeTier,
  playerGoals, goalClarifications, goalMilestones, goalCheckIns,
  type PlayerGoal, type InsertPlayerGoal,
  type GoalClarification,
  type GoalMilestone, type InsertGoalMilestone,
  type GoalCheckIn, type InsertGoalCheckIn,
  statChallenges, type StatChallenge, type InsertStatChallenge,
  type StatChallengeMetric,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db, pool } from "./db";
import { eq, desc, asc, and, or, sql, gte, isNotNull, isNull, inArray } from "drizzle-orm";
import { generateAiDrill } from "./ai-drill-generator";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;

  // Drills
  getDrills(): Promise<Drill[]>;
  getDrillById(id: string): Promise<Drill | undefined>;
  getFeaturedDrills(): Promise<Drill[]>;
  getDrillsByCategory(category: string): Promise<Drill[]>;
  getDrillsForUser(userId: string): Promise<Drill[]>; // Admin drills + user's own drills
  getDailyChallengeHistory(limit?: number, userId?: string): Promise<Array<{ challengeDate: string; drill: Drill; trainingLogId?: string | null; completed?: boolean }>>;
  getUserDrills(userId: string): Promise<Drill[]>; // Only user's own drills
  getCommunityDrills(): Promise<Drill[]>; // Shared user drills
  toggleDrillSharing(id: string, isShared: boolean): Promise<Drill | undefined>;
  createDrill(drill: InsertDrill): Promise<Drill>;
  updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill | undefined>;
  deleteDrill(id: string): Promise<boolean>;
  
  // Admin
  isUserAdmin(userId: string): Promise<boolean>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<boolean>;
  getAllUsers(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean; staffRole: string | null }>>;
  createUser(userData: { email: string; firstName?: string; lastName?: string; isAdmin?: boolean }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }>;
  deleteUser(userId: string): Promise<boolean>;
  setUserStaffRole(userId: string, staffRole: string | null): Promise<boolean>;

  // Training Logs
  getTrainingLogs(userId: string): Promise<TrainingLog[]>;
  getRecentTrainingLogs(userId: string, limit?: number): Promise<TrainingLog[]>;
  getTrainingLog(id: string): Promise<TrainingLog | undefined>;
  createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog>;
  updateTrainingLog(id: string, updates: Partial<InsertTrainingLog>): Promise<TrainingLog>;
  deleteTrainingLog(id: string): Promise<boolean>;

  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined>;

  // User Videos
  getUserVideos(userId: string): Promise<UserVideo[]>;
  createUserVideo(video: InsertUserVideo): Promise<UserVideo>;
  updateUserVideo(id: string, userId: string, data: Partial<InsertUserVideo>): Promise<UserVideo | undefined>;
  deleteUserVideo(id: string, userId: string): Promise<boolean>;

  // Progress
  getDrillProgress(userId: string): Promise<DrillProgress[]>;
  updateDrillProgress(userId: string, drillId: string, duration: number, score?: number): Promise<DrillProgress>;
  getUserDrillsWithPersonalBests(userId: string, limit?: number): Promise<Array<Drill & { personalBest: number | null; totalSessions: number }>>;

  // Stats
  getUserStats(userId: string, period?: string): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>;
  getWeeklyStats(userId: string, period?: string): Promise<{ date: string; minutes: number; sessions: number }[]>;
  getCategoryStats(userId: string, period?: string): Promise<{ category: string; minutes: number; sessions: number }[]>;
  getDashboardTrainingStats(userId: string, period?: string): Promise<Record<string, number>>;
  getProgressTrends(userId: string, period?: string): Promise<{
    label: string; shotsMade: number; shotsAttempted: number;
    threesMade: number; threesAttempted: number;
    freeThrowsMade: number; freeThrowsAttempted: number;
    layupsMade: number; layupsAttempted: number;
    midRangeMade: number; midRangeAttempted: number;
    minutes: number; sessions: number;
  }[]>;

  // Benchmarks
  getBenchmarks(): Promise<Benchmark[]>;

  // Video Library
  getVideoLibrary(): Promise<VideoLibrary[]>;
  getVideoLibraryById(id: string): Promise<VideoLibrary | undefined>;
  createVideoLibraryItem(video: InsertVideoLibrary): Promise<VideoLibrary>;
  updateVideoLibraryItem(id: string, video: Partial<InsertVideoLibrary>): Promise<VideoLibrary | undefined>;
  deleteVideoLibraryItem(id: string): Promise<boolean>;

  // PDF Library
  getPdfLibrary(): Promise<PdfLibrary[]>;
  getPdfLibraryById(id: string): Promise<PdfLibrary | undefined>;
  createPdfLibraryItem(pdf: InsertPdfLibrary): Promise<PdfLibrary>;
  updatePdfLibraryItem(id: string, pdf: Partial<InsertPdfLibrary>): Promise<PdfLibrary | undefined>;
  deletePdfLibraryItem(id: string): Promise<boolean>;

  // Tutorial Videos
  getTutorialVideos(): Promise<TutorialVideo[]>;
  getTutorialVideoByKey(key: string): Promise<TutorialVideo | undefined>;
  upsertTutorialVideo(data: InsertTutorialVideo): Promise<TutorialVideo>;
  deleteTutorialVideo(key: string): Promise<boolean>;

  // Metric Templates
  getMetricTemplates(): Promise<MetricTemplate[]>;
  getMetricTemplateById(id: string): Promise<MetricTemplate | undefined>;
  createMetricTemplate(template: InsertMetricTemplate): Promise<MetricTemplate>;
  updateMetricTemplate(id: string, template: Partial<InsertMetricTemplate>): Promise<MetricTemplate | undefined>;
  deleteMetricTemplate(id: string): Promise<boolean>;

  // Shot Locations (DB-managed)
  getShotLocations(): Promise<ShotLocationDB[]>;
  createShotLocation(data: InsertShotLocation): Promise<ShotLocationDB>;
  updateShotLocation(id: string, data: Partial<InsertShotLocation>): Promise<ShotLocationDB | undefined>;
  deleteShotLocation(id: string): Promise<boolean>;

  // Shot Types (DB-managed)
  getShotTypes(): Promise<ShotTypeDB[]>;
  createShotType(data: InsertShotType): Promise<ShotTypeDB>;
  updateShotType(id: string, data: Partial<InsertShotType>): Promise<ShotTypeDB | undefined>;
  deleteShotType(id: string): Promise<boolean>;

  // Drill Metrics (links drills to metric templates)
  getDrillMetrics(drillId: string): Promise<DrillMetric[]>;
  getDrillMetricsWithTemplates(drillId: string): Promise<Array<DrillMetric & { template: MetricTemplate }>>;
  setDrillMetrics(drillId: string, metricTemplateIds: string[]): Promise<DrillMetric[]>;
  createDrillMetric(metric: InsertDrillMetric): Promise<DrillMetric>;
  updateDrillMetric(id: string, metric: Partial<InsertDrillMetric>): Promise<DrillMetric | undefined>;
  deleteDrillMetric(id: string): Promise<boolean>;
  
  // Training Log Metrics
  getTrainingLogMetrics(trainingLogId: string): Promise<TrainingLogMetric[]>;
  saveTrainingLogMetrics(trainingLogId: string, metrics: Array<{ metricId: string; value: number }>): Promise<TrainingLogMetric[]>;

  // Workouts
  getWorkouts(): Promise<Workout[]>;
  getHandlzWorkouts(): Promise<Workout[]>; // Admin-created workouts (userId is null)
  getUserWorkouts(userId: string): Promise<Workout[]>; // User's own workouts
  getWorkoutById(id: string): Promise<Workout | undefined>;
  getWorkoutWithDrills(id: string): Promise<{ workout: Workout; drills: Array<WorkoutDrill & { drill: Drill }> } | undefined>;
  createWorkout(workout: InsertWorkout, drillIds: string[]): Promise<Workout>;
  updateWorkout(id: string, workout: Partial<InsertWorkout>, drillIds?: string[]): Promise<Workout | undefined>;
  toggleWorkoutFavorite(id: string): Promise<Workout | undefined>;
  deleteWorkout(id: string): Promise<boolean>;

  // Favorite Drills
  getUserFavoriteDrills(userId: string): Promise<string[]>;
  addFavoriteDrill(userId: string, drillId: string): Promise<void>;
  removeFavoriteDrill(userId: string, drillId: string): Promise<void>;

  // Career Profiles
  getCareerProfile(userId: string): Promise<CareerProfile | undefined>;
  createCareerProfile(profile: InsertCareerProfile): Promise<CareerProfile>;
  updateCareerProfile(userId: string, profile: Partial<InsertCareerProfile>): Promise<CareerProfile | undefined>;
  addXpToCareer(userId: string, xp: number): Promise<CareerProfile | undefined>;

  // Achievements
  getAchievements(): Promise<CareerAchievement[]>;
  getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: CareerAchievement }>>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;
  checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]>;

  // Challenges
  getChallenges(): Promise<Challenge[]>;
  getAppGeneratedChallenges(): Promise<Challenge[]>;
  getUserCreatedChallenges(userId: string): Promise<Challenge[]>;
  getChallengeById(id: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined>;
  deleteChallenge(id: string): Promise<boolean>;
  getUserChallenges(userId: string): Promise<Array<UserChallenge & { challenge: Challenge }>>;
  startChallenge(userId: string, challengeId: string): Promise<UserChallenge>;
  updateChallengeProgress(id: string, currentValue: number): Promise<UserChallenge | undefined>;
  completeChallenge(id: string): Promise<UserChallenge | undefined>;

  // Personal Records
  getUserPersonalRecords(userId: string): Promise<Array<PersonalRecord & { drill: Drill }>>;
  createPersonalRecord(record: InsertPersonalRecord): Promise<PersonalRecord>;
  
  // Team Awards
  getUserTeamAwards(userId: string): Promise<TeamAward[]>;
  createTeamAward(award: InsertTeamAward): Promise<TeamAward>;
  updateTeamAward(id: string, award: Partial<InsertTeamAward>): Promise<TeamAward | undefined>;
  deleteTeamAward(id: string): Promise<boolean>;

  // Drill Ratings
  getDrillRatings(drillId: string): Promise<{ averageRating: number; totalRatings: number }>;
  getUserDrillRating(drillId: string, userId: string): Promise<number | null>;
  rateDrill(drillId: string, userId: string, rating: number): Promise<DrillRating>;
  getDrillRatingsBatch(drillIds: string[]): Promise<Record<string, { averageRating: number; totalRatings: number }>>;

  // Shot Stats (for heatmap)
  getUserShotStats(userId: string, period?: string): Promise<Array<{ location: string; made: number; missed: number }>>;

  // Seasons
  getUserSeasons(userId: string): Promise<Season[]>;
  getPublicUserSeasons(userId: string): Promise<Season[]>;
  getSeasonWithGames(seasonId: string): Promise<{ season: Season; games: Game[] } | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: string, season: Partial<InsertSeason>): Promise<Season | undefined>;
  deleteSeason(id: string): Promise<boolean>;

  // Games
  getSeasonGames(seasonId: string): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;

  // Player Profiles (public)
  getPlayerProfile(userId: string): Promise<PlayerProfile | undefined>;
  getPlayerProfileBySlug(slug: string): Promise<PlayerProfile | undefined>;
  upsertPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile>;

  // Trainer Teams
  getCoachTeams(coachId: string, teamType?: string): Promise<TrainerTeam[]>;
  getTeamById(id: string): Promise<TrainerTeam | undefined>;
  getTeamByCode(code: string): Promise<TrainerTeam | undefined>;
  createTeam(team: InsertTrainerTeam): Promise<TrainerTeam>;
  updateTeam(id: string, team: Partial<InsertTrainerTeam>): Promise<TrainerTeam | undefined>;
  deleteTeam(id: string): Promise<boolean>;

  // Team Members
  getTeamMembers(teamId: string): Promise<Array<TeamMember & { user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } }>>;
  getUserTeams(userId: string): Promise<Array<TeamMember & { team: TrainerTeam }>>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(teamId: string, userId: string, updates: { position?: string; jerseyNumber?: string }): Promise<TeamMember | undefined>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;

  // Drill Assignments
  getTeamAssignments(teamId: string): Promise<Array<DrillAssignment & { drill: Drill }>>;
  getUserAssignments(userId: string): Promise<Array<DrillAssignment & { drill: Drill; team?: TrainerTeam }>>;
  createDrillAssignment(assignment: InsertDrillAssignment): Promise<DrillAssignment>;
  updateDrillAssignmentStatus(id: string, status: string, trainingLogId?: string): Promise<DrillAssignment | undefined>;
  getActiveAssignmentsForDrillAndUser(userId: string, drillId: string): Promise<DrillAssignment[]>;
  getAllActiveAssignmentsForUser(userId: string): Promise<DrillAssignment[]>;
  deleteDrillAssignment(id: string): Promise<boolean>;

  // Messages
  getConversations(userId: string): Promise<Array<{ partnerId: string; partnerName: string; partnerImage?: string; lastMessage: string; lastMessageAt: Date; unreadCount: number; teamId?: string; teamName?: string }>>;
  getMessages(userId: string, partnerId: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessagesRead(userId: string, senderId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;

  // Chat Threads
  getChatThreads(userId: string, mode: string): Promise<Array<ChatThread & { memberCount: number; lastMessage?: string; lastMessageAt?: Date }>>;
  getChatThreadById(id: string): Promise<ChatThread | undefined>;
  createChatThread(thread: InsertChatThread): Promise<ChatThread>;
  deleteChatThread(id: string): Promise<boolean>;
  getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]>;
  addChatThreadMember(member: InsertChatThreadMember): Promise<ChatThreadMember>;
  removeChatThreadMember(threadId: string, userId: string): Promise<boolean>;
  getChatThreadMessages(threadId: string): Promise<ChatThreadMessage[]>;
  createChatThreadMessage(message: InsertChatThreadMessage): Promise<ChatThreadMessage>;

  // Player Invitations
  getTeamInvitations(teamId: string): Promise<PlayerInvitation[]>;
  getInvitationsByTrainer(trainerId: string): Promise<PlayerInvitation[]>;
  createInvitation(invitation: InsertPlayerInvitation): Promise<PlayerInvitation>;
  getInvitationsByEmail(email: string): Promise<PlayerInvitation[]>;
  updateInvitationStatus(id: string, status: string): Promise<PlayerInvitation | undefined>;
  deleteInvitation(id: string): Promise<boolean>;

  // Player Videos (for coach/trainer viewing)
  getPlayerVideos(playerIds: string[]): Promise<Array<{ userId: string; playerName: string; videos: any[] }>>;

  // Shared Videos
  getSharedVideos(teamId: string, assignmentId?: string): Promise<Array<{ id: string; userId: string; playerName: string; title: string; videoUrl: string; description: string | null; assignmentId: string | null; createdAt: Date | null }>>;
  createSharedVideo(data: { userId: string; teamId: string; title: string; videoUrl: string; description?: string; assignmentId?: string }): Promise<SharedVideo>;
  deleteSharedVideo(id: string, userId: string): Promise<boolean>;

  // Coach Players
  getCoachPlayers(coachId: string): Promise<CoachPlayer[]>;
  getCoachPlayerById(id: string): Promise<CoachPlayer | undefined>;
  createCoachPlayer(player: InsertCoachPlayer): Promise<CoachPlayer>;
  updateCoachPlayer(id: string, data: Partial<InsertCoachPlayer>): Promise<CoachPlayer | undefined>;
  deleteCoachPlayer(id: string): Promise<boolean>;
  getCoachPlayerAssignments(coachPlayerId: string): Promise<(CoachPlayerAssignment & { teamName: string; seasonYear?: number | null; ageGroup?: string | null })[]>;
  assignCoachPlayerToTeam(assignment: InsertCoachPlayerAssignment): Promise<CoachPlayerAssignment>;
  removeCoachPlayerFromTeam(assignmentId: string): Promise<boolean>;
  getCoachPlayersByTeam(teamId: string): Promise<(CoachPlayer & { assignmentId: string; teamPosition?: string | null; teamJersey?: string | null })[]>;

  // Trainer Player Management
  getTrainerPlayers(trainerId: string): Promise<TrainerPlayer[]>;
  getTrainerPlayerById(id: string): Promise<TrainerPlayer | undefined>;
  createTrainerPlayer(player: InsertTrainerPlayer): Promise<TrainerPlayer>;
  findOrCreateTrainerPlayerForUser(trainerId: string, appUserId: string): Promise<TrainerPlayer>;
  updateTrainerPlayer(id: string, data: Partial<InsertTrainerPlayer>): Promise<TrainerPlayer | undefined>;
  deleteTrainerPlayer(id: string): Promise<boolean>;
  getTrainerPlayerAssignments(trainerPlayerId: string): Promise<(TrainerPlayerAssignment & { groupName: string; ageGroup?: string | null })[]>;
  assignTrainerPlayerToGroup(assignment: InsertTrainerPlayerAssignment): Promise<TrainerPlayerAssignment>;
  removeTrainerPlayerFromGroup(assignmentId: string): Promise<boolean>;
  getTrainerPlayersByGroup(groupId: string): Promise<(TrainerPlayer & { assignmentId: string; groupPosition?: string | null; groupJersey?: string | null })[]>;
  getTrainerPlayersByTeam(teamId: string): Promise<(TrainerPlayer & { assignmentId: string; teamPosition?: string | null; teamJersey?: string | null; assignedAt?: Date | null })[]>;

  // Player Detail Data
  getPlayerDrillAssignments(playerId: string, trainerId: string): Promise<Array<DrillAssignment & { drill: Drill; teamName?: string }>>;
  getTrainerDirectAssignments(trainerId: string): Promise<Array<DrillAssignment & { drill: Drill; playerName: string; playerRosterId: string }>>;
  getPlayerSharedVideos(playerId: string, trainerId: string): Promise<Array<{ id: string; userId: string; playerName: string; title: string; videoUrl: string; description: string | null; assignmentId: string | null; teamName: string; createdAt: Date | null }>>;
  getPlayerMessages(playerId: string, trainerId: string): Promise<Message[]>;

  // Unified Player Team Assignments
  getPlayerTeamAssignments(playerId: string): Promise<Array<{ id: string; playerId: string; teamId: string; teamName: string; seasonYear: string | null; ageGroup: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>>;
  assignPlayerToTeam(assignment: { playerId: string; teamId: string; position?: string | null; jerseyNumber?: string | null }): Promise<PlayerTeamAssignment>;
  removePlayerFromTeam(assignmentId: string): Promise<boolean>;
  bulkAssignPlayersToTeam(playerIds: string[], teamId: string): Promise<void>;

  // Career Stats
  getCareerStats(userId: string): Promise<{
    totalGames: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    totalFgMade: number;
    totalFgAttempted: number;
    totalThreePtMade: number;
    totalThreePtAttempted: number;
    totalFtMade: number;
    totalFtAttempted: number;
    wins: number;
    losses: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    seasonBreakdown: Array<{
      seasonId: string;
      seasonName: string;
      seasonType: string;
      year: string;
      gamesPlayed: number;
      avgPoints: number;
      avgRebounds: number;
      avgAssists: number;
      avgSteals: number;
      avgBlocks: number;
      totalPoints: number;
      totalRebounds: number;
      totalAssists: number;
      totalSteals: number;
      totalBlocks: number;
      totalFgMade: number;
      totalFgAttempted: number;
      totalThreePtMade: number;
      totalThreePtAttempted: number;
      totalFtMade: number;
      totalFtAttempted: number;
      wins: number;
      losses: number;
    }>;
  }>;

  // Team Clubs (AAU/Travel/Competitive)
  getTeamClubs(filters?: { organizationType?: string; state?: string; city?: string; ageGroup?: string; gender?: string; circuit?: string; query?: string }): Promise<TeamClub[]>;
  getTeamClubById(id: string): Promise<TeamClub | undefined>;
  getTeamClubBySlug(slug: string): Promise<TeamClub | undefined>;
  createTeamClub(club: InsertTeamClub): Promise<TeamClub>;
  updateTeamClub(id: string, club: Partial<InsertTeamClub>): Promise<TeamClub | undefined>;
  deleteTeamClub(id: string): Promise<boolean>;

  // Leagues (Community/Recreational)
  getLeagues(filters?: { leagueType?: string; state?: string; city?: string; ageGroup?: string; season?: string; query?: string }): Promise<League[]>;
  getLeagueById(id: string): Promise<League | undefined>;
  getLeagueBySlug(slug: string): Promise<League | undefined>;
  createLeague(league: InsertLeague): Promise<League>;
  updateLeague(id: string, league: Partial<InsertLeague>): Promise<League | undefined>;
  deleteLeague(id: string): Promise<boolean>;

  // Trainer Profiles
  getTrainerProfile(userId: string): Promise<TrainerProfile | undefined>;
  upsertTrainerProfile(profile: InsertTrainerProfile): Promise<TrainerProfile>;
  getPublicTrainerProfiles(filters?: { state?: string; city?: string; specialty?: string; query?: string }): Promise<(TrainerProfile & { firstName: string | null; lastName: string | null })[]>;
  getTrainerProfileById(id: string): Promise<(TrainerProfile & { firstName: string | null; lastName: string | null }) | undefined>;

  getTrainingLocations(): Promise<TrainingLocation[]>;
  getTrainingLocationById(id: string): Promise<TrainingLocation | undefined>;
  createTrainingLocation(loc: InsertTrainingLocation): Promise<TrainingLocation>;
  updateTrainingLocation(id: string, loc: Partial<InsertTrainingLocation>): Promise<TrainingLocation | undefined>;
  deleteTrainingLocation(id: string): Promise<boolean>;

  getTrainerProfileLocations(trainerProfileId: string): Promise<(TrainerProfileLocation & { location: TrainingLocation })[]>;
  getTrainerProfileLocationById(id: string): Promise<TrainerProfileLocation | undefined>;
  createTrainerProfileLocation(data: InsertTrainerProfileLocation): Promise<TrainerProfileLocation>;
  updateTrainerProfileLocation(id: string, data: Partial<InsertTrainerProfileLocation>): Promise<TrainerProfileLocation | undefined>;
  deleteTrainerProfileLocation(id: string): Promise<boolean>;

  getPlayerTrainerFavorites(playerId: string): Promise<PlayerTrainerFavorite[]>;
  getPlayerTrainerFavorite(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite | undefined>;
  addPlayerTrainerFavorite(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite>;
  removePlayerTrainerFavorite(playerId: string, trainerId: string): Promise<boolean>;
  setMyTrainer(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite>;
  unsetMyTrainer(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite | undefined>;

  createTrainingSession(data: InsertTrainingSession): Promise<TrainingSession>;
  getTrainingSessionById(id: string): Promise<TrainingSession | undefined>;
  getTrainingSessionsForTrainer(trainerId: string, filters?: { status?: string; from?: string; to?: string }): Promise<TrainingSession[]>;
  getTrainingSessionsForPlayer(playerId: string, filters?: { status?: string; from?: string; to?: string }): Promise<TrainingSession[]>;
  getTrainingSessionsByGroupId(groupSessionId: string): Promise<TrainingSession[]>;
  updateTrainingSession(id: string, data: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined>;
  deleteTrainingSession(id: string): Promise<void>;

  getEvaluationAttributes(trainerId?: string): Promise<EvaluationAttribute[]>;
  getEvaluationAttributeById(id: string): Promise<EvaluationAttribute | undefined>;
  createEvaluationAttribute(data: InsertEvaluationAttribute): Promise<EvaluationAttribute>;
  updateEvaluationAttribute(id: string, data: Partial<InsertEvaluationAttribute>): Promise<EvaluationAttribute | undefined>;
  deleteEvaluationAttribute(id: string): Promise<boolean>;

  createPlayerEvaluation(data: InsertPlayerEvaluation, ratings: InsertPlayerEvaluationRating[]): Promise<PlayerEvaluation>;
  getPlayerEvaluations(playerId: string, trainerId?: string): Promise<PlayerEvaluation[]>;
  getPlayerEvaluationById(id: string): Promise<{ evaluation: PlayerEvaluation; ratings: (PlayerEvaluationRating & { attribute: EvaluationAttribute })[] } | undefined>;
  deletePlayerEvaluation(id: string): Promise<boolean>;
  getPlayerEvaluationCount(trainerId: string, playerId: string): Promise<number>;
  toggleEvaluationSharing(id: string, shared: boolean): Promise<PlayerEvaluation | undefined>;
  getSharedEvaluationsForPlayer(playerId: string): Promise<PlayerEvaluation[]>;

  createConnection(data: InsertConnection): Promise<PlayerTrainerConnection>;
  getConnection(playerId: string, trainerId: string): Promise<PlayerTrainerConnection | undefined>;
  getConnectionsForUser(userId: string): Promise<PlayerTrainerConnection[]>;
  getPendingConnectionsForUser(userId: string): Promise<PlayerTrainerConnection[]>;
  updateConnectionStatus(id: string, status: "accepted" | "declined"): Promise<PlayerTrainerConnection | undefined>;
  areConnected(playerId: string, trainerId: string): Promise<boolean>;

  createParentLink(parentUserId: string, playerUserId: string): Promise<ParentLink>;
  getParentLinks(parentUserId: string): Promise<ParentLink[]>;
  getParentForPlayer(playerUserId: string): Promise<ParentLink | undefined>;

  savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionForUser(userId: string, endpoint: string): Promise<void>;
  saveNativePushToken(userId: string, token: string, platform: string): Promise<NativePushToken>;
  getNativePushTokensForUser(userId: string): Promise<NativePushToken[]>;
  deleteNativePushToken(userId: string, token: string): Promise<void>;

  // Daily Streak Challenge
  getDailyChallenge(dateStr: string): Promise<{ challenge: DailyChallenge; drill: Drill } | null>;
  getTodayCompletion(userId: string, dateStr: string): Promise<DailyCompletion | null>;
  completeDailyChallenge(userId: string, drillId: string, dateStr: string, trainingLogId?: string): Promise<{ completion: DailyCompletion; streak: UserStreak; milestoneReached: number | null }>;
  getUserStreak(userId: string): Promise<UserStreak>;
  getStreakLeaderboard(): Promise<Array<{ userId: string; displayName: string; currentStreak: number; profilePhotoUrl: string | null }>>;

  // Archetype Roadmap (legacy custom items — kept for backward compat)
  getArchetypeRoadmap(archetypeId: string): Promise<ArchetypeRoadmapItem[]>;
  getRoadmapItem(id: string): Promise<ArchetypeRoadmapItem | undefined>;
  upsertRoadmapItem(data: InsertArchetypeRoadmapItem & { id?: string }): Promise<ArchetypeRoadmapItem>;
  deleteRoadmapItem(id: string): Promise<void>;
  getUserItemCompletions(userId: string, userArchetypeId: string): Promise<ArchetypeItemCompletion[]>;
  completeRoadmapItem(userId: string, userArchetypeId: string, roadmapItemId: string, notes?: string): Promise<{ completion: ArchetypeItemCompletion; tierPct: number; tierGateDone: boolean; newTier: string | null }>;
  uncompleteRoadmapItem(userId: string, roadmapItemId: string): Promise<void>;
  // Archetype ↔ Program tier assignments
  getArchetypeTierPrograms(archetypeId: string): Promise<(ArchetypeTierProgram & { program: { id: string; title: string; slug: string; tagline: string | null; description: string | null; lengthDays: number; difficulty: string; isPublished: boolean | null; coverImageUrl: string | null; accentColor: string | null } })[]>;
  linkProgramToTier(data: InsertArchetypeTierProgram): Promise<ArchetypeTierProgram>;
  unlinkProgramFromTier(id: string): Promise<void>;
  updateTierProgramOrder(id: string, sortOrder: number, isGateChallenge: boolean): Promise<void>;
  // Archetype tier challenges
  getArchetypeTierChallenges(archetypeId: string): Promise<ArchetypeTierChallenge[]>;
  createArchetypeTierChallenge(data: InsertArchetypeTierChallenge): Promise<ArchetypeTierChallenge>;
  updateArchetypeTierChallenge(id: string, data: Partial<InsertArchetypeTierChallenge>): Promise<ArchetypeTierChallenge>;
  deleteArchetypeTierChallenge(id: string): Promise<void>;
  getUserChallengeCompletions(userId: string, archetypeId: string): Promise<ArchetypeChallengeCompletion[]>;
  completeArchetypeChallenge(userId: string, challengeId: string, score?: number): Promise<ArchetypeChallengeCompletion>;
  uncompleteArchetypeChallenge(userId: string, challengeId: string): Promise<void>;
  // User tier status (programs-based)
  getUserArchetypeTierStatus(userId: string, archetypeId: string): Promise<Record<string, { pct: number; gateDone: boolean; unlocked: boolean; programs: Array<{ programId: string; completed: boolean; isGate: boolean }>; challenges: Array<{ challengeId: string; completed: boolean; isGate: boolean; title: string; metric: string; target: number; description: string | null; shotLocationFilter: string | null }> }>>;
  recalcUserArchetypeTier(userId: string, archetypeId: string): Promise<void>;
  // Admin Archetypes
  upsertArchetype(data: Archetype): Promise<Archetype>;
  deleteArchetype(id: string): Promise<void>;

  // Stat Challenges
  getPublishedStatChallenges(): Promise<StatChallenge[]>;
  getAllStatChallenges(): Promise<StatChallenge[]>;
  getStatChallengeBySlug(slug: string): Promise<StatChallenge | undefined>;
  createStatChallenge(data: InsertStatChallenge): Promise<StatChallenge>;
  updateStatChallenge(id: string, data: Partial<InsertStatChallenge>): Promise<StatChallenge>;
  deleteStatChallenge(id: string): Promise<void>;
  getStatChallengeLeaderboard(challengeId: string, limit?: number): Promise<Array<{ userId: string; displayName: string; profilePhotoUrl: string | null; score: number }>>;

  setAdminDailyChallenge(dateStr: string, drillId: string): Promise<DailyChallenge>;
  getAdminDailyChallenges(from: string, to: string): Promise<Array<DailyChallenge & { drill: Drill }>>;

  // Programs
  listPrograms(opts?: {
    category?: string;
    difficulty?: string;
    authorType?: string;
    featuredFirst?: boolean;
  }): Promise<Program[]>;
  getProgramBySlug(slug: string): Promise<Program | undefined>;
  getProgramById(id: string): Promise<Program | undefined>;
  getProgramItems(programId: string): Promise<ProgramItem[]>;
  getActiveEnrollmentsForUser(userId: string): Promise<Array<ProgramEnrollment & { program: Program; completedItemCount: number; totalItemCount: number }>>;
  getEnrollmentById(enrollmentId: string): Promise<ProgramEnrollment | undefined>;
  getEnrollmentForUserAndProgram(userId: string, programId: string): Promise<ProgramEnrollment | undefined>;
  enrollUserInProgram(userId: string, programId: string, opts?: { assignedByTrainerId?: string; eventId?: string }): Promise<ProgramEnrollment>;
  abandonEnrollment(enrollmentId: string, userId: string): Promise<ProgramEnrollment | undefined>;
  resumeEnrollment(enrollmentId: string, userId: string): Promise<ProgramEnrollment | undefined>;
  getCompletionsForEnrollment(enrollmentId: string): Promise<ProgramItemCompletion[]>;
  completeProgramItem(input: {
    enrollmentId: string;
    programItemId: string;
    userId: string;
    trainingLogId?: string;
    score?: number;
    notes?: string;
  }): Promise<{ completion: ProgramItemCompletion; enrollment: ProgramEnrollment; programCompleted: boolean }>;

  // Authoring (admin + trainer)
  listAllProgramsAdmin(): Promise<Program[]>;
  listProgramsForAuthor(authorUserId: string): Promise<Program[]>;
  createProgram(input: InsertProgram): Promise<Program>;
  updateProgram(id: string, patch: Partial<InsertProgram>): Promise<Program | undefined>;
  deleteProgram(id: string): Promise<boolean>;
  hasProgramEnrollments(programId: string): Promise<boolean>;
  getProgramItem(id: string): Promise<ProgramItem | undefined>;
  addProgramItem(input: InsertProgramItem): Promise<ProgramItem>;
  updateProgramItem(id: string, patch: Partial<InsertProgramItem>): Promise<ProgramItem | undefined>;
  deleteProgramItem(id: string): Promise<boolean>;
  reorderProgramItems(programId: string, items: Array<{ id: string; dayNumber: number; orderInDay: number }>): Promise<void>;

  // Trainer assignment + roster discovery
  getRosterPlayerIds(trainerId: string): Promise<string[]>;
  assignProgramToPlayers(programId: string, playerIds: string[], trainerId: string): Promise<{
    assigned: string[];
    alreadyEnrolled: string[];
    skipped: string[];
  }>;
  listAssignedProgramsForUser(userId: string): Promise<Array<ProgramEnrollment & {
    program: Program;
    completedItemCount: number;
    totalItemCount: number;
    trainer: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  }>>;
  listProgramsFromConnectedTrainers(userId: string): Promise<Array<Program & {
    trainer: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  }>>;

  // Events (Program wrapper w/ time window + leaderboard)
  listEvents(opts?: { includeUnpublished?: boolean }): Promise<Array<Event & { status: EventStatus; program: Program | null }>>;
  getEventBySlug(slug: string): Promise<(Event & { program: Program | null; status: EventStatus }) | undefined>;
  getEventById(id: string): Promise<Event | undefined>;
  createEvent(input: InsertEvent): Promise<Event>;
  updateEvent(id: string, patch: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  hasEventParticipants(eventId: string): Promise<boolean>;
  joinEvent(eventId: string, userId: string): Promise<{ participant: EventParticipant; enrollment: ProgramEnrollment }>;
  getEventParticipant(eventId: string, userId: string): Promise<EventParticipant | undefined>;
  submitFinalChallengeScore(eventId: string, userId: string, score: number, notes?: string, attemptsTaken?: number): Promise<EventParticipant>;
  getEventLeaderboard(eventId: string, limit?: number): Promise<Array<{
    userId: string;
    user: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
    joinedAt: Date | null;
    completedItemCount: number;
    lastCompletedAt: Date | null;
    finalScore: string | null;
    finalSubmittedAt: Date | null;
    attemptsTaken: number | null;
    currentDay: number | null;
    shootingPct: number | null;
    compositeScore: number;
    rank: number;
  }>>;

  // Feature Flags
  listFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  upsertFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | undefined>;
  deleteFeatureFlag(key: string): Promise<boolean>;
  getUserFeatureFlags(userId: string): Promise<Record<string, boolean>>;

  // Journal
  getJournalEntries(userId: string): Promise<JournalEntry[]>;
  getJournalEntry(id: string, userId: string): Promise<JournalEntry | undefined>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: string, userId: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string, userId: string): Promise<boolean>;

  // Game Day
  getWeeklyGameDay(userId: string, weekStart: string): Promise<WeeklyGameDay | undefined>;
  createWeeklyGameDay(data: InsertWeeklyGameDay): Promise<WeeklyGameDay>;
  deleteWeeklyGameDay(userId: string, weekStart: string): Promise<boolean>;

  // Challenge Attempts
  getChallengeAttempt(userId: string, weekGameDayId: string): Promise<GameDayChallengeAttempt | undefined>;
  createChallengeAttempt(data: Omit<InsertGameDayChallengeAttempt, "id" | "completedAt">): Promise<GameDayChallengeAttempt>;

  // Archetypes
  getArchetypes(): Promise<Archetype[]>;
  getArchetype(id: string): Promise<Archetype | undefined>;
  getUserArchetypes(userId: string): Promise<(UserArchetype & { archetype: Archetype })[]>;
  selectArchetype(userId: string, archetypeId: string, role: "main" | "secondary"): Promise<UserArchetype>;
  deselectArchetype(userId: string, role: "main" | "secondary"): Promise<boolean>;
  addArchetypeXp(userId: string, userArchetypeId: string, xpEarned: number, sourceType: string, sourceId?: string, note?: string): Promise<void>;
  getArchetypeXpLog(userId: string, limit?: number): Promise<ArchetypeXpLog[]>;

  // Goal Coach
  createGoal(userId: string, goalText: string): Promise<PlayerGoal>;
  getActiveGoal(userId: string): Promise<PlayerGoal | null>;
  getGoalById(goalId: string): Promise<PlayerGoal | null>;
  updateGoal(goalId: string, data: Partial<InsertPlayerGoal>): Promise<PlayerGoal>;
  abandonGoal(goalId: string): Promise<void>;
  addClarification(goalId: string, questionIndex: number, question: string): Promise<GoalClarification>;
  answerClarification(clarificationId: string, answer: string): Promise<GoalClarification>;
  getClarifications(goalId: string): Promise<GoalClarification[]>;
  createMilestone(data: InsertGoalMilestone): Promise<GoalMilestone>;
  getGoalMilestones(goalId: string): Promise<GoalMilestone[]>;
  completeMilestone(milestoneId: string): Promise<GoalMilestone>;
  createCheckIn(data: InsertGoalCheckIn): Promise<GoalCheckIn>;
  getCheckIns(goalId: string): Promise<GoalCheckIn[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Drills
  async getDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(or(eq(drills.isAiGenerated, false), isNull(drills.isAiGenerated))).orderBy(drills.title);
  }

  async getDrillById(id: string): Promise<Drill | undefined> {
    const [drill] = await db.select().from(drills).where(eq(drills.id, id));
    return drill;
  }

  async getFeaturedDrills(): Promise<Drill[]> {
    return await db.select().from(drills).where(and(eq(drills.isFeatured, true), or(eq(drills.isAiGenerated, false), isNull(drills.isAiGenerated)))).limit(8);
  }

  async getDrillsByCategory(category: string): Promise<Drill[]> {
    return await db.select().from(drills).where(and(eq(drills.category, category as any), or(eq(drills.isAiGenerated, false), isNull(drills.isAiGenerated))));
  }

  async getDrillsForUser(userId: string): Promise<Drill[]> {
    // Get admin drills (userId is null, not AI) and user's own drills
    return await db.select().from(drills)
      .where(and(
        sql`${drills.userId} IS NULL OR ${drills.userId} = ${userId}`,
        or(eq(drills.isAiGenerated, false), isNull(drills.isAiGenerated))
      ))
      .orderBy(drills.title);
  }

  async getDailyChallengeHistory(limit = 30, userId?: string): Promise<Array<{ challengeDate: string; drill: Drill; trainingLogId?: string | null; completed?: boolean }>> {
    const results = await db
      .select({
        challengeDate: dailyChallenges.challengeDate,
        drill: drills,
        trainingLogId: dailyCompletions.trainingLogId,
        completedAt: dailyCompletions.completedAt,
      })
      .from(dailyChallenges)
      .innerJoin(drills, eq(drills.id, dailyChallenges.drillId))
      .leftJoin(
        dailyCompletions,
        userId
          ? and(eq(dailyCompletions.challengeDate, dailyChallenges.challengeDate), eq(dailyCompletions.userId, userId))
          : sql`false`
      )
      .orderBy(desc(dailyChallenges.challengeDate))
      .limit(limit);
    return results.map(r => ({
      challengeDate: r.challengeDate,
      drill: r.drill,
      trainingLogId: r.trainingLogId ?? null,
      completed: !!r.completedAt,
    }));
  }

  async getUserDrills(userId: string): Promise<Drill[]> {
    // Get only user's own drills
    return await db.select().from(drills)
      .where(eq(drills.userId, userId))
      .orderBy(desc(drills.createdAt));
  }

  async getCommunityDrills(): Promise<Drill[]> {
    return await db.select().from(drills)
      .where(and(
        isNotNull(drills.userId),
        eq(drills.isShared, true)
      ))
      .orderBy(desc(drills.createdAt));
  }

  async toggleDrillSharing(id: string, isShared: boolean): Promise<Drill | undefined> {
    const [updated] = await db.update(drills)
      .set({ isShared })
      .where(eq(drills.id, id))
      .returning();
    return updated;
  }

  async createDrill(drill: InsertDrill): Promise<Drill> {
    const [newDrill] = await db.insert(drills).values(drill as any).returning();
    return newDrill;
  }

  async updateDrill(id: string, drill: Partial<InsertDrill>): Promise<Drill | undefined> {
    const [updated] = await db.update(drills)
      .set(drill as any)
      .where(eq(drills.id, id))
      .returning();
    return updated;
  }

  async deleteDrill(id: string): Promise<boolean> {
    await db.delete(drills).where(eq(drills.id, id));
    return true;
  }

  // Admin - checks both env var (bootstrap) and database field
  async isUserAdmin(userId: string): Promise<boolean> {
    // Check environment variable first (bootstrap admins)
    const envAdminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    if (envAdminIds.includes(userId)) {
      return true;
    }
    // Then check database
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile?.isAdmin === true;
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<boolean> {
    const [existing] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    
    if (existing) {
      await db.update(userProfiles)
        .set({ isAdmin, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));
    } else {
      await db.insert(userProfiles)
        .values({ userId, isAdmin });
    }
    return true;
  }

  // User management
  async getAllUsers(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean; staffRole: string | null }>> {
    const allUsers = await db.select().from(users);
    const profiles = await db.select().from(userProfiles);
    const careers = await db.select({ userId: careerProfiles.userId, staffRole: careerProfiles.staffRole }).from(careerProfiles);
    const envAdminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    
    return allUsers.map(user => {
      const profile = profiles.find(p => p.userId === user.id);
      const career = careers.find(c => c.userId === user.id);
      const isEnvAdmin = envAdminIds.includes(user.id);
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: isEnvAdmin || (profile?.isAdmin === true),
        staffRole: career?.staffRole ?? null,
        subscriptionPlan: profile?.subscriptionPlan ?? "free",
      };
    });
  }

  async deleteUser(userId: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, userId));
    return true;
  }

  async setUserStaffRole(userId: string, staffRole: string | null): Promise<boolean> {
    const alsoPlayer = staffRole === "both" || staffRole === null;
    const [existing] = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId));
    if (existing) {
      await db.update(careerProfiles).set({ staffRole: staffRole as any, alsoPlayer }).where(eq(careerProfiles.userId, userId));
    } else {
      await db.insert(careerProfiles).values({ userId, staffRole: staffRole as any, alsoPlayer });
    }
    return true;
  }

  async createUser(userData: { email: string; firstName?: string; lastName?: string; isAdmin?: boolean }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean }> {
    const [newUser] = await db.insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      })
      .returning();
    
    // If isAdmin is set, create a user profile with admin flag
    if (userData.isAdmin) {
      await db.insert(userProfiles)
        .values({
          userId: newUser.id,
          isAdmin: true,
        });
    }
    
    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      isAdmin: userData.isAdmin || false,
    };
  }

  // Training Logs
  async getTrainingLogs(userId: string): Promise<TrainingLog[]> {
    return await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId))
      .orderBy(desc(trainingLogs.completedAt));
  }

  async getRecentTrainingLogs(userId: string, limit = 10): Promise<TrainingLog[]> {
    return await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.userId, userId))
      .orderBy(desc(trainingLogs.completedAt))
      .limit(limit);
  }

  async getTrainingLog(id: string): Promise<TrainingLog | undefined> {
    const [log] = await db.select()
      .from(trainingLogs)
      .where(eq(trainingLogs.id, id));
    return log;
  }

  async createTrainingLog(log: InsertTrainingLog): Promise<TrainingLog> {
    const [newLog] = await db.insert(trainingLogs).values(log).returning();
    
    // Update drill progress
    if (log.drillId) {
      await this.updateDrillProgress(log.userId, log.drillId, log.duration, log.score ?? undefined);
    }
    
    return newLog;
  }

  async updateTrainingLog(id: string, updates: Partial<InsertTrainingLog>): Promise<TrainingLog> {
    const [updated] = await db.update(trainingLogs)
      .set(updates)
      .where(eq(trainingLogs.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingLog(id: string): Promise<boolean> {
    const result = await db.delete(trainingLogs).where(eq(trainingLogs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
    const [result] = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const definedFields: Record<string, any> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined && key !== 'userId') {
        definedFields[key] = value;
      }
    }
    const [result] = await db.insert(userProfiles)
      .values(profile as any)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: definedFields as any
      })
      .returning();
    return result;
  }

  // User Videos
  async getUserVideos(userId: string): Promise<UserVideo[]> {
    return await db.select()
      .from(userVideos)
      .where(eq(userVideos.userId, userId))
      .orderBy(desc(userVideos.createdAt));
  }

  async createUserVideo(video: InsertUserVideo): Promise<UserVideo> {
    const [newVideo] = await db.insert(userVideos).values(video).returning();
    return newVideo;
  }

  async updateUserVideo(id: string, userId: string, data: Partial<InsertUserVideo>): Promise<UserVideo | undefined> {
    const [updated] = await db.update(userVideos)
      .set(data as any)
      .where(and(eq(userVideos.id, id), eq(userVideos.userId, userId)))
      .returning();
    return updated;
  }

  async deleteUserVideo(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(userVideos)
      .where(and(eq(userVideos.id, id), eq(userVideos.userId, userId)));
    return true;
  }

  // Progress
  async getDrillProgress(userId: string): Promise<DrillProgress[]> {
    return await db.select()
      .from(drillProgress)
      .where(eq(drillProgress.userId, userId));
  }

  async updateDrillProgress(userId: string, drillId: string, duration: number, score?: number): Promise<DrillProgress> {
    const existing = await db.select()
      .from(drillProgress)
      .where(and(eq(drillProgress.userId, userId), eq(drillProgress.drillId, drillId)));

    if (existing.length > 0) {
      const current = existing[0];
      const newTotalSessions = (current.totalSessions || 0) + 1;
      const newTotalMinutes = (current.totalMinutes || 0) + duration;
      const newBestScore = score && (!current.bestScore || score > current.bestScore) ? score : current.bestScore;
      
      let newAvgScore = current.averageScore;
      if (score) {
        const currentTotal = Number(current.averageScore || 0) * (current.totalSessions || 0);
        newAvgScore = String(((currentTotal + score) / newTotalSessions).toFixed(1));
      }

      const [updated] = await db.update(drillProgress)
        .set({
          totalSessions: newTotalSessions,
          totalMinutes: newTotalMinutes,
          averageScore: newAvgScore,
          bestScore: newBestScore,
          lastPracticedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(eq(drillProgress.userId, userId), eq(drillProgress.drillId, drillId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(drillProgress)
        .values({
          userId,
          drillId,
          totalSessions: 1,
          totalMinutes: duration,
          averageScore: score ? String(score) : null,
          bestScore: score,
          lastPracticedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async getUserDrillsWithPersonalBests(userId: string, limit: number = 4): Promise<Array<Drill & { personalBest: number | null; totalSessions: number }>> {
    // Get user's drill progress ordered by most recently practiced with drill data in a single query
    const progressWithDrills = await db.select({
      drill: drills,
      bestScore: drillProgress.bestScore,
      totalSessions: drillProgress.totalSessions,
    })
      .from(drillProgress)
      .innerJoin(drills, eq(drillProgress.drillId, drills.id))
      .where(eq(drillProgress.userId, userId))
      .orderBy(desc(drillProgress.lastPracticedAt))
      .limit(limit);

    const result: Array<Drill & { personalBest: number | null; totalSessions: number }> = progressWithDrills.map(p => ({
      ...p.drill,
      personalBest: p.bestScore,
      totalSessions: p.totalSessions || 0
    }));

    // If we have fewer than limit items, fill with featured drills
    if (result.length < limit) {
      const existingIds = result.map(d => d.id);
      const remainingLimit = limit - result.length;
      
      const featuredDrills = await db.select()
        .from(drills)
        .where(eq(drills.isFeatured, true))
        .limit(remainingLimit + 5); // Get extra in case of overlap
      
      for (const drill of featuredDrills) {
        if (!existingIds.includes(drill.id) && result.length < limit) {
          result.push({
            ...drill,
            personalBest: null,
            totalSessions: 0
          });
        }
      }
    }

    return result;
  }

  // Helper to get date range based on period.
  //
  // If `startTs` is provided (epoch ms), trust it — the client computed it in
  // the user's local timezone so "today / this week / this month" boundaries
  // match the user's wall clock instead of UTC. Falls back to server UTC math
  // when no override is sent (legacy callers, server-internal calls).
  private getDateRangeForPeriod(period: string = "weekly", startTs?: number): Date {
    // Guard against junk values: must be a finite ms timestamp from after 2023
    // (lower bound prevents accidental epoch-0 / clock-skewed clients) and not
    // in the future (prevents leaking future-dated logs into "today").
    if (typeof startTs === "number" && Number.isFinite(startTs) && startTs > 1_700_000_000_000 && startTs <= Date.now()) {
      return new Date(startTs);
    }
    const now = new Date();
    switch (period) {
      case "daily":
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay;
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case "monthly":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      case "annual":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return yearAgo;
      default:
        const defaultWeekAgo = new Date(now);
        defaultWeekAgo.setDate(defaultWeekAgo.getDate() - 7);
        return defaultWeekAgo;
    }
  }

  // Stats
  async getUserStats(userId: string, period: string = "weekly", startTs?: number): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }> {
    const startDate = this.getDateRangeForPeriod(period, startTs);
    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const totalSessions = logs.length;
    const totalMinutes = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const scoresWithValues = logs.filter(log => log.score != null);
    const avgScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((sum, log) => sum + (log.score || 0), 0) / scoresWithValues.length 
      : 0;

    // Calculate streak (simplified - count consecutive days)
    let streak = 0;
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
      );
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastLogDate = new Date(sortedLogs[0].completedAt!);
      lastLogDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        streak = 1;
        let prevDate = lastLogDate;
        
        for (let i = 1; i < sortedLogs.length; i++) {
          const logDate = new Date(sortedLogs[i].completedAt!);
          logDate.setHours(0, 0, 0, 0);
          
          const diff = Math.floor((prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 0) continue;
          if (diff === 1) {
            streak++;
            prevDate = logDate;
          } else {
            break;
          }
        }
      }
    }

    return { totalSessions, totalMinutes, avgScore: Math.round(avgScore * 10) / 10, streak };
  }

  async getWeeklyStats(userId: string, period: string = "weekly", startTs?: number): Promise<{ date: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period, startTs);

    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const dailyStats: Record<string, { minutes: number; sessions: number }> = {};
    
    // Initialize days based on period
    const daysToShow = period === "daily" ? 1 : period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { minutes: 0, sessions: 0 };
    }

    // Aggregate logs
    logs.forEach(log => {
      const dateStr = new Date(log.completedAt!).toISOString().split('T')[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].minutes += log.duration || 0;
        dailyStats[dateStr].sessions += 1;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getProgressTrends(userId: string, period: string = "weekly", startTs?: number): Promise<{
    label: string; shotsMade: number; shotsAttempted: number;
    threesMade: number; threesAttempted: number;
    freeThrowsMade: number; freeThrowsAttempted: number;
    layupsMade: number; layupsAttempted: number;
    midRangeMade: number; midRangeAttempted: number;
    minutes: number; sessions: number;
  }[]> {
    const now = new Date();
    type BucketEntry = { key: string; label: string; start: Date; end: Date };
    const buckets: BucketEntry[] = [];

    if (period === "weekly" || period === "daily") {
      // Last 7 days day-by-day
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        buckets.push({
          key: d.toISOString().split("T")[0],
          label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          start: d, end,
        });
      }
    } else if (period === "monthly") {
      // Current month day-by-day
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      let cursor = new Date(firstDay);
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= now) {
        const dayStart = new Date(cursor);
        const dayEnd = new Date(cursor);
        dayEnd.setHours(23, 59, 59, 999);
        buckets.push({
          key: dayStart.toISOString().split("T")[0],
          label: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          start: dayStart, end: dayEnd,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // Annual: each month Jan–Dec of current year
      for (let m = 0; m < 12; m++) {
        const ms = new Date(now.getFullYear(), m, 1);
        const me = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59, 999);
        buckets.push({
          key: `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`,
          label: ms.toLocaleDateString("en-US", { month: "short" }),
          start: ms, end: me,
        });
      }
    }

    const startDate = buckets[0].start;
    const logs = await db.select().from(trainingLogs).where(and(
      eq(trainingLogs.userId, userId),
      gte(trainingLogs.completedAt, startDate)
    ));

    type TrendBucket = {
      label: string; shotsMade: number; shotsAttempted: number;
      threesMade: number; threesAttempted: number;
      freeThrowsMade: number; freeThrowsAttempted: number;
      layupsMade: number; layupsAttempted: number;
      midRangeMade: number; midRangeAttempted: number;
      minutes: number; sessions: number;
    };

    const bucketMap: Record<string, TrendBucket> = {};
    for (const b of buckets) {
      bucketMap[b.key] = {
        label: b.label, shotsMade: 0, shotsAttempted: 0,
        threesMade: 0, threesAttempted: 0,
        freeThrowsMade: 0, freeThrowsAttempted: 0,
        layupsMade: 0, layupsAttempted: 0,
        midRangeMade: 0, midRangeAttempted: 0,
        minutes: 0, sessions: 0,
      };
    }

    for (const log of logs) {
      if (!log.completedAt) continue;
      const logDate = new Date(log.completedAt);
      let bucketKey: string | null = null;

      if (period === "weekly" || period === "daily") {
        bucketKey = logDate.toISOString().split("T")[0];
      } else if (period === "monthly") {
        bucketKey = logDate.toISOString().split("T")[0];
      } else {
        bucketKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!bucketKey || !bucketMap[bucketKey]) continue;
      const bk = bucketMap[bucketKey];
      bk.sessions += 1;
      bk.minutes += log.duration || 0;

      const made = log.shotsMade || 0;
      const attempted = log.shotsAttempted || 0;
      if (made > 0 || attempted > 0) {
        bk.shotsMade += made;
        bk.shotsAttempted += attempted;
        if (log.shotLocation) {
          const classification = LOCATION_CLASSIFICATIONS[log.shotLocation as ShotLocation];
          const loc = log.shotLocation as string;
          if (classification === "3-pointer") {
            bk.threesMade += made; bk.threesAttempted += attempted;
          } else if (classification === "free-throw") {
            bk.freeThrowsMade += made; bk.freeThrowsAttempted += attempted;
          } else if (classification === "2-pointer") {
            if (loc.includes("block") || loc.includes("layup")) {
              bk.layupsMade += made; bk.layupsAttempted += attempted;
            } else {
              bk.midRangeMade += made; bk.midRangeAttempted += attempted;
            }
          } else if (!classification && loc.includes("layup")) {
            bk.layupsMade += made; bk.layupsAttempted += attempted;
          }
        }
      }
    }

    return buckets.map(b => bucketMap[b.key]);
  }

  async getCategoryStats(userId: string, period: string = "weekly", startTs?: number): Promise<{ category: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period, startTs);
    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    const drillIds = Array.from(new Set(logs.map(l => l.drillId)));
    
    if (drillIds.length === 0) return [];

    const drillsData = await db.select()
      .from(drills)
      .where(sql`${drills.id} IN ${drillIds}`);

    const drillCategoryMap = new Map(drillsData.map(d => [d.id, d.category]));

    const categoryStats: Record<string, { minutes: number; sessions: number }> = {};

    logs.forEach(log => {
      const category = drillCategoryMap.get(log.drillId) || 'unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { minutes: 0, sessions: 0 };
      }
      categoryStats[category].minutes += log.duration || 0;
      categoryStats[category].sessions += 1;
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  async getDashboardTrainingStats(userId: string, period: string = "weekly", startTs?: number): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const startDate = this.getDateRangeForPeriod(period, startTs);

    const logs = await db.select()
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        gte(trainingLogs.completedAt, startDate)
      ));

    let totalShotsMade = 0;
    let threePointersMade = 0;
    let freeThrowsMade = 0;
    let fieldGoalsMade = 0;
    let layupsMade = 0;

    for (const log of logs) {
      if (log.shotsMade && log.shotsMade > 0) {
        // Count ALL made shots regardless of location
        totalShotsMade += log.shotsMade;
        if (log.shotLocation) {
          const classification = LOCATION_CLASSIFICATIONS[log.shotLocation as ShotLocation];
          const loc = log.shotLocation as string;
          if (classification === "3-pointer") threePointersMade += log.shotsMade;
          else if (classification === "free-throw") freeThrowsMade += log.shotsMade;
          else if (classification === "2-pointer") {
            if (loc.includes("block") || loc.includes("layup")) {
              layupsMade += log.shotsMade;
            } else {
              fieldGoalsMade += log.shotsMade;
            }
          } else if (!classification) {
            // Locations not in LOCATION_CLASSIFICATIONS (e.g. left-hand-layup, right-hand-layup)
            if (loc.includes("layup")) {
              layupsMade += log.shotsMade;
            }
            // All other unrecognised locations are left uncategorised (total still counts)
          }
        }
      }
    }

    if (totalShotsMade > 0) result["totalShotsMade"] = totalShotsMade;
    if (threePointersMade > 0) result["threePointersMade"] = threePointersMade;
    if (freeThrowsMade > 0) result["freeThrowsMade"] = freeThrowsMade;
    if (fieldGoalsMade > 0) result["fieldGoalsMade"] = fieldGoalsMade;
    if (layupsMade > 0) result["layupsMade"] = layupsMade;

    const totalConditioningMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    if (totalConditioningMinutes > 0) result["conditioningTime"] = totalConditioningMinutes;

    const logIds = logs.map(l => l.id);
    if (logIds.length > 0) {
      const metrics = await db.select({
        metricId: trainingLogMetrics.metricId,
        value: trainingLogMetrics.value,
        trainingLogId: trainingLogMetrics.trainingLogId,
      })
        .from(trainingLogMetrics)
        .where(inArray(trainingLogMetrics.trainingLogId, logIds));

      const templates = await db.select().from(metricTemplates);
      const templateMap = new Map(templates.map(t => [t.id, t]));

      const logDrillMap = new Map(logs.map(l => [l.id, l.drillId]));
      const drillIds = Array.from(new Set(logs.map(l => l.drillId).filter(Boolean))) as string[];
      let drillTitleMap = new Map<string, string>();
      if (drillIds.length > 0) {
        const drillsData = await db.select({ id: drills.id, title: drills.title })
          .from(drills)
          .where(inArray(drills.id, drillIds));
        drillTitleMap = new Map(drillsData.map(d => [d.id, d.title.toLowerCase()]));
      }

      const metricTotals: Record<string, number> = {};
      let metricShotsByDrill: { drillId: string | null; templateName: string; value: number }[] = [];
      for (const m of metrics) {
        const tmpl = templateMap.get(m.metricId);
        if (!tmpl || !m.value) continue;
        const val = Number(m.value);
        if (val <= 0) continue;
        if (!metricTotals[tmpl.name]) metricTotals[tmpl.name] = 0;
        metricTotals[tmpl.name] += val;

        if (tmpl.name === "shot(s)_made") {
          const drillId = logDrillMap.get(m.trainingLogId) || null;
          metricShotsByDrill.push({ drillId, templateName: tmpl.name, value: val });
        }
      }

      const ballHandlingTime = (metricTotals["time"] || 0);
      const leftHandDribbles = (metricTotals["left_hand_dribbles"] || 0) + (metricTotals["left_hand"] || 0);
      const rightHandDribbles = (metricTotals["right_hand_dribbles"] || 0) + (metricTotals["right_hand"] || 0);
      const totalDribbles = (metricTotals["total_dribbles"] || 0) + (metricTotals["dribbles"] || 0);
      const passesMade = (metricTotals["passes"] || 0) + (metricTotals["total_passes"] || 0) + (metricTotals["left_hand_passes"] || 0) + (metricTotals["right_hand_passes"] || 0);
      const formShotsMade = metricTotals["form_shots_made"] || 0;
      const metricLayups = (metricTotals["total_layups"] || 0) + (metricTotals["left_hand_layups"] || 0) + (metricTotals["right_hand_layups"] || 0);

      // Note: shot totals (totalShotsMade, freeThrowsMade, etc.) are derived from
      // training_logs.shotsMade + shotLocation above — do NOT add metric shots on top (double-count).

      if (metricLayups > 0) {
        result["layupsMade"] = (result["layupsMade"] || 0) + metricLayups;
      }

      const totalBallHandling = leftHandDribbles + rightHandDribbles + totalDribbles;

      if (totalBallHandling > 0 || ballHandlingTime > 0) result["timeBallHandling"] = totalBallHandling || ballHandlingTime;
      if (passesMade > 0) result["passesMade"] = passesMade;
      if (leftHandDribbles > 0) result["leftHandBallHandling"] = leftHandDribbles;
      if (rightHandDribbles > 0) result["rightHandBallHandling"] = rightHandDribbles;
      if (formShotsMade > 0) result["formShotsMade"] = formShotsMade;
    }

    return result;
  }

  // Benchmarks
  async getBenchmarks(): Promise<Benchmark[]> {
    return await db.select().from(benchmarks);
  }

  // Video Library
  async getVideoLibrary(): Promise<VideoLibrary[]> {
    return await db.select().from(videoLibrary).orderBy(desc(videoLibrary.createdAt));
  }

  async getVideoLibraryById(id: string): Promise<VideoLibrary | undefined> {
    const [video] = await db.select().from(videoLibrary).where(eq(videoLibrary.id, id));
    return video;
  }

  async createVideoLibraryItem(video: InsertVideoLibrary): Promise<VideoLibrary> {
    const [newVideo] = await db.insert(videoLibrary).values(video as any).returning();
    return newVideo;
  }

  async updateVideoLibraryItem(id: string, video: Partial<InsertVideoLibrary>): Promise<VideoLibrary | undefined> {
    const [updated] = await db.update(videoLibrary)
      .set(video as any)
      .where(eq(videoLibrary.id, id))
      .returning();
    return updated;
  }

  async deleteVideoLibraryItem(id: string): Promise<boolean> {
    await db.delete(videoLibrary).where(eq(videoLibrary.id, id));
    return true;
  }

  // PDF Library
  async getPdfLibrary(): Promise<PdfLibrary[]> {
    return await db.select().from(pdfLibrary).orderBy(desc(pdfLibrary.createdAt));
  }

  async getPdfLibraryById(id: string): Promise<PdfLibrary | undefined> {
    const [pdf] = await db.select().from(pdfLibrary).where(eq(pdfLibrary.id, id));
    return pdf;
  }

  async createPdfLibraryItem(pdf: InsertPdfLibrary): Promise<PdfLibrary> {
    const [newPdf] = await db.insert(pdfLibrary).values(pdf as any).returning();
    return newPdf;
  }

  async updatePdfLibraryItem(id: string, pdf: Partial<InsertPdfLibrary>): Promise<PdfLibrary | undefined> {
    const [updated] = await db.update(pdfLibrary)
      .set(pdf as any)
      .where(eq(pdfLibrary.id, id))
      .returning();
    return updated;
  }

  async deletePdfLibraryItem(id: string): Promise<boolean> {
    await db.delete(pdfLibrary).where(eq(pdfLibrary.id, id));
    return true;
  }

  async getTutorialVideos(): Promise<TutorialVideo[]> {
    return await db.select().from(tutorialVideos).orderBy(desc(tutorialVideos.createdAt));
  }

  async getTutorialVideoByKey(key: string): Promise<TutorialVideo | undefined> {
    const [video] = await db.select().from(tutorialVideos).where(eq(tutorialVideos.key, key));
    return video;
  }

  async upsertTutorialVideo(data: InsertTutorialVideo): Promise<TutorialVideo> {
    const existing = await this.getTutorialVideoByKey(data.key);
    if (existing) {
      const [updated] = await db.update(tutorialVideos)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(tutorialVideos.key, data.key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(tutorialVideos).values(data as any).returning();
    return created;
  }

  async deleteTutorialVideo(key: string): Promise<boolean> {
    await db.delete(tutorialVideos).where(eq(tutorialVideos.key, key));
    return true;
  }

  // Metric Templates
  async getMetricTemplates(): Promise<MetricTemplate[]> {
    return await db.select().from(metricTemplates).orderBy(metricTemplates.name);
  }

  async getMetricTemplateById(id: string): Promise<MetricTemplate | undefined> {
    const [template] = await db.select().from(metricTemplates).where(eq(metricTemplates.id, id));
    return template;
  }

  async createMetricTemplate(template: InsertMetricTemplate): Promise<MetricTemplate> {
    const [newTemplate] = await db.insert(metricTemplates).values(template as any).returning();
    return newTemplate;
  }

  async updateMetricTemplate(id: string, template: Partial<InsertMetricTemplate>): Promise<MetricTemplate | undefined> {
    const [updated] = await db.update(metricTemplates)
      .set(template as any)
      .where(eq(metricTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteMetricTemplate(id: string): Promise<boolean> {
    await db.delete(metricTemplates).where(eq(metricTemplates.id, id));
    return true;
  }

  // Shot Locations
  async getShotLocations(): Promise<ShotLocationDB[]> {
    return await db.select().from(shotLocations).orderBy(shotLocations.sortOrder);
  }

  async createShotLocation(data: InsertShotLocation): Promise<ShotLocationDB> {
    const [row] = await db.insert(shotLocations).values(data).returning();
    return row;
  }

  async updateShotLocation(id: string, data: Partial<InsertShotLocation>): Promise<ShotLocationDB | undefined> {
    const [row] = await db.update(shotLocations).set(data).where(eq(shotLocations.id, id)).returning();
    return row;
  }

  async deleteShotLocation(id: string): Promise<boolean> {
    await db.delete(shotLocations).where(eq(shotLocations.id, id));
    return true;
  }

  // Shot Types
  async getShotTypes(): Promise<ShotTypeDB[]> {
    return await db.select().from(shotTypes).orderBy(shotTypes.sortOrder);
  }

  async createShotType(data: InsertShotType): Promise<ShotTypeDB> {
    const [row] = await db.insert(shotTypes).values(data).returning();
    return row;
  }

  async updateShotType(id: string, data: Partial<InsertShotType>): Promise<ShotTypeDB | undefined> {
    const [row] = await db.update(shotTypes).set(data).where(eq(shotTypes.id, id)).returning();
    return row;
  }

  async deleteShotType(id: string): Promise<boolean> {
    await db.delete(shotTypes).where(eq(shotTypes.id, id));
    return true;
  }

  // Drill Metrics
  async getDrillMetrics(drillId: string): Promise<DrillMetric[]> {
    return await db.select()
      .from(drillMetrics)
      .where(eq(drillMetrics.drillId, drillId))
      .orderBy(drillMetrics.sortOrder);
  }

  async getDrillMetricsWithTemplates(drillId: string): Promise<Array<DrillMetric & { template: MetricTemplate }>> {
    const results = await db.select({
      drillMetric: drillMetrics,
      template: metricTemplates,
    })
      .from(drillMetrics)
      .innerJoin(metricTemplates, eq(drillMetrics.metricTemplateId, metricTemplates.id))
      .where(eq(drillMetrics.drillId, drillId))
      .orderBy(drillMetrics.sortOrder);
    
    return results.map(r => ({
      ...r.drillMetric,
      template: r.template
    }));
  }

  async setDrillMetrics(drillId: string, metricTemplateIds: string[]): Promise<DrillMetric[]> {
    // Delete existing drill metrics
    await db.delete(drillMetrics).where(eq(drillMetrics.drillId, drillId));
    
    if (metricTemplateIds.length === 0) return [];
    
    // Insert new drill metrics
    const values = metricTemplateIds.map((id, index) => ({
      drillId,
      metricTemplateId: id,
      sortOrder: index,
      isRequired: false,
    }));
    
    const inserted = await db.insert(drillMetrics).values(values).returning();
    return inserted;
  }

  async createDrillMetric(metric: InsertDrillMetric): Promise<DrillMetric> {
    const [newMetric] = await db.insert(drillMetrics).values(metric as any).returning();
    return newMetric;
  }

  async updateDrillMetric(id: string, metric: Partial<InsertDrillMetric>): Promise<DrillMetric | undefined> {
    const [updated] = await db.update(drillMetrics)
      .set(metric as any)
      .where(eq(drillMetrics.id, id))
      .returning();
    return updated;
  }

  async deleteDrillMetric(id: string): Promise<boolean> {
    await db.delete(drillMetrics).where(eq(drillMetrics.id, id));
    return true;
  }

  // Training Log Metrics
  async getTrainingLogMetrics(trainingLogId: string): Promise<TrainingLogMetric[]> {
    return await db.select()
      .from(trainingLogMetrics)
      .where(eq(trainingLogMetrics.trainingLogId, trainingLogId));
  }

  async saveTrainingLogMetrics(trainingLogId: string, metrics: Array<{ metricId: string; value: number }>): Promise<TrainingLogMetric[]> {
    // Delete existing metrics for this training log first
    await db.delete(trainingLogMetrics).where(eq(trainingLogMetrics.trainingLogId, trainingLogId));
    
    if (metrics.length === 0) return [];
    
    // Insert new metrics
    const values = metrics.map(m => ({
      trainingLogId,
      metricId: m.metricId,
      value: String(m.value)
    }));
    
    const inserted = await db.insert(trainingLogMetrics).values(values).returning();
    return inserted;
  }

  // Workouts
  async getWorkouts(): Promise<Workout[]> {
    return await db.select().from(workouts).orderBy(desc(workouts.createdAt));
  }

  async getHandlzWorkouts(): Promise<Workout[]> {
    return await db.select().from(workouts)
      .where(sql`${workouts.userId} IS NULL`)
      .orderBy(workouts.name);
  }

  async getUserWorkouts(userId: string): Promise<Workout[]> {
    return await db.select().from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.createdAt));
  }

  async getWorkoutById(id: string): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async getWorkoutWithDrills(id: string): Promise<{ workout: Workout; drills: Array<WorkoutDrill & { drill: Drill }> } | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    if (!workout) return undefined;

    const results = await db.select({
      workoutDrill: workoutDrills,
      drill: drills
    })
      .from(workoutDrills)
      .innerJoin(drills, eq(workoutDrills.drillId, drills.id))
      .where(eq(workoutDrills.workoutId, id))
      .orderBy(workoutDrills.sortOrder);

    return {
      workout,
      drills: results.map(r => ({
        ...r.workoutDrill,
        drill: r.drill
      }))
    };
  }

  async createWorkout(workout: InsertWorkout, drillIds: string[]): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout as any).returning();
    
    if (drillIds.length > 0) {
      const drillValues = drillIds.map((drillId, index) => ({
        workoutId: newWorkout.id,
        drillId,
        sortOrder: index
      }));
      await db.insert(workoutDrills).values(drillValues);
    }
    
    return newWorkout;
  }

  async toggleWorkoutFavorite(id: string): Promise<Workout | undefined> {
    const [updated] = await db.update(workouts)
      .set({ isFavorite: sql`NOT ${workouts.isFavorite}`, updatedAt: new Date() })
      .where(eq(workouts.id, id))
      .returning();
    return updated || undefined;
  }

  async updateWorkout(id: string, workout: Partial<InsertWorkout>, drillIds?: string[]): Promise<Workout | undefined> {
    const [updated] = await db.update(workouts)
      .set({ ...workout, updatedAt: new Date() } as any)
      .where(eq(workouts.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    // Update drills if provided
    if (drillIds !== undefined) {
      await db.delete(workoutDrills).where(eq(workoutDrills.workoutId, id));
      
      if (drillIds.length > 0) {
        const drillValues = drillIds.map((drillId, index) => ({
          workoutId: id,
          drillId,
          sortOrder: index
        }));
        await db.insert(workoutDrills).values(drillValues);
      }
    }
    
    return updated;
  }

  async deleteWorkout(id: string): Promise<boolean> {
    // Delete associated workout drills first
    await db.delete(workoutDrills).where(eq(workoutDrills.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));
    return true;
  }

  // Favorite Drills
  async getUserFavoriteDrills(userId: string): Promise<string[]> {
    const rows = await db.select({ drillId: userFavoriteDrills.drillId })
      .from(userFavoriteDrills)
      .where(eq(userFavoriteDrills.userId, userId));
    return rows.map(r => r.drillId);
  }

  async addFavoriteDrill(userId: string, drillId: string): Promise<void> {
    const existing = await db.select().from(userFavoriteDrills)
      .where(and(eq(userFavoriteDrills.userId, userId), eq(userFavoriteDrills.drillId, drillId)));
    if (existing.length === 0) {
      await db.insert(userFavoriteDrills).values({ userId, drillId });
    }
  }

  async removeFavoriteDrill(userId: string, drillId: string): Promise<void> {
    await db.delete(userFavoriteDrills)
      .where(and(eq(userFavoriteDrills.userId, userId), eq(userFavoriteDrills.drillId, drillId)));
  }

  // Career Profiles
  async getCareerProfile(userId: string): Promise<CareerProfile | undefined> {
    const [profile] = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId));
    return profile;
  }

  async createCareerProfile(profile: InsertCareerProfile): Promise<CareerProfile> {
    const [newProfile] = await db.insert(careerProfiles).values(profile as any).returning();
    return newProfile;
  }

  async updateCareerProfile(userId: string, profile: Partial<InsertCareerProfile>): Promise<CareerProfile | undefined> {
    const [updated] = await db.update(careerProfiles)
      .set({ ...profile, updatedAt: new Date() } as any)
      .where(eq(careerProfiles.userId, userId))
      .returning();
    return updated;
  }

  async addXpToCareer(userId: string, xpToAdd: number): Promise<CareerProfile | undefined> {
    const existingProfile = await this.getCareerProfile(userId);
    if (!existingProfile) return undefined;

    const newXp = (existingProfile.xp || 0) + xpToAdd;
    const newTotalXp = (existingProfile.totalXp || 0) + xpToAdd;
    
    // Calculate level based on XP (100 XP per level, increasing by 50 each level)
    let level = existingProfile.level || 1;
    let xpForNextLevel = level * 100 + 50;
    let currentXp = newXp;
    
    while (currentXp >= xpForNextLevel) {
      currentXp -= xpForNextLevel;
      level++;
      xpForNextLevel = level * 100 + 50;
    }

    const [updated] = await db.update(careerProfiles)
      .set({ 
        xp: currentXp, 
        totalXp: newTotalXp, 
        level,
        updatedAt: new Date() 
      } as any)
      .where(eq(careerProfiles.userId, userId))
      .returning();
    
    return updated;
  }

  // Achievements
  async getAchievements(): Promise<CareerAchievement[]> {
    return await db.select().from(careerAchievements).orderBy(careerAchievements.name);
  }

  async getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: CareerAchievement }>> {
    const results = await db
      .select()
      .from(userAchievements)
      .innerJoin(careerAchievements, eq(userAchievements.achievementId, careerAchievements.id))
      .where(eq(userAchievements.userId, userId));
    
    return results.map(r => ({
      ...r.user_achievements,
      achievement: r.career_achievements
    }));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Check if already unlocked
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ));
    
    if (existing) return existing;

    const [newAchievement] = await db
      .insert(userAchievements)
      .values({ userId, achievementId })
      .returning();
    
    // Add XP from achievement
    const [achievement] = await db
      .select()
      .from(careerAchievements)
      .where(eq(careerAchievements.id, achievementId));
    
    if (achievement?.xpReward) {
      await this.addXpToCareer(userId, achievement.xpReward);
    }
    
    return newAchievement;
  }

  async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];
    
    // Get user's stats
    const stats = await this.getUserStats(userId);
    const allAchievements = await this.getAchievements();
    const userAchievementsList = await this.getUserAchievements(userId);
    const unlockedIds = new Set(userAchievementsList.map(ua => ua.achievementId));
    
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;
      
      let shouldUnlock = false;
      const [reqType, reqDetail] = achievement.requirement.split(':');
      
      switch (reqType) {
        case 'sessions':
          shouldUnlock = stats.totalSessions >= achievement.requirementValue;
          break;
        case 'minutes':
          shouldUnlock = stats.totalMinutes >= achievement.requirementValue;
          break;
        case 'streak':
          shouldUnlock = stats.streak >= achievement.requirementValue;
          break;
        case 'score':
          shouldUnlock = stats.avgScore >= achievement.requirementValue;
          break;
      }
      
      if (shouldUnlock) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        unlockedAchievements.push(unlocked);
      }
    }
    
    return unlockedAchievements;
  }

  // Challenges
  async getChallenges(): Promise<Challenge[]> {
    return await db.select().from(challenges).orderBy(desc(challenges.createdAt));
  }

  async getAppGeneratedChallenges(): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.isAppGenerated, true));
  }

  async getUserCreatedChallenges(userId: string): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.createdBy, userId));
  }

  async getChallengeById(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [newChallenge] = await db.insert(challenges).values(challenge).returning();
    return newChallenge;
  }

  async updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined> {
    const [updated] = await db.update(challenges).set(challenge).where(eq(challenges.id, id)).returning();
    return updated;
  }

  async deleteChallenge(id: string): Promise<boolean> {
    const result = await db.delete(challenges).where(eq(challenges.id, id));
    return true;
  }

  async getUserChallenges(userId: string): Promise<Array<UserChallenge & { challenge: Challenge }>> {
    const results = await db
      .select()
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId))
      .orderBy(desc(userChallenges.startedAt));
    
    return results.map(r => ({
      ...r.user_challenges,
      challenge: r.challenges
    }));
  }

  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    // Check if already started
    const [existing] = await db
      .select()
      .from(userChallenges)
      .where(and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId)
      ));
    
    if (existing) return existing;

    const [newUserChallenge] = await db
      .insert(userChallenges)
      .values({ userId, challengeId })
      .returning();
    
    return newUserChallenge;
  }

  async updateChallengeProgress(id: string, currentValue: number): Promise<UserChallenge | undefined> {
    const [updated] = await db
      .update(userChallenges)
      .set({ currentValue })
      .where(eq(userChallenges.id, id))
      .returning();
    return updated;
  }

  async completeChallenge(id: string): Promise<UserChallenge | undefined> {
    const [updated] = await db
      .update(userChallenges)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(userChallenges.id, id))
      .returning();
    
    // Add XP reward if completed
    if (updated) {
      const challenge = await this.getChallengeById(updated.challengeId);
      if (challenge?.xpReward) {
        await this.addXpToCareer(updated.userId, challenge.xpReward);
      }
    }
    
    return updated;
  }

  // Personal Records
  async getUserPersonalRecords(userId: string): Promise<Array<PersonalRecord & { drill: { title: string } }>> {
    const results = await db
      .select()
      .from(personalRecords)
      .leftJoin(drills, eq(personalRecords.drillId, drills.id))
      .where(eq(personalRecords.userId, userId))
      .orderBy(desc(personalRecords.achievedAt));
    
    return results.map(r => ({
      ...r.personal_records,
      drill: { title: r.drills?.title || (r.personal_records.source === "game" ? "Game Stats" : "Unknown") }
    }));
  }

  async createPersonalRecord(record: InsertPersonalRecord): Promise<PersonalRecord> {
    const [newRecord] = await db.insert(personalRecords).values(record).returning();
    return newRecord;
  }

  async checkAndCreateDrillPRs(userId: string, drillId: string, trainingLogId: string, metrics: { metricName: string; value: number }[]): Promise<PersonalRecord[]> {
    const created: PersonalRecord[] = [];
    for (const metric of metrics) {
      if (metric.value <= 0) continue;
      const existing = await db
        .select()
        .from(personalRecords)
        .where(and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.drillId, drillId),
          eq(personalRecords.metricName, metric.metricName),
          eq(personalRecords.source, "drill")
        ))
        .orderBy(desc(personalRecords.newValue))
        .limit(1);
      
      const currentBest = existing.length > 0 ? Number(existing[0].newValue) : 0;
      if (metric.value > currentBest) {
        const pr = await this.createPersonalRecord({
          userId,
          drillId,
          metricName: metric.metricName,
          previousValue: currentBest.toFixed(2),
          newValue: metric.value.toFixed(2),
          trainingLogId,
          source: "drill"
        });
        created.push(pr);
      }
    }
    return created;
  }

  async checkAndCreateGamePRs(userId: string, gameId: string, stats: Record<string, number>): Promise<PersonalRecord[]> {
    const created: PersonalRecord[] = [];
    const statNames: Record<string, string> = {
      points: "Points",
      rebounds: "Rebounds",
      assists: "Assists",
      steals: "Steals",
      blocks: "Blocks",
      fgMade: "FG Made",
      threePtMade: "3PT Made",
      ftMade: "FT Made"
    };
    
    for (const [key, label] of Object.entries(statNames)) {
      const value = stats[key];
      if (value === undefined || value === null || value <= 0) continue;
      
      const existing = await db
        .select()
        .from(personalRecords)
        .where(and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.metricName, label),
          eq(personalRecords.source, "game")
        ))
        .orderBy(desc(personalRecords.newValue))
        .limit(1);
      
      const currentBest = existing.length > 0 ? Number(existing[0].newValue) : 0;
      if (value > currentBest) {
        const pr = await this.createPersonalRecord({
          userId,
          metricName: label,
          previousValue: currentBest.toFixed(2),
          newValue: value.toFixed(2),
          gameId,
          source: "game"
        });
        created.push(pr);
      }
    }
    return created;
  }

  // Team Awards
  async getUserTeamAwards(userId: string): Promise<TeamAward[]> {
    return await db.select().from(teamAwards).where(eq(teamAwards.userId, userId)).orderBy(desc(teamAwards.awardedAt));
  }

  async createTeamAward(award: InsertTeamAward): Promise<TeamAward> {
    const [newAward] = await db.insert(teamAwards).values(award).returning();
    return newAward;
  }

  async updateTeamAward(id: string, award: Partial<InsertTeamAward>): Promise<TeamAward | undefined> {
    const [updated] = await db.update(teamAwards).set(award).where(eq(teamAwards.id, id)).returning();
    return updated;
  }

  async deleteTeamAward(id: string): Promise<boolean> {
    await db.delete(teamAwards).where(eq(teamAwards.id, id));
    return true;
  }

  // Shot Stats (for heatmap)
  async getUserShotStats(userId: string, period: string = "weekly", startTs?: number): Promise<Array<{ location: string; made: number; missed: number }>> {
    const startDate = this.getDateRangeForPeriod(period, startTs);
    const logs = await db
      .select({
        location: trainingLogs.shotLocation,
        made: sql<number>`COALESCE(SUM(${trainingLogs.shotsMade}), 0)::int`,
        attempted: sql<number>`COALESCE(SUM(${trainingLogs.shotsAttempted}), 0)::int`
      })
      .from(trainingLogs)
      .where(and(
        eq(trainingLogs.userId, userId),
        sql`${trainingLogs.shotLocation} IS NOT NULL`,
        gte(trainingLogs.completedAt, startDate)
      ))
      .groupBy(trainingLogs.shotLocation);
    
    return logs
      .filter(l => l.location)
      .map(l => ({
        location: l.location!,
        made: l.made,
        missed: l.attempted - l.made
      }));
  }

  // Seasons
  async getUserSeasons(userId: string): Promise<Season[]> {
    return await db.select().from(seasons).where(eq(seasons.userId, userId)).orderBy(desc(seasons.createdAt));
  }

  async getPublicUserSeasons(userId: string): Promise<Season[]> {
    return await db.select().from(seasons).where(
      and(
        eq(seasons.userId, userId),
        or(eq(seasons.isPublicProfile, true), isNull(seasons.isPublicProfile))
      )
    ).orderBy(desc(seasons.createdAt));
  }

  async getSeasonWithGames(seasonId: string): Promise<{ season: Season; games: Game[] } | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));
    if (!season) return undefined;
    const seasonGames = await db.select().from(games).where(eq(games.seasonId, seasonId)).orderBy(desc(games.gameDate));
    return { season, games: seasonGames };
  }

  async createSeason(season: InsertSeason): Promise<Season> {
    const [newSeason] = await db.insert(seasons).values(season).returning();
    return newSeason;
  }

  async updateSeason(id: string, season: Partial<InsertSeason>): Promise<Season | undefined> {
    const [updated] = await db.update(seasons).set({ ...season, updatedAt: new Date() }).where(eq(seasons.id, id)).returning();
    return updated;
  }

  async deleteSeason(id: string): Promise<boolean> {
    await db.delete(games).where(eq(games.seasonId, id));
    await db.delete(seasons).where(eq(seasons.id, id));
    return true;
  }

  // Games
  async getSeasonGames(seasonId: string): Promise<Game[]> {
    return await db.select().from(games).where(eq(games.seasonId, seasonId)).orderBy(desc(games.gameDate));
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined> {
    const [updated] = await db.update(games).set({ ...game, updatedAt: new Date() }).where(eq(games.id, id)).returning();
    return updated;
  }

  async deleteGame(id: string): Promise<boolean> {
    await db.delete(games).where(eq(games.id, id));
    return true;
  }

  // Career Stats
  async getCareerStats(userId: string): Promise<{
    totalGames: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    totalSteals: number;
    totalBlocks: number;
    totalFgMade: number;
    totalFgAttempted: number;
    totalThreePtMade: number;
    totalThreePtAttempted: number;
    totalFtMade: number;
    totalFtAttempted: number;
    wins: number;
    losses: number;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    avgSteals: number;
    avgBlocks: number;
    seasonBreakdown: Array<{
      seasonId: string;
      seasonName: string;
      seasonType: string;
      year: string;
      gamesPlayed: number;
      avgPoints: number;
      avgRebounds: number;
      avgAssists: number;
      avgSteals: number;
      avgBlocks: number;
      totalPoints: number;
      totalRebounds: number;
      totalAssists: number;
      totalSteals: number;
      totalBlocks: number;
      totalFgMade: number;
      totalFgAttempted: number;
      totalThreePtMade: number;
      totalThreePtAttempted: number;
      totalFtMade: number;
      totalFtAttempted: number;
      wins: number;
      losses: number;
    }>;
  }> {
    const rows = await db
      .select({
        seasonId: seasons.id,
        seasonName: seasons.name,
        seasonType: seasons.seasonType,
        year: seasons.year,
        gamesPlayed: sql<number>`COUNT(${games.id})::int`,
        totalPoints: sql<number>`COALESCE(SUM(${games.points}), 0)::int`,
        totalRebounds: sql<number>`COALESCE(SUM(${games.rebounds}), 0)::int`,
        totalAssists: sql<number>`COALESCE(SUM(${games.assists}), 0)::int`,
        totalSteals: sql<number>`COALESCE(SUM(${games.steals}), 0)::int`,
        totalBlocks: sql<number>`COALESCE(SUM(${games.blocks}), 0)::int`,
        totalFgMade: sql<number>`COALESCE(SUM(${games.fgMade}), 0)::int`,
        totalFgAttempted: sql<number>`COALESCE(SUM(${games.fgAttempted}), 0)::int`,
        totalThreePtMade: sql<number>`COALESCE(SUM(${games.threePtMade}), 0)::int`,
        totalThreePtAttempted: sql<number>`COALESCE(SUM(${games.threePtAttempted}), 0)::int`,
        totalFtMade: sql<number>`COALESCE(SUM(${games.ftMade}), 0)::int`,
        totalFtAttempted: sql<number>`COALESCE(SUM(${games.ftAttempted}), 0)::int`,
        wins: sql<number>`COUNT(*) FILTER (WHERE ${games.result} = 'W')::int`,
        losses: sql<number>`COUNT(*) FILTER (WHERE ${games.result} = 'L')::int`,
      })
      .from(seasons)
      .innerJoin(games, eq(games.seasonId, seasons.id))
      .where(eq(seasons.userId, userId))
      .groupBy(seasons.id, seasons.name, seasons.seasonType, seasons.year, seasons.createdAt)
      .orderBy(desc(seasons.createdAt));

    let totalGames = 0, totalPoints = 0, totalRebounds = 0, totalAssists = 0;
    let totalSteals = 0, totalBlocks = 0, totalWins = 0, totalLosses = 0;
    let totalFgMade = 0, totalFgAttempted = 0, totalThreePtMade = 0, totalThreePtAttempted = 0;
    let totalFtMade = 0, totalFtAttempted = 0;

    const seasonBreakdown = rows.map(r => {
      totalGames += r.gamesPlayed;
      totalPoints += r.totalPoints;
      totalRebounds += r.totalRebounds;
      totalAssists += r.totalAssists;
      totalSteals += r.totalSteals;
      totalBlocks += r.totalBlocks;
      totalFgMade += r.totalFgMade;
      totalFgAttempted += r.totalFgAttempted;
      totalThreePtMade += r.totalThreePtMade;
      totalThreePtAttempted += r.totalThreePtAttempted;
      totalFtMade += r.totalFtMade;
      totalFtAttempted += r.totalFtAttempted;
      totalWins += r.wins;
      totalLosses += r.losses;
      return {
        seasonId: r.seasonId,
        seasonName: r.seasonName,
        seasonType: r.seasonType,
        year: r.year,
        gamesPlayed: r.gamesPlayed,
        avgPoints: Math.round((r.totalPoints / r.gamesPlayed) * 10) / 10,
        avgRebounds: Math.round((r.totalRebounds / r.gamesPlayed) * 10) / 10,
        avgAssists: Math.round((r.totalAssists / r.gamesPlayed) * 10) / 10,
        avgSteals: Math.round((r.totalSteals / r.gamesPlayed) * 10) / 10,
        avgBlocks: Math.round((r.totalBlocks / r.gamesPlayed) * 10) / 10,
        totalPoints: r.totalPoints,
        totalRebounds: r.totalRebounds,
        totalAssists: r.totalAssists,
        totalSteals: r.totalSteals,
        totalBlocks: r.totalBlocks,
        totalFgMade: r.totalFgMade,
        totalFgAttempted: r.totalFgAttempted,
        totalThreePtMade: r.totalThreePtMade,
        totalThreePtAttempted: r.totalThreePtAttempted,
        totalFtMade: r.totalFtMade,
        totalFtAttempted: r.totalFtAttempted,
        wins: r.wins,
        losses: r.losses,
      };
    });

    return {
      totalGames,
      totalPoints,
      totalRebounds,
      totalAssists,
      totalSteals,
      totalBlocks,
      totalFgMade,
      totalFgAttempted,
      totalThreePtMade,
      totalThreePtAttempted,
      totalFtMade,
      totalFtAttempted,
      wins: totalWins,
      losses: totalLosses,
      avgPoints: totalGames > 0 ? Math.round((totalPoints / totalGames) * 10) / 10 : 0,
      avgRebounds: totalGames > 0 ? Math.round((totalRebounds / totalGames) * 10) / 10 : 0,
      avgAssists: totalGames > 0 ? Math.round((totalAssists / totalGames) * 10) / 10 : 0,
      avgSteals: totalGames > 0 ? Math.round((totalSteals / totalGames) * 10) / 10 : 0,
      avgBlocks: totalGames > 0 ? Math.round((totalBlocks / totalGames) * 10) / 10 : 0,
      seasonBreakdown,
    };
  }
  // Drill Ratings
  async getDrillRatings(drillId: string): Promise<{ averageRating: number; totalRatings: number }> {
    const result = await db.select({
      avg: sql<number>`COALESCE(AVG(${drillRatings.rating}), 0)`,
      count: sql<number>`COUNT(*)::int`
    }).from(drillRatings).where(eq(drillRatings.drillId, drillId));
    return {
      averageRating: Math.round((result[0]?.avg || 0) * 10) / 10,
      totalRatings: result[0]?.count || 0
    };
  }

  async getUserDrillRating(drillId: string, userId: string): Promise<number | null> {
    const [rating] = await db.select().from(drillRatings)
      .where(and(eq(drillRatings.drillId, drillId), eq(drillRatings.userId, userId)));
    return rating?.rating ?? null;
  }

  async rateDrill(drillId: string, userId: string, rating: number): Promise<DrillRating> {
    const existing = await db.select().from(drillRatings)
      .where(and(eq(drillRatings.drillId, drillId), eq(drillRatings.userId, userId)));
    if (existing.length > 0) {
      const [updated] = await db.update(drillRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(drillRatings.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(drillRatings)
      .values({ drillId, userId, rating })
      .returning();
    return created;
  }

  async getDrillRatingsBatch(drillIds: string[]): Promise<Record<string, { averageRating: number; totalRatings: number }>> {
    if (drillIds.length === 0) return {};
    const results = await db.select({
      drillId: drillRatings.drillId,
      avg: sql<number>`COALESCE(AVG(${drillRatings.rating}), 0)`,
      count: sql<number>`COUNT(*)::int`
    }).from(drillRatings)
      .where(sql`${drillRatings.drillId} IN (${sql.join(drillIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(drillRatings.drillId);
    const map: Record<string, { averageRating: number; totalRatings: number }> = {};
    for (const r of results) {
      map[r.drillId] = {
        averageRating: Math.round((r.avg || 0) * 10) / 10,
        totalRatings: r.count || 0
      };
    }
    return map;
  }

  // Player Profiles
  async getPlayerProfile(userId: string): Promise<PlayerProfile | undefined> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
    return profile;
  }

  async getPlayerProfileBySlug(slug: string): Promise<PlayerProfile | undefined> {
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.slug, slug));
    return profile;
  }

  async upsertPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile> {
    const existing = await this.getPlayerProfile(profile.userId);
    if (existing) {
      const [updated] = await db.update(playerProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(playerProfiles.userId, profile.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(playerProfiles).values(profile).returning();
    return created;
  }

  // Trainer Teams
  async getCoachTeams(coachId: string, teamType?: string): Promise<TrainerTeam[]> {
    const conditions = [eq(trainerTeams.coachId, coachId)];
    if (teamType) {
      conditions.push(eq(trainerTeams.teamType, teamType));
    }
    return await db.select().from(trainerTeams).where(and(...conditions)).orderBy(desc(trainerTeams.createdAt));
  }

  async getTeamById(id: string): Promise<TrainerTeam | undefined> {
    const [team] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, id));
    return team;
  }

  async getTeamByCode(code: string): Promise<TrainerTeam | undefined> {
    const [team] = await db.select().from(trainerTeams).where(eq(trainerTeams.teamCode, code));
    return team;
  }

  async createTeam(team: InsertTrainerTeam): Promise<TrainerTeam> {
    const [created] = await db.insert(trainerTeams).values(team).returning();
    return created;
  }

  async updateTeam(id: string, team: Partial<InsertTrainerTeam>): Promise<TrainerTeam | undefined> {
    const [updated] = await db.update(trainerTeams)
      .set({ ...team, updatedAt: new Date() })
      .where(eq(trainerTeams.id, id))
      .returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    await db.delete(drillAssignments).where(eq(drillAssignments.teamId, id));
    const result = await db.delete(trainerTeams).where(eq(trainerTeams.id, id));
    return true;
  }

  // Team Members
  async getTeamMembers(teamId: string): Promise<Array<TeamMember & { user: { id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null } }>> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    const result = [];
    for (const member of members) {
      const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl
      }).from(users).where(eq(users.id, member.userId));
      if (user) {
        result.push({ ...member, user });
      }
    }
    return result;
  }

  async getUserTeams(userId: string): Promise<Array<TeamMember & { team: TrainerTeam }>> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const result = [];
    for (const member of members) {
      const [team] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, member.teamId));
      if (team) {
        result.push({ ...member, team });
      }
    }
    return result;
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(teamId: string, userId: string, updates: { position?: string; jerseyNumber?: string }): Promise<TeamMember | undefined> {
    const [updated] = await db.update(teamMembers)
      .set(updates)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return updated;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return true;
  }

  // Drill Assignments
  async getTeamAssignments(teamId: string): Promise<Array<DrillAssignment & { drill: Drill }>> {
    const assignments = await db.select().from(drillAssignments)
      .where(eq(drillAssignments.teamId, teamId))
      .orderBy(desc(drillAssignments.createdAt));
    const result = [];
    for (const assignment of assignments) {
      const [drill] = await db.select().from(drills).where(eq(drills.id, assignment.drillId));
      if (drill) {
        result.push({ ...assignment, drill });
      }
    }
    return result;
  }

  async getUserAssignments(userId: string): Promise<Array<DrillAssignment & { drill: Drill; team?: TrainerTeam }>> {
    const userTeamMembers = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = userTeamMembers.map(m => m.teamId);
    
    const rosterEntries = await db.select({ id: trainerPlayers.id })
      .from(trainerPlayers).where(eq(trainerPlayers.linkedUserId, userId));
    const allUserIds = [userId, ...rosterEntries.map(r => r.id)];
    
    let allAssignments: DrillAssignment[] = [];
    
    const directAssignments = await db.select().from(drillAssignments)
      .where(inArray(drillAssignments.assignedTo, allUserIds))
      .orderBy(desc(drillAssignments.createdAt));
    allAssignments.push(...directAssignments);
    
    if (teamIds.length > 0) {
      for (const tid of teamIds) {
        const teamAssignments = await db.select().from(drillAssignments)
          .where(and(eq(drillAssignments.teamId, tid), sql`${drillAssignments.assignedTo} IS NULL`))
          .orderBy(desc(drillAssignments.createdAt));
        allAssignments.push(...teamAssignments);
      }
    }

    const result = [];
    for (const assignment of allAssignments) {
      const [drill] = await db.select().from(drills).where(eq(drills.id, assignment.drillId));
      let team: TrainerTeam | undefined;
      if (assignment.teamId) {
        const [t] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, assignment.teamId));
        team = t;
      }
      if (drill) {
        result.push({ ...assignment, drill, team });
      }
    }
    return result;
  }

  async createDrillAssignment(assignment: InsertDrillAssignment): Promise<DrillAssignment> {
    const [created] = await db.insert(drillAssignments).values(assignment).returning();
    return created;
  }

  async getDrillAssignmentById(id: string): Promise<DrillAssignment | undefined> {
    const [assignment] = await db.select().from(drillAssignments).where(eq(drillAssignments.id, id));
    return assignment;
  }

  async updateDrillAssignmentStatus(id: string, status: string, trainingLogId?: string): Promise<DrillAssignment | undefined> {
    const [updated] = await db.update(drillAssignments)
      .set({ status, ...(trainingLogId ? { trainingLogId } : {}) })
      .where(eq(drillAssignments.id, id))
      .returning();
    return updated;
  }

  async getActiveAssignmentsForDrillAndUser(userId: string, drillId: string): Promise<DrillAssignment[]> {
    const rosterEntries = await db.select({ id: trainerPlayers.id })
      .from(trainerPlayers).where(eq(trainerPlayers.linkedUserId, userId));
    const allUserIds = [userId, ...rosterEntries.map(r => r.id)];

    const direct = await db.select().from(drillAssignments)
      .where(and(
        eq(drillAssignments.drillId, drillId),
        inArray(drillAssignments.assignedTo, allUserIds),
        sql`${drillAssignments.status} != 'completed'`
      ));

    const userTeamMembers = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = userTeamMembers.map(m => m.teamId);
    let teamWide: DrillAssignment[] = [];
    if (teamIds.length > 0) {
      teamWide = await db.select().from(drillAssignments)
        .where(and(
          eq(drillAssignments.drillId, drillId),
          inArray(drillAssignments.teamId, teamIds),
          isNull(drillAssignments.assignedTo),
          sql`${drillAssignments.status} != 'completed'`
        ));
    }

    const seen = new Set<string>();
    const combined: DrillAssignment[] = [];
    for (const a of [...direct, ...teamWide]) {
      if (!seen.has(a.id)) { seen.add(a.id); combined.push(a); }
    }
    return combined;
  }

  async getAllActiveAssignmentsForUser(userId: string): Promise<DrillAssignment[]> {
    const rosterEntries = await db.select({ id: trainerPlayers.id })
      .from(trainerPlayers).where(eq(trainerPlayers.linkedUserId, userId));
    const allUserIds = [userId, ...rosterEntries.map(r => r.id)];

    const direct = await db.select().from(drillAssignments)
      .where(and(
        inArray(drillAssignments.assignedTo, allUserIds),
        sql`${drillAssignments.status} != 'completed'`
      ));

    const userTeamMembers = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const teamIds = userTeamMembers.map(m => m.teamId);
    let teamWide: DrillAssignment[] = [];
    if (teamIds.length > 0) {
      teamWide = await db.select().from(drillAssignments)
        .where(and(
          inArray(drillAssignments.teamId, teamIds),
          isNull(drillAssignments.assignedTo),
          sql`${drillAssignments.status} != 'completed'`
        ));
    }

    const seen = new Set<string>();
    const combined: DrillAssignment[] = [];
    for (const a of [...direct, ...teamWide]) {
      if (!seen.has(a.id)) { seen.add(a.id); combined.push(a); }
    }
    return combined;
  }

  async deleteDrillAssignment(id: string): Promise<boolean> {
    await db.delete(drillAssignments).where(eq(drillAssignments.id, id));
    return true;
  }

  // Team Clubs
  async getTeamClubs(filters?: { organizationType?: string; state?: string; city?: string; ageGroup?: string; gender?: string; circuit?: string; query?: string }): Promise<TeamClub[]> {
    const conditions: any[] = [];
    if (filters?.organizationType) conditions.push(eq(teamClubs.organizationType, filters.organizationType));
    if (filters?.state) conditions.push(eq(teamClubs.state, filters.state));
    if (filters?.city) conditions.push(sql`LOWER(${teamClubs.city}) LIKE LOWER(${'%' + filters.city + '%'})`);
    if (filters?.ageGroup) conditions.push(sql`${filters.ageGroup} = ANY(${teamClubs.ageGroups})`);
    if (filters?.gender) conditions.push(eq(teamClubs.gender, filters.gender));
    if (filters?.circuit) conditions.push(eq(teamClubs.circuit, filters.circuit));
    if (filters?.query) {
      const q = '%' + filters.query + '%';
      conditions.push(sql`(LOWER(${teamClubs.name}) LIKE LOWER(${q}) OR LOWER(${teamClubs.city}) LIKE LOWER(${q}) OR LOWER(${teamClubs.state}) LIKE LOWER(${q}))`);
    }

    if (conditions.length > 0) {
      return await db.select().from(teamClubs).where(and(...conditions)).orderBy(teamClubs.name);
    }
    return await db.select().from(teamClubs).orderBy(teamClubs.name);
  }

  async getTeamClubById(id: string): Promise<TeamClub | undefined> {
    const [club] = await db.select().from(teamClubs).where(eq(teamClubs.id, id));
    return club;
  }

  async getTeamClubBySlug(slug: string): Promise<TeamClub | undefined> {
    const [club] = await db.select().from(teamClubs).where(eq(teamClubs.slug, slug));
    return club;
  }

  async createTeamClub(club: InsertTeamClub): Promise<TeamClub> {
    const [created] = await db.insert(teamClubs).values(club as any).returning();
    return created;
  }

  async updateTeamClub(id: string, club: Partial<InsertTeamClub>): Promise<TeamClub | undefined> {
    const [updated] = await db.update(teamClubs).set(club as any).where(eq(teamClubs.id, id)).returning();
    return updated;
  }

  async deleteTeamClub(id: string): Promise<boolean> {
    await db.delete(teamClubs).where(eq(teamClubs.id, id));
    return true;
  }

  // Leagues
  async getLeagues(filters?: { leagueType?: string; state?: string; city?: string; ageGroup?: string; season?: string; query?: string }): Promise<League[]> {
    const conditions: any[] = [];
    if (filters?.leagueType) conditions.push(eq(leagues.leagueType, filters.leagueType));
    if (filters?.state) conditions.push(eq(leagues.state, filters.state));
    if (filters?.city) conditions.push(sql`LOWER(${leagues.city}) LIKE LOWER(${'%' + filters.city + '%'})`);
    if (filters?.ageGroup) conditions.push(sql`${filters.ageGroup} = ANY(${leagues.ageGroups})`);
    if (filters?.season) conditions.push(sql`${filters.season} = ANY(${leagues.seasons})`);
    if (filters?.query) {
      const q = '%' + filters.query + '%';
      conditions.push(sql`(LOWER(${leagues.name}) LIKE LOWER(${q}) OR LOWER(${leagues.city}) LIKE LOWER(${q}) OR LOWER(${leagues.state}) LIKE LOWER(${q}))`);
    }

    if (conditions.length > 0) {
      return await db.select().from(leagues).where(and(...conditions)).orderBy(leagues.name);
    }
    return await db.select().from(leagues).orderBy(leagues.name);
  }

  async getLeagueById(id: string): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
    return league;
  }

  async getLeagueBySlug(slug: string): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.slug, slug));
    return league;
  }

  async createLeague(league: InsertLeague): Promise<League> {
    const [created] = await db.insert(leagues).values(league as any).returning();
    return created;
  }

  async updateLeague(id: string, league: Partial<InsertLeague>): Promise<League | undefined> {
    const [updated] = await db.update(leagues).set(league as any).where(eq(leagues.id, id)).returning();
    return updated;
  }

  async deleteLeague(id: string): Promise<boolean> {
    await db.delete(leagues).where(eq(leagues.id, id));
    return true;
  }

  // ===== MESSAGES =====

  async getConversations(userId: string): Promise<Array<{ partnerId: string; partnerName: string; partnerImage?: string; lastMessage: string; lastMessageAt: Date; unreadCount: number; teamId?: string; teamName?: string }>> {
    const rows = await db.execute(sql`
      WITH partner_messages AS (
        SELECT
          CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS partner_id,
          id, content, created_at, team_id, receiver_id, is_read
        FROM messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
      ),
      latest_per_partner AS (
        SELECT DISTINCT ON (partner_id)
          partner_id,
          content AS last_message,
          created_at AS last_message_at,
          team_id
        FROM partner_messages
        ORDER BY partner_id, created_at DESC
      ),
      unread_counts AS (
        SELECT
          partner_id,
          COUNT(*) AS unread_count
        FROM partner_messages
        WHERE receiver_id = ${userId} AND is_read = false
        GROUP BY partner_id
      )
      SELECT
        l.partner_id,
        COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, 'Unknown') AS partner_name,
        u.profile_image_url AS partner_image,
        l.last_message,
        l.last_message_at,
        COALESCE(uc.unread_count, 0)::int AS unread_count,
        l.team_id,
        t.name AS team_name
      FROM latest_per_partner l
      LEFT JOIN users u ON u.id = l.partner_id
      LEFT JOIN unread_counts uc ON uc.partner_id = l.partner_id
      LEFT JOIN trainer_teams t ON t.id = l.team_id
      ORDER BY l.last_message_at DESC
    `);

    return (rows.rows as any[]).map((row: any) => ({
      partnerId: row.partner_id,
      partnerName: row.partner_name || 'Unknown',
      partnerImage: row.partner_image || undefined,
      lastMessage: row.last_message,
      lastMessageAt: new Date(row.last_message_at),
      unreadCount: Number(row.unread_count) || 0,
      teamId: row.team_id || undefined,
      teamName: row.team_name || undefined,
    }));
  }

  async getMessages(userId: string, partnerId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
          and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt);
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessagesRead(userId: string, senderId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.receiverId, userId), eq(messages.senderId, senderId), eq(messages.isRead, false)));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  // ===== PLAYER INVITATIONS =====

  async getTeamInvitations(teamId: string): Promise<PlayerInvitation[]> {
    return await db.select().from(playerInvitations)
      .where(eq(playerInvitations.teamId, teamId))
      .orderBy(desc(playerInvitations.createdAt));
  }

  async getInvitationsByTrainer(trainerId: string): Promise<PlayerInvitation[]> {
    return await db.select().from(playerInvitations)
      .where(eq(playerInvitations.invitedBy, trainerId))
      .orderBy(desc(playerInvitations.createdAt));
  }

  async createInvitation(invitation: InsertPlayerInvitation): Promise<PlayerInvitation> {
    const [created] = await db.insert(playerInvitations).values(invitation).returning();
    return created;
  }

  async getInvitationsByEmail(email: string): Promise<PlayerInvitation[]> {
    return await db.select().from(playerInvitations)
      .where(and(eq(playerInvitations.email, email), eq(playerInvitations.status, "pending")));
  }

  async updateInvitationStatus(id: string, status: string): Promise<PlayerInvitation | undefined> {
    const [updated] = await db.update(playerInvitations)
      .set({ status })
      .where(eq(playerInvitations.id, id))
      .returning();
    return updated;
  }

  async getInvitationById(id: string): Promise<PlayerInvitation | undefined> {
    const [invitation] = await db.select().from(playerInvitations).where(eq(playerInvitations.id, id));
    return invitation;
  }

  async deleteInvitation(id: string): Promise<boolean> {
    await db.delete(playerInvitations).where(eq(playerInvitations.id, id));
    return true;
  }

  // ===== PLAYER VIDEOS (for coach/trainer) =====

  async getPlayerVideos(playerIds: string[]): Promise<Array<{ userId: string; playerName: string; videos: any[] }>> {
    if (playerIds.length === 0) return [];
    const result: Array<{ userId: string; playerName: string; videos: any[] }> = [];
    for (const playerId of playerIds) {
      const videos = await db.select().from(userVideos).where(eq(userVideos.userId, playerId)).orderBy(desc(userVideos.createdAt));
      const [user] = await db.select().from(users).where(eq(users.id, playerId));
      const playerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';
      if (videos.length > 0) {
        result.push({ userId: playerId, playerName, videos });
      }
    }
    return result;
  }

  async getSharedVideos(teamId: string, assignmentId?: string): Promise<Array<{ id: string; userId: string; playerName: string; title: string; videoUrl: string; description: string | null; assignmentId: string | null; createdAt: Date | null }>> {
    const conditions = [eq(sharedVideos.teamId, teamId)];
    if (assignmentId) {
      conditions.push(eq(sharedVideos.assignmentId, assignmentId));
    }
    const videos = await db.select().from(sharedVideos).where(and(...conditions)).orderBy(desc(sharedVideos.createdAt));
    const result = [];
    for (const video of videos) {
      const [user] = await db.select().from(users).where(eq(users.id, video.userId));
      const playerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';
      result.push({ ...video, playerName });
    }
    return result;
  }

  async createSharedVideo(data: { userId: string; teamId: string; title: string; videoUrl: string; description?: string; assignmentId?: string }): Promise<SharedVideo> {
    const [video] = await db.insert(sharedVideos).values(data).returning();
    return video;
  }

  async deleteSharedVideo(id: string, userId: string): Promise<boolean> {
    const [video] = await db.select().from(sharedVideos).where(eq(sharedVideos.id, id));
    if (!video || video.userId !== userId) return false;
    await db.delete(sharedVideos).where(eq(sharedVideos.id, id));
    return true;
  }

  async getCoachPlayers(coachId: string): Promise<CoachPlayer[]> {
    return db.select().from(coachPlayers).where(eq(coachPlayers.coachId, coachId)).orderBy(desc(coachPlayers.createdAt));
  }

  async getCoachPlayerById(id: string): Promise<CoachPlayer | undefined> {
    const [player] = await db.select().from(coachPlayers).where(eq(coachPlayers.id, id));
    return player;
  }

  async createCoachPlayer(player: InsertCoachPlayer): Promise<CoachPlayer> {
    const [created] = await db.insert(coachPlayers).values(player).returning();
    return created;
  }

  async updateCoachPlayer(id: string, data: Partial<InsertCoachPlayer>): Promise<CoachPlayer | undefined> {
    const [updated] = await db.update(coachPlayers).set({ ...data, updatedAt: new Date() }).where(eq(coachPlayers.id, id)).returning();
    return updated;
  }

  async deleteCoachPlayer(id: string): Promise<boolean> {
    await db.delete(coachPlayerAssignments).where(eq(coachPlayerAssignments.coachPlayerId, id));
    await db.delete(coachPlayers).where(eq(coachPlayers.id, id));
    return true;
  }

  async getCoachPlayerAssignments(coachPlayerId: string): Promise<(CoachPlayerAssignment & { teamName: string; seasonYear?: number | null; ageGroup?: string | null })[]> {
    const assignments = await db.select().from(coachPlayerAssignments).where(eq(coachPlayerAssignments.coachPlayerId, coachPlayerId));
    const result = [];
    for (const a of assignments) {
      const [team] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, a.teamId));
      result.push({ ...a, teamName: team?.name || "Unknown", seasonYear: team?.seasonYear, ageGroup: team?.ageGroup });
    }
    return result;
  }

  async assignCoachPlayerToTeam(assignment: InsertCoachPlayerAssignment): Promise<CoachPlayerAssignment> {
    const [created] = await db.insert(coachPlayerAssignments).values(assignment).returning();
    return created;
  }

  async removeCoachPlayerFromTeam(assignmentId: string): Promise<boolean> {
    await db.delete(coachPlayerAssignments).where(eq(coachPlayerAssignments.id, assignmentId));
    return true;
  }

  async getCoachPlayersByTeam(teamId: string): Promise<(CoachPlayer & { assignmentId: string; teamPosition?: string | null; teamJersey?: string | null })[]> {
    const assignments = await db.select().from(coachPlayerAssignments).where(eq(coachPlayerAssignments.teamId, teamId));
    const result = [];
    for (const a of assignments) {
      const [player] = await db.select().from(coachPlayers).where(eq(coachPlayers.id, a.coachPlayerId));
      if (player) {
        result.push({ ...player, assignmentId: a.id, teamPosition: a.position, teamJersey: a.jerseyNumber });
      }
    }
    return result;
  }

  async getTrainerPlayers(trainerId: string): Promise<TrainerPlayer[]> {
    return db.select().from(trainerPlayers).where(eq(trainerPlayers.trainerId, trainerId)).orderBy(desc(trainerPlayers.createdAt));
  }

  async getTrainerPlayerById(id: string): Promise<TrainerPlayer | undefined> {
    const [player] = await db.select().from(trainerPlayers).where(eq(trainerPlayers.id, id));
    return player;
  }

  async createTrainerPlayer(player: InsertTrainerPlayer): Promise<TrainerPlayer> {
    const [created] = await db.insert(trainerPlayers).values(player).returning();
    return created;
  }

  async findOrCreateTrainerPlayerForUser(trainerId: string, appUserId: string): Promise<TrainerPlayer> {
    const byLinked = await db.select().from(trainerPlayers)
      .where(and(eq(trainerPlayers.trainerId, trainerId), eq(trainerPlayers.linkedUserId, appUserId)));
    if (byLinked.length > 0) return byLinked[0];

    const [user] = await db.select().from(users).where(eq(users.id, appUserId));
    let firstName = user?.firstName || "";
    let lastName = user?.lastName || "";
    let email = user?.email || null;

    if (email) {
      const allForTrainer = await db.select().from(trainerPlayers)
        .where(eq(trainerPlayers.trainerId, trainerId));
      const emailMatch = allForTrainer.find(tp => tp.email && tp.email.toLowerCase() === email!.toLowerCase());
      if (emailMatch) {
        const [updated] = await db.update(trainerPlayers)
          .set({ linkedUserId: appUserId, updatedAt: new Date() })
          .where(eq(trainerPlayers.id, emailMatch.id))
          .returning();
        return updated;
      }
    }

    if (!firstName) {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, appUserId));
      if (profile?.displayName) {
        const parts = profile.displayName.split(" ");
        firstName = parts[0] || "Player";
        lastName = parts.slice(1).join(" ");
      }
    }
    if (!firstName) {
      firstName = email ? email.split("@")[0] : "Player";
    }

    const [created] = await db.insert(trainerPlayers).values({
      trainerId,
      firstName,
      lastName,
      email,
      linkedUserId: appUserId,
    }).returning();
    return created;
  }

  async updateTrainerPlayer(id: string, data: Partial<InsertTrainerPlayer>): Promise<TrainerPlayer | undefined> {
    const [updated] = await db.update(trainerPlayers).set({ ...data, updatedAt: new Date() }).where(eq(trainerPlayers.id, id)).returning();
    return updated;
  }

  async deleteTrainerPlayer(id: string): Promise<boolean> {
    await db.delete(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.trainerPlayerId, id));
    await db.delete(trainerPlayers).where(eq(trainerPlayers.id, id));
    return true;
  }

  async getTrainerPlayerAssignments(trainerPlayerId: string): Promise<(TrainerPlayerAssignment & { groupName: string; ageGroup?: string | null })[]> {
    const assignments = await db.select().from(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.trainerPlayerId, trainerPlayerId));
    const result = [];
    for (const a of assignments) {
      const [group] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, a.groupId));
      if (group) {
        result.push({ ...a, groupName: group.name, ageGroup: group.ageGroup || null });
      }
    }
    return result;
  }

  async assignTrainerPlayerToGroup(assignment: InsertTrainerPlayerAssignment): Promise<TrainerPlayerAssignment> {
    const [created] = await db.insert(trainerPlayerAssignments).values(assignment).returning();
    return created;
  }

  async getTrainerPlayerAssignmentById(assignmentId: string): Promise<TrainerPlayerAssignment | undefined> {
    const [assignment] = await db.select().from(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.id, assignmentId));
    return assignment;
  }

  async removeTrainerPlayerFromGroup(assignmentId: string): Promise<boolean> {
    await db.delete(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.id, assignmentId));
    return true;
  }

  async getTrainerPlayersByGroup(groupId: string): Promise<(TrainerPlayer & { assignmentId: string; groupPosition?: string | null; groupJersey?: string | null })[]> {
    const assignments = await db.select().from(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.groupId, groupId));
    if (assignments.length === 0) return [];
    const playerIds = assignments.map(a => a.trainerPlayerId);
    const players = await db.select().from(trainerPlayers).where(inArray(trainerPlayers.id, playerIds));
    const playerMap = new Map(players.map(p => [p.id, p]));
    return assignments
      .filter(a => playerMap.has(a.trainerPlayerId))
      .map(a => ({ ...playerMap.get(a.trainerPlayerId)!, assignmentId: a.id, groupPosition: a.position, groupJersey: a.jerseyNumber }));
  }

  async getTrainerPlayersByTeam(teamId: string): Promise<(TrainerPlayer & { assignmentId: string; teamPosition?: string | null; teamJersey?: string | null; assignedAt?: Date | null })[]> {
    const assignments = await db.select().from(playerTeamAssignments).where(eq(playerTeamAssignments.teamId, teamId));
    if (assignments.length === 0) return [];
    const playerIds = assignments.map(a => a.playerId);
    const players = await db.select().from(trainerPlayers).where(inArray(trainerPlayers.id, playerIds));
    const playerMap = new Map(players.map(p => [p.id, p]));
    return assignments
      .filter(a => playerMap.has(a.playerId))
      .map(a => ({ ...playerMap.get(a.playerId)!, assignmentId: a.id, teamPosition: a.position, teamJersey: a.jerseyNumber, assignedAt: a.assignedAt }));
  }

  async getPlayerDrillAssignments(playerId: string, trainerId: string): Promise<Array<DrillAssignment & { drill: Drill; teamName?: string }>> {
    const groupAssignments = await db.select().from(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.trainerPlayerId, playerId));
    const teamAssignments = await db.select().from(playerTeamAssignments).where(eq(playerTeamAssignments.playerId, playerId));
    const groupIds = groupAssignments.map(a => a.groupId);
    const teamIds = teamAssignments.map(a => a.teamId);
    const allTeamGroupIds = Array.from(new Set([...groupIds, ...teamIds]));

    const directAssignments = await db.select().from(drillAssignments)
      .where(and(eq(drillAssignments.assignedTo, playerId), eq(drillAssignments.assignedBy, trainerId)))
      .orderBy(desc(drillAssignments.createdAt));

    let teamGroupAssignments: (typeof drillAssignments.$inferSelect)[] = [];
    if (allTeamGroupIds.length > 0) {
      teamGroupAssignments = await db.select().from(drillAssignments)
        .where(and(inArray(drillAssignments.teamId, allTeamGroupIds), eq(drillAssignments.assignedBy, trainerId)))
        .orderBy(desc(drillAssignments.createdAt));
    }

    const seenIds = new Set<string>();
    const allAssignmentsRaw = [...directAssignments, ...teamGroupAssignments].filter(a => {
      if (seenIds.has(a.id)) return false;
      seenIds.add(a.id);
      return true;
    });

    const drillIds = [...new Set(allAssignmentsRaw.map(a => a.drillId))];
    const teamIdsForDrills = [...new Set(allAssignmentsRaw.filter(a => a.teamId).map(a => a.teamId!))];
    const [drillsData, teamsData] = await Promise.all([
      drillIds.length > 0 ? db.select().from(drills).where(inArray(drills.id, drillIds)) : Promise.resolve([]),
      teamIdsForDrills.length > 0 ? db.select().from(trainerTeams).where(inArray(trainerTeams.id, teamIdsForDrills)) : Promise.resolve([]),
    ]);
    const drillMap = new Map(drillsData.map(d => [d.id, d]));
    const teamMap = new Map(teamsData.map(t => [t.id, t]));
    return allAssignmentsRaw
      .filter(a => drillMap.has(a.drillId))
      .map(a => ({ ...a, drill: drillMap.get(a.drillId)!, teamName: a.teamId ? teamMap.get(a.teamId)?.name : undefined }));
  }

  async getTrainerDirectAssignments(trainerId: string): Promise<Array<DrillAssignment & { drill: Drill; playerName: string; playerRosterId: string }>> {
    const directAssignments = await db.select().from(drillAssignments)
      .where(and(eq(drillAssignments.assignedBy, trainerId), isNotNull(drillAssignments.assignedTo), isNull(drillAssignments.teamId)))
      .orderBy(desc(drillAssignments.createdAt));
    if (!directAssignments.length) return [];
    const drillIds = [...new Set(directAssignments.map(a => a.drillId))];
    const rosterIds = [...new Set(directAssignments.map(a => a.assignedTo!))];
    const [drillsData, rosterData] = await Promise.all([
      db.select().from(drills).where(inArray(drills.id, drillIds)),
      db.select({ id: trainerPlayers.id, firstName: trainerPlayers.firstName, lastName: trainerPlayers.lastName }).from(trainerPlayers).where(inArray(trainerPlayers.id, rosterIds)),
    ]);
    const drillMap = new Map(drillsData.map(d => [d.id, d]));
    const rosterMap = new Map(rosterData.map(p => [p.id, `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown"]));
    return directAssignments
      .filter(a => drillMap.has(a.drillId))
      .map(a => ({
        ...a,
        drill: drillMap.get(a.drillId)!,
        playerName: rosterMap.get(a.assignedTo!) || "Unknown",
        playerRosterId: a.assignedTo!,
      }));
  }

  async getPlayerSharedVideos(playerId: string, trainerId: string): Promise<Array<{ id: string; userId: string; playerName: string; title: string; videoUrl: string; description: string | null; assignmentId: string | null; teamName: string; createdAt: Date | null }>> {
    const groupAssignments = await db.select().from(trainerPlayerAssignments).where(eq(trainerPlayerAssignments.trainerPlayerId, playerId));
    const teamAssignments = await db.select().from(playerTeamAssignments).where(eq(playerTeamAssignments.playerId, playerId));
    const allIds = Array.from(new Set([...groupAssignments.map(a => a.groupId), ...teamAssignments.map(a => a.teamId)]));

    if (allIds.length === 0) return [];
    const teamsAll = await db.select().from(trainerTeams).where(inArray(trainerTeams.id, allIds));
    const validTeams = teamsAll.filter(t => t.coachId === trainerId);
    if (validTeams.length === 0) return [];
    const validTeamIds = validTeams.map(t => t.id);
    const teamNameMap = new Map(validTeams.map(t => [t.id, t.name]));
    const videos = await db.select().from(sharedVideos).where(inArray(sharedVideos.teamId, validTeamIds)).orderBy(desc(sharedVideos.createdAt));
    if (videos.length === 0) return [];
    const userIds = [...new Set(videos.map(v => v.userId))];
    const usersData = await db.select().from(users).where(inArray(users.id, userIds));
    const userMap = new Map(usersData.map(u => [u.id, u]));
    return videos.map(video => {
      const user = userMap.get(video.userId);
      const playerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';
      return { ...video, playerName, teamName: teamNameMap.get(video.teamId) || 'Unknown' };
    });
  }

  async getPlayerMessages(playerId: string, trainerId: string): Promise<Message[]> {
    const player = await this.getTrainerPlayerById(playerId);
    if (!player) return [];
    const tpId = `tp_${playerId}`;
    const conditions = [
      and(eq(messages.senderId, trainerId), eq(messages.receiverId, tpId)),
      and(eq(messages.senderId, tpId), eq(messages.receiverId, trainerId)),
    ];
    if (player.linkedUserId) {
      conditions.push(
        and(eq(messages.senderId, trainerId), eq(messages.receiverId, player.linkedUserId))!,
        and(eq(messages.senderId, player.linkedUserId), eq(messages.receiverId, trainerId))!,
      );
    }
    const msgs = await db.select().from(messages)
      .where(or(...conditions))
      .orderBy(desc(messages.createdAt));
    return msgs;
  }

  async getPlayerTeamAssignments(playerId: string): Promise<Array<{ id: string; playerId: string; teamId: string; teamName: string; seasonYear: string | null; ageGroup: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>> {
    const assignments = await db.select().from(playerTeamAssignments).where(eq(playerTeamAssignments.playerId, playerId));
    const result = [];
    for (const a of assignments) {
      const [team] = await db.select().from(trainerTeams).where(eq(trainerTeams.id, a.teamId));
      if (team) {
        result.push({
          id: a.id,
          playerId: a.playerId,
          teamId: a.teamId,
          teamName: team.name,
          seasonYear: team.seasonYear ?? null,
          ageGroup: team.ageGroup ?? null,
          position: a.position,
          jerseyNumber: a.jerseyNumber,
          assignedAt: a.assignedAt?.toISOString() ?? new Date().toISOString(),
        });
      }
    }
    return result;
  }

  async assignPlayerToTeam(assignment: { playerId: string; teamId: string; position?: string | null; jerseyNumber?: string | null }): Promise<PlayerTeamAssignment> {
    const [created] = await db.insert(playerTeamAssignments).values({
      playerId: assignment.playerId,
      teamId: assignment.teamId,
      position: assignment.position ?? null,
      jerseyNumber: assignment.jerseyNumber ?? null,
    }).returning();
    return created;
  }

  async getPlayerTeamAssignmentById(assignmentId: string): Promise<PlayerTeamAssignment | undefined> {
    const [assignment] = await db.select().from(playerTeamAssignments).where(eq(playerTeamAssignments.id, assignmentId));
    return assignment;
  }

  async removePlayerFromTeam(assignmentId: string): Promise<boolean> {
    await db.delete(playerTeamAssignments).where(eq(playerTeamAssignments.id, assignmentId));
    return true;
  }

  async bulkAssignPlayersToTeam(playerIds: string[], teamId: string): Promise<void> {
    for (const playerId of playerIds) {
      await db.insert(playerTeamAssignments).values({
        playerId,
        teamId,
      });
    }
  }

  async getChatThreads(userId: string, mode: string): Promise<Array<ChatThread & { memberCount: number; lastMessage?: string; lastMessageAt?: Date }>> {
    const memberRows = await db.select().from(chatThreadMembers).where(eq(chatThreadMembers.userId, userId));
    const threadIds = memberRows.map(m => m.threadId);
    if (threadIds.length === 0) return [];
    const threads = await db.select().from(chatThreads).where(and(inArray(chatThreads.id, threadIds), eq(chatThreads.mode, mode))).orderBy(desc(chatThreads.createdAt));
    if (threads.length === 0) return [];
    const tIds = threads.map(t => t.id);
    const [allMembers, allMessages] = await Promise.all([
      db.select().from(chatThreadMembers).where(inArray(chatThreadMembers.threadId, tIds)),
      db.select().from(chatThreadMessages).where(inArray(chatThreadMessages.threadId, tIds)).orderBy(desc(chatThreadMessages.createdAt)),
    ]);
    const memberCountMap = new Map<string, number>();
    for (const m of allMembers) {
      memberCountMap.set(m.threadId, (memberCountMap.get(m.threadId) || 0) + 1);
    }
    const latestMessageMap = new Map<string, { content: string; createdAt: Date }>();
    for (const msg of allMessages) {
      if (!latestMessageMap.has(msg.threadId)) {
        latestMessageMap.set(msg.threadId, { content: msg.content, createdAt: msg.createdAt! });
      }
    }
    return threads.map(thread => ({
      ...thread,
      memberCount: memberCountMap.get(thread.id) || 0,
      lastMessage: latestMessageMap.get(thread.id)?.content,
      lastMessageAt: latestMessageMap.get(thread.id)?.createdAt,
    })).sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessageAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  async getChatThreadById(id: string): Promise<ChatThread | undefined> {
    const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, id));
    return thread;
  }

  async createChatThread(thread: InsertChatThread): Promise<ChatThread> {
    const [created] = await db.insert(chatThreads).values(thread).returning();
    return created;
  }

  async deleteChatThread(id: string): Promise<boolean> {
    await db.delete(chatThreadMessages).where(eq(chatThreadMessages.threadId, id));
    await db.delete(chatThreadMembers).where(eq(chatThreadMembers.threadId, id));
    await db.delete(chatThreads).where(eq(chatThreads.id, id));
    return true;
  }

  async getChatThreadMembers(threadId: string): Promise<ChatThreadMember[]> {
    return await db.select().from(chatThreadMembers).where(eq(chatThreadMembers.threadId, threadId));
  }

  async addChatThreadMember(member: InsertChatThreadMember): Promise<ChatThreadMember> {
    const [created] = await db.insert(chatThreadMembers).values(member).returning();
    return created;
  }

  async removeChatThreadMember(threadId: string, userId: string): Promise<boolean> {
    await db.delete(chatThreadMembers).where(and(eq(chatThreadMembers.threadId, threadId), eq(chatThreadMembers.userId, userId)));
    return true;
  }

  async getChatThreadMessages(threadId: string): Promise<ChatThreadMessage[]> {
    return await db.select().from(chatThreadMessages).where(eq(chatThreadMessages.threadId, threadId)).orderBy(chatThreadMessages.createdAt);
  }

  async createChatThreadMessage(message: InsertChatThreadMessage): Promise<ChatThreadMessage> {
    const [created] = await db.insert(chatThreadMessages).values(message).returning();
    return created;
  }

  async getTrainerProfile(userId: string): Promise<TrainerProfile | undefined> {
    const [profile] = await db.select().from(trainerProfiles).where(eq(trainerProfiles.userId, userId));
    return profile;
  }

  async upsertTrainerProfile(profile: InsertTrainerProfile): Promise<TrainerProfile> {
    const existing = await this.getTrainerProfile(profile.userId);
    if (existing) {
      const [updated] = await db.update(trainerProfiles)
        .set({ ...profile, updatedAt: new Date() })
        .where(eq(trainerProfiles.userId, profile.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(trainerProfiles).values(profile).returning();
    return created;
  }

  async getPublicTrainerProfiles(filters?: { state?: string; city?: string; specialty?: string; query?: string }): Promise<(TrainerProfile & { firstName: string | null; lastName: string | null })[]> {
    const conditions: any[] = [eq(trainerProfiles.isPublic, true)];
    if (filters?.state) conditions.push(eq(trainerProfiles.state, filters.state));
    if (filters?.city) conditions.push(sql`LOWER(${trainerProfiles.city}) LIKE LOWER(${'%' + filters.city + '%'})`);
    if (filters?.specialty) conditions.push(sql`${filters.specialty} = ANY(${trainerProfiles.specialties})`);
    if (filters?.query) {
      const q = '%' + filters.query + '%';
      conditions.push(sql`(LOWER(${trainerProfiles.headline}) LIKE LOWER(${q}) OR LOWER(${trainerProfiles.bio}) LIKE LOWER(${q}) OR LOWER(${trainerProfiles.city}) LIKE LOWER(${q}))`);
    }
    const results = await db.select({
      id: trainerProfiles.id,
      userId: trainerProfiles.userId,
      headline: trainerProfiles.headline,
      bio: trainerProfiles.bio,
      specialties: trainerProfiles.specialties,
      city: trainerProfiles.city,
      state: trainerProfiles.state,
      hourlyRate: trainerProfiles.hourlyRate,
      sessionTypes: trainerProfiles.sessionTypes,
      experienceYears: trainerProfiles.experienceYears,
      certifications: trainerProfiles.certifications,
      availability: trainerProfiles.availability,
      profilePhotoUrl: trainerProfiles.profilePhotoUrl,
      contactEmail: trainerProfiles.contactEmail,
      contactPhone: trainerProfiles.contactPhone,
      socialInstagram: trainerProfiles.socialInstagram,
      socialTwitter: trainerProfiles.socialTwitter,
      website: trainerProfiles.website,
      isPublic: trainerProfiles.isPublic,
      stripeAccountId: trainerProfiles.stripeAccountId,
      createdAt: trainerProfiles.createdAt,
      updatedAt: trainerProfiles.updatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(trainerProfiles)
    .innerJoin(users, eq(trainerProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(trainerProfiles.createdAt);
    return results;
  }

  async getTrainerProfileById(id: string): Promise<(TrainerProfile & { firstName: string | null; lastName: string | null }) | undefined> {
    const [result] = await db.select({
      id: trainerProfiles.id,
      userId: trainerProfiles.userId,
      headline: trainerProfiles.headline,
      bio: trainerProfiles.bio,
      specialties: trainerProfiles.specialties,
      city: trainerProfiles.city,
      state: trainerProfiles.state,
      hourlyRate: trainerProfiles.hourlyRate,
      sessionTypes: trainerProfiles.sessionTypes,
      experienceYears: trainerProfiles.experienceYears,
      certifications: trainerProfiles.certifications,
      availability: trainerProfiles.availability,
      profilePhotoUrl: trainerProfiles.profilePhotoUrl,
      contactEmail: trainerProfiles.contactEmail,
      contactPhone: trainerProfiles.contactPhone,
      socialInstagram: trainerProfiles.socialInstagram,
      socialTwitter: trainerProfiles.socialTwitter,
      website: trainerProfiles.website,
      isPublic: trainerProfiles.isPublic,
      stripeAccountId: trainerProfiles.stripeAccountId,
      createdAt: trainerProfiles.createdAt,
      updatedAt: trainerProfiles.updatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(trainerProfiles)
    .innerJoin(users, eq(trainerProfiles.userId, users.id))
    .where(eq(trainerProfiles.id, id));
    return result;
  }

  async getTrainerProfilesByIds(ids: string[]): Promise<(TrainerProfile & { firstName: string | null; lastName: string | null })[]> {
    if (ids.length === 0) return [];
    return await db.select({
      id: trainerProfiles.id,
      userId: trainerProfiles.userId,
      headline: trainerProfiles.headline,
      bio: trainerProfiles.bio,
      specialties: trainerProfiles.specialties,
      city: trainerProfiles.city,
      state: trainerProfiles.state,
      hourlyRate: trainerProfiles.hourlyRate,
      sessionTypes: trainerProfiles.sessionTypes,
      experienceYears: trainerProfiles.experienceYears,
      certifications: trainerProfiles.certifications,
      availability: trainerProfiles.availability,
      profilePhotoUrl: trainerProfiles.profilePhotoUrl,
      contactEmail: trainerProfiles.contactEmail,
      contactPhone: trainerProfiles.contactPhone,
      socialInstagram: trainerProfiles.socialInstagram,
      socialTwitter: trainerProfiles.socialTwitter,
      website: trainerProfiles.website,
      isPublic: trainerProfiles.isPublic,
      stripeAccountId: trainerProfiles.stripeAccountId,
      createdAt: trainerProfiles.createdAt,
      updatedAt: trainerProfiles.updatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(trainerProfiles)
    .innerJoin(users, eq(trainerProfiles.userId, users.id))
    .where(inArray(trainerProfiles.id, ids));
  }

  async getTrainingLocations(): Promise<TrainingLocation[]> {
    return await db.select().from(trainingLocations).orderBy(trainingLocations.name);
  }

  async getTrainingLocationById(id: string): Promise<TrainingLocation | undefined> {
    const [loc] = await db.select().from(trainingLocations).where(eq(trainingLocations.id, id));
    return loc;
  }

  async getTrainingLocationsByIds(ids: string[]): Promise<TrainingLocation[]> {
    if (ids.length === 0) return [];
    return await db.select().from(trainingLocations).where(inArray(trainingLocations.id, ids));
  }

  async createTrainingLocation(loc: InsertTrainingLocation): Promise<TrainingLocation> {
    const [newLoc] = await db.insert(trainingLocations).values(loc as any).returning();
    return newLoc;
  }

  async updateTrainingLocation(id: string, loc: Partial<InsertTrainingLocation>): Promise<TrainingLocation | undefined> {
    const [updated] = await db.update(trainingLocations)
      .set({ ...loc, updatedAt: new Date() } as any)
      .where(eq(trainingLocations.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingLocation(id: string): Promise<boolean> {
    await db.delete(trainerProfileLocations).where(eq(trainerProfileLocations.locationId, id));
    await db.delete(trainingLocations).where(eq(trainingLocations.id, id));
    return true;
  }

  async getTrainerProfileLocations(trainerProfileId: string): Promise<(TrainerProfileLocation & { location: TrainingLocation })[]> {
    const results = await db.select({
      id: trainerProfileLocations.id,
      trainerProfileId: trainerProfileLocations.trainerProfileId,
      locationId: trainerProfileLocations.locationId,
      availability: trainerProfileLocations.availability,
      createdAt: trainerProfileLocations.createdAt,
      location: trainingLocations,
    })
    .from(trainerProfileLocations)
    .innerJoin(trainingLocations, eq(trainerProfileLocations.locationId, trainingLocations.id))
    .where(eq(trainerProfileLocations.trainerProfileId, trainerProfileId));
    return results;
  }

  async getTrainerProfileLocationById(id: string): Promise<TrainerProfileLocation | undefined> {
    const [link] = await db.select().from(trainerProfileLocations).where(eq(trainerProfileLocations.id, id));
    return link;
  }

  async createTrainerProfileLocation(data: InsertTrainerProfileLocation): Promise<TrainerProfileLocation> {
    const [created] = await db.insert(trainerProfileLocations).values(data as any).returning();
    return created;
  }

  async updateTrainerProfileLocation(id: string, data: Partial<InsertTrainerProfileLocation>): Promise<TrainerProfileLocation | undefined> {
    const [updated] = await db.update(trainerProfileLocations)
      .set(data as any)
      .where(eq(trainerProfileLocations.id, id))
      .returning();
    return updated;
  }

  async deleteTrainerProfileLocation(id: string): Promise<boolean> {
    await db.delete(trainerProfileLocations).where(eq(trainerProfileLocations.id, id));
    return true;
  }

  async createTrainingSession(data: InsertTrainingSession): Promise<TrainingSession> {
    const [session] = await db.insert(trainingSessions).values(data as any).returning();
    return session;
  }

  async getTrainingSessionById(id: string): Promise<TrainingSession | undefined> {
    const [session] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id));
    return session;
  }

  async getTrainingSessionsForTrainer(trainerId: string, filters?: { status?: string; from?: string; to?: string }): Promise<TrainingSession[]> {
    const conditions: any[] = [eq(trainingSessions.trainerId, trainerId)];
    if (filters?.status) conditions.push(eq(trainingSessions.status, filters.status));
    if (filters?.from) conditions.push(gte(trainingSessions.sessionDate, filters.from));
    if (filters?.to) conditions.push(sql`${trainingSessions.sessionDate} <= ${filters.to}`);
    return await db.select().from(trainingSessions).where(and(...conditions)).orderBy(desc(trainingSessions.sessionDate));
  }

  async getTrainingSessionsForPlayer(playerId: string, filters?: { status?: string; from?: string; to?: string }): Promise<TrainingSession[]> {
    const conditions: any[] = [eq(trainingSessions.playerId, playerId)];
    if (filters?.status) conditions.push(eq(trainingSessions.status, filters.status));
    if (filters?.from) conditions.push(gte(trainingSessions.sessionDate, filters.from));
    if (filters?.to) conditions.push(sql`${trainingSessions.sessionDate} <= ${filters.to}`);
    return await db.select().from(trainingSessions).where(and(...conditions)).orderBy(desc(trainingSessions.sessionDate));
  }

  async getTrainingSessionsByGroupId(groupSessionId: string): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions).where(eq(trainingSessions.groupSessionId, groupSessionId));
  }

  async updateTrainingSession(id: string, data: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const [updated] = await db.update(trainingSessions)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(trainingSessions.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingSession(id: string): Promise<void> {
    await db.delete(trainingSessions).where(eq(trainingSessions.id, id));
  }

  async getEvaluationAttributes(trainerId?: string): Promise<EvaluationAttribute[]> {
    if (trainerId) {
      return await db.select().from(evaluationAttributes)
        .where(or(eq(evaluationAttributes.isDefault, true), eq(evaluationAttributes.createdBy, trainerId)))
        .orderBy(evaluationAttributes.category, evaluationAttributes.name);
    }
    return await db.select().from(evaluationAttributes)
      .where(eq(evaluationAttributes.isDefault, true))
      .orderBy(evaluationAttributes.category, evaluationAttributes.name);
  }

  async getEvaluationAttributeById(id: string): Promise<EvaluationAttribute | undefined> {
    const [attr] = await db.select().from(evaluationAttributes).where(eq(evaluationAttributes.id, id));
    return attr;
  }

  async createEvaluationAttribute(data: InsertEvaluationAttribute): Promise<EvaluationAttribute> {
    const [attr] = await db.insert(evaluationAttributes).values(data).returning();
    return attr;
  }

  async updateEvaluationAttribute(id: string, data: Partial<InsertEvaluationAttribute>): Promise<EvaluationAttribute | undefined> {
    const [updated] = await db.update(evaluationAttributes).set(data).where(eq(evaluationAttributes.id, id)).returning();
    return updated;
  }

  async deleteEvaluationAttribute(id: string): Promise<boolean> {
    const result = await db.delete(evaluationAttributes).where(eq(evaluationAttributes.id, id));
    return true;
  }

  async createPlayerEvaluation(data: InsertPlayerEvaluation, ratings: InsertPlayerEvaluationRating[]): Promise<PlayerEvaluation> {
    const [evaluation] = await db.insert(playerEvaluations).values(data).returning();
    if (ratings.length > 0) {
      const ratingsWithEvalId = ratings.map(r => ({ ...r, evaluationId: evaluation.id }));
      await db.insert(playerEvaluationRatings).values(ratingsWithEvalId);
    }
    return evaluation;
  }

  async getPlayerEvaluations(playerId: string, trainerId?: string): Promise<PlayerEvaluation[]> {
    const rosterEntry = await db.select({ id: trainerPlayers.id, linkedUserId: trainerPlayers.linkedUserId })
      .from(trainerPlayers)
      .where(eq(trainerPlayers.id, playerId));
    const linkedId = rosterEntry[0]?.linkedUserId;
    const allIds = linkedId ? [playerId, linkedId] : [playerId];
    const rosterByLinked = await db.select({ id: trainerPlayers.id })
      .from(trainerPlayers)
      .where(eq(trainerPlayers.linkedUserId, playerId));
    for (const r of rosterByLinked) {
      if (!allIds.includes(r.id)) allIds.push(r.id);
    }

    if (trainerId) {
      return await db.select().from(playerEvaluations)
        .where(and(inArray(playerEvaluations.playerId, allIds), eq(playerEvaluations.trainerId, trainerId)))
        .orderBy(desc(playerEvaluations.createdAt));
    }
    return await db.select().from(playerEvaluations)
      .where(inArray(playerEvaluations.playerId, allIds))
      .orderBy(desc(playerEvaluations.createdAt));
  }

  async getPlayerEvaluationById(id: string): Promise<{ evaluation: PlayerEvaluation; ratings: (PlayerEvaluationRating & { attribute: EvaluationAttribute })[] } | undefined> {
    const [evaluation] = await db.select().from(playerEvaluations).where(eq(playerEvaluations.id, id));
    if (!evaluation) return undefined;

    const ratingsRows = await db
      .select({
        id: playerEvaluationRatings.id,
        evaluationId: playerEvaluationRatings.evaluationId,
        attributeId: playerEvaluationRatings.attributeId,
        numericValue: playerEvaluationRatings.numericValue,
        wordValue: playerEvaluationRatings.wordValue,
        notes: playerEvaluationRatings.notes,
        attribute: evaluationAttributes,
      })
      .from(playerEvaluationRatings)
      .innerJoin(evaluationAttributes, eq(playerEvaluationRatings.attributeId, evaluationAttributes.id))
      .where(eq(playerEvaluationRatings.evaluationId, id));

    return { evaluation, ratings: ratingsRows };
  }

  async deletePlayerEvaluation(id: string): Promise<boolean> {
    await db.delete(playerEvaluationRatings).where(eq(playerEvaluationRatings.evaluationId, id));
    await db.delete(playerEvaluations).where(eq(playerEvaluations.id, id));
    return true;
  }

  async getPlayerEvaluationCount(trainerId: string, playerId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(playerEvaluations)
      .where(and(eq(playerEvaluations.trainerId, trainerId), eq(playerEvaluations.playerId, playerId)));
    return Number(result[0]?.count ?? 0);
  }

  async toggleEvaluationSharing(id: string, shared: boolean): Promise<PlayerEvaluation | undefined> {
    const [updated] = await db.update(playerEvaluations)
      .set({ sharedWithPlayer: shared })
      .where(eq(playerEvaluations.id, id))
      .returning();
    return updated;
  }

  async getSharedEvaluationsForPlayer(playerId: string): Promise<PlayerEvaluation[]> {
    const rosterEntries = await db.select({ id: trainerPlayers.id })
      .from(trainerPlayers)
      .where(eq(trainerPlayers.linkedUserId, playerId));
    const rosterIds = rosterEntries.map(r => r.id);
    const allIds = [playerId, ...rosterIds];
    return await db.select().from(playerEvaluations)
      .where(and(inArray(playerEvaluations.playerId, allIds), eq(playerEvaluations.sharedWithPlayer, true)))
      .orderBy(desc(playerEvaluations.createdAt));
  }

  async getPlayerTrainerFavorites(playerId: string): Promise<PlayerTrainerFavorite[]> {
    return await db.select().from(playerTrainerFavorites)
      .where(eq(playerTrainerFavorites.playerId, playerId))
      .orderBy(desc(playerTrainerFavorites.createdAt));
  }

  async getPlayerTrainerFavorite(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite | undefined> {
    const [fav] = await db.select().from(playerTrainerFavorites)
      .where(and(eq(playerTrainerFavorites.playerId, playerId), eq(playerTrainerFavorites.trainerId, trainerId)));
    return fav;
  }

  async addPlayerTrainerFavorite(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite> {
    const existing = await this.getPlayerTrainerFavorite(playerId, trainerId);
    if (existing) return existing;
    const [created] = await db.insert(playerTrainerFavorites).values({ playerId, trainerId, isMyTrainer: false }).returning();
    return created;
  }

  async removePlayerTrainerFavorite(playerId: string, trainerId: string): Promise<boolean> {
    const result = await db.delete(playerTrainerFavorites)
      .where(and(eq(playerTrainerFavorites.playerId, playerId), eq(playerTrainerFavorites.trainerId, trainerId)));
    return true;
  }

  async setMyTrainer(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite> {
    await db.update(playerTrainerFavorites)
      .set({ isMyTrainer: false })
      .where(and(eq(playerTrainerFavorites.playerId, playerId), eq(playerTrainerFavorites.isMyTrainer, true)));
    let fav = await this.getPlayerTrainerFavorite(playerId, trainerId);
    if (!fav) {
      const [created] = await db.insert(playerTrainerFavorites).values({ playerId, trainerId, isMyTrainer: true }).returning();
      return created;
    }
    const [updated] = await db.update(playerTrainerFavorites)
      .set({ isMyTrainer: true })
      .where(eq(playerTrainerFavorites.id, fav.id))
      .returning();
    return updated;
  }

  async unsetMyTrainer(playerId: string, trainerId: string): Promise<PlayerTrainerFavorite | undefined> {
    const [updated] = await db.update(playerTrainerFavorites)
      .set({ isMyTrainer: false })
      .where(and(eq(playerTrainerFavorites.playerId, playerId), eq(playerTrainerFavorites.trainerId, trainerId)))
      .returning();
    return updated;
  }

  async createConnection(data: InsertConnection): Promise<PlayerTrainerConnection> {
    const [conn] = await db.insert(playerTrainerConnections).values(data).returning();
    return conn;
  }

  async getConnection(playerId: string, trainerId: string): Promise<PlayerTrainerConnection | undefined> {
    const [conn] = await db.select().from(playerTrainerConnections)
      .where(
        or(
          and(
            eq(playerTrainerConnections.playerId, playerId),
            eq(playerTrainerConnections.trainerId, trainerId)
          ),
          and(
            eq(playerTrainerConnections.playerId, trainerId),
            eq(playerTrainerConnections.trainerId, playerId)
          )
        )
      );
    return conn;
  }

  async getConnectionsForUser(userId: string): Promise<PlayerTrainerConnection[]> {
    return await db.select().from(playerTrainerConnections)
      .where(and(
        or(
          eq(playerTrainerConnections.playerId, userId),
          eq(playerTrainerConnections.trainerId, userId)
        ),
        eq(playerTrainerConnections.status, "accepted")
      ))
      .orderBy(desc(playerTrainerConnections.updatedAt));
  }

  async getPendingConnectionsForUser(userId: string): Promise<PlayerTrainerConnection[]> {
    return await db.select().from(playerTrainerConnections)
      .where(and(
        or(
          eq(playerTrainerConnections.playerId, userId),
          eq(playerTrainerConnections.trainerId, userId)
        ),
        eq(playerTrainerConnections.status, "pending")
      ))
      .orderBy(desc(playerTrainerConnections.createdAt));
  }

  async updateConnectionStatus(id: string, status: "accepted" | "declined"): Promise<PlayerTrainerConnection | undefined> {
    const [conn] = await db.update(playerTrainerConnections)
      .set({ status, updatedAt: new Date() })
      .where(eq(playerTrainerConnections.id, id))
      .returning();
    return conn;
  }

  async areConnected(playerId: string, trainerId: string): Promise<boolean> {
    const [conn] = await db.select().from(playerTrainerConnections)
      .where(and(
        or(
          and(
            eq(playerTrainerConnections.playerId, playerId),
            eq(playerTrainerConnections.trainerId, trainerId)
          ),
          and(
            eq(playerTrainerConnections.playerId, trainerId),
            eq(playerTrainerConnections.trainerId, playerId)
          )
        ),
        eq(playerTrainerConnections.status, "accepted")
      ));
    return !!conn;
  }

  async createParentLink(parentUserId: string, playerUserId: string): Promise<ParentLink> {
    const [link] = await db.insert(parentLinks).values({ parentUserId, playerUserId }).returning();
    return link;
  }

  async getParentLinks(parentUserId: string): Promise<ParentLink[]> {
    return await db.select().from(parentLinks)
      .where(eq(parentLinks.parentUserId, parentUserId));
  }

  async getParentForPlayer(playerUserId: string): Promise<ParentLink | undefined> {
    const [link] = await db.select().from(parentLinks)
      .where(eq(parentLinks.playerUserId, playerUserId));
    return link;
  }

  async savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    if (existing.length > 0) {
      const [updated] = await db.update(pushSubscriptions)
        .set({ p256dh, auth })
        .where(eq(pushSubscriptions.id, existing[0].id))
        .returning();
      return updated;
    }
    const [sub] = await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth }).returning();
    return sub;
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionForUser(userId: string, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))
    );
  }

  async saveNativePushToken(userId: string, token: string, platform: string): Promise<NativePushToken> {
    const existing = await db.select().from(nativePushTokens)
      .where(and(eq(nativePushTokens.userId, userId), eq(nativePushTokens.token, token)));
    if (existing.length > 0) return existing[0];
    const [row] = await db.insert(nativePushTokens).values({ userId, token, platform }).returning();
    return row;
  }

  async getNativePushTokensForUser(userId: string): Promise<NativePushToken[]> {
    return db.select().from(nativePushTokens).where(eq(nativePushTokens.userId, userId));
  }

  async deleteNativePushToken(userId: string, token: string): Promise<void> {
    await db.delete(nativePushTokens).where(
      and(eq(nativePushTokens.userId, userId), eq(nativePushTokens.token, token))
    );
  }

  // ─── Feedback Forum ───────────────────────────────────────────────────────

  async getFeedbackPosts(opts?: { category?: string; sort?: string }): Promise<Array<FeedbackPost & { authorName: string; hasVoted?: boolean }>> {
    const rows = await db.select().from(feedbackPosts)
      .where(opts?.category && opts.category !== 'all' ? eq(feedbackPosts.category, opts.category) : undefined)
      .orderBy(opts?.sort === 'new' ? desc(feedbackPosts.createdAt) : desc(feedbackPosts.voteCount));
    const userIds = [...new Set(rows.map(r => r.userId))];
    const profiles = userIds.length > 0
      ? await db.select({ userId: userProfiles.userId, displayName: userProfiles.displayName }).from(userProfiles).where(inArray(userProfiles.userId, userIds))
      : [];
    const nameMap = new Map(profiles.map(p => [p.userId, p.displayName || 'User']));
    return rows.map(r => ({ ...r, authorName: nameMap.get(r.userId) || 'User' }));
  }

  async createFeedbackPost(data: InsertFeedbackPost): Promise<FeedbackPost> {
    const [row] = await db.insert(feedbackPosts).values(data).returning();
    return row;
  }

  async getFeedbackVote(userId: string, postId: string): Promise<FeedbackVote | undefined> {
    const [row] = await db.select().from(feedbackVotes).where(and(eq(feedbackVotes.userId, userId), eq(feedbackVotes.postId, postId)));
    return row;
  }

  async toggleFeedbackVote(userId: string, postId: string): Promise<{ voted: boolean; voteCount: number }> {
    const existing = await this.getFeedbackVote(userId, postId);
    if (existing) {
      await db.delete(feedbackVotes).where(and(eq(feedbackVotes.userId, userId), eq(feedbackVotes.postId, postId)));
      const [updated] = await db.update(feedbackPosts).set({ voteCount: sql`vote_count - 1` }).where(eq(feedbackPosts.id, postId)).returning();
      return { voted: false, voteCount: updated.voteCount };
    } else {
      await db.insert(feedbackVotes).values({ userId, postId });
      const [updated] = await db.update(feedbackPosts).set({ voteCount: sql`vote_count + 1` }).where(eq(feedbackPosts.id, postId)).returning();
      return { voted: true, voteCount: updated.voteCount };
    }
  }

  async updateFeedbackStatus(id: string, status: string): Promise<FeedbackPost | undefined> {
    const [row] = await db.update(feedbackPosts).set({ status, updatedAt: new Date() }).where(eq(feedbackPosts.id, id)).returning();
    return row;
  }

  async deleteFeedbackPost(id: string): Promise<void> {
    await db.delete(feedbackVotes).where(eq(feedbackVotes.postId, id));
    await db.delete(feedbackPosts).where(eq(feedbackPosts.id, id));
  }

  async getUserFeedbackVotes(userId: string): Promise<Set<string>> {
    const votes = await db.select({ postId: feedbackVotes.postId }).from(feedbackVotes).where(eq(feedbackVotes.userId, userId));
    return new Set(votes.map(v => v.postId));
  }

  // ─── Analytics Events ─────────────────────────────────────────────────────

  async trackAnalyticsEvent(userId: string, event: string, page?: string, metadata?: any): Promise<void> {
    await db.insert(analyticsEvents).values({ userId, event, page: page || null, metadata: metadata || null });
  }

  async getAdminAnalytics(): Promise<any> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    const totalUsersRow    = r1(await db.execute(sql`SELECT COUNT(*) as count FROM users`));
    const totalLogsRow     = r1(await db.execute(sql`SELECT COUNT(*) as count FROM training_logs`));
    const totalSessionsRow = r1(await db.execute(sql`SELECT COUNT(*) as count FROM training_sessions`));
    const totalConnRow     = r1(await db.execute(sql`SELECT COUNT(*) as count FROM player_trainer_connections WHERE status = 'accepted'`));
    const totalFbRow       = r1(await db.execute(sql`SELECT COUNT(*) as count FROM feedback_posts`));
    const active7Row       = r1(await db.execute(sql`SELECT COUNT(DISTINCT user_id) as count FROM training_logs WHERE completed_at >= NOW() - INTERVAL '7 days'`));
    const active30Row      = r1(await db.execute(sql`SELECT COUNT(DISTINCT user_id) as count FROM training_logs WHERE completed_at >= NOW() - INTERVAL '30 days'`));

    const usersByWeek      = r(await db.execute(sql`SELECT DATE_TRUNC('week', created_at) as week, COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '12 weeks' GROUP BY week ORDER BY week ASC`));
    const logsByWeek       = r(await db.execute(sql`SELECT DATE_TRUNC('week', completed_at) as week, COUNT(*) as count FROM training_logs WHERE completed_at >= NOW() - INTERVAL '12 weeks' GROUP BY week ORDER BY week ASC`));
    const popularDrills    = r(await db.execute(sql`SELECT d.title, COUNT(tl.id) as log_count FROM training_logs tl JOIN drills d ON d.id = tl.drill_id GROUP BY d.id, d.title ORDER BY log_count DESC LIMIT 10`));
    const usersByRole      = r(await db.execute(sql`SELECT role, COUNT(*) as count FROM users GROUP BY role`));
    const topActiveUsers   = r(await db.execute(sql`SELECT u.first_name, u.last_name, u.email, COUNT(tl.id) as log_count FROM users u JOIN training_logs tl ON tl.user_id = u.id GROUP BY u.id, u.first_name, u.last_name, u.email ORDER BY log_count DESC LIMIT 10`));
    const recentSignups    = r(await db.execute(sql`SELECT u.first_name, u.last_name, u.email, u.role, u.created_at FROM users u ORDER BY u.created_at DESC LIMIT 10`));
    const sessionsByStatus = r(await db.execute(sql`SELECT status, COUNT(*) as count FROM training_sessions GROUP BY status`));
    const categoryBrkdn    = r(await db.execute(sql`SELECT d.category, COUNT(tl.id) as count FROM training_logs tl JOIN drills d ON d.id = tl.drill_id GROUP BY d.category ORDER BY count DESC`));
    const analyticsEvents  = r(await db.execute(sql`SELECT event, COUNT(*) as count FROM analytics_events GROUP BY event ORDER BY count DESC LIMIT 20`));
    const pageViews        = r(await db.execute(sql`SELECT page, COUNT(*) as count FROM analytics_events WHERE event = 'page_view' AND page IS NOT NULL GROUP BY page ORDER BY count DESC LIMIT 15`));

    return {
      totals: {
        users:          Number(totalUsersRow.count    || 0),
        trainingLogs:   Number(totalLogsRow.count     || 0),
        sessions:       Number(totalSessionsRow.count || 0),
        connections:    Number(totalConnRow.count      || 0),
        feedbackPosts:  Number(totalFbRow.count        || 0),
        activeUsers7d:  Number(active7Row.count        || 0),
        activeUsers30d: Number(active30Row.count       || 0),
      },
      usersByWeek:      usersByWeek.map((x: any) => ({ week: x.week, count: Number(x.count) })),
      logsByWeek:       logsByWeek.map((x: any) => ({ week: x.week, count: Number(x.count) })),
      popularDrills:    popularDrills.map((x: any) => ({ title: x.title, count: Number(x.log_count) })),
      usersByRole:      usersByRole.map((x: any) => ({ role: x.role || 'unknown', count: Number(x.count) })),
      topActiveUsers:   topActiveUsers.map((x: any) => ({ name: `${x.first_name || ''} ${x.last_name || ''}`.trim(), email: x.email, logs: Number(x.log_count) })),
      recentSignups:    recentSignups.map((x: any) => ({ name: `${x.first_name || ''} ${x.last_name || ''}`.trim(), email: x.email, role: x.role, createdAt: x.created_at })),
      sessionsByStatus: sessionsByStatus.map((x: any) => ({ status: x.status, count: Number(x.count) })),
      categoryBreakdown: categoryBrkdn.map((x: any) => ({ category: x.category || 'unknown', count: Number(x.count) })),
      topEvents:        analyticsEvents.map((x: any) => ({ event: x.event, count: Number(x.count) })),
      topPages:         pageViews.map((x: any) => ({ page: x.page, count: Number(x.count) })),
    };
  }

  // ─── Retention & Cohort Analysis ─────────────────────────────────────────

  /**
   * Weekly signup cohorts. For each cohort week, returns the % of users from
   * that cohort who were active (had >=1 training_log) in week 0, 1, 2, ...
   */
  async getCohortRetention(): Promise<{
    cohorts: Array<{
      cohortWeek: string;
      cohortSize: number;
      retention: Array<{ weekOffset: number; activeUsers: number; pct: number }>;
    }>;
    maxOffset: number;
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];

    // Cohort = users who signed up in the last 12 weeks, grouped by signup week.
    // Activity = had >=1 training_log in week N relative to their cohort week.
    const rows = r(await db.execute(sql`
      WITH cohorts AS (
        SELECT
          DATE_TRUNC('week', created_at)::date AS cohort_week,
          id AS user_id,
          created_at
        FROM users
        WHERE created_at >= DATE_TRUNC('week', NOW() - INTERVAL '11 weeks')
      ),
      cohort_sizes AS (
        SELECT cohort_week, COUNT(*) AS size FROM cohorts GROUP BY cohort_week
      ),
      activity AS (
        SELECT
          c.cohort_week,
          c.user_id,
          -- Postgres date minus date returns integer days, so divide by 7 for weeks.
          GREATEST(0, FLOOR((DATE_TRUNC('week', tl.completed_at)::date - c.cohort_week) / 7.0)::int) AS week_offset
        FROM cohorts c
        JOIN training_logs tl ON tl.user_id = c.user_id
        WHERE tl.completed_at >= c.cohort_week
        GROUP BY c.cohort_week, c.user_id, week_offset
      )
      SELECT
        cs.cohort_week,
        cs.size AS cohort_size,
        COALESCE(a.week_offset, 0) AS week_offset,
        COUNT(DISTINCT a.user_id)::int AS active_users
      FROM cohort_sizes cs
      LEFT JOIN activity a ON a.cohort_week = cs.cohort_week
      GROUP BY cs.cohort_week, cs.size, a.week_offset
      ORDER BY cs.cohort_week DESC, week_offset ASC
    `));

    // Group by cohort
    const map = new Map<string, { cohortWeek: string; cohortSize: number; retention: Map<number, number> }>();
    for (const row of rows) {
      const wk = new Date(row.cohort_week).toISOString().slice(0, 10);
      const size = Number(row.cohort_size);
      const offset = Number(row.week_offset);
      const active = Number(row.active_users);
      if (!map.has(wk)) map.set(wk, { cohortWeek: wk, cohortSize: size, retention: new Map() });
      const c = map.get(wk)!;
      // Only record if there were actually active users (LEFT JOIN may yield 0s)
      if (active > 0) c.retention.set(offset, active);
    }

    // Max age (in weeks) of any cohort — limits how many columns to render
    const now = Date.now();
    let maxOffset = 0;
    const cohorts = Array.from(map.values()).map(c => {
      const cohortStart = new Date(c.cohortWeek).getTime();
      const ageWeeks = Math.floor((now - cohortStart) / (7 * 24 * 3600 * 1000));
      maxOffset = Math.max(maxOffset, ageWeeks);
      const retention: Array<{ weekOffset: number; activeUsers: number; pct: number }> = [];
      for (let off = 0; off <= ageWeeks; off++) {
        const active = c.retention.get(off) ?? 0;
        retention.push({
          weekOffset: off,
          activeUsers: active,
          pct: c.cohortSize > 0 ? Math.round((active / c.cohortSize) * 1000) / 10 : 0,
        });
      }
      return { cohortWeek: c.cohortWeek, cohortSize: c.cohortSize, retention };
    }).sort((a, b) => a.cohortWeek.localeCompare(b.cohortWeek));

    return { cohorts, maxOffset: Math.min(maxOffset, 11) };
  }

  /**
   * D1 / D7 / D30 retention overall — % of eligible signups who had >=1
   * training_log within N days of signup.
   */
  async getRetentionCurves(): Promise<{ d1: number; d7: number; d30: number; eligibleD1: number; eligibleD7: number; eligibleD30: number; }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    const row = r1(await db.execute(sql`
      WITH first_log AS (
        SELECT u.id, u.created_at, MIN(tl.completed_at) AS first_log_at
        FROM users u
        LEFT JOIN training_logs tl ON tl.user_id = u.id
        GROUP BY u.id, u.created_at
      )
      SELECT
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '1 day')::int AS elig_d1,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days')::int AS elig_d7,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days')::int AS elig_d30,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '1 day' AND first_log_at IS NOT NULL AND first_log_at <= created_at + INTERVAL '1 day')::int AS ret_d1,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days' AND first_log_at IS NOT NULL AND first_log_at <= created_at + INTERVAL '7 days')::int AS ret_d7,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days' AND first_log_at IS NOT NULL AND first_log_at <= created_at + INTERVAL '30 days')::int AS ret_d30
      FROM first_log
    `));

    const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
    return {
      eligibleD1: Number(row.elig_d1 || 0),
      eligibleD7: Number(row.elig_d7 || 0),
      eligibleD30: Number(row.elig_d30 || 0),
      d1:  pct(Number(row.ret_d1  || 0), Number(row.elig_d1  || 0)),
      d7:  pct(Number(row.ret_d7  || 0), Number(row.elig_d7  || 0)),
      d30: pct(Number(row.ret_d30 || 0), Number(row.elig_d30 || 0)),
    };
  }

  /**
   * What % of all training logs come from the top 1%, 10%, 25% of users.
   * Pareto reality check.
   */
  async getPowerUserConcentration(): Promise<{
    totalUsers: number; totalLogs: number;
    top1: { userCount: number; logShare: number };
    top10: { userCount: number; logShare: number };
    top25: { userCount: number; logShare: number };
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    // Use deterministic rank cutoffs (GREATEST(1, CEIL(N * pct))) so the
    // top-1% bucket always includes ≥1 user when the cohort is non-empty,
    // instead of rounding down to zero on small populations.
    const row = r1(await db.execute(sql`
      WITH user_logs AS (
        SELECT user_id, COUNT(*)::int AS log_count
        FROM training_logs
        GROUP BY user_id
        HAVING COUNT(*) > 0
      ),
      stats AS (
        SELECT
          COUNT(*)::int AS total_users,
          COALESCE(SUM(log_count), 0)::int AS total_logs,
          GREATEST(1, CEIL(COUNT(*) * 0.01))::int AS top1_cut,
          GREATEST(1, CEIL(COUNT(*) * 0.10))::int AS top10_cut,
          GREATEST(1, CEIL(COUNT(*) * 0.25))::int AS top25_cut
        FROM user_logs
      ),
      ranked AS (
        SELECT
          ul.log_count,
          ROW_NUMBER() OVER (ORDER BY ul.log_count DESC) AS rn
        FROM user_logs ul
      )
      SELECT
        s.total_users,
        s.total_logs,
        (SELECT COUNT(*) FROM ranked WHERE rn <= s.top1_cut)::int  AS top1_count,
        (SELECT COUNT(*) FROM ranked WHERE rn <= s.top10_cut)::int AS top10_count,
        (SELECT COUNT(*) FROM ranked WHERE rn <= s.top25_cut)::int AS top25_count,
        (SELECT COALESCE(SUM(log_count), 0) FROM ranked WHERE rn <= s.top1_cut)::int  AS top1_logs,
        (SELECT COALESCE(SUM(log_count), 0) FROM ranked WHERE rn <= s.top10_cut)::int AS top10_logs,
        (SELECT COALESCE(SUM(log_count), 0) FROM ranked WHERE rn <= s.top25_cut)::int AS top25_logs
      FROM stats s
    `));

    const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
    const totalUsers = Number(row.total_users || 0);
    const totalLogs  = Number(row.total_logs  || 0);

    return {
      totalUsers,
      totalLogs,
      top1:  { userCount: Number(row.top1_count  || 0), logShare: pct(Number(row.top1_logs  || 0), totalLogs) },
      top10: { userCount: Number(row.top10_count || 0), logShare: pct(Number(row.top10_logs || 0), totalLogs) },
      top25: { userCount: Number(row.top25_count || 0), logShare: pct(Number(row.top25_logs || 0), totalLogs) },
    };
  }

  /**
   * Per-user engagement score (0-100). Composite of recency, frequency,
   * breadth (categories), and current streak. Returns:
   *  - distribution across 5 buckets
   *  - top 20 most engaged users
   *  - 20 at-risk users (recently engaged but slipping: score 15-40)
   */
  async getEngagementScores(): Promise<{
    distribution: Array<{ bucket: string; count: number }>;
    topUsers: Array<{ userId: string; name: string; email: string; role: string; score: number; logs28d: number; currentStreak: number; daysSinceLast: number | null }>;
    atRisk: Array<{ userId: string; name: string; email: string; role: string; score: number; logs28d: number; currentStreak: number; daysSinceLast: number | null }>;
    avgScore: number;
    activeUserCount: number;
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];

    const rows = r(await db.execute(sql`
      WITH metrics AS (
        SELECT
          u.id AS user_id,
          u.first_name, u.last_name, u.email, u.role,
          MAX(tl.completed_at) AS last_log_at,
          COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS logs_28d,
          COUNT(DISTINCT d.category) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS cats_28d,
          COALESCE(MAX(us.current_streak), 0)::int AS current_streak
        FROM users u
        LEFT JOIN training_logs tl ON tl.user_id = u.id
        LEFT JOIN drills d ON d.id = tl.drill_id
        LEFT JOIN user_streaks us ON us.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
      )
      SELECT
        user_id,
        TRIM(BOTH ' ' FROM COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS name,
        email,
        role,
        last_log_at,
        logs_28d,
        cats_28d,
        current_streak,
        CASE
          WHEN last_log_at IS NULL THEN NULL
          ELSE EXTRACT(EPOCH FROM (NOW() - last_log_at)) / 86400.0
        END AS days_since_last
      FROM metrics
    `));

    const buckets = [
      { name: "0-20",   min: 0,  max: 20,  count: 0 },
      { name: "20-40",  min: 20, max: 40,  count: 0 },
      { name: "40-60",  min: 40, max: 60,  count: 0 },
      { name: "60-80",  min: 60, max: 80,  count: 0 },
      { name: "80-100", min: 80, max: 101, count: 0 },
    ];

    const scored = rows.map((row: any) => {
      const daysSince = row.days_since_last == null ? null : Number(row.days_since_last);
      const logs28d = Number(row.logs_28d || 0);
      const cats28d = Number(row.cats_28d || 0);
      const streak  = Number(row.current_streak || 0);

      // Recency: 1.0 today → 0 at 30+ days
      const r_score = daysSince == null ? 0 : Math.max(0, 1 - daysSince / 30);
      // Frequency: 1+ log/day for 28d = perfect
      const f_score = Math.min(logs28d / 28, 1);
      // Breadth: 5+ distinct categories in 28d = perfect
      const b_score = Math.min(cats28d / 5, 1);
      // Streak: 30+ day streak = perfect
      const s_score = Math.min(streak / 30, 1);

      const score = Math.round((r_score * 35 + f_score * 35 + b_score * 15 + s_score * 15) * 10) / 10;

      return {
        userId: String(row.user_id),
        name:   String(row.name || "—"),
        email:  String(row.email || ""),
        role:   String(row.role || "player"),
        score,
        logs28d,
        currentStreak: streak,
        daysSinceLast: daysSince == null ? null : Math.round(daysSince * 10) / 10,
      };
    });

    // "Active" = had ≥1 training log in the last 28 days. This matches the
    // product definition (active in the recent window), not "score > 0"
    // which would include users whose only signal is recency.
    let totalScore = 0;
    let activeCount = 0;
    for (const u of scored) {
      const b = buckets.find(b => u.score >= b.min && u.score < b.max);
      if (b) b.count++;
      if (u.logs28d > 0) {
        totalScore += u.score;
        activeCount++;
      }
    }

    const topUsers = [...scored].sort((a, b) => b.score - a.score).slice(0, 20);

    // At-risk: had recent activity (logs in 28d > 0) but score 15-40 (slipping).
    const atRisk = scored
      .filter(u => u.logs28d > 0 && u.score >= 15 && u.score < 40)
      .sort((a, b) => (b.daysSinceLast ?? 0) - (a.daysSinceLast ?? 0))
      .slice(0, 20);

    return {
      distribution: buckets.map(b => ({ bucket: b.name, count: b.count })),
      topUsers,
      atRisk,
      avgScore: activeCount > 0 ? Math.round((totalScore / activeCount) * 10) / 10 : 0,
      activeUserCount: activeCount,
    };
  }

  /**
   * Funnel analysis — for each preset funnel, walks each user's events in
   * time order and counts how many made it to each sequential step.
   * The next step must occur *after* the previous step's timestamp for
   * the same user. Median time-to-next is reported per step transition.
   */
  async getFunnelAnalysis(funnelKey: string, days: number): Promise<{
    funnel: string;
    label: string;
    description: string;
    windowDays: number;
    steps: Array<{
      key: string;
      label: string;
      users: number;
      pctFromStart: number;
      pctFromPrev: number;
      dropOff: number;
      medianTimeToNextSec: number | null;
    }>;
    totalCandidates: number;
  }> {
    type StepDef = {
      key: string;
      label: string;
      events: string[];
      pageMatch?: (path: string | null) => boolean;
    };
    const FUNNELS: Record<string, { label: string; description: string; steps: StepDef[] }> = {
      activation: {
        label: "New User Activation",
        description: "Signup → Onboarding → First Drill Viewed → First Drill Logged",
        steps: [
          { key: "signup",      label: "Signed Up",            events: ["signup"] },
          { key: "onboarding",  label: "Completed Onboarding", events: ["onboarding_completed"] },
          { key: "first_view",  label: "Viewed First Drill",   events: ["drill_viewed"] },
          { key: "first_log",   label: "Logged First Drill",   events: ["drill_log_completed"] },
        ],
      },
      booking: {
        label: "Trainer Booking",
        description: "Discover trainers → View trainer profile → Book a session",
        steps: [
          { key: "discover", label: "Visited My Trainer",      events: ["page_view"], pageMatch: (p) => !!p && p.startsWith("/my-trainer") },
          { key: "profile",  label: "Viewed Trainer Profile",  events: ["page_view"], pageMatch: (p) => !!p && p.startsWith("/t/") },
          { key: "booked",   label: "Booked Session",          events: ["booking_completed"] },
        ],
      },
      engagement: {
        label: "Daily Engagement Loop",
        description: "Drill View → Drill Log → Daily Challenge",
        steps: [
          { key: "view",      label: "Viewed a Drill",          events: ["drill_viewed"] },
          { key: "log",       label: "Logged a Drill",          events: ["drill_log_completed"] },
          { key: "challenge", label: "Started Daily Challenge", events: ["daily_challenge_started"] },
        ],
      },
    };

    const def = FUNNELS[funnelKey];
    if (!def) throw new Error(`Unknown funnel: ${funnelKey}`);
    const windowDays = Math.max(1, Math.min(365, Math.floor(days || 30)));

    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];

    // Pull only events relevant to any step in this funnel
    const eventNames = Array.from(new Set(def.steps.flatMap(s => s.events)));
    const rows = r<{ user_id: string; event: string; page: string | null; created_at: string | Date }>(
      await db.execute(sql`
        SELECT user_id, event, page, created_at, id
        FROM analytics_events
        WHERE created_at >= NOW() - (${windowDays}::int || ' days')::interval
          AND event IN (${sql.join(eventNames.map(e => sql`${e}`), sql`, `)})
        -- Deterministic tiebreak on id so equal-timestamp events have a stable order.
        ORDER BY user_id ASC, created_at ASC, id ASC
      `)
    );

    // Group events by user, preserving time order
    const byUser = new Map<string, Array<{ event: string; page: string | null; ts: number }>>();
    for (const row of rows) {
      const uid = String(row.user_id);
      const ts = new Date(row.created_at as any).getTime();
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push({ event: String(row.event), page: row.page ?? null, ts });
    }

    // For each user, walk events and find earliest-after-previous timestamp at each step
    const stepReachCount = def.steps.map(() => 0);
    const transitionDeltas: number[][] = def.steps.map(() => []); // index i = delta seconds between step i-1 and step i
    let totalCandidates = 0; // users who reached at least step 0

    for (const events of byUser.values()) {
      let pointer = 0;
      let lastReachedAt: number | null = null;
      for (const e of events) {
        if (pointer >= def.steps.length) break;
        const step = def.steps[pointer];
        const matchesEvent = step.events.includes(e.event);
        const matchesPage = !step.pageMatch || step.pageMatch(e.page);
        // Step 2+ must occur strictly AFTER the previous step's timestamp.
        const isAfterPrev = pointer === 0 || lastReachedAt == null || e.ts > lastReachedAt;
        if (matchesEvent && matchesPage && isAfterPrev) {
          stepReachCount[pointer]++;
          if (pointer === 0) totalCandidates++;
          if (pointer > 0 && lastReachedAt != null) {
            transitionDeltas[pointer].push((e.ts - lastReachedAt) / 1000);
          }
          lastReachedAt = e.ts;
          pointer++;
        }
      }
    }

    const median = (arr: number[]): number | null => {
      if (!arr.length) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : Math.round(sorted[mid]);
    };

    const startCount = stepReachCount[0];
    const steps = def.steps.map((s, i) => {
      const users = stepReachCount[i];
      const prev = i === 0 ? users : stepReachCount[i - 1];
      const pctFromStart = startCount > 0 ? Math.round((users / startCount) * 1000) / 10 : 0;
      const pctFromPrev  = prev > 0       ? Math.round((users / prev) * 1000) / 10       : 0;
      const dropOff      = i === 0 ? 0 : prev - users;
      const medianTimeToNextSec = i === 0 ? null : median(transitionDeltas[i]);
      return { key: s.key, label: s.label, users, pctFromStart, pctFromPrev, dropOff, medianTimeToNextSec };
    });

    return {
      funnel: funnelKey,
      label: def.label,
      description: def.description,
      windowDays,
      steps,
      totalCandidates,
    };
  }

  /**
   * Behavioral user segmentation. Each user is assigned to exactly one
   * segment based on signup recency + recent training activity.
   */
  async getUserSegments(): Promise<{
    segments: Array<{ key: string; label: string; description: string; color: string; count: number; pct: number }>;
    totalUsers: number;
    segmentDetails: Record<string, Array<{
      userId: string; name: string; email: string; role: string;
      signedUpDaysAgo: number; logs28d: number; lastActiveDaysAgo: number | null; currentStreak: number;
    }>>;
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];

    // Pull per-user metrics: signup age, total logs ever, last log timestamp, logs in 28d, weekend logs in 28d, current streak.
    const rows = r(await db.execute(sql`
      WITH metrics AS (
        SELECT
          u.id AS user_id,
          u.first_name, u.last_name, u.email, u.role,
          EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 86400.0 AS signup_days_ago,
          COUNT(tl.id)::int AS logs_total,
          COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '60 days')::int AS logs_60d,
          COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS logs_28d,
          COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '14 days')::int AS logs_14d,
          COUNT(tl.id) FILTER (
            WHERE tl.completed_at >= NOW() - INTERVAL '28 days'
              AND EXTRACT(DOW FROM tl.completed_at) IN (0, 6)
          )::int AS weekend_logs_28d,
          MAX(tl.completed_at) AS last_log_at,
          COALESCE(MAX(us.current_streak), 0)::int AS current_streak
        FROM users u
        LEFT JOIN training_logs tl ON tl.user_id = u.id
        LEFT JOIN user_streaks us ON us.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
      )
      SELECT * FROM metrics
    `));

    const SEGMENT_DEFS: Array<{ key: string; label: string; description: string; color: string }> = [
      { key: "power",       label: "Power Users",     description: "20+ training logs in the last 28 days. Your biggest fans.",                   color: "#22c55e" },
      { key: "grinder",     label: "Daily Grinders",  description: "14–19 logs in 28 days. Logging almost every day.",                            color: "#3b82f6" },
      { key: "weekend",     label: "Weekend Warriors", description: "4+ logs in 28 days, 60%+ on Saturday or Sunday.",                            color: "#a855f7" },
      { key: "casual",      label: "Casual Loggers",   description: "1–13 logs in 28 days. Engaged, with room to grow.",                          color: "#06b6d4" },
      { key: "new_active",  label: "New & Active",     description: "Signed up in the last 14 days and have already logged a drill.",             color: "#f59e0b" },
      { key: "new_signup",  label: "New (Onboarding)", description: "Signed up in the last 14 days, no training log yet.",                        color: "#fbbf24" },
      { key: "at_risk",     label: "At-Risk",          description: "Was active in last 60 days but hasn't logged in the last 14 days.",          color: "#f97316" },
      { key: "ghost",       label: "Ghost Signups",    description: "Signed up over a week ago and never logged a single drill.",                 color: "#94a3b8" },
      { key: "dormant",     label: "Dormant",          description: "Has logged in the past, but no activity in 60+ days.",                       color: "#64748b" },
    ];

    const counts = new Map<string, number>(SEGMENT_DEFS.map(s => [s.key, 0]));
    const details = new Map<string, Array<any>>(SEGMENT_DEFS.map(s => [s.key, []]));

    const totalUsers = rows.length;

    for (const row of rows) {
      const signupDaysAgo = Number(row.signup_days_ago);
      const logsTotal = Number(row.logs_total);
      const logs60d = Number(row.logs_60d);
      const logs28d = Number(row.logs_28d);
      const logs14d = Number(row.logs_14d);
      const weekendLogs28d = Number(row.weekend_logs_28d);
      const lastLogAt = row.last_log_at ? new Date(row.last_log_at) : null;
      const lastActiveDaysAgo = lastLogAt ? Math.floor((Date.now() - lastLogAt.getTime()) / 86400000) : null;
      const weekendShare = logs28d > 0 ? weekendLogs28d / logs28d : 0;

      let key: string;
      if (signupDaysAgo < 14) {
        key = logsTotal > 0 ? "new_active" : "new_signup";
      } else if (logsTotal === 0) {
        key = "ghost";
      } else if (logs60d > 0 && logs14d === 0) {
        // At-Risk takes priority over Casual: any user with activity in the
        // last 60 days but nothing in the last 14 is slipping away.
        key = "at_risk";
      } else if (logs28d >= 20) {
        key = "power";
      } else if (logs28d >= 14) {
        key = "grinder";
      } else if (logs28d >= 4 && weekendShare >= 0.6) {
        key = "weekend";
      } else if (logs28d >= 1) {
        key = "casual";
      } else {
        key = "dormant";
      }

      counts.set(key, (counts.get(key) ?? 0) + 1);
      details.get(key)!.push({
        userId: String(row.user_id),
        name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || String(row.email ?? "—"),
        email: String(row.email ?? ""),
        role: String(row.role ?? "player"),
        signedUpDaysAgo: Math.round(signupDaysAgo),
        logs28d,
        lastActiveDaysAgo,
        currentStreak: Number(row.current_streak),
      });
    }

    // Sort each segment's full list deterministically, THEN cap to 50.
    // Active segments sort by logs28d desc; recovery/inactive segments by
    // signedUpDaysAgo desc (oldest first — most worth re-engaging).
    const ACTIVE = new Set(["power", "grinder", "weekend", "casual", "new_active"]);
    for (const [key, arr] of details) {
      if (ACTIVE.has(key)) {
        arr.sort((a, b) => b.logs28d - a.logs28d || a.userId.localeCompare(b.userId));
      } else {
        arr.sort((a, b) => b.signedUpDaysAgo - a.signedUpDaysAgo || a.userId.localeCompare(b.userId));
      }
      if (arr.length > 50) arr.length = 50;
    }

    const segments = SEGMENT_DEFS.map(def => {
      const count = counts.get(def.key) ?? 0;
      return {
        ...def,
        count,
        pct: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
      };
    });

    const segmentDetails: Record<string, any[]> = {};
    for (const [key, arr] of details) segmentDetails[key] = arr;

    return { segments, totalUsers, segmentDetails };
  }

  /**
   * Content (drill) performance metrics — top/bottom drills, category
   * breakdown, and Daily Challenge engagement summary.
   */
  async getContentPerformance(): Promise<{
    topDrills: Array<{ id: string; title: string; category: string; difficulty: string; logs28d: number; uniqueUsers28d: number; logsAllTime: number }>;
    underperformers: Array<{ id: string; title: string; category: string; difficulty: string; logs28d: number; ageDays: number }>;
    categoryStats: Array<{ category: string; drillCount: number; logs28d: number; avgLogsPerDrill: number; uniqueUsers28d: number }>;
    dailyChallenge: {
      completionsLast7d: number;
      completionsLast28d: number;
      avgPerDay7d: number;
      activeStreakUsers: number;
      avgCurrentStreak: number;
      longestCurrentStreak: number;
      uniqueUsers28d: number;
    };
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    // Top 20 most-logged drills in 28d
    const topRows = r(await db.execute(sql`
      SELECT
        d.id,
        d.title,
        d.category,
        d.difficulty,
        COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS logs_28d,
        COUNT(DISTINCT tl.user_id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS users_28d,
        COUNT(tl.id)::int AS logs_all_time
      FROM drills d
      LEFT JOIN training_logs tl ON tl.drill_id = d.id
      GROUP BY d.id, d.title, d.category, d.difficulty
      ORDER BY logs_28d DESC, logs_all_time DESC
      LIMIT 20
    `));

    // Underperformers: drills older than 14 days with 0 logs in 28 days, oldest first
    const underRows = r(await db.execute(sql`
      WITH drill_stats AS (
        SELECT
          d.id, d.title, d.category, d.difficulty, d.created_at,
          COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS logs_28d
        FROM drills d
        LEFT JOIN training_logs tl ON tl.drill_id = d.id
        WHERE d.created_at < NOW() - INTERVAL '14 days'
          AND COALESCE(d.is_shared, true) = true
        GROUP BY d.id, d.title, d.category, d.difficulty, d.created_at
      )
      SELECT
        id, title, category, difficulty, logs_28d,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::int AS age_days
      FROM drill_stats
      WHERE logs_28d = 0
      ORDER BY age_days DESC
      LIMIT 20
    `));

    // Category aggregates
    const catRows = r(await db.execute(sql`
      SELECT
        d.category,
        COUNT(DISTINCT d.id)::int AS drill_count,
        COUNT(tl.id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS logs_28d,
        COUNT(DISTINCT tl.user_id) FILTER (WHERE tl.completed_at >= NOW() - INTERVAL '28 days')::int AS users_28d
      FROM drills d
      LEFT JOIN training_logs tl ON tl.drill_id = d.id
      GROUP BY d.category
      ORDER BY logs_28d DESC
    `));

    // Daily Challenge stats
    const dcRow = r1(await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '7 days')::int  AS completions_7d,
        (SELECT COUNT(*) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '28 days')::int AS completions_28d,
        (SELECT COUNT(DISTINCT user_id) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '28 days')::int AS unique_users_28d,
        (SELECT COUNT(*) FROM user_streaks WHERE current_streak >= 1)::int AS active_streak_users,
        COALESCE((SELECT AVG(current_streak)::float FROM user_streaks WHERE current_streak >= 1), 0) AS avg_current_streak,
        COALESCE((SELECT MAX(current_streak)::int FROM user_streaks), 0) AS longest_current_streak
    `));

    const topDrills = topRows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title),
      category: String(row.category ?? "—"),
      difficulty: String(row.difficulty ?? "—"),
      logs28d: Number(row.logs_28d),
      uniqueUsers28d: Number(row.users_28d),
      logsAllTime: Number(row.logs_all_time),
    }));

    const underperformers = underRows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title),
      category: String(row.category ?? "—"),
      difficulty: String(row.difficulty ?? "—"),
      logs28d: Number(row.logs_28d),
      ageDays: Number(row.age_days),
    }));

    const categoryStats = catRows.map((row: any) => {
      const drillCount = Number(row.drill_count);
      const logs28d = Number(row.logs_28d);
      return {
        category: String(row.category ?? "—"),
        drillCount,
        logs28d,
        avgLogsPerDrill: drillCount > 0 ? Math.round((logs28d / drillCount) * 10) / 10 : 0,
        uniqueUsers28d: Number(row.users_28d),
      };
    });

    const completions7d = Number(dcRow.completions_7d || 0);
    const dailyChallenge = {
      completionsLast7d: completions7d,
      completionsLast28d: Number(dcRow.completions_28d || 0),
      avgPerDay7d: Math.round((completions7d / 7) * 10) / 10,
      activeStreakUsers: Number(dcRow.active_streak_users || 0),
      avgCurrentStreak: Math.round(Number(dcRow.avg_current_streak || 0) * 10) / 10,
      longestCurrentStreak: Number(dcRow.longest_current_streak || 0),
      uniqueUsers28d: Number(dcRow.unique_users_28d || 0),
    };

    return { topDrills, underperformers, categoryStats, dailyChallenge };
  }

  /**
   * Live activity feed — what's happening on the platform RIGHT NOW.
   * Designed to be polled every ~10 seconds from the admin Live tab.
   */
  async getLiveActivity(): Promise<{
    activeNow: number;
    active15min: number;
    active60min: number;
    eventsLast15min: number;
    eventsLast60min: number;
    eventsByMinute: Array<{ minute: string; count: number }>;
    topActiveUsers: Array<{ userId: string; name: string; email: string; eventCount: number }>;
    recentEvents: Array<{ id: string; userId: string | null; userName: string; event: string; props: any; createdAt: string; ageSec: number }>;
    activeLocations: Array<{ country: string | null; city: string | null; lat: number; lng: number; userCount: number; eventCount: number }>;
  }> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    const counts = r1(await db.execute(sql`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '5 minutes' AND user_id IS NOT NULL)::int  AS active_now,
        (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '15 minutes' AND user_id IS NOT NULL)::int AS active_15min,
        (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '60 minutes' AND user_id IS NOT NULL)::int AS active_60min,
        (SELECT COUNT(*) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '15 minutes')::int AS events_15min,
        (SELECT COUNT(*) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '60 minutes')::int AS events_60min
    `));

    // Per-minute event counts for last 60 minutes (for sparkline)
    const minuteRows = r(await db.execute(sql`
      WITH minutes AS (
        SELECT generate_series(
          date_trunc('minute', NOW() - INTERVAL '59 minutes'),
          date_trunc('minute', NOW()),
          INTERVAL '1 minute'
        ) AS minute
      )
      SELECT
        TO_CHAR(m.minute, 'HH24:MI') AS minute,
        COUNT(ae.id)::int AS count
      FROM minutes m
      LEFT JOIN analytics_events ae
        ON date_trunc('minute', ae.created_at) = m.minute
       AND ae.created_at >= NOW() - INTERVAL '60 minutes'
      GROUP BY m.minute
      ORDER BY m.minute ASC
    `));

    const topUserRows = r(await db.execute(sql`
      SELECT
        ae.user_id,
        u.first_name, u.last_name, u.email,
        COUNT(*)::int AS event_count
      FROM analytics_events ae
      LEFT JOIN users u ON u.id = ae.user_id
      WHERE ae.created_at >= NOW() - INTERVAL '60 minutes'
        AND ae.user_id IS NOT NULL
      GROUP BY ae.user_id, u.first_name, u.last_name, u.email
      ORDER BY event_count DESC, ae.user_id ASC
      LIMIT 10
    `));

    const recentRows = r(await db.execute(sql`
      SELECT
        ae.id, ae.user_id, ae.event, ae.metadata, ae.created_at,
        u.first_name, u.last_name, u.email,
        EXTRACT(EPOCH FROM (NOW() - ae.created_at))::int AS age_sec
      FROM analytics_events ae
      LEFT JOIN users u ON u.id = ae.user_id
      ORDER BY ae.created_at DESC, ae.id DESC
      LIMIT 50
    `));

    // Active locations (last 60 min) — group by city dot, count distinct users.
    // Geo data is stored in metadata.geo by the /api/analytics/track route.
    // Casts are guarded: only rows whose lat/lng look like valid signed decimals
    // are included, so a malformed metadata.geo can never crash this query.
    const NUM_RE = "^-?[0-9]+(\\.[0-9]+)?$";
    const locationRows = r(await db.execute(sql`
      WITH geo_events AS (
        SELECT
          ae.user_id,
          ae.metadata->'geo'->>'country' AS country,
          ae.metadata->'geo'->>'city' AS city,
          ae.metadata->'geo'->>'lat' AS lat_raw,
          ae.metadata->'geo'->>'lng' AS lng_raw
        FROM analytics_events ae
        WHERE ae.created_at >= NOW() - INTERVAL '60 minutes'
          AND ae.metadata ? 'geo'
      )
      SELECT
        country,
        city,
        ROUND(lat_raw::numeric, 2)::float AS lat,
        ROUND(lng_raw::numeric, 2)::float AS lng,
        COUNT(DISTINCT user_id)::int AS user_count,
        COUNT(*)::int AS event_count
      FROM geo_events
      WHERE lat_raw ~ ${NUM_RE}
        AND lng_raw ~ ${NUM_RE}
      GROUP BY country, city, ROUND(lat_raw::numeric, 2), ROUND(lng_raw::numeric, 2)
      ORDER BY user_count DESC, event_count DESC
      LIMIT 200
    `));

    return {
      activeNow: Number(counts.active_now || 0),
      active15min: Number(counts.active_15min || 0),
      active60min: Number(counts.active_60min || 0),
      eventsLast15min: Number(counts.events_15min || 0),
      eventsLast60min: Number(counts.events_60min || 0),
      eventsByMinute: minuteRows.map((row: any) => ({ minute: String(row.minute), count: Number(row.count) })),
      topActiveUsers: topUserRows.map((row: any) => ({
        userId: String(row.user_id),
        name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || String(row.email ?? "—"),
        email: String(row.email ?? ""),
        eventCount: Number(row.event_count),
      })),
      recentEvents: recentRows.map((row: any) => ({
        id: String(row.id),
        userId: row.user_id ? String(row.user_id) : null,
        userName: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || String(row.email ?? "anonymous"),
        event: String(row.event),
        props: row.metadata ?? null,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        ageSec: Number(row.age_sec || 0),
      })),
      activeLocations: locationRows.map((row: any) => ({
        country: row.country ? String(row.country) : null,
        city: row.city ? String(row.city) : null,
        lat: Number(row.lat),
        lng: Number(row.lng),
        userCount: Number(row.user_count || 0),
        eventCount: Number(row.event_count || 0),
      })),
    };
  }

  /**
   * List active (non-dismissed) AI insights, newest first.
   */
  async listAnalyticsInsights(opts: number | { limit?: number; kinds?: string[]; since?: Date; includeDismissed?: boolean } = 30): Promise<AnalyticsInsight[]> {
    const o = typeof opts === "number" ? { limit: opts } : opts;
    const limit = o.limit ?? 30;
    const includeDismissed = o.includeDismissed ?? false;
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const conditions: any[] = [];
    if (!includeDismissed) conditions.push(sql`is_dismissed = false`);
    if (o.kinds && o.kinds.length > 0) {
      conditions.push(sql`kind IN (${sql.join(o.kinds.map(k => sql`${k}`), sql`, `)})`);
    }
    if (o.since) {
      conditions.push(sql`created_at >= ${o.since.toISOString()}`);
    }
    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;
    const rows = r(await db.execute(sql`
      SELECT id, kind, title, body, severity, metadata, is_dismissed, created_at
      FROM analytics_insights
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `));
    return rows.map((row: any) => ({
      id: String(row.id),
      kind: String(row.kind),
      title: String(row.title),
      body: String(row.body),
      severity: String(row.severity),
      metadata: row.metadata,
      isDismissed: Boolean(row.is_dismissed),
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    })) as any;
  }

  async dismissAnalyticsInsight(id: string): Promise<void> {
    await db.execute(sql`UPDATE analytics_insights SET is_dismissed = true WHERE id = ${id}`);
  }

  async insertAnalyticsInsight(insight: { kind: string; title: string; body: string; severity: string; metadata?: any }): Promise<string> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const rows = r(await db.execute(sql`
      INSERT INTO analytics_insights (kind, title, body, severity, metadata)
      VALUES (${insight.kind}, ${insight.title}, ${insight.body}, ${insight.severity}, ${insight.metadata ? JSON.stringify(insight.metadata) : null}::jsonb)
      RETURNING id
    `));
    return String(rows[0]?.id ?? "");
  }

  /**
   * Code-based anomaly detection — scans key metrics for week-over-week
   * swings of >=30% (in either direction) and inserts insight rows.
   * Does NOT call any AI; safe to call frequently.
   */
  async detectAnalyticsAnomalies(): Promise<{ inserted: number; checked: number }> {
    const movers = await this.getTopMovers();
    let inserted = 0;
    for (const m of movers) {
      // Skip noise: only flag changes where last week had at least 5 events
      if (m.lastWeek < 5) continue;
      const absPct = Math.abs(m.deltaPct);
      if (absPct < 30) continue;

      const direction = m.deltaPct >= 0 ? "up" : "down";
      const severity = direction === "down" && absPct >= 50 ? "critical"
                     : direction === "down" && absPct >= 30 ? "warn"
                     : direction === "up" && absPct >= 50 ? "positive"
                     : "info";
      const arrow = direction === "up" ? "▲" : "▼";
      const title = `${m.metric} ${arrow} ${absPct.toFixed(0)}% week-over-week`;
      const body = `**${m.metric}** moved ${direction} by **${absPct.toFixed(1)}%** week over week.\n\n- This week: **${m.thisWeek.toLocaleString()}**\n- Last week: ${m.lastWeek.toLocaleString()}\n- Net change: ${m.deltaAbs >= 0 ? "+" : ""}${m.deltaAbs.toLocaleString()}`;

      // De-dupe by stable key (metric + direction) over the last 24h —
      // not by title, since title embeds a rounded percentage that drifts.
      const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
      const existing = r(await db.execute(sql`
        SELECT id FROM analytics_insights
        WHERE kind = 'anomaly'
          AND metadata->>'metric' = ${m.metric}
          AND metadata->>'direction' = ${direction}
          AND created_at >= NOW() - INTERVAL '24 hours'
          AND is_dismissed = false
        LIMIT 1
      `));
      if (existing.length > 0) continue;

      await this.insertAnalyticsInsight({
        kind: "anomaly",
        title,
        body,
        severity,
        metadata: { metric: m.metric, direction, deltaPct: m.deltaPct, thisWeek: m.thisWeek, lastWeek: m.lastWeek },
      });
      inserted++;
    }
    return { inserted, checked: movers.length };
  }

  /**
   * Snapshot of headline platform metrics — fed into the AI summary prompt.
   */
  async getMetricsSnapshot(): Promise<any> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};
    const head = r1(await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days')::int AS signups_7d,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS signups_prev_7d,
        (SELECT COUNT(*) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS logs_7d,
        (SELECT COUNT(*) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '14 days' AND completed_at < NOW() - INTERVAL '7 days')::int AS logs_prev_7d,
        (SELECT COUNT(DISTINCT user_id) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS active_users_7d,
        (SELECT COUNT(*) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS daily_challenge_7d,
        (SELECT COUNT(*) FROM training_sessions WHERE created_at >= NOW() - INTERVAL '7 days')::int AS bookings_7d
    `));
    return head;
  }

  /**
   * Week-over-week % change for headline metrics.
   * Returns rows sorted by absolute change for "biggest movers" UI.
   */
  async getTopMovers(): Promise<Array<{ metric: string; thisWeek: number; lastWeek: number; deltaPct: number; deltaAbs: number }>> {
    const r = <T = any>(res: any): T[] => (res.rows ?? res) as T[];
    const r1 = (res: any): any => r(res)[0] ?? {};

    const row = r1(await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days')::int AS signups_tw,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS signups_lw,
        (SELECT COUNT(*) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS logs_tw,
        (SELECT COUNT(*) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '14 days' AND completed_at < NOW() - INTERVAL '7 days')::int AS logs_lw,
        (SELECT COUNT(DISTINCT user_id) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS active_tw,
        (SELECT COUNT(DISTINCT user_id) FROM training_logs WHERE completed_at >= NOW() - INTERVAL '14 days' AND completed_at < NOW() - INTERVAL '7 days')::int AS active_lw,
        (SELECT COUNT(*) FROM training_sessions WHERE created_at >= NOW() - INTERVAL '7 days')::int AS sessions_tw,
        (SELECT COUNT(*) FROM training_sessions WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS sessions_lw,
        (SELECT COUNT(*) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '7 days')::int AS daily_tw,
        (SELECT COUNT(*) FROM daily_completions WHERE completed_at >= NOW() - INTERVAL '14 days' AND completed_at < NOW() - INTERVAL '7 days')::int AS daily_lw,
        (SELECT COUNT(*) FROM player_trainer_connections WHERE status = 'accepted' AND created_at >= NOW() - INTERVAL '7 days')::int AS conns_tw,
        (SELECT COUNT(*) FROM player_trainer_connections WHERE status = 'accepted' AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS conns_lw,
        (SELECT COUNT(*) FROM feedback_posts WHERE created_at >= NOW() - INTERVAL '7 days')::int AS fb_tw,
        (SELECT COUNT(*) FROM feedback_posts WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::int AS fb_lw
    `));

    const pct = (tw: number, lw: number) => {
      if (lw === 0) return tw > 0 ? 100 : 0;
      return Math.round(((tw - lw) / lw) * 1000) / 10;
    };

    const metrics = [
      { metric: "New Signups",          tw: Number(row.signups_tw  || 0), lw: Number(row.signups_lw  || 0) },
      { metric: "Training Logs",        tw: Number(row.logs_tw     || 0), lw: Number(row.logs_lw     || 0) },
      { metric: "Active Users",         tw: Number(row.active_tw   || 0), lw: Number(row.active_lw   || 0) },
      { metric: "Sessions Booked",      tw: Number(row.sessions_tw || 0), lw: Number(row.sessions_lw || 0) },
      { metric: "Daily Challenges",     tw: Number(row.daily_tw    || 0), lw: Number(row.daily_lw    || 0) },
      { metric: "New Connections",      tw: Number(row.conns_tw    || 0), lw: Number(row.conns_lw    || 0) },
      { metric: "Feedback Posts",       tw: Number(row.fb_tw       || 0), lw: Number(row.fb_lw       || 0) },
    ].map(m => ({
      metric: m.metric,
      thisWeek: m.tw,
      lastWeek: m.lw,
      deltaPct: pct(m.tw, m.lw),
      deltaAbs: m.tw - m.lw,
    }));

    return metrics.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  }

  // ─── Daily Streak Challenge ─────────────────────────────────────────────

  async getDailyChallenge(dateStr: string): Promise<{ challenge: DailyChallenge; drill: Drill } | null> {
    // Check for an existing record for this date
    const [existing] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.challengeDate, dateStr));
    if (existing) {
      const [drill] = await db.select().from(drills).where(eq(drills.id, existing.drillId));
      if (!drill) return null;
      return { challenge: existing, drill };
    }

    // Generate a brand-new AI drill for today
    let aiDrill;
    try {
      aiDrill = await generateAiDrill(dateStr);
    } catch (err) {
      console.error("[daily-challenge] AI generation failed, falling back to library drill:", err);
      // Fallback: pick a library drill by date rotation
      const adminDrills = await db.select().from(drills).where(and(isNull(drills.userId), or(eq(drills.isAiGenerated, false), isNull(drills.isAiGenerated)))).orderBy(drills.id);
      if (adminDrills.length === 0) return null;
      const epoch = new Date("2024-01-01T00:00:00Z").getTime();
      const target = new Date(`${dateStr}T00:00:00Z`).getTime();
      const dayIndex = Math.floor((target - epoch) / (1000 * 60 * 60 * 24));
      const fallbackDrill = adminDrills[((dayIndex % adminDrills.length) + adminDrills.length) % adminDrills.length];
      const [challenge] = await db.insert(dailyChallenges).values({ challengeDate: dateStr, drillId: fallbackDrill.id, isAdminOverride: false }).onConflictDoNothing().returning();
      const final = challenge ?? (await db.select().from(dailyChallenges).where(eq(dailyChallenges.challengeDate, dateStr)))[0];
      if (!final) return null;
      const [finalDrill] = await db.select().from(drills).where(eq(drills.id, final.drillId));
      return finalDrill ? { challenge: final, drill: finalDrill } : null;
    }

    // Insert the AI-generated drill into the drills table
    const [insertedDrill] = await db
      .insert(drills)
      .values({
        title: aiDrill.title,
        description: aiDrill.description,
        category: aiDrill.category,
        difficulty: aiDrill.difficulty,
        duration: aiDrill.duration,
        equipment: aiDrill.equipment,
        tips: aiDrill.tips,
        isFeatured: false,
        isAiGenerated: true,
        userId: null, // system drill
      })
      .returning();

    if (!insertedDrill) return null;

    // Wire up the AI-specified metrics for this drill
    const allTemplates = await db.select().from(metricTemplates);
    const tmByName = Object.fromEntries(allTemplates.map(t => [t.name, t.id]));
    const metricAssociations = aiDrill.metrics
      .map((name, idx) => {
        const tmId = tmByName[name];
        if (!tmId) return null;
        return {
          drillId: insertedDrill.id,
          metricTemplateId: tmId,
          isRequired: name === "shots-made" || name === "shot-attempts" || name === "time",
          sortOrder: idx,
        };
      })
      .filter(Boolean) as { drillId: string; metricTemplateId: string; isRequired: boolean; sortOrder: number }[];

    if (metricAssociations.length > 0) {
      await db.insert(drillMetrics).values(metricAssociations).onConflictDoNothing();
    }

    // Create the daily challenge record
    const [challenge] = await db
      .insert(dailyChallenges)
      .values({ challengeDate: dateStr, drillId: insertedDrill.id, isAdminOverride: false })
      .onConflictDoNothing()
      .returning();

    // Race condition guard — if another process already inserted it, fetch that one
    const final = challenge ?? (await db.select().from(dailyChallenges).where(eq(dailyChallenges.challengeDate, dateStr)))[0];
    if (!final) return null;
    const [finalDrill] = await db.select().from(drills).where(eq(drills.id, final.drillId));
    return finalDrill ? { challenge: final, drill: finalDrill } : null;
  }

  async getTodayCompletion(userId: string, dateStr: string): Promise<DailyCompletion | null> {
    const [row] = await db
      .select()
      .from(dailyCompletions)
      .where(and(eq(dailyCompletions.userId, userId), eq(dailyCompletions.challengeDate, dateStr)));
    return row ?? null;
  }

  async getUserStreak(userId: string): Promise<UserStreak> {
    const [existing] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    if (existing) return existing;
    // Create a fresh streak row for new users
    const [created] = await db
      .insert(userStreaks)
      .values({ userId, currentStreak: 0, longestStreak: 0 })
      .returning();
    return created;
  }

  async completeDailyChallenge(
    userId: string,
    drillId: string,
    dateStr: string,
    trainingLogId?: string
  ): Promise<{ completion: DailyCompletion; streak: UserStreak; milestoneReached: number | null }> {
    // Idempotent — if already completed today, return existing
    const already = await this.getTodayCompletion(userId, dateStr);
    const streak = await this.getUserStreak(userId);

    if (already) {
      return { completion: already, streak, milestoneReached: null };
    }

    // Record the completion
    const [completion] = await db
      .insert(dailyCompletions)
      .values({ userId, challengeDate: dateStr, drillId, trainingLogId })
      .returning();

    // Update streak
    const yesterday = new Date(`${dateStr}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newCurrent = 1;
    if (streak.lastCompletedDate === yesterdayStr) {
      newCurrent = (streak.currentStreak ?? 0) + 1;
    }

    const newLongest = Math.max(streak.longestStreak ?? 0, newCurrent);

    const MILESTONES = [3, 7, 14, 30, 60, 100];
    const milestoneReached = MILESTONES.includes(newCurrent) ? newCurrent : null;

    const [updatedStreak] = await db
      .insert(userStreaks)
      .values({ userId, currentStreak: newCurrent, longestStreak: newLongest, lastCompletedDate: dateStr })
      .onConflictDoUpdate({
        target: userStreaks.userId,
        set: { currentStreak: newCurrent, longestStreak: newLongest, lastCompletedDate: dateStr, updatedAt: new Date() },
      })
      .returning();

    return { completion, streak: updatedStreak, milestoneReached };
  }

  async getStreakLeaderboard(): Promise<Array<{ userId: string; displayName: string; currentStreak: number; profilePhotoUrl: string | null }>> {
    const rows = await db
      .select({
        userId: userStreaks.userId,
        currentStreak: userStreaks.currentStreak,
        displayName: userProfiles.displayName,
        profilePhotoUrl: userProfiles.profilePhotoUrl,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(userStreaks)
      .leftJoin(userProfiles, eq(userProfiles.userId, userStreaks.userId))
      .leftJoin(users, eq(users.id, userStreaks.userId))
      .where(sql`${userStreaks.currentStreak} > 0`)
      .orderBy(desc(userStreaks.currentStreak))
      .limit(10);

    return rows.map(r => ({
      userId: r.userId,
      displayName: r.displayName
        || (r.firstName ? [r.firstName, r.lastName].filter(Boolean).join(" ") : null)
        || "Player",
      currentStreak: r.currentStreak ?? 0,
      profilePhotoUrl: r.profilePhotoUrl ?? null,
    }));
  }

  async getPublishedStatChallenges(): Promise<StatChallenge[]> {
    return await db
      .select()
      .from(statChallenges)
      .where(eq(statChallenges.isPublished, true))
      .orderBy(desc(statChallenges.startsAt));
  }

  async getAllStatChallenges(): Promise<StatChallenge[]> {
    return await db
      .select()
      .from(statChallenges)
      .orderBy(desc(statChallenges.createdAt));
  }

  async getStatChallengeBySlug(slug: string): Promise<StatChallenge | undefined> {
    const [row] = await db
      .select()
      .from(statChallenges)
      .where(eq(statChallenges.slug, slug));
    return row;
  }

  async createStatChallenge(data: InsertStatChallenge): Promise<StatChallenge> {
    const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 60);
    const slug = (data as any).slug || `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
    const [row] = await db
      .insert(statChallenges)
      .values({ ...data, slug })
      .returning();
    return row;
  }

  async updateStatChallenge(id: string, data: Partial<InsertStatChallenge>): Promise<StatChallenge> {
    const [row] = await db
      .update(statChallenges)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(statChallenges.id, id))
      .returning();
    return row;
  }

  async deleteStatChallenge(id: string): Promise<void> {
    await db.delete(statChallenges).where(eq(statChallenges.id, id));
  }

  async getStatChallengeLeaderboard(
    challengeId: string,
    limit = 50,
  ): Promise<Array<{ userId: string; displayName: string; profilePhotoUrl: string | null; score: number }>> {
    const [challenge] = await db.select().from(statChallenges).where(eq(statChallenges.id, challengeId));
    if (!challenge) return [];

    const metric = challenge.metric as StatChallengeMetric;

    let scoreExpr: string;
    if (metric === "sessions")       scoreExpr = "COUNT(tl.id)::bigint";
    else if (metric === "total_minutes") scoreExpr = "COALESCE(SUM(tl.duration), 0)::bigint";
    else if (metric === "shots_made")    scoreExpr = "COALESCE(SUM(tl.shots_made), 0)::bigint";
    else                                 scoreExpr = "COALESCE(SUM(tl.shots_attempted), 0)::bigint";

    const safeLocation = challenge.shotLocationFilter
      ? challenge.shotLocationFilter.replace(/'/g, "''")
      : null;
    const locationClause =
      safeLocation && (metric === "shots_made" || metric === "shots_attempted")
        ? `AND tl.shot_location = '${safeLocation}'`
        : "";

    const result = await pool.query(
      `SELECT
         tl.user_id,
         COALESCE(up.display_name, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), u.email) AS display_name,
         up.profile_photo_url,
         ${scoreExpr} AS score
       FROM training_logs tl
       JOIN users u ON u.id = tl.user_id
       LEFT JOIN user_profiles up ON up.user_id = tl.user_id
       WHERE tl.completed_at >= $1
         AND tl.completed_at <= $2
         ${locationClause}
       GROUP BY tl.user_id, up.display_name, u.first_name, u.last_name, u.email, up.profile_photo_url
       ORDER BY score DESC
       LIMIT $3`,
      [challenge.startsAt, challenge.endsAt, limit],
    );

    return result.rows.map((r: any) => ({
      userId:         r.user_id,
      displayName:    r.display_name || "Player",
      profilePhotoUrl: r.profile_photo_url ?? null,
      score:          Number(r.score),
    }));
  }

  async setAdminDailyChallenge(dateStr: string, drillId: string): Promise<DailyChallenge> {
    const [row] = await db
      .insert(dailyChallenges)
      .values({ challengeDate: dateStr, drillId, isAdminOverride: true })
      .onConflictDoUpdate({
        target: dailyChallenges.challengeDate,
        set: { drillId, isAdminOverride: true },
      })
      .returning();
    return row;
  }

  async getAdminDailyChallenges(from: string, to: string): Promise<Array<DailyChallenge & { drill: Drill }>> {
    const rows = await db
      .select({ challenge: dailyChallenges, drill: drills })
      .from(dailyChallenges)
      .innerJoin(drills, eq(drills.id, dailyChallenges.drillId))
      .where(and(sql`${dailyChallenges.challengeDate} >= ${from}`, sql`${dailyChallenges.challengeDate} <= ${to}`))
      .orderBy(dailyChallenges.challengeDate);
    return rows.map(r => ({ ...r.challenge, drill: r.drill }));
  }

  // ─── Programs ───────────────────────────────────────────────────────────

  async listPrograms(opts?: {
    category?: string;
    difficulty?: string;
    authorType?: string;
    featuredFirst?: boolean;
  }): Promise<Program[]> {
    const conds = [eq(programs.isPublished, true), eq(programs.visibility, "public")];
    if (opts?.difficulty) conds.push(eq(programs.difficulty, opts.difficulty as any));
    if (opts?.authorType) conds.push(eq(programs.authorType, opts.authorType as any));
    let q = db.select().from(programs).where(and(...conds));
    if (opts?.category) {
      // Postgres array contains check via sql template
      q = db.select().from(programs).where(and(...conds, sql`${programs.categoryTags} @> ARRAY[${opts.category}]::text[]`));
    }
    const rows = await q.orderBy(
      desc(programs.isFeatured),
      desc(programs.enrollmentCount),
      desc(programs.createdAt),
    );
    return rows;
  }

  async getProgramBySlug(slug: string): Promise<Program | undefined> {
    const [row] = await db.select().from(programs).where(eq(programs.slug, slug));
    return row;
  }

  async getProgramById(id: string): Promise<Program | undefined> {
    const [row] = await db.select().from(programs).where(eq(programs.id, id));
    return row;
  }

  async getProgramItems(programId: string): Promise<ProgramItem[]> {
    return await db
      .select()
      .from(programItems)
      .where(eq(programItems.programId, programId))
      .orderBy(asc(programItems.dayNumber), asc(programItems.orderInDay));
  }

  async getActiveEnrollmentsForUser(
    userId: string,
  ): Promise<Array<ProgramEnrollment & { program: Program; completedItemCount: number; totalItemCount: number }>> {
    const rows = await db
      .select({
        enrollment: programEnrollments,
        program: programs,
        completedItemCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${programItemCompletions}
          WHERE ${programItemCompletions.enrollmentId} = ${programEnrollments.id}
        )`,
        totalItemCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${programItems}
          WHERE ${programItems.programId} = ${programs.id}
        )`,
      })
      .from(programEnrollments)
      .innerJoin(programs, eq(programs.id, programEnrollments.programId))
      .where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.status, "active")))
      .orderBy(desc(programEnrollments.startedAt));
    return rows.map(r => ({
      ...r.enrollment,
      program: r.program,
      completedItemCount: Number(r.completedItemCount ?? 0),
      totalItemCount: Number(r.totalItemCount ?? 0),
    }));
  }

  async getEnrollmentById(enrollmentId: string): Promise<ProgramEnrollment | undefined> {
    const [row] = await db.select().from(programEnrollments).where(eq(programEnrollments.id, enrollmentId));
    return row;
  }

  async getEnrollmentForUserAndProgram(userId: string, programId: string): Promise<ProgramEnrollment | undefined> {
    // Prefer the active enrollment so callers don't accidentally treat an
    // abandoned/completed row as the user's current run.
    const rows = await db
      .select()
      .from(programEnrollments)
      .where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.programId, programId)))
      .orderBy(desc(programEnrollments.startedAt));
    return rows.find((r) => r.status === "active") ?? rows[0];
  }

  async enrollUserInProgram(
    userId: string,
    programId: string,
    opts?: { assignedByTrainerId?: string; eventId?: string },
  ): Promise<ProgramEnrollment> {
    // Race-safe idempotent insert. The partial unique index
    // (userId, programId) WHERE status = 'active' makes the second concurrent
    // INSERT a no-op via ON CONFLICT DO NOTHING. We only bump enrollmentCount
    // when the row is actually created, so denormalized counts stay accurate.
    const inserted = await db
      .insert(programEnrollments)
      .values({
        userId,
        programId,
        currentDay: 1,
        status: "active",
        assignedByTrainerId: opts?.assignedByTrainerId,
        eventId: opts?.eventId,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      await db
        .update(programs)
        .set({ enrollmentCount: sql`${programs.enrollmentCount} + 1` })
        .where(eq(programs.id, programId));
      return inserted[0];
    }

    // Conflict — load the existing active enrollment.
    const [existing] = await db
      .select()
      .from(programEnrollments)
      .where(and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.programId, programId),
        eq(programEnrollments.status, "active"),
      ));
    if (!existing) throw new Error("Failed to enroll: conflict but no active enrollment");
    return existing;
  }

  async abandonEnrollment(enrollmentId: string, userId: string): Promise<ProgramEnrollment | undefined> {
    const [row] = await db
      .update(programEnrollments)
      .set({ status: "abandoned" })
      .where(and(eq(programEnrollments.id, enrollmentId), eq(programEnrollments.userId, userId)))
      .returning();
    return row;
  }

  async resumeEnrollment(enrollmentId: string, userId: string): Promise<ProgramEnrollment | undefined> {
    // Block resume if another active enrollment for the same program already exists.
    const [target] = await db
      .select()
      .from(programEnrollments)
      .where(and(eq(programEnrollments.id, enrollmentId), eq(programEnrollments.userId, userId)));
    if (!target) return undefined;
    if (target.status === "active") return target;
    const [conflict] = await db
      .select()
      .from(programEnrollments)
      .where(and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.programId, target.programId),
        eq(programEnrollments.status, "active"),
      ));
    if (conflict) throw new Error("Another active enrollment exists for this program");
    const [row] = await db
      .update(programEnrollments)
      .set({ status: "active", completedAt: null })
      .where(eq(programEnrollments.id, enrollmentId))
      .returning();
    return row;
  }

  async getCompletionsForEnrollment(enrollmentId: string): Promise<ProgramItemCompletion[]> {
    return await db
      .select()
      .from(programItemCompletions)
      .where(eq(programItemCompletions.enrollmentId, enrollmentId))
      .orderBy(desc(programItemCompletions.completedAt));
  }

  async completeProgramItem(input: {
    enrollmentId: string;
    programItemId: string;
    userId: string;
    trainingLogId?: string;
    score?: number;
    notes?: string;
  }): Promise<{ completion: ProgramItemCompletion; enrollment: ProgramEnrollment; programCompleted: boolean }> {
    // Validate enrollment ownership
    const [enrollment] = await db
      .select()
      .from(programEnrollments)
      .where(and(
        eq(programEnrollments.id, input.enrollmentId),
        eq(programEnrollments.userId, input.userId),
      ));
    if (!enrollment) throw new Error("Enrollment not found or not owned by user");
    if (enrollment.status !== "active") {
      // Don't allow logging completions against abandoned/completed enrollments —
      // the user must explicitly resume or re-enroll first.
      throw new Error(`Enrollment is ${enrollment.status}; resume it first`);
    }

    // Validate item belongs to the enrolled program
    const [item] = await db
      .select()
      .from(programItems)
      .where(and(eq(programItems.id, input.programItemId), eq(programItems.programId, enrollment.programId)));
    if (!item) throw new Error("Program item not found in this program");

    // Race-safe idempotent insert. The unique index on (enrollmentId, programItemId)
    // makes a concurrent second insert a no-op via ON CONFLICT DO NOTHING.
    const insertedRows = await db
      .insert(programItemCompletions)
      .values({
        enrollmentId: input.enrollmentId,
        programItemId: input.programItemId,
        trainingLogId: input.trainingLogId,
        score: input.score != null ? String(input.score) : undefined,
        notes: input.notes,
      })
      .onConflictDoNothing()
      .returning();
    let completion: ProgramItemCompletion;
    if (insertedRows.length > 0) {
      completion = insertedRows[0];
    } else {
      const [existing] = await db
        .select()
        .from(programItemCompletions)
        .where(and(
          eq(programItemCompletions.enrollmentId, input.enrollmentId),
          eq(programItemCompletions.programItemId, input.programItemId),
        ));
      if (!existing) throw new Error("Failed to record completion");
      completion = existing;
    }

    // Update enrollment progress: bump currentDay to the highest day completed + 1 (capped to lengthDays)
    const [progress] = await db
      .select({
        completedDays: sql<number>`COUNT(DISTINCT ${programItems.dayNumber})::int`,
        totalItems: sql<number>`(SELECT COUNT(*)::int FROM ${programItems} WHERE ${programItems.programId} = ${enrollment.programId})`,
        completedItems: sql<number>`(SELECT COUNT(*)::int FROM ${programItemCompletions} WHERE ${programItemCompletions.enrollmentId} = ${input.enrollmentId})`,
        maxCompletedDay: sql<number>`COALESCE(MAX(${programItems.dayNumber}), 0)::int`,
      })
      .from(programItemCompletions)
      .innerJoin(programItems, eq(programItems.id, programItemCompletions.programItemId))
      .where(eq(programItemCompletions.enrollmentId, input.enrollmentId));

    const [program] = await db.select().from(programs).where(eq(programs.id, enrollment.programId));
    const totalItems = Number(progress?.totalItems ?? 0);
    const completedItems = Number(progress?.completedItems ?? 0);
    const maxCompletedDay = Number(progress?.maxCompletedDay ?? 0);
    const programCompleted = totalItems > 0 && completedItems >= totalItems;

    const newCurrentDay = Math.min(maxCompletedDay + 1, program?.lengthDays ?? maxCompletedDay + 1);
    const [updatedEnrollment] = await db
      .update(programEnrollments)
      .set({
        currentDay: Math.max(enrollment.currentDay, newCurrentDay),
        status: programCompleted ? "completed" : enrollment.status,
        completedAt: programCompleted ? new Date() : enrollment.completedAt,
      })
      .where(eq(programEnrollments.id, input.enrollmentId))
      .returning();

    return { completion, enrollment: updatedEnrollment, programCompleted };
  }

  // ===== Programs authoring =====

  async listAllProgramsAdmin(): Promise<Program[]> {
    return await db
      .select()
      .from(programs)
      .orderBy(desc(programs.isFeatured), desc(programs.createdAt));
  }

  async listProgramsForAuthor(authorUserId: string): Promise<Program[]> {
    return await db
      .select()
      .from(programs)
      .where(eq(programs.authorUserId, authorUserId))
      .orderBy(desc(programs.createdAt));
  }

  async createProgram(input: InsertProgram): Promise<Program> {
    const [row] = await db.insert(programs).values(input).returning();
    return row;
  }

  async updateProgram(id: string, patch: Partial<InsertProgram>): Promise<Program | undefined> {
    const [row] = await db
      .update(programs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(programs.id, id))
      .returning();
    return row;
  }

  async deleteProgram(id: string): Promise<boolean> {
    // Items are removed first since we don't have FK CASCADE on this table.
    await db.delete(programItems).where(eq(programItems.programId, id));
    const result = await db.delete(programs).where(eq(programs.id, id)).returning();
    return result.length > 0;
  }

  async hasProgramEnrollments(programId: string): Promise<boolean> {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(programEnrollments)
      .where(eq(programEnrollments.programId, programId));
    return Number(row?.count ?? 0) > 0;
  }

  async getProgramItem(id: string): Promise<ProgramItem | undefined> {
    const [row] = await db.select().from(programItems).where(eq(programItems.id, id));
    return row;
  }

  async addProgramItem(input: InsertProgramItem): Promise<ProgramItem> {
    const [row] = await db.insert(programItems).values(input).returning();
    return row;
  }

  async updateProgramItem(id: string, patch: Partial<InsertProgramItem>): Promise<ProgramItem | undefined> {
    const [row] = await db
      .update(programItems)
      .set(patch)
      .where(eq(programItems.id, id))
      .returning();
    return row;
  }

  async deleteProgramItem(id: string): Promise<boolean> {
    const result = await db.delete(programItems).where(eq(programItems.id, id)).returning();
    return result.length > 0;
  }

  async reorderProgramItems(
    programId: string,
    items: Array<{ id: string; dayNumber: number; orderInDay: number }>,
  ): Promise<void> {
    // Apply in a sequence; quantity per program is small (tens of items).
    await Promise.all(
      items.map((it) =>
        db
          .update(programItems)
          .set({ dayNumber: it.dayNumber, orderInDay: it.orderInDay })
          .where(and(eq(programItems.id, it.id), eq(programItems.programId, programId))),
      ),
    );
  }

  // ─── Trainer assignment + roster discovery ──────────────────────────────
  async getRosterPlayerIds(trainerId: string): Promise<string[]> {
    // Accepted connections where the OTHER user is the player. The
    // connection table stores (playerId, trainerId) but in practice either
    // side can initiate, so we resolve the "other" user by matching trainerId
    // on either column.
    const rows = await db
      .select({ playerId: playerTrainerConnections.playerId, trainerId: playerTrainerConnections.trainerId })
      .from(playerTrainerConnections)
      .where(
        and(
          eq(playerTrainerConnections.status, "accepted"),
          or(
            eq(playerTrainerConnections.trainerId, trainerId),
            eq(playerTrainerConnections.playerId, trainerId),
          ),
        ),
      );
    const ids = new Set<string>();
    for (const r of rows) {
      const otherId = r.playerId === trainerId ? r.trainerId : r.playerId;
      if (otherId && otherId !== trainerId) ids.add(otherId);
    }
    return Array.from(ids);
  }

  async assignProgramToPlayers(
    programId: string,
    playerIds: string[],
    trainerId: string,
  ): Promise<{ assigned: string[]; alreadyEnrolled: string[]; skipped: string[] }> {
    const rosterIds = new Set(await this.getRosterPlayerIds(trainerId));
    const assigned: string[] = [];
    const alreadyEnrolled: string[] = [];
    const skipped: string[] = [];

    for (const pid of playerIds) {
      if (!rosterIds.has(pid)) {
        skipped.push(pid);
        continue;
      }
      // Race-safe: rely on the partial unique index `(userId, programId) WHERE status='active'`
      // so the actual `inserted.length > 0` signal is the single source of truth for whether
      // this call created a new enrollment. Pre-checks would race under concurrent assigns.
      const inserted = await db
        .insert(programEnrollments)
        .values({
          userId: pid,
          programId,
          currentDay: 1,
          status: "active",
          assignedByTrainerId: trainerId,
        })
        .onConflictDoNothing()
        .returning();
      if (inserted.length > 0) {
        await db
          .update(programs)
          .set({ enrollmentCount: sql`${programs.enrollmentCount} + 1` })
          .where(eq(programs.id, programId));
        assigned.push(pid);
      } else {
        alreadyEnrolled.push(pid);
      }
    }

    return { assigned, alreadyEnrolled, skipped };
  }

  async listAssignedProgramsForUser(userId: string): Promise<Array<ProgramEnrollment & {
    program: Program;
    completedItemCount: number;
    totalItemCount: number;
    trainer: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  }>> {
    const rows = await db
      .select({
        enrollment: programEnrollments,
        program: programs,
        trainer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        completedItemCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${programItemCompletions}
          WHERE ${programItemCompletions.enrollmentId} = ${programEnrollments.id}
        )`,
        totalItemCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${programItems}
          WHERE ${programItems.programId} = ${programs.id}
        )`,
      })
      .from(programEnrollments)
      .innerJoin(programs, eq(programs.id, programEnrollments.programId))
      .leftJoin(users, eq(users.id, programEnrollments.assignedByTrainerId))
      .where(and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.status, "active"),
        sql`${programEnrollments.assignedByTrainerId} IS NOT NULL`,
      ))
      .orderBy(desc(programEnrollments.startedAt));
    return rows.map(r => ({
      ...r.enrollment,
      program: r.program,
      completedItemCount: Number(r.completedItemCount ?? 0),
      totalItemCount: Number(r.totalItemCount ?? 0),
      trainer: r.trainer?.id ? r.trainer : null,
    }));
  }

  async listProgramsFromConnectedTrainers(userId: string): Promise<Array<Program & {
    trainer: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null } | null;
  }>> {
    // Find all accepted connection counterparts (trainers from the user's POV).
    const conns = await db
      .select({ playerId: playerTrainerConnections.playerId, trainerId: playerTrainerConnections.trainerId })
      .from(playerTrainerConnections)
      .where(and(
        eq(playerTrainerConnections.status, "accepted"),
        or(
          eq(playerTrainerConnections.playerId, userId),
          eq(playerTrainerConnections.trainerId, userId),
        ),
      ));
    const trainerIds = new Set<string>();
    for (const c of conns) {
      const otherId = c.playerId === userId ? c.trainerId : c.playerId;
      if (otherId && otherId !== userId) trainerIds.add(otherId);
    }
    if (trainerIds.size === 0) return [];

    const idArr = Array.from(trainerIds);
    const rows = await db
      .select({
        program: programs,
        trainer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(programs)
      .leftJoin(users, eq(users.id, programs.authorUserId))
      .where(and(
        eq(programs.isPublished, true),
        inArray(programs.authorUserId, idArr),
        or(eq(programs.visibility, "public"), eq(programs.visibility, "connections")),
      ))
      .orderBy(desc(programs.isFeatured), desc(programs.enrollmentCount), desc(programs.createdAt));

    return rows.map(r => ({ ...r.program, trainer: r.trainer?.id ? r.trainer : null }));
  }

  // ─── Events ──────────────────────────────────────────────────────────────
  private deriveEventStatus(e: { isPublished: boolean | null; startsAt: Date; endsAt: Date }): EventStatus {
    if (!e.isPublished) return "draft";
    const now = Date.now();
    if (now < e.startsAt.getTime()) return "scheduled";
    if (now > e.endsAt.getTime()) return "finished";
    return "live";
  }

  async listEvents(opts?: { includeUnpublished?: boolean }): Promise<Array<Event & { status: EventStatus; program: Program | null }>> {
    const rows = await db
      .select({ event: events, program: programs })
      .from(events)
      .leftJoin(programs, eq(programs.id, events.programId))
      .where(opts?.includeUnpublished ? sql`true` : eq(events.isPublished, true))
      .orderBy(desc(events.startsAt));
    return rows.map(r => ({
      ...r.event,
      program: r.program,
      status: this.deriveEventStatus(r.event),
    }));
  }

  async getEventBySlug(slug: string): Promise<(Event & { program: Program | null; status: EventStatus }) | undefined> {
    const [row] = await db
      .select({ event: events, program: programs })
      .from(events)
      .leftJoin(programs, eq(programs.id, events.programId))
      .where(eq(events.slug, slug));
    if (!row) return undefined;
    return { ...row.event, program: row.program, status: this.deriveEventStatus(row.event) };
  }

  async getEventById(id: string): Promise<Event | undefined> {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    return row;
  }

  async createEvent(input: InsertEvent): Promise<Event> {
    const [row] = await db.insert(events).values(input).returning();
    return row;
  }

  async updateEvent(id: string, patch: Partial<InsertEvent>): Promise<Event | undefined> {
    const [row] = await db
      .update(events)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return row;
  }

  async deleteEvent(id: string): Promise<boolean> {
    // Cascade-clean event-scoped child rows in a single transaction so the
    // operation is atomic. The FKs were never enforced at the DB level, so
    // we have to do this manually:
    //  1. event_participants — remove explicit participant records.
    //  2. program_enrollments.eventId — null out so the user's enrollment
    //     itself stays (their training history) but is no longer scoped to
    //     a now-nonexistent event.
    //  3. events — finally remove the row itself.
    return await db.transaction(async (tx) => {
      await tx.delete(eventParticipants).where(eq(eventParticipants.eventId, id));
      await tx
        .update(programEnrollments)
        .set({ eventId: null })
        .where(eq(programEnrollments.eventId, id));
      const result = await tx
        .delete(events)
        .where(eq(events.id, id))
        .returning({ id: events.id });
      return result.length > 0;
    });
  }

  async hasEventParticipants(eventId: string): Promise<boolean> {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));
    return (row?.c ?? 0) > 0;
  }

  async joinEvent(eventId: string, userId: string): Promise<{ participant: EventParticipant; enrollment: ProgramEnrollment }> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new Error("Event not found");
    if (!event.isPublished) throw new Error("Event is not published");
    const status = this.deriveEventStatus(event);
    if (status !== "live") throw new Error(`Event is ${status} — joining is only allowed while live`);

    // 1) Resolve enrollment — explicit check-then-create to avoid partial-index
    //    conflict ambiguity with onConflictDoNothing.
    let enrollment: ProgramEnrollment;
    const [existingEnrollment] = await db
      .select()
      .from(programEnrollments)
      .where(and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.programId, event.programId),
        eq(programEnrollments.status, "active"),
      ));

    if (existingEnrollment) {
      if (existingEnrollment.eventId && existingEnrollment.eventId !== eventId) {
        // Active enrollment scoped to a DIFFERENT event — still block.
        throw new Error(
          "You already have an active enrollment in this program for a different event. " +
          "Pause that enrollment first to join this event.",
        );
      }
      // Either already scoped to this event or standalone — tag it and reuse it.
      if (existingEnrollment.eventId !== eventId) {
        const [updated] = await db
          .update(programEnrollments)
          .set({ eventId })
          .where(eq(programEnrollments.id, existingEnrollment.id))
          .returning();
        enrollment = updated ?? existingEnrollment;
      } else {
        enrollment = existingEnrollment;
      }
    } else {
      // No active enrollment yet — create one scoped to this event.
      const [newEnrollment] = await db
        .insert(programEnrollments)
        .values({
          userId,
          programId: event.programId,
          currentDay: 1,
          status: "active",
          eventId,
        })
        .returning();
      enrollment = newEnrollment;
    }

    // 2) Now that we have an event-scoped enrollment, create the participant
    //    row. Race-safe via UNIQUE(eventId,userId).
    const insertedParticipants = await db
      .insert(eventParticipants)
      .values({ eventId, userId })
      .onConflictDoNothing()
      .returning();
    let participant: EventParticipant;
    if (insertedParticipants.length > 0) {
      participant = insertedParticipants[0];
      await db
        .update(events)
        .set({ participantCount: sql`${events.participantCount} + 1` })
        .where(eq(events.id, eventId));
    } else {
      const [existing] = await db
        .select()
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)));
      if (!existing) throw new Error("Failed to join: race conflict but no participant row");
      participant = existing;
    }

    // 3) Bump program enrollmentCount only when we actually created a new row.
    if (!existingEnrollment) {
      await db
        .update(programs)
        .set({ enrollmentCount: sql`${programs.enrollmentCount} + 1` })
        .where(eq(programs.id, event.programId));
    }

    return { participant, enrollment };
  }

  async getEventParticipant(eventId: string, userId: string): Promise<EventParticipant | undefined> {
    const [row] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)));
    return row;
  }

  async submitFinalChallengeScore(eventId: string, userId: string, score: number, notes?: string, attemptsTaken?: number): Promise<EventParticipant> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new Error("Event not found");
    const status = this.deriveEventStatus(event);
    if (status !== "live") throw new Error(`Final challenge can only be submitted while event is live (currently ${status})`);

    const participant = await this.getEventParticipant(eventId, userId);
    if (!participant) throw new Error("You must join the event before submitting the final challenge");

    // Tightening: require an event-scoped active enrollment to exist before
    // accepting any final score. Prevents participant-only edge states from
    // recording a score against an event they aren't actually running.
    const [scopedEnrollment] = await db
      .select({ id: programEnrollments.id })
      .from(programEnrollments)
      .where(and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.programId, event.programId),
        eq(programEnrollments.eventId, eventId),
        eq(programEnrollments.status, "active"),
      ));
    if (!scopedEnrollment) {
      throw new Error("You must join the event (active enrollment required) before submitting the final challenge");
    }

    const [updated] = await db
      .update(eventParticipants)
      .set({
        finalScore: score.toString(),
        finalSubmittedAt: new Date(),
        finalNotes: notes ?? null,
        ...(attemptsTaken != null ? { attemptsTaken } : {}),
      })
      .where(eq(eventParticipants.id, participant.id))
      .returning();

    // Mirror the score onto a program_item_completions row for the event's
    // configured final challenge item, so the program flow stays consistent.
    // Strictly scope to the event-specific enrollment so we never write the
    // mirror to a pre-existing non-event run of the same program.
    if (event.finalChallengeItemId) {
      // Defensive: confirm the configured final item actually belongs to this
      // event's program before mirroring.
      const [finalItem] = await db
        .select({ id: programItems.id, programId: programItems.programId })
        .from(programItems)
        .where(eq(programItems.id, event.finalChallengeItemId));
      if (!finalItem || finalItem.programId !== event.programId) {
        return updated;
      }
      const [enrollment] = await db
        .select()
        .from(programEnrollments)
        .where(and(
          eq(programEnrollments.userId, userId),
          eq(programEnrollments.programId, event.programId),
          eq(programEnrollments.eventId, eventId),
          eq(programEnrollments.status, "active"),
        ));
      if (enrollment) {
        // Upsert via insert-or-update on the unique (enrollment, item) index.
        const inserted = await db
          .insert(programItemCompletions)
          .values({
            enrollmentId: enrollment.id,
            programItemId: event.finalChallengeItemId,
            score: score.toString(),
            notes: notes ?? null,
          })
          .onConflictDoNothing()
          .returning();
        if (inserted.length === 0) {
          await db
            .update(programItemCompletions)
            .set({ score: score.toString(), notes: notes ?? null, completedAt: new Date() })
            .where(and(
              eq(programItemCompletions.enrollmentId, enrollment.id),
              eq(programItemCompletions.programItemId, event.finalChallengeItemId),
            ));
        }
      }
    }

    return updated;
  }

  async getEventLeaderboard(eventId: string, limit: number = 100): Promise<Array<{
    userId: string;
    user: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
    joinedAt: Date | null;
    completedItemCount: number;
    lastCompletedAt: Date | null;
    finalScore: string | null;
    finalSubmittedAt: Date | null;
    attemptsTaken: number | null;
    currentDay: number | null;
    shootingPct: number | null;
    compositeScore: number;
    rank: number;
  }>> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return [];

    // Total items in the program — needed for completion % calculation.
    const [{ totalItems }] = await db
      .select({ totalItems: sql<number>`COUNT(*)::int` })
      .from(programItems)
      .where(eq(programItems.programId, event.programId));

    const rows = await db
      .select({
        userId: eventParticipants.userId,
        joinedAt: eventParticipants.joinedAt,
        finalScore: eventParticipants.finalScore,
        finalSubmittedAt: eventParticipants.finalSubmittedAt,
        attemptsTaken: eventParticipants.attemptsTaken,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImageUrl: users.profileImageUrl,
        // How many program items completed in the event-scoped enrollment
        completedItemCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${programItemCompletions} pic
          JOIN ${programEnrollments} pe ON pe.id = pic.enrollment_id
          WHERE pe.event_id = ${eventId} AND pe.user_id = ${eventParticipants.userId}
        ), 0)`,
        // Most-recent completion timestamp (for tie-breaking)
        lastCompletedAt: sql<Date | null>`(
          SELECT MAX(pic.completed_at) FROM ${programItemCompletions} pic
          JOIN ${programEnrollments} pe ON pe.id = pic.enrollment_id
          WHERE pe.event_id = ${eventId} AND pe.user_id = ${eventParticipants.userId}
        )`,
        // Current day in the event-scoped enrollment
        currentDay: sql<number | null>`(
          SELECT pe.current_day FROM ${programEnrollments} pe
          WHERE pe.event_id = ${eventId} AND pe.user_id = ${eventParticipants.userId}
          AND pe.status = 'active'
          LIMIT 1
        )`,
        // Aggregate shooting stats across all drill completions in this event
        totalShotsMade: sql<number>`COALESCE((
          SELECT SUM(tl.shots_made) FROM ${programItemCompletions} pic
          JOIN ${programEnrollments} pe ON pe.id = pic.enrollment_id
          JOIN ${trainingLogs} tl ON tl.id = pic.training_log_id
          WHERE pe.event_id = ${eventId} AND pe.user_id = ${eventParticipants.userId}
          AND tl.shots_attempted > 0
        ), 0)`,
        totalShotsAttempted: sql<number>`COALESCE((
          SELECT SUM(tl.shots_attempted) FROM ${programItemCompletions} pic
          JOIN ${programEnrollments} pe ON pe.id = pic.enrollment_id
          JOIN ${trainingLogs} tl ON tl.id = pic.training_log_id
          WHERE pe.event_id = ${eventId} AND pe.user_id = ${eventParticipants.userId}
          AND tl.shots_attempted > 0
        ), 0)`,
      })
      .from(eventParticipants)
      .leftJoin(users, eq(users.id, eventParticipants.userId))
      .where(eq(eventParticipants.eventId, eventId));

    const total = Number(totalItems ?? 0);

    // Build decorated rows with composite score.
    // Weighted formula:
    //   50% → completion percentage (completed / total * 100)
    //   30% → attempt efficiency (100 / attemptsTaken; 0 if not submitted)
    //   20% → shooting percentage across all drills
    const decorated = rows.map(r => {
      const completed = Number(r.completedItemCount ?? 0);
      const completionPct = total > 0 ? (completed / total) * 100 : 0;

      const attempts = r.attemptsTaken != null ? Number(r.attemptsTaken) : null;
      const attemptScore = attempts != null && attempts > 0 ? (100 / attempts) : 0;

      const shotsMade = Number(r.totalShotsMade ?? 0);
      const shotsAttempted = Number(r.totalShotsAttempted ?? 0);
      const shootingPct = shotsAttempted > 0 ? (shotsMade / shotsAttempted) * 100 : null;

      const compositeScore =
        completionPct * 0.5 +
        attemptScore * 0.3 +
        (shootingPct ?? 0) * 0.2;

      return {
        userId: r.userId,
        user: {
          id: r.userId,
          firstName: r.userFirstName,
          lastName: r.userLastName,
          profileImageUrl: r.userProfileImageUrl,
        },
        joinedAt: r.joinedAt,
        completedItemCount: completed,
        lastCompletedAt: r.lastCompletedAt,
        finalScore: r.finalScore,
        finalSubmittedAt: r.finalSubmittedAt,
        attemptsTaken: attempts,
        currentDay: r.currentDay != null ? Number(r.currentDay) : null,
        shootingPct: shootingPct != null ? Math.round(shootingPct) : null,
        compositeScore: Math.round(compositeScore * 10) / 10,
      };
    });

    // Always rank by compositeScore descending; earlier last-completion
    // breaks ties (rewards consistency).
    decorated.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
      const aT = a.lastCompletedAt ? a.lastCompletedAt.getTime() : Infinity;
      const bT = b.lastCompletedAt ? b.lastCompletedAt.getTime() : Infinity;
      return aT - bT;
    });

    return decorated.slice(0, limit).map((d, idx) => ({ ...d, rank: idx + 1 }));
  }

  // ===== FEATURE FLAGS =====
  async listFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.createdAt));
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return flag;
  }

  async upsertFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db
      .insert(featureFlags)
      .values(data)
      .onConflictDoUpdate({ target: featureFlags.key, set: { ...data, updatedAt: new Date() } })
      .returning();
    return flag;
  }

  async updateFeatureFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | undefined> {
    const [flag] = await db
      .update(featureFlags)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(featureFlags.key, key))
      .returning();
    return flag;
  }

  async deleteFeatureFlag(key: string): Promise<boolean> {
    const result = await db.delete(featureFlags).where(eq(featureFlags.key, key)).returning();
    return result.length > 0;
  }

  async getUserFeatureFlags(userId: string): Promise<Record<string, boolean>> {
    const flags = await db.select().from(featureFlags);
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = flag.isEnabled || (flag.betaUserIds ?? []).includes(userId);
    }
    return result;
  }

  // ===== JOURNAL =====

  private mapJournalRow(row: any): JournalEntry {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      trainingLogId: row.training_log_id ?? null,
      mood: row.mood ?? null,
      responses: row.responses ?? [],
      aiCoachFeedback: row.ai_coach_feedback ?? null,
      aiFollowUpQuestion: row.ai_follow_up_question ?? null,
      aiFollowUpAnswer: row.ai_follow_up_answer ?? null,
      createdAt: row.created_at ?? null,
    };
  }

  async getJournalEntries(userId: string): Promise<JournalEntry[]> {
    const result = await pool.query(
      `SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC`,
      [String(userId)]
    );
    console.log("[storage.getJournalEntries] userId:", userId, "rows:", result.rowCount);
    return result.rows.map((r) => this.mapJournalRow(r));
  }

  async getJournalEntry(id: string, userId: string): Promise<JournalEntry | undefined> {
    const result = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, String(userId)]
    );
    console.log("[storage.getJournalEntry] id:", id, "userId:", userId, "found:", result.rowCount);
    return result.rows[0] ? this.mapJournalRow(result.rows[0]) : undefined;
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const result = await pool.query(
      `INSERT INTO journal_entries (user_id, type, training_log_id, mood, responses, ai_coach_feedback, ai_follow_up_question, ai_follow_up_answer)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [
        String(entry.userId),
        entry.type ?? "open",
        entry.trainingLogId ?? null,
        entry.mood ?? null,
        JSON.stringify(entry.responses ?? []),
        entry.aiCoachFeedback ?? null,
        entry.aiFollowUpQuestion ?? null,
        entry.aiFollowUpAnswer ?? null,
      ]
    );
    console.log("[storage.createJournalEntry] created id:", result.rows[0]?.id);
    return this.mapJournalRow(result.rows[0]);
  }

  async updateJournalEntry(id: string, userId: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const setParts: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.aiCoachFeedback !== undefined) {
      setParts.push(`ai_coach_feedback = $${idx++}`);
      values.push(updates.aiCoachFeedback);
    }
    if (updates.aiFollowUpQuestion !== undefined) {
      setParts.push(`ai_follow_up_question = $${idx++}`);
      values.push(updates.aiFollowUpQuestion);
    }
    if (updates.aiFollowUpAnswer !== undefined) {
      setParts.push(`ai_follow_up_answer = $${idx++}`);
      values.push(updates.aiFollowUpAnswer);
    }
    if (updates.mood !== undefined) {
      setParts.push(`mood = $${idx++}`);
      values.push(updates.mood);
    }
    if (updates.responses !== undefined) {
      setParts.push(`responses = $${idx++}::jsonb`);
      values.push(JSON.stringify(updates.responses));
    }

    if (setParts.length === 0) {
      return this.getJournalEntry(id, userId);
    }

    values.push(id, String(userId));
    const result = await pool.query(
      `UPDATE journal_entries SET ${setParts.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapJournalRow(result.rows[0]) : undefined;
  }

  async deleteJournalEntry(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, String(userId)]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ===== Game Day =====
  async getWeeklyGameDay(userId: string, weekStart: string): Promise<WeeklyGameDay | undefined> {
    const [row] = await db.select().from(weeklyGameDays)
      .where(and(eq(weeklyGameDays.userId, userId), eq(weeklyGameDays.weekStart, weekStart)));
    return row;
  }

  async createWeeklyGameDay(data: InsertWeeklyGameDay): Promise<WeeklyGameDay> {
    const [row] = await db.insert(weeklyGameDays).values(data).returning();
    return row;
  }

  async deleteWeeklyGameDay(userId: string, weekStart: string): Promise<boolean> {
    const result = await db.delete(weeklyGameDays)
      .where(and(eq(weeklyGameDays.userId, userId), eq(weeklyGameDays.weekStart, weekStart)))
      .returning();
    return result.length > 0;
  }

  async getChallengeAttempt(userId: string, weekGameDayId: string): Promise<GameDayChallengeAttempt | undefined> {
    const [row] = await db.select().from(gameDayChallengeAttempts)
      .where(and(eq(gameDayChallengeAttempts.userId, userId), eq(gameDayChallengeAttempts.weekGameDayId, weekGameDayId)));
    return row;
  }

  async createChallengeAttempt(data: Omit<InsertGameDayChallengeAttempt, "id" | "completedAt">): Promise<GameDayChallengeAttempt> {
    const [row] = await db.insert(gameDayChallengeAttempts).values(data as InsertGameDayChallengeAttempt).returning();
    return row;
  }

  // ===== ARCHETYPES =====
  // ─── Archetype ↔ Program tier assignments ────────────────────────────────
  async getArchetypeTierPrograms(archetypeId: string) {
    const rows = await db
      .select({
        link: archetypeTierPrograms,
        program: {
          id: programs.id,
          title: programs.title,
          slug: programs.slug,
          tagline: programs.tagline,
          description: programs.description,
          lengthDays: programs.lengthDays,
          difficulty: programs.difficulty,
          isPublished: programs.isPublished,
          coverImageUrl: programs.coverImageUrl,
          accentColor: programs.accentColor,
        },
      })
      .from(archetypeTierPrograms)
      .innerJoin(programs, eq(archetypeTierPrograms.programId, programs.id))
      .where(eq(archetypeTierPrograms.archetypeId, archetypeId))
      .orderBy(archetypeTierPrograms.tier, archetypeTierPrograms.sortOrder);
    return rows.map(r => ({ ...r.link, program: r.program }));
  }

  async linkProgramToTier(data: InsertArchetypeTierProgram): Promise<ArchetypeTierProgram> {
    const [row] = await db.insert(archetypeTierPrograms).values(data).returning();
    return row;
  }

  async unlinkProgramFromTier(id: string): Promise<void> {
    await db.delete(archetypeTierPrograms).where(eq(archetypeTierPrograms.id, id));
  }

  async updateTierProgramOrder(id: string, sortOrder: number, isGateChallenge: boolean): Promise<void> {
    await db.update(archetypeTierPrograms).set({ sortOrder, isGateChallenge }).where(eq(archetypeTierPrograms.id, id));
  }

  // ─── Archetype tier challenges ───────────────────────────────────────────────
  async getArchetypeTierChallenges(archetypeId: string): Promise<ArchetypeTierChallenge[]> {
    return db.select().from(archetypeTierChallenges)
      .where(eq(archetypeTierChallenges.archetypeId, archetypeId))
      .orderBy(archetypeTierChallenges.tier, archetypeTierChallenges.sortOrder);
  }

  async createArchetypeTierChallenge(data: InsertArchetypeTierChallenge): Promise<ArchetypeTierChallenge> {
    const [row] = await db.insert(archetypeTierChallenges).values(data).returning();
    return row;
  }

  async updateArchetypeTierChallenge(id: string, data: Partial<InsertArchetypeTierChallenge>): Promise<ArchetypeTierChallenge> {
    const [row] = await db.update(archetypeTierChallenges).set(data).where(eq(archetypeTierChallenges.id, id)).returning();
    return row;
  }

  async deleteArchetypeTierChallenge(id: string): Promise<void> {
    await db.delete(archetypeTierChallenges).where(eq(archetypeTierChallenges.id, id));
    await db.delete(archetypeChallengeCompletions).where(eq(archetypeChallengeCompletions.challengeId, id));
  }

  async getUserChallengeCompletions(userId: string, archetypeId: string): Promise<ArchetypeChallengeCompletion[]> {
    const challenges = await this.getArchetypeTierChallenges(archetypeId);
    const challengeIds = challenges.map(c => c.id);
    if (challengeIds.length === 0) return [];
    return db.select().from(archetypeChallengeCompletions)
      .where(and(eq(archetypeChallengeCompletions.userId, userId), inArray(archetypeChallengeCompletions.challengeId, challengeIds)));
  }

  async completeArchetypeChallenge(userId: string, challengeId: string, score?: number): Promise<ArchetypeChallengeCompletion> {
    const [row] = await db.insert(archetypeChallengeCompletions)
      .values({ userId, challengeId, score: score ?? null })
      .onConflictDoUpdate({ target: [archetypeChallengeCompletions.userId, archetypeChallengeCompletions.challengeId], set: { score: score ?? null, completedAt: new Date() } })
      .returning();
    return row;
  }

  async uncompleteArchetypeChallenge(userId: string, challengeId: string): Promise<void> {
    await db.delete(archetypeChallengeCompletions)
      .where(and(eq(archetypeChallengeCompletions.userId, userId), eq(archetypeChallengeCompletions.challengeId, challengeId)));
  }

  async getUserArchetypeTierStatus(userId: string, archetypeId: string) {
    const [tierLinks, tierChallenges, userEnrollments, completions] = await Promise.all([
      this.getArchetypeTierPrograms(archetypeId),
      this.getArchetypeTierChallenges(archetypeId),
      db.select().from(programEnrollments).where(and(eq(programEnrollments.userId, userId), eq(programEnrollments.status, "completed"))),
      this.getUserChallengeCompletions(userId, archetypeId),
    ]);

    const completedProgramIds = new Set(userEnrollments.map(e => e.programId));
    const completedChallengeIds = new Set(completions.map(c => c.challengeId));

    const result: Record<string, {
      pct: number; gateDone: boolean; unlocked: boolean;
      programs: Array<{ programId: string; completed: boolean; isGate: boolean; linkId: string }>;
      challenges: Array<{ challengeId: string; completed: boolean; isGate: boolean; title: string; metric: string; target: number; description: string | null; shotLocationFilter: string | null }>;
    }> = {};

    for (const tier of ARCHETYPE_TIERS) {
      const tierPrograms = tierLinks.filter(l => l.tier === tier);
      const tierChalls = tierChallenges.filter(c => c.tier === tier);

      const regularPrograms = tierPrograms.filter(l => !l.isGateChallenge);
      const gateProgramItems = tierPrograms.filter(l => l.isGateChallenge);
      const regularChallenges = tierChalls.filter(c => !c.isGateChallenge);
      const gateChallengeItems = tierChalls.filter(c => c.isGateChallenge);

      // Progress = (completed regular programs + completed regular challenges) / (total regular programs + total regular challenges)
      const totalRegular = regularPrograms.length + regularChallenges.length;
      const completedRegular =
        regularPrograms.filter(l => completedProgramIds.has(l.programId)).length +
        regularChallenges.filter(c => completedChallengeIds.has(c.id)).length;

      const pct = totalRegular > 0 ? Math.min(Math.round((completedRegular / totalRegular) * 100), 100) : 0;

      const gateItemsDone =
        gateProgramItems.every(l => completedProgramIds.has(l.programId)) &&
        gateChallengeItems.every(c => completedChallengeIds.has(c.id));
      const hasGateItems = gateProgramItems.length + gateChallengeItems.length > 0;
      const gateDone = hasGateItems ? gateItemsDone : pct >= 100;

      result[tier] = {
        pct: (tierPrograms.length + tierChalls.length) === 0 ? 0 : pct,
        gateDone,
        unlocked: false,
        programs: tierPrograms.map(l => ({
          programId: l.programId, completed: completedProgramIds.has(l.programId),
          isGate: l.isGateChallenge ?? false, linkId: l.id,
        })),
        challenges: tierChalls.map(c => ({
          challengeId: c.id, completed: completedChallengeIds.has(c.id),
          isGate: c.isGateChallenge ?? false, title: c.title,
          metric: c.metric, target: c.target,
          description: c.description ?? null, shotLocationFilter: c.shotLocationFilter ?? null,
        })),
      };
    }

    result["prospect"].unlocked = true;
    for (let i = 1; i < ARCHETYPE_TIERS.length; i++) {
      const prev = result[ARCHETYPE_TIERS[i - 1]];
      result[ARCHETYPE_TIERS[i]].unlocked = prev.pct >= 100 && prev.gateDone;
    }

    return result;
  }

  async recalcUserArchetypeTier(userId: string, archetypeId: string): Promise<void> {
    const [ua] = await db
      .select()
      .from(userArchetypes)
      .where(and(eq(userArchetypes.userId, userId), eq(userArchetypes.archetypeId, archetypeId)));
    if (!ua) return;

    const status = await this.getUserArchetypeTierStatus(userId, archetypeId);
    const currentTierStatus = status[ua.tier];

    // Find highest unlocked & completed tier to advance to
    let newTier = ua.tier;
    for (let i = ARCHETYPE_TIERS.indexOf(ua.tier as ArchetypeTier); i < ARCHETYPE_TIERS.length; i++) {
      const t = ARCHETYPE_TIERS[i];
      if (status[t].unlocked && status[t].pct >= 100 && status[t].gateDone && i < ARCHETYPE_TIERS.length - 1) {
        newTier = ARCHETYPE_TIERS[i + 1];
      } else break;
    }

    await db.update(userArchetypes).set({
      tier: newTier,
      tierPct: status[newTier]?.pct ?? currentTierStatus.pct,
      tierGateDone: status[newTier]?.gateDone ?? currentTierStatus.gateDone,
      updatedAt: new Date(),
    }).where(eq(userArchetypes.id, ua.id));
  }

  // ─── Admin archetype CRUD ────────────────────────────────────────────────
  async upsertArchetype(data: Archetype): Promise<Archetype> {
    const [row] = await db
      .insert(archetypes)
      .values(data)
      .onConflictDoUpdate({ target: archetypes.id, set: { ...data } })
      .returning();
    return row;
  }

  async deleteArchetype(id: string): Promise<void> {
    await db.delete(archetypeRoadmapItems).where(eq(archetypeRoadmapItems.archetypeId, id));
    await db.delete(archetypes).where(eq(archetypes.id, id));
  }

  // ─── Archetype Roadmap ───────────────────────────────────────────────────
  async getArchetypeRoadmap(archetypeId: string): Promise<ArchetypeRoadmapItem[]> {
    return db
      .select()
      .from(archetypeRoadmapItems)
      .where(eq(archetypeRoadmapItems.archetypeId, archetypeId))
      .orderBy(archetypeRoadmapItems.tier, archetypeRoadmapItems.sortOrder);
  }

  async getRoadmapItem(id: string): Promise<ArchetypeRoadmapItem | undefined> {
    const [row] = await db.select().from(archetypeRoadmapItems).where(eq(archetypeRoadmapItems.id, id));
    return row;
  }

  async upsertRoadmapItem(data: InsertArchetypeRoadmapItem & { id?: string }): Promise<ArchetypeRoadmapItem> {
    if (data.id) {
      const [row] = await db
        .update(archetypeRoadmapItems)
        .set(data)
        .where(eq(archetypeRoadmapItems.id, data.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(archetypeRoadmapItems).values(data).returning();
    return row;
  }

  async deleteRoadmapItem(id: string): Promise<void> {
    await db.delete(archetypeItemCompletions).where(eq(archetypeItemCompletions.roadmapItemId, id));
    await db.delete(archetypeRoadmapItems).where(eq(archetypeRoadmapItems.id, id));
  }

  async getUserItemCompletions(userId: string, userArchetypeId: string): Promise<ArchetypeItemCompletion[]> {
    return db
      .select()
      .from(archetypeItemCompletions)
      .where(and(eq(archetypeItemCompletions.userId, userId), eq(archetypeItemCompletions.userArchetypeId, userArchetypeId)));
  }

  async completeRoadmapItem(
    userId: string,
    userArchetypeId: string,
    roadmapItemId: string,
    notes?: string,
  ): Promise<{ completion: ArchetypeItemCompletion; tierPct: number; tierGateDone: boolean; newTier: string | null }> {
    // Upsert completion
    const [completion] = await db
      .insert(archetypeItemCompletions)
      .values({ userId, userArchetypeId, roadmapItemId, notes: notes ?? null })
      .onConflictDoUpdate({
        target: [archetypeItemCompletions.userId, archetypeItemCompletions.roadmapItemId],
        set: { completedAt: new Date(), notes: notes ?? null },
      })
      .returning();

    // Recalculate tier progress
    const [ua] = await db.select().from(userArchetypes).where(eq(userArchetypes.id, userArchetypeId));
    if (!ua) return { completion, tierPct: 0, tierGateDone: false, newTier: null };

    const currentTier = ua.tier as ArchetypeTier;
    const allItems = await db
      .select()
      .from(archetypeRoadmapItems)
      .where(and(eq(archetypeRoadmapItems.archetypeId, ua.archetypeId), eq(archetypeRoadmapItems.tier, currentTier)));

    const regularItems = allItems.filter((i) => !i.isGateChallenge);
    const gateItem = allItems.find((i) => i.isGateChallenge);

    const allCompletions = await db
      .select()
      .from(archetypeItemCompletions)
      .where(eq(archetypeItemCompletions.userArchetypeId, userArchetypeId));

    const completedIds = new Set(allCompletions.map((c) => c.roadmapItemId));
    const completedRegular = regularItems.filter((i) => completedIds.has(i.id)).length;
    const totalRegular = Math.max(regularItems.length, ARCHETYPE_TIER_ITEM_COUNTS[currentTier]);
    const tierPct = Math.min(Math.round((completedRegular / totalRegular) * 100), 100);

    const tierGateDone = gateItem ? completedIds.has(gateItem.id) : tierPct >= 100;

    // Check if can advance tier
    let newTier: string | null = null;
    const tierIdx = ARCHETYPE_TIERS.indexOf(currentTier);
    const nextTier = ARCHETYPE_TIERS[tierIdx + 1] as ArchetypeTier | undefined;
    if (tierPct >= 100 && tierGateDone && nextTier) {
      newTier = nextTier;
    }

    await db
      .update(userArchetypes)
      .set({
        tierPct,
        tierGateDone,
        ...(newTier ? { tier: newTier, tierPct: 0, tierGateDone: false } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userArchetypes.id, userArchetypeId));

    return { completion, tierPct, tierGateDone, newTier };
  }

  async uncompleteRoadmapItem(userId: string, roadmapItemId: string): Promise<void> {
    const [completion] = await db
      .select()
      .from(archetypeItemCompletions)
      .where(and(eq(archetypeItemCompletions.userId, userId), eq(archetypeItemCompletions.roadmapItemId, roadmapItemId)));
    if (!completion) return;

    await db
      .delete(archetypeItemCompletions)
      .where(and(eq(archetypeItemCompletions.userId, userId), eq(archetypeItemCompletions.roadmapItemId, roadmapItemId)));

    // Recalculate pct for the user archetype
    const [ua] = await db.select().from(userArchetypes).where(eq(userArchetypes.id, completion.userArchetypeId));
    if (!ua) return;
    const currentTier = ua.tier as ArchetypeTier;
    const allItems = await db.select().from(archetypeRoadmapItems)
      .where(and(eq(archetypeRoadmapItems.archetypeId, ua.archetypeId), eq(archetypeRoadmapItems.tier, currentTier)));
    const regularItems = allItems.filter((i) => !i.isGateChallenge);
    const gateItem = allItems.find((i) => i.isGateChallenge);
    const allCompletions = await db.select().from(archetypeItemCompletions)
      .where(eq(archetypeItemCompletions.userArchetypeId, ua.id));
    const completedIds = new Set(allCompletions.map((c) => c.roadmapItemId));
    const completedRegular = regularItems.filter((i) => completedIds.has(i.id)).length;
    const totalRegular = Math.max(regularItems.length, ARCHETYPE_TIER_ITEM_COUNTS[currentTier]);
    const tierPct = Math.min(Math.round((completedRegular / totalRegular) * 100), 100);
    const tierGateDone = gateItem ? completedIds.has(gateItem.id) : false;
    await db.update(userArchetypes).set({ tierPct, tierGateDone, updatedAt: new Date() }).where(eq(userArchetypes.id, ua.id));
  }

  async getArchetypes(): Promise<Archetype[]> {
    return db.select().from(archetypes).orderBy(archetypes.displayOrder);
  }

  async getArchetype(id: string): Promise<Archetype | undefined> {
    const [row] = await db.select().from(archetypes).where(eq(archetypes.id, id));
    return row;
  }

  async getUserArchetypes(userId: string): Promise<(UserArchetype & { archetype: Archetype })[]> {
    const rows = await db
      .select({ ua: userArchetypes, a: archetypes })
      .from(userArchetypes)
      .innerJoin(archetypes, eq(userArchetypes.archetypeId, archetypes.id))
      .where(eq(userArchetypes.userId, userId));
    return rows.map((r) => ({ ...r.ua, archetype: r.a }));
  }

  async selectArchetype(userId: string, archetypeId: string, role: "main" | "secondary"): Promise<UserArchetype> {
    // Remove any existing selection for this role
    await db
      .delete(userArchetypes)
      .where(and(eq(userArchetypes.userId, userId), eq(userArchetypes.role, role)));

    // If this archetype is already the other role, remove that too (can't have same archetype twice)
    const otherRole = role === "main" ? "secondary" : "main";
    await db
      .delete(userArchetypes)
      .where(
        and(
          eq(userArchetypes.userId, userId),
          eq(userArchetypes.archetypeId, archetypeId),
          eq(userArchetypes.role, otherRole),
        ),
      );

    const [row] = await db
      .insert(userArchetypes)
      .values({ userId, archetypeId, role, totalXp: 0, tier: "prospect" })
      .returning();
    return row;
  }

  async deselectArchetype(userId: string, role: "main" | "secondary"): Promise<boolean> {
    const result = await db
      .delete(userArchetypes)
      .where(and(eq(userArchetypes.userId, userId), eq(userArchetypes.role, role)))
      .returning();
    return result.length > 0;
  }

  async addArchetypeXp(
    userId: string,
    userArchetypeId: string,
    xpEarned: number,
    sourceType: string,
    sourceId?: string,
    note?: string,
  ): Promise<void> {
    await db.insert(archetypeXpLog).values({
      userId,
      userArchetypeId,
      sourceType,
      sourceId: sourceId ?? null,
      xpEarned,
      note: note ?? null,
    });

    const [ua] = await db
      .select()
      .from(userArchetypes)
      .where(eq(userArchetypes.id, userArchetypeId));
    if (!ua) return;

    const newTotal = ua.totalXp + xpEarned;
    const newTier = calcArchetypeTier(newTotal);
    await db
      .update(userArchetypes)
      .set({ totalXp: newTotal, tier: newTier, updatedAt: new Date() })
      .where(eq(userArchetypes.id, userArchetypeId));
  }

  async getArchetypeXpLog(userId: string, limit = 25): Promise<ArchetypeXpLog[]> {
    return db
      .select()
      .from(archetypeXpLog)
      .where(eq(archetypeXpLog.userId, userId))
      .orderBy(desc(archetypeXpLog.earnedAt))
      .limit(limit);
  }
}

function calcArchetypeTier(totalXp: number): string {
  if (totalXp >= 12000) return "playr1";
  if (totalXp >= 7000) return "elite";
  if (totalXp >= 3500) return "star";
  if (totalXp >= 1500) return "starter";
  if (totalXp >= 500) return "rising";
  return "prospect";
}

// ===== GOAL COACH IMPLEMENTATION =====
Object.assign(DatabaseStorage.prototype, {
  async createGoal(userId: string, goalText: string): Promise<PlayerGoal> {
    const [goal] = await db
      .insert(playerGoals)
      .values({ userId, goalText, status: "clarifying", currentWeek: 1, totalWeeks: 8 })
      .returning();
    return goal;
  },

  async getActiveGoal(userId: string): Promise<PlayerGoal | null> {
    const [goal] = await db
      .select()
      .from(playerGoals)
      .where(
        and(
          eq(playerGoals.userId, userId),
          or(eq(playerGoals.status, "clarifying"), eq(playerGoals.status, "active"))
        )
      )
      .orderBy(desc(playerGoals.createdAt))
      .limit(1);
    return goal ?? null;
  },

  async getGoalById(goalId: string): Promise<PlayerGoal | null> {
    const [goal] = await db.select().from(playerGoals).where(eq(playerGoals.id, goalId));
    return goal ?? null;
  },

  async updateGoal(goalId: string, data: Partial<InsertPlayerGoal>): Promise<PlayerGoal> {
    const [goal] = await db.update(playerGoals).set(data).where(eq(playerGoals.id, goalId)).returning();
    return goal;
  },

  async abandonGoal(goalId: string): Promise<void> {
    await db.update(playerGoals).set({ status: "abandoned" }).where(eq(playerGoals.id, goalId));
  },

  async addClarification(goalId: string, questionIndex: number, question: string): Promise<GoalClarification> {
    const [row] = await db
      .insert(goalClarifications)
      .values({ goalId, questionIndex, question })
      .returning();
    return row;
  },

  async answerClarification(clarificationId: string, answer: string): Promise<GoalClarification> {
    const [row] = await db
      .update(goalClarifications)
      .set({ answer })
      .where(eq(goalClarifications.id, clarificationId))
      .returning();
    return row;
  },

  async getClarifications(goalId: string): Promise<GoalClarification[]> {
    return db
      .select()
      .from(goalClarifications)
      .where(eq(goalClarifications.goalId, goalId))
      .orderBy(goalClarifications.questionIndex);
  },

  async createMilestone(data: InsertGoalMilestone): Promise<GoalMilestone> {
    const [row] = await db.insert(goalMilestones).values(data).returning();
    return row;
  },

  async getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
    return db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(goalMilestones.weekNumber);
  },

  async completeMilestone(milestoneId: string): Promise<GoalMilestone> {
    const [row] = await db
      .update(goalMilestones)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(goalMilestones.id, milestoneId))
      .returning();
    return row;
  },

  async createCheckIn(data: InsertGoalCheckIn): Promise<GoalCheckIn> {
    const [row] = await db.insert(goalCheckIns).values(data).returning();
    return row;
  },

  async getCheckIns(goalId: string): Promise<GoalCheckIn[]> {
    return db
      .select()
      .from(goalCheckIns)
      .where(eq(goalCheckIns.goalId, goalId))
      .orderBy(goalCheckIns.weekNumber);
  },
});

export const storage = new DatabaseStorage();
