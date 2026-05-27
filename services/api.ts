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

type UploadableFile = {
  uri: string;
  name?: string | null;
  type?: string | null;
};

function extractResourceId(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/\.jsonld$/, '').replace(/\/$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  if (typeof value === 'object' && value !== null) {
    const maybeId =
      'id' in value
        ? (value as { id?: unknown }).id
        : '@id' in value
          ? (value as { '@id'?: unknown })['@id']
          : undefined;
    return maybeId !== undefined && maybeId !== null ? String(maybeId) : null;
  }

  return null;
}

type CreatePostInput = Omit<Partial<Post>, 'image' | 'author'> & {
  image?: string;
  author?: string;
};

type UpdatePostInput = Omit<Partial<Post>, 'image'> & {
  image?: string | null;
};

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/ld+json, application/json;q=0.9, */*;q=0.8',
};

const getHeaders = (includeAuth = true, isFormData = false) => ({
  ...(isFormData ? { Accept: defaultHeaders.Accept } : defaultHeaders),
  ...(includeAuth && authToken && { Authorization: `Bearer ${authToken}` }),
});

/**
 * Generic API request handler
 */
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  includeAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(includeAuth, isFormData),
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;

      try {
        const payload = (await response.json()) as {
          description?: string;
          message?: string;
          detail?: string;
          violations?: Array<{ message?: string }>;
        };

        if (payload.description) {
          message = payload.description;
        } else if (payload.message) {
          message = payload.message;
        } else if (payload.detail) {
          message = payload.detail;
        } else if (payload.violations?.length) {
          message = payload.violations
            .map((violation) => violation.message)
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Keep default HTTP message when backend body is not JSON.
      }

      const error: ApiError = {
        message,
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
  async register(email: string, username: string, password: string): Promise<User> {
    return apiCall<User>(
      API_ENDPOINTS.USERS,
      {
        method: 'POST',
        body: JSON.stringify({ email, username, plainPassword: password }),
      },
      false
    );
  },

  async login(email: string, plainPassword: string): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>(
      API_ENDPOINTS.AUTH,
      {
        method: 'POST',
        body: JSON.stringify({ email, password: plainPassword }),
      },
      false
    );

    const token = response.token ?? response.id_token;
    if (token) {
      authToken = token;
      return { ...response, token };
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
    const response = await apiCall<ApiCollection<Vote> | Vote[]>(
      API_ENDPOINTS.USER_VOTES(userId)
    );

    if (Array.isArray(response)) {
      return response;
    }

    return Array.isArray(response.member) ? response.member : [];
  },
};

/**
 * Posts Service
 */
export const postsService = {
  async getPage(page = 1): Promise<ApiCollection<Post>> {
    const response = await apiCall<ApiCollection<Post> | Post[]>(
      `${API_ENDPOINTS.POSTS}?page=${page}`
    );

    // API may return either a Hydra collection or a plain array depending on config.
    if (Array.isArray(response)) {
      return {
        member: response,
        totalItems: response.length,
      };
    }

    return {
      ...response,
      member: Array.isArray(response.member) ? response.member : [],
    };
  },

  async getAll(): Promise<Post[]> {
    const collection = await postsService.getPage(1);
    return collection.member;
  },

  async getById(id: string): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_DETAIL(id));
  },

  async create(data: CreatePostInput): Promise<Post> {
    const formData = new FormData();

    formData.append('title', data.title ?? '');

    if (data.description) {
      formData.append('description', data.description);
    }

    if (data.content) {
      formData.append('content', data.content);
    }

    if (data.latitude) {
      formData.append('latitude', data.latitude);
    }

    if (data.longitude) {
      formData.append('longitude', data.longitude);
    }

    if (data.customContent) {
      formData.append('customContent', JSON.stringify(data.customContent));
    }

    if (data.image) {
      formData.append('image', data.image);
    }

    if (data.author) {
      formData.append('author', data.author);
    }

    return apiCall<Post>(API_ENDPOINTS.POSTS, {
      method: 'POST',
      body: formData,
    });
  },

  async update(id: string, data: UpdatePostInput): Promise<Post> {
    return apiCall<Post>(API_ENDPOINTS.POST_DETAIL(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
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

  async cancelVote(postId: string, userId: string, previousVote: -1 | 1): Promise<void> {
    const userVotes = await usersService.getVotes(userId);
    const targetVote = userVotes.find((vote) => {
      const votePostId = extractResourceId(vote.post);
      return votePostId === postId;
    });

    const targetVoteId = extractResourceId(targetVote);
    if (targetVoteId) {
      await votesService.delete(targetVoteId);
      return;
    }

    // Fallback for APIs where vote endpoints toggle the active vote.
    if (previousVote === 1) {
      await postsService.upvote(postId);
      return;
    }

    await postsService.downvote(postId);
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

  async uploadImage(file: UploadableFile): Promise<string> {
    const formData = new FormData();
    const fileName = file.name?.trim() || 'upload.jpg';
    const fileType = file.type?.trim() || 'image/jpeg';

    formData.append(
      'file',
      {
        uri: file.uri,
        name: fileName,
        type: fileType,
      } as unknown as Blob
    );

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEDIA_OBJECTS}`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: formData,
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;

      try {
        const payload = (await response.json()) as {
          description?: string;
          message?: string;
          detail?: string;
          violations?: Array<{ message?: string }>;
        };

        if (payload.description) {
          message = payload.description;
        } else if (payload.message) {
          message = payload.message;
        } else if (payload.detail) {
          message = payload.detail;
        } else if (payload.violations?.length) {
          message = payload.violations
            .map((violation) => violation.message)
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Keep default HTTP message when backend body is not JSON.
      }

      throw {
        message,
        status: response.status,
      } as ApiError;
    }

    const location =
      response.headers.get('Location') ?? response.headers.get('Content-Location');

    if (!location) {
      throw {
        message: 'Upload image reussi, mais aucune ressource media n\'a ete retournee.',
        status: response.status,
      } as ApiError;
    }

    return location.replace(/\.jsonld$/, '');
  },
};

/**
 * Votes Service
 */
export const votesService = {
  async getById(id: string): Promise<Vote> {
    return apiCall<Vote>(API_ENDPOINTS.VOTE_DETAIL(id));
  },

  async delete(idOrIri: string): Promise<void> {
    const voteId = extractResourceId(idOrIri) ?? idOrIri;

    return apiCall<void>(API_ENDPOINTS.VOTE_DETAIL(voteId), {
      method: 'DELETE',
    });
  },
};
