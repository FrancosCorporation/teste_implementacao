export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isDemo: boolean;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
}

export interface Question {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  answered: boolean;
}

export type RoomLikes = Record<string, Record<string, true>>;
