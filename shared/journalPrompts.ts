export type JournalPromptCategory = "post-workout" | "post-game" | "open";

export type JournalPrompt = {
  id: string;
  category: JournalPromptCategory;
  question: string;
};

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  { id: "pw1", category: "post-workout", question: "What part of today’s work felt more natural than it did a few months ago?" },
  { id: "pw2", category: "post-workout", question: "Which skill or move felt most reliable today, and what helped it click?" },
  { id: "pw3", category: "post-workout", question: "Which part of practice kept breaking down, even after you tried to adjust?" },
  { id: "pw4", category: "post-workout", question: "When did your focus dip today, and what pulled your attention away?" },
  { id: "pw5", category: "post-workout", question: "What feedback did you receive today that you need to take seriously?" },
  { id: "pw6", category: "post-workout", question: "Which repetition or drill best matched the player you are trying to become?" },
  { id: "pw7", category: "post-workout", question: "Where did you rush, coast, or avoid being uncomfortable?" },
  { id: "pw8", category: "post-workout", question: "What did your body tell you today about your energy, confidence, or readiness?" },
  { id: "pw9", category: "post-workout", question: "What is one thing from today’s practice worth repeating next time?" },
  { id: "pw10", category: "post-workout", question: "What is the one adjustment you want to carry into your next workout?" },
  { id: "pg1", category: "post-game", question: "What moment from the game best represents how you want to play?" },
  { id: "pg2", category: "post-game", question: "When did you feel most confident and in control?" },
  { id: "pg3", category: "post-game", question: "Which decision would you make differently if you could replay it?" },
  { id: "pg4", category: "post-game", question: "How did you respond after your first mistake or difficult stretch?" },
  { id: "pg5", category: "post-game", question: "What did the defense give you, and how well did you recognize it?" },
  { id: "pg6", category: "post-game", question: "Where did your communication help the team, and where was it missing?" },
  { id: "pg7", category: "post-game", question: "When did you follow the game plan, and when did you drift from it?" },
  { id: "pg8", category: "post-game", question: "What part of your game held up under pressure?" },
  { id: "pg9", category: "post-game", question: "What gap between your current level and your potential showed up today?" },
  { id: "pg10", category: "post-game", question: "What is the most important adjustment for your next game?" },
  { id: "op1", category: "open", question: "What feels most present for you about your game right now?" },
  { id: "op2", category: "open", question: "What belief about yourself as a player are you beginning to question?" },
  { id: "op3", category: "open", question: "Where are you asking for confidence instead of building it through action?" },
  { id: "op4", category: "open", question: "What part of your development feels exciting, frustrating, or unclear?" },
  { id: "op5", category: "open", question: "What are you avoiding because it might expose a weakness?" },
  { id: "op6", category: "open", question: "What would your future self want you to stay consistent with this week?" },
  { id: "op7", category: "open", question: "What do you need from yourself, your teammates, or your coaches right now?" },
  { id: "op8", category: "open", question: "What is something about your game that you can appreciate today?" },
  { id: "op9", category: "open", question: "If you were being completely honest, what do you already know you need to work on?" },
  { id: "op10", category: "open", question: "What is one small action that would make you feel more in control of your progress?" },
];

export function getJournalPrompts(category: JournalPromptCategory) {
  return JOURNAL_PROMPTS.filter((prompt) => prompt.category === category);
}