import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import {
    ApiCollection,
    ApiError,
    AuthResponse,
    CustomList,
    CustomListEntry,
    MediaObject,
    Post,
    User,
    Vote,
} from '@/types/api';

let authToken: string | null = null;

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const getHeaders = () => ({
  ...defaultHeaders,
  ...(authToken && { Authorization: `Bearer ${authToken}` }),
});

/**
 * Generic API request handler
 */
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: getHeaders(),
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Auth Service
 */
export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>(API_ENDPOINTS.AUTH, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      authToken = response.token;
    }

    return response;
  },

  setToken(token: string) {
    authToken = token;
  },

  getToken() {
    return authToken;
  },

  logout() {
    authToken = null;
  },
};

/**
 * Users Service
 */
export const usersService = {
  async getAll(): Promise<User[]> {
    return apiCall<User[]>(API_ENDPOINTS.USERS);
  },

  async getById(id: string): Promise<User> {
    return apiCall<User>(API_ENDPOINTS.USER_DETAIL(id));
  },

  async create(data: Partial<User>): Promise<User> {
    return apiCall<User>(API_ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    return apiCall<User>(API_ENDPOINTS.USER_DETAIL(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiCall<void>(API_ENDPOINTS.USER_DETAIL(id), {
      method: 'DELETE',
    });
  },

  async getVotes(userId: string): Promise<Vote[]> {
    return apiCall<Vote[]>(API_ENDPOINTS.USER_VOTES(userId));
  },
};

/**
 * Posts Service
 */
export const postsService = {
  async getPage(page = 1): Promise<ApiCollection<Post>> {
    return apiCall<ApiCollection<Post>>(`${API_ENDPOINTS.POSTS}?page=${page}`);
  },

  async getAll(): Promise<Post[]> {
    const collection = await postsService.getPage(1);
    return collection.member;
  },

  async getById(id: string): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_DETAIL(id));
  },

  async create(data: Partial<Post>): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POSTS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Post>): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_DETAIL(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiCall<void>(API_ENDPOINTS.POST_DETAIL(id), {
      method: 'DELETE',
    });
  },

  async upvote(id: string): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_UPVOTE(id), {
      method: 'POST',
    });
  },

  async downvote(id: string): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_DOWNVOTE(id), {
      method: 'POST',
    });
  },
};

/**
 * Custom Lists Service
 */
export const customListsService = {
  async getAll(): Promise<CustomList[]> {
    return apiCall<CustomList[]>(API_ENDPOINTS.CUSTOM_LISTS);
  },

  async getById(id: string): Promise<CustomList> {
    return apiCall<CustomList>(API_ENDPOINTS.CUSTOM_LIST_DETAIL(id));
  },

  async create(data: Partial<CustomList>): Promise<CustomList> {
    return apiCall<CustomList>(API_ENDPOINTS.CUSTOM_LISTS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<CustomList>): Promise<CustomList> {
    return apiCall<CustomList>(API_ENDPOINTS.CUSTOM_LIST_DETAIL(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiCall<void>(API_ENDPOINTS.CUSTOM_LIST_DETAIL(id), {
      method: 'DELETE',
    });
  },

  async getEntries(customListId: string): Promise<CustomListEntry[]> {
    return apiCall<CustomListEntry[]>(
      API_ENDPOINTS.CUSTOM_LIST_ENTRIES(customListId)
    );
  },
};

/**
 * Custom List Entries Service
 */
export const customListEntriesService = {
  async getAll(): Promise<CustomListEntry[]> {
    return apiCall<CustomListEntry[]>(API_ENDPOINTS.CUSTOM_LIST_ENTRIES_ALL);
  },

  async getById(id: string): Promise<CustomListEntry> {
    return apiCall<CustomListEntry>(API_ENDPOINTS.CUSTOM_LIST_ENTRY_DETAIL(id));
  },

  async create(data: Partial<CustomListEntry>): Promise<CustomListEntry> {
    return apiCall<CustomListEntry>(API_ENDPOINTS.CUSTOM_LIST_ENTRIES_ALL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiCall<void>(API_ENDPOINTS.CUSTOM_LIST_ENTRY_DETAIL(id), {
      method: 'DELETE',
    });
  },
};

/**
 * Media Objects Service
 */
export const mediaObjectsService = {
  async getAll(): Promise<MediaObject[]> {
    return apiCall<MediaObject[]>(API_ENDPOINTS.MEDIA_OBJECTS);
  },

  async getById(id: string): Promise<MediaObject> {
    return apiCall<MediaObject>(API_ENDPOINTS.MEDIA_OBJECT_DETAIL(id));
  },

  async create(data: Partial<MediaObject>): Promise<MediaObject> {
    return apiCall<MediaObject>(API_ENDPOINTS.MEDIA_OBJECTS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Votes Service
 */
export const votesService = {
  async getById(id: string): Promise<Vote> {
    return apiCall<Vote>(API_ENDPOINTS.VOTE_DETAIL(id));
  },
};
