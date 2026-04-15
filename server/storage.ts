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
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, isNotNull, isNull, inArray } from "drizzle-orm";
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
  setAdminDailyChallenge(dateStr: string, drillId: string): Promise<DailyChallenge>;
  getAdminDailyChallenges(from: string, to: string): Promise<Array<DailyChallenge & { drill: Drill }>>;
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

  // Helper to get date range based on period
  private getDateRangeForPeriod(period: string = "weekly"): Date {
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
  async getUserStats(userId: string, period: string = "weekly"): Promise<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }> {
    const startDate = this.getDateRangeForPeriod(period);
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

  async getWeeklyStats(userId: string, period: string = "weekly"): Promise<{ date: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period);

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

  async getCategoryStats(userId: string, period: string = "weekly"): Promise<{ category: string; minutes: number; sessions: number }[]> {
    const startDate = this.getDateRangeForPeriod(period);
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

  async getDashboardTrainingStats(userId: string, period: string = "weekly"): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const startDate = this.getDateRangeForPeriod(period);

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
            // — infer type from the location slug itself
            if (loc.includes("layup") || loc.includes("floater")) {
              layupsMade += log.shotsMade;
            } else if (loc.includes("3") || loc.includes("corner") || loc.includes("wing") || loc.includes("top")) {
              threePointersMade += log.shotsMade;
            } else {
              fieldGoalsMade += log.shotsMade;
            }
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
  async getUserShotStats(userId: string, period: string = "weekly"): Promise<Array<{ location: string; made: number; missed: number }>> {
    const startDate = this.getDateRangeForPeriod(period);
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
}

export const storage = new DatabaseStorage();
