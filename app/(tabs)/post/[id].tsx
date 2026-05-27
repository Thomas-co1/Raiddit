import { ImageViewerModal } from "@/components/image-viewer-modal";
import { API_ORIGIN } from "@/constants/api";
import { postsService } from "@/services/api";
import { Post } from "@/types/api";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ArrowsOutSimple } from "phosphor-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

function getImageUrl(filePath?: string): string | null {
  if (!filePath) {
    return null;
  }

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  return `${API_ORIGIN}${filePath}`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    const postId = id ? String(id) : "";
    if (!postId) {
      setError("Post introuvable.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nextPost = await postsService.getById(postId);
      setPost(nextPost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger ce post.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void fetchPost();
    }, [fetchPost])
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error || "Post introuvable."}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageViewerModal
        visible={Boolean(fullscreenImageUri)}
        imageUri={fullscreenImageUri}
        title={post.title}
        subtitle="Touchez autour de l'image pour revenir au post."
        onClose={() => {
          setFullscreenImageUri(null);
        }}
      />

      <Pressable
        style={({ pressed }) => [styles.backButton, pressed ? styles.backPressed : undefined]}
        onPress={() => {
          router.replace("/(tabs)");
        }}
      >
        <View style={styles.backContent}>
          <ArrowLeft size={16} color="#111827" weight="bold" />
          <Text style={styles.backText}>Retour</Text>
        </View>
      </Pressable>

      <Text style={styles.title}>{post.title}</Text>

      {getImageUrl(post.image?.filePath) ? (
        <Pressable
          style={styles.imageFrame}
          onPress={() => {
            setFullscreenImageUri(getImageUrl(post.image?.filePath));
          }}
        >
          <Image
            source={{ uri: getImageUrl(post.image?.filePath) as string }}
            style={styles.image}
            resizeMode="contain"
          />

          <View style={styles.imageBadge}>
            <ArrowsOutSimple size={14} color="#ffffff" weight="bold" />
            <Text style={styles.imageBadgeText}>Ouvrir en grand</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.meta}>Par: {post.author?.username || "Anonyme"}</Text>
        <Text style={styles.meta}>{post.totalVotes ?? 0} votes</Text>
      </View>

      {post.description ? (
        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{post.description}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    backgroundColor: "#eef2ff",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  backPressed: {
    opacity: 0.8,
  },
  backContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 14,
  },
  imageFrame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: 360,
    backgroundColor: "#e5e7eb",
  },
  imageBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },
  imageBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  descriptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 220,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#6b7280",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  description: {
    marginTop: 0,
    marginBottom: 0,
    color: "#111827",
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "600",
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
  },
});
