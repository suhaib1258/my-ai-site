export interface User {
  id: string; // Google UID
  email: string;
  username: string;
  avatar: string;
  points: number;
  level: string; // Beginner, Fighter, Warrior, Legend
  currentStreak: number;
  totalSuccessfulDays: number;
  clanId?: string;
  lastOathTime?: number;
  guarantorId?: string; // Optional friend to save streak
  highestStreak?: number;
  relapseCount?: number;
  age?: number;
  gender?: string;
  lastProfileUpdate?: number;
}

export interface Clan {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: string[]; // UIDs
  powerIndex: number;
  habitCategory?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  isSystem: boolean;
}
