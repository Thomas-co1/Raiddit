import { ImageViewerModal } from "@/components/image-viewer-modal";
import { API_ORIGIN } from "@/constants/api";
import { useAuth } from "@/contexts/AuthContext";
import { mediaObjectsService, postsService } from "@/services/api";
import { Post } from "@/types/api";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
    ArrowCircleDown,
    ArrowCircleUp,
    ArrowsOutSimple,
    DotsThreeOutline,
    PencilSimpleLine,
    Trash,
    UploadSimple,
    XCircle,
} from "phosphor-react-native";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type EditableImage = {
  uri: string;
  name?: string | null;
  type?: string | null;
};

type VoteValue = -1 | 0 | 1;

function normalizeVote(value: Post["myVote"]): VoteValue {
  if (value === 1) {
    return 1;
  }

  if (value === -1) {
    return -1;
  }

  return 0;
}

function normalizeResourceId(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/\.jsonld$/, "").replace(/\/$/, "");
    const parts = cleaned.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  if (typeof value === "object" && value !== null) {
    const maybeId =
      "id" in value
        ? (value as { id?: unknown }).id
        : "@id" in value
          ? (value as { "@id"?: unknown })["@id"]
          : undefined;
    return maybeId !== undefined && maybeId !== null ? String(maybeId) : null;
  }

  return null;
}

function getImageUrl(filePath?: string): string | null {
  if (!filePath) {
    return null;
  }

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  return `${API_ORIGIN}${filePath}`;
}

