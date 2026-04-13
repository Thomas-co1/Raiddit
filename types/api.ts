export interface User {
  id: string;
  email?: string;
  username?: string;
  userColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  description?: string;
  content?: string;
  author?: User;
  image?: {
    filePath: string;
  };
  latitude?: string;
  longitude?: string;
  customContent?: Record<string, unknown>;
  totalVotes?: number;
  myVote?: number | null;
  isSavedInCustomLists?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  upvotes?: number;
  downvotes?: number;
}

export interface ApiCollection<T> {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  totalItems?: number;
  member: T[];
  search?: unknown;
}

export interface CustomList {
  id: string;
  title: string;
  description?: string;
  owner?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomListEntry {
  id: string;
  customList?: CustomList;
  post?: Post;
  createdAt?: string;
}

export interface MediaObject {
  id: string;
  url: string;
  type?: string;
  createdAt?: string;
}

export interface Vote {
  id: string;
  user?: User;
  post?: Post;
  type: 'upvote' | 'downvote';
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
