# Intégration API Raiddite

## 📋 Overview

L'intégration API est complètement configurée pour votre application Expo. Elle fournit des services prêts à l'emploi pour interagir avec l'API Raiddite.

## 🏗️ Structure

```
├── constants/
│   └── api.ts           # URLs et endpoints
├── types/
│   └── api.ts           # Types TypeScript
├── services/
│   └── api.ts           # Services d'API
└── hooks/
    └── useApi.ts        # Hook React pour les requêtes
```

## 🚀 Utilisation

### 1. Récupérer tous les posts

```typescript
import { postsService } from '@/services/api';

const posts = await postsService.getAll();
```

### 2. Récupérer un post spécifique

```typescript
const post = await postsService.getById('post-id');
```

### 3. Créer un nouveau post

```typescript
const newPost = await postsService.create({
  title: 'Mon premier post',
  content: 'Contenu du post',
});
```

### 4. Voter sur un post

```typescript
await postsService.upvote('post-id');
await postsService.downvote('post-id');
```

### 5. Utiliser le hook useApi dans les composants

```typescript
import { useApi } from '@/hooks/useApi';
import { postsService } from '@/services/api';

export function PostsList() {
  const { data: posts, loading, error } = useApi(
    () => postsService.getAll(),
    [] // dépendances
  );

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Erreur: {error.message}</Text>;

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

## 🔐 Authentification

### Login

```typescript
import { authService } from '@/services/api';

const response = await authService.login('email@example.com', 'password');
// Le token est automatiquement stocké et utilisé pour les prochaines requêtes
```

### Définir un token manuelement

```typescript
authService.setToken('your-token-here');
```

### Logout

```typescript
authService.logout();
```

## 📚 Services Disponibles

### Users
- `getAll()` - Liste tous les utilisateurs
- `getById(id)` - Récupère un utilisateur
- `create(data)` - Crée un nouvel utilisateur
- `update(id, data)` - Modifie un utilisateur
- `delete(id)` - Supprime un utilisateur
- `getVotes(userId)` - Récupère les votes d'un utilisateur

### Posts
- `getAll()` - Liste tous les posts
- `getById(id)` - Récupère un post
- `create(data)` - Crée un nouveau post
- `update(id, data)` - Modifie un post
- `delete(id)` - Supprime un post
- `upvote(id)` - Vote positif
- `downvote(id)` - Vote négatif

### Custom Lists
- `getAll()` - Liste toutes les listes
- `getById(id)` - Récupère une liste
- `create(data)` - Crée une liste
- `update(id, data)` - Modifie une liste
- `delete(id)` - Supprime une liste
- `getEntries(customListId)` - Récupère les entrées d'une liste

### Custom List Entries
- `getAll()` - Liste toutes les entrées
- `getById(id)` - Récupère une entrée
- `create(data)` - Crée une entrée
- `delete(id)` - Supprime une entrée

### Media Objects
- `getAll()` - Liste tous les médias
- `getById(id)` - Récupère un média
- `create(data)` - Crée un média

### Votes
- `getById(id)` - Récupère un vote

## 🔧 Configuration

L'URL de base est définie dans [constants/api.ts](constants/api.ts):

```typescript
export const API_BASE_URL = 'https://raiddite-api.ac-sandbox.xyz/api';
```

## 📝 Types TypeScript

Tous les types sont définis dans [types/api.ts](types/api.ts):

- `User`
- `Post`
- `CustomList`
- `CustomListEntry`
- `MediaObject`
- `Vote`
- `AuthResponse`
- `ApiError`

## ⚠️ Gestion des erreurs

Tous les services lancent des exceptions en cas d'erreur. Utilisez try/catch:

```typescript
try {
  const posts = await postsService.getAll();
} catch (error) {
  console.error('Erreur API:', error);
}
```

## 🎯 Prochaines étapes

1. Configurer votre authentification en utilisant `authService.login()`
2. Implémenter les écrans principaux de votre app
3. Ajouter la gestion d'état (Redux, Zustand, etc.) si nécessaire
4. Implémenter la validation des données
5. Ajouter le stockage local si nécessaire

Bonne chance avec votre app! 🚀