export default function Index() {
  const router = useRouter();
  const { userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [voteLoadingByPost, setVoteLoadingByPost] = useState<Record<string, boolean>>({});
  const [deleteLoadingByPost, setDeleteLoadingByPost] = useState<Record<string, boolean>>({});
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [newEditImage, setNewEditImage] = useState<EditableImage | null>(null);
  const [removeEditImage, setRemoveEditImage] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onEndReachedDuringMomentum = useRef(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setEmptyMessage(null);
      setHasMorePosts(true);
      setCurrentPage(1);
      const collection = await postsService.getPage(1);
      const members = Array.isArray(collection.member) ? collection.member : [];
      setPosts(members);

      if (members.length === 0) {
        setEmptyMessage("Aucun post à afficher pour le moment.");
        setHasMorePosts(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPosts();
    }, [fetchPosts])
  );

  const refreshPosts = async () => {
    try {
      setRefreshing(true);
      await fetchPosts();
    } finally {
      setRefreshing(false);
    }
  };

  const appendNextPage = async () => {
    if (loading || loadingMore || !hasMorePosts) {
      return;
    }

    setLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const collection = await postsService.getPage(nextPage);
      const members = Array.isArray(collection.member) ? collection.member : [];

      if (members.length === 0) {
        setHasMorePosts(false);
        setEmptyMessage("Il n'y a plus de posts à afficher.");
        return;
      }

      setPosts((currentPosts) => [...currentPosts, ...members]);
      setCurrentPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (postId: string, nextVote: VoteValue) => {
    const postKey = String(postId);

    if (voteLoadingByPost[postKey]) {
      return;
    }

    const targetPost = posts.find((post) => String(post.id) === postKey);
    if (!targetPost) {
      return;
    }

    const previousVote = normalizeVote(targetPost.myVote);
    const targetVote = previousVote === nextVote ? 0 : nextVote;

    const previousTotalVotes = Number(targetPost.totalVotes ?? 0);
    const voteDelta = targetVote - previousVote;

    setError(null);
    setVoteLoadingByPost((current) => ({ ...current, [postKey]: true }));

    // Optimistic update keeps UX responsive while preserving one-vote-per-user rule.
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (String(post.id) !== postKey) {
          return post;
        }

        return {
          ...post,
          myVote: targetVote === 0 ? null : targetVote,
          totalVotes: previousTotalVotes + voteDelta,
        };
      })
    );

    try {
      const updatedPost =
        targetVote === 0
          ? await (async () => {
              if (!userId) {
                throw new Error("Connecte-toi pour annuler ton vote.");
              }

              await postsService.cancelVote(postKey, userId, previousVote === 0 ? 1 : previousVote);
              return await postsService.getById(postKey);
            })()
          : nextVote === 1
            ? await postsService.upvote(postKey)
            : await postsService.downvote(postKey);

      if (updatedPost && typeof updatedPost === "object") {
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            String(post.id) === postKey
              ? {
                  ...post,
                  ...updatedPost,
                }
              : post
          )
        );
      }
    } catch (err) {
      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (String(post.id) !== postKey) {
            return post;
          }

          return {
            ...post,
            myVote: previousVote === 0 ? null : previousVote,
            totalVotes: previousTotalVotes,
          };
        })
      );

      setError(err instanceof Error ? err.message : "Impossible de voter pour ce post.");
    } finally {
      setVoteLoadingByPost((current) => ({ ...current, [postKey]: false }));
    }
  };

  const handleDeletePost = (postId: string) => {
    const postKey = String(postId);

    if (deleteLoadingByPost[postKey]) {
      return;
    }

    Alert.alert(
      "Supprimer ce post ?",
      "Cette action est definitive.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setError(null);
              setDeleteLoadingByPost((current) => ({ ...current, [postKey]: true }));

              try {
                await postsService.delete(postKey);
                setPosts((currentPosts) => currentPosts.filter((post) => String(post.id) !== postKey));
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Impossible de supprimer ce post."
                );
              } finally {
                setDeleteLoadingByPost((current) => ({ ...current, [postKey]: false }));
              }
            })();
          },
        },
      ]
    );
  };

  const openEditPost = (post: Post) => {
    setError(null);
    setEditingPost(post);
    setEditTitle(post.title ?? "");
    setEditDescription(post.description ?? "");
    setEditContent(post.content ?? "");
    setEditImagePreview(getImageUrl(post.image?.filePath));
    setNewEditImage(null);
    setRemoveEditImage(false);
  };

  const closeEditPost = () => {
    if (savingEdit) {
      return;
    }

    setEditingPost(null);
    setEditTitle("");
    setEditDescription("");
    setEditContent("");
    setEditImagePreview(null);
    setNewEditImage(null);
    setRemoveEditImage(false);
  };

  const pickEditImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Autorise l'acces aux photos pour modifier l'image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    setError(null);
    setRemoveEditImage(false);
    setEditImagePreview(asset.uri);
    setNewEditImage({
      uri: asset.uri,
      name: asset.fileName,
      type: asset.mimeType,
    });
  };

  const clearEditImage = () => {
    setRemoveEditImage(true);
    setNewEditImage(null);
    setEditImagePreview(null);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) {
      return;
    }

    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      setError("Le titre du post est obligatoire.");
      return;
    }

    const postKey = String(editingPost.id);

    try {
      setError(null);
      setSavingEdit(true);

      let imagePatch: string | null | undefined;
      if (removeEditImage) {
        imagePatch = null;
      } else if (newEditImage) {
        imagePatch = await mediaObjectsService.uploadImage(newEditImage);
      }

      const updatedPost = await postsService.update(postKey, {
        title: nextTitle,
        description: editDescription.trim() || undefined,
        content: editContent.trim() || undefined,
        ...(imagePatch !== undefined ? { image: imagePatch } : {}),
      });

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          String(post.id) === postKey
            ? {
                ...post,
                ...updatedPost,
              }
            : post
        )
      );

      closeEditPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier ce post.");
    } finally {
      setSavingEdit(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const postKey = String(item.id);
    const currentVote = normalizeVote(item.myVote);
    const isVoting = Boolean(voteLoadingByPost[postKey]);
    const isDeleting = Boolean(deleteLoadingByPost[postKey]);
    const authorId = normalizeResourceId(item.author);
    const canManage = Boolean(userId && authorId && userId === authorId);

    return (
      <View style={styles.postCard}>
        <Pressable
          style={styles.postHeaderPressable}
          onPress={() => {
            router.push({
              pathname: "/(tabs)/post/[id]",
              params: { id: postKey },
            });
          }}
        >
          <Text style={styles.postTitle}>{item.title}</Text>

          <View style={styles.metaChipRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>@{item.author?.username || "Anonyme"}</Text>
            </View>
            <View style={styles.metaChipMuted}>
              <DotsThreeOutline size={14} color="#475569" weight="fill" />
              <Text style={styles.metaChipMutedText}>{item.totalVotes ?? 0} votes</Text>
            </View>
          </View>

          <Text style={styles.postHint}>Appuie pour voir les details du post.</Text>
        </Pressable>

        {getImageUrl(item.image?.filePath) ? (
          <Pressable
            style={styles.imageTapZone}
            onPress={() => {
              setFullscreenImageUri(getImageUrl(item.image?.filePath));
            }}
          >
            <Image
              source={{ uri: getImageUrl(item.image?.filePath) as string }}
              style={styles.postImage}
              resizeMode="contain"
            />

            <View style={styles.imageOverlayBadge}>
              <ArrowsOutSimple size={14} color="#ffffff" weight="bold" />
              <Text style={styles.imageOverlayText}>Plein ecran</Text>
            </View>
          </Pressable>
        ) : null}

        {canManage ? (
          <View style={styles.manageRow}>
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed ? styles.voteButtonPressed : undefined,
              ]}
              onPress={() => {
                openEditPost(item);
              }}
            >
              <View style={styles.buttonContentRow}>
                <PencilSimpleLine size={16} color="#1d4ed8" weight="bold" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && !isDeleting ? styles.voteButtonPressed : undefined,
                isDeleting ? styles.voteButtonDisabled : undefined,
              ]}
              onPress={() => {
                handleDeletePost(postKey);
              }}
              disabled={isDeleting}
            >
              <View style={styles.buttonContentRow}>
                <Trash size={16} color="#b91c1c" weight="bold" />
                <Text style={styles.deleteButtonText}>{isDeleting ? "Suppression..." : "Supprimer"}</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.voteRow}>
          <Pressable
            style={({ pressed }) => [
              styles.voteButton,
              currentVote === 1 ? styles.voteButtonActiveUp : undefined,
              pressed && !isVoting ? styles.voteButtonPressed : undefined,
              isVoting ? styles.voteButtonDisabled : undefined,
            ]}
            onPress={() => {
              void handleVote(postKey, 1);
            }}
            disabled={isVoting}
          >
            <View style={styles.buttonContentRow}>
              <ArrowCircleUp size={16} color="#111827" weight="bold" />
              <Text style={styles.voteButtonText}>Upvote</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.voteButton,
              currentVote === -1 ? styles.voteButtonActiveDown : undefined,
              pressed && !isVoting ? styles.voteButtonPressed : undefined,
              isVoting ? styles.voteButtonDisabled : undefined,
            ]}
            onPress={() => {
              void handleVote(postKey, -1);
            }}
            disabled={isVoting}
          >
            <View style={styles.buttonContentRow}>
              <ArrowCircleDown size={16} color="#111827" weight="bold" />
              <Text style={styles.voteButtonText}>Downvote</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>Erreur: {error}</Text>}

      <ImageViewerModal
        visible={Boolean(fullscreenImageUri)}
        imageUri={fullscreenImageUri}
        title="Image du post"
        subtitle="Affichage plein ecran pour mieux voir le visuel sans rognage."
        onClose={() => {
          setFullscreenImageUri(null);
        }}
      />

      <Modal visible={Boolean(editingPost)} transparent animationType="fade" onRequestClose={closeEditPost}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modifier mon post</Text>

            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={styles.modalInput}
              placeholder="Titre"
              placeholderTextColor="#9ca3af"
              editable={!savingEdit}
            />

            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              style={styles.modalInput}
              placeholder="Description"
              placeholderTextColor="#9ca3af"
              editable={!savingEdit}
            />

            <TextInput
              value={editContent}
              onChangeText={setEditContent}
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Contenu"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!savingEdit}
            />

            {editImagePreview ? (
              <Pressable
                onPress={() => {
                  setFullscreenImageUri(editImagePreview);
                }}
              >
                <Image source={{ uri: editImagePreview }} style={styles.editImagePreview} resizeMode="contain" />
              </Pressable>
            ) : null}

            <View style={styles.modalImageActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondaryAction,
                  pressed && !savingEdit ? styles.voteButtonPressed : undefined,
                  savingEdit ? styles.voteButtonDisabled : undefined,
                ]}
                onPress={() => {
                  void pickEditImage();
                }}
                disabled={savingEdit}
              >
                <View style={styles.buttonContentRow}>
                  <UploadSimple size={15} color="#1d4ed8" weight="bold" />
                  <Text style={styles.modalSecondaryActionText}>
                    {editImagePreview ? "Remplacer l&apos;image" : "Ajouter une image"}
                  </Text>
                </View>
              </Pressable>

              {editImagePreview ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalDangerAction,
                    pressed && !savingEdit ? styles.voteButtonPressed : undefined,
                    savingEdit ? styles.voteButtonDisabled : undefined,
                  ]}
                  onPress={clearEditImage}
                  disabled={savingEdit}
                >
                  <View style={styles.buttonContentRow}>
                    <XCircle size={15} color="#b91c1c" weight="bold" />
                    <Text style={styles.modalDangerActionText}>Retirer l&apos;image</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && !savingEdit ? styles.voteButtonPressed : undefined,
                  savingEdit ? styles.voteButtonDisabled : undefined,
                ]}
                onPress={closeEditPost}
                disabled={savingEdit}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalSave,
                  pressed && !savingEdit ? styles.voteButtonPressed : undefined,
                  savingEdit ? styles.voteButtonDisabled : undefined,
                ]}
                onPress={() => {
                  void handleSaveEdit();
                }}
                disabled={savingEdit}
              >
                <Text style={styles.modalSaveText}>{savingEdit ? "Enregistrement..." : "Enregistrer"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void refreshPosts(); }} tintColor="#111827" colors={["#111827"]} />
        }
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 ? styles.emptyList : undefined,
        ]}
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
            <Text style={styles.footerText}>Fais défiler pour charger d&apos;autres posts.</Text>
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
    backgroundColor: "#eef2ff",
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },
  postCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  postHeaderPressable: {
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  postHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 10,
  },
  metaChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff7ed",
  },
  metaChipLabel: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "700",
  },
  metaChipMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  metaChipMutedText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  imageTapZone: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  postImage: {
    width: "100%",
    height: 260,
    backgroundColor: "#e5e7eb",
  },
  imageOverlayBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  imageOverlayText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  postMeta: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  manageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  editButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "700",
  },
  deleteButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "700",
  },
  voteRow: {
    flexDirection: "row",
    gap: 10,
  },
  voteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  voteButtonActiveUp: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  voteButtonActiveDown: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
  },
  voteButtonPressed: {
    opacity: 0.8,
  },
  voteButtonDisabled: {
    opacity: 0.6,
  },
  voteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  error: {
    color: "#b91c1c",
    paddingHorizontal: 16,
    paddingBottom: 8,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
    backgroundColor: "#f9fafb",
  },
  modalTextArea: {
    minHeight: 110,
  },
  editImagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    marginBottom: 10,
  },
  modalImageActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  modalSecondaryAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
  },
  modalSecondaryActionText: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 13,
  },
  modalDangerAction: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
  },
  modalDangerActionText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 14,
  },
  modalSave: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dcfce7",
  },
  modalSaveText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    marginVertical: 16,
  },
  footerText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
    marginVertical: 16,
    paddingHorizontal: 16,
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
