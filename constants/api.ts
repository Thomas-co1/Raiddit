const API_BASE_URL_ENV = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL =
  API_BASE_URL_ENV?.trim() || 'https://raiddite-api.ac-sandbox.xyz/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH: '/auth',
  
  // Users
  USERS: '/users',
  USER_DETAIL: (id: string) => `/users/${id}`,
  USER_VOTES: (userId: string) => `/users/${userId}/votes`,
  
  // Posts
  POSTS: '/posts',
  POST_DETAIL: (id: string) => `/posts/${id}`,
  POST_UPVOTE: (id: string) => `/posts/${id}/upvote`,
  POST_DOWNVOTE: (id: string) => `/posts/${id}/downvote`,
  
  // Custom Lists
  CUSTOM_LISTS: '/custom_lists',
  CUSTOM_LIST_DETAIL: (id: string) => `/custom_lists/${id}`,
  CUSTOM_LIST_ENTRIES: (customListId: string) => `/custom_lists/${customListId}/custom_list_entries`,
  
  // Custom List Entries
  CUSTOM_LIST_ENTRIES_ALL: '/custom_list_entries',
  CUSTOM_LIST_ENTRY_DETAIL: (id: string) => `/custom_list_entries/${id}`,
  
  // Media Objects
  MEDIA_OBJECTS: '/media_objects',
  MEDIA_OBJECT_DETAIL: (id: string) => `/media_objects/${id}`,
  
  // Votes
  VOTES: '/votes',
  VOTE_DETAIL: (id: string) => `/votes/${id}`,
};
