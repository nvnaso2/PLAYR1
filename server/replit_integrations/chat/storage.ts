import { db } from "../../db";
import { chatThreads, messages as schemaMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// This legacy integration predates the current chat-thread schema. Keep its
// storage adapter isolated until the old endpoints are retired.
const conversations = chatThreads as any;
const messages = schemaMessages as any;

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string) {
    const rows = await db.insert(conversations).values({ title }).returning();
    const conversation = (rows as any[])[0];
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const rows = await db.insert(messages).values({ conversationId, role, content }).returning();
    const message = (rows as any[])[0];
    return message;
  },
};

