import { postsService } from "@/services/api";
import { Post } from "@/types/api";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Index() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const onEndReachedDuringMomentum = useRef(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        setEmptyMessage(null);
        setHasMorePosts(true);
        setCurrentPage(1);
        const collection = await postsService.getPage(1);
        setPosts(collection.member);

        if (collection.member.length === 0) {
          setEmptyMessage("Aucun post à afficher pour le moment.");
          setHasMorePosts(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const appendNextPage = async () => {
    if (loading || loadingMore || !hasMorePosts) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const collection = await postsService.getPage(nextPage);

      if (collection.member.length === 0) {
        setHasMorePosts(false);
        setEmptyMessage("Il n'y a plus de posts à afficher.");
        return;
      }

      setPosts((currentPosts) => [...currentPosts, ...collection.member]);
      setCurrentPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>
        {item.description || item.content || "Aucun contenu."}
      </Text>
      <Text style={styles.postMeta}>
        Par: {item.author?.username || "Anonyme"} · {item.totalVotes ?? 0} votes
      </Text>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Raiddite - Posts</Text>

      {error && <Text style={styles.error}>Erreur: {error}</Text>}

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
        onMomentumScrollBegin={() => {
          onEndReachedDuringMomentum.current = false;
        }}
        onEndReached={() => {
          if (!onEndReachedDuringMomentum.current) {
            onEndReachedDuringMomentum.current = true;
            void appendNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#111827" style={styles.footer} />
          ) : emptyMessage ? (
            <Text style={styles.footerText}>{emptyMessage}</Text>
          ) : (
            <Text style={styles.footerText}>Fais défiler pour charger d'autres posts.</Text>
          )
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>{emptyMessage || "Aucun post disponible."}</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    backgroundColor: "#f5f7fb",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    marginHorizontal: 16,
    color: "#111827",
  },
  postCard: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  postMeta: {
    fontSize: 12,
    color: "#999",
  },
  error: {
    color: "#b91c1c",
    paddingHorizontal: 16,
    paddingBottom: 8,
    textAlign: "center",
  },
  footer: {
    marginVertical: 16,
  },
  footerText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
    marginVertical: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
  },
});
