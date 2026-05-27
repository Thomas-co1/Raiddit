import { ImageViewerModal } from "@/components/image-viewer-modal";
import { useAuth } from "@/contexts/AuthContext";
import { mediaObjectsService, postsService } from "@/services/api";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowsOutSimple, ImageSquare } from "phosphor-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function CreatePostScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    name?: string | null;
    type?: string | null;
  } | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Autorise l'acces aux photos pour ajouter une image.");
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
    setSelectedImage({
      uri: asset.uri,
      name: asset.fileName,
      type: asset.mimeType,
    });
  };

  const submitPost = async () => {
    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      let imageIri: string | undefined;
      if (selectedImage) {
        imageIri = await mediaObjectsService.uploadImage(selectedImage);
      }

      const basePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        image: imageIri,
      };

      if (userId) {
        try {
          await postsService.create({
            ...basePayload,
            author: `/api/users/${userId}`,
          });
        } catch (createError) {
          const status =
            typeof createError === "object" && createError !== null && "status" in createError
              ? Number((createError as { status?: number }).status)
              : undefined;

          // Some backends infer author from token and reject explicit author assignment.
          if (status === 400 || status === 403 || status === 409 || status === 422) {
            await postsService.create(basePayload);
          } else {
            throw createError;
          }
        }
      } else {
        await postsService.create(basePayload);
      }

      setTitle("");
      setDescription("");
      setSelectedImage(null);
      setSuccess("Post créé avec succès.");

      setTimeout(() => {
        router.push("/(tabs)");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ImageViewerModal
          visible={Boolean(fullscreenImageUri)}
          imageUri={fullscreenImageUri}
          title="Apercu de l'image"
          subtitle="Verifie ton visuel avant de publier le post."
          onClose={() => {
            setFullscreenImageUri(null);
          }}
        />

        <View style={styles.formCard}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="Ton titre"
            placeholderTextColor="#9ca3af"
            editable={!submitting}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.descriptionInput]}
            placeholder="Decris ton post en detail"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            editable={!submitting}
          />
          <Text style={styles.helperText}>La description est le coeur du post: prends un peu plus de place ici.</Text>

          <Text style={styles.sectionTitle}>Image optionnelle</Text>
          <Pressable
            onPress={() => {
              void pickImage();
            }}
            disabled={submitting}
            style={({ pressed }) => [
              styles.addMetaButton,
              pressed && !submitting ? styles.submitPressed : undefined,
              submitting ? styles.submitDisabled : undefined,
            ]}
          >
            <View style={styles.buttonContentRow}>
              <ImageSquare size={16} color="#334155" weight="bold" />
              <Text style={styles.addMetaText}>
                {selectedImage ? "Changer l&apos;image" : "Choisir une image"}
              </Text>
            </View>
          </Pressable>

          {selectedImage ? (
            <View style={styles.imageCard}>
              <Pressable
                style={styles.imageFrame}
                onPress={() => {
                  setFullscreenImageUri(selectedImage.uri);
                }}
              >
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="contain" />
                <View style={styles.imageOverlayBadge}>
                  <ArrowsOutSimple size={14} color="#ffffff" weight="bold" />
                  <Text style={styles.imageOverlayText}>Agrandir</Text>
                </View>
              </Pressable>
              <Text style={styles.imageName} numberOfLines={1}>
                {selectedImage.name || "Image selectionnee"}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedImage(null);
                }}
                disabled={submitting}
              >
                <Text style={styles.metaRemove}>Retirer l&apos;image</Text>
              </Pressable>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !submitting ? styles.submitPressed : undefined,
              submitting ? styles.submitDisabled : undefined,
            ]}
            onPress={() => {
              void submitPost();
            }}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>Publier</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
    marginBottom: 8,
    marginTop: 4,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 14,
    backgroundColor: "#f9fafb",
  },
  descriptionInput: {
    minHeight: 220,
    paddingTop: 14,
    marginBottom: 8,
  },
  helperText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  addMetaButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  imageCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 14,
  },
  imagePreview: {
    width: "100%",
    height: 260,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  imageFrame: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
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
  addMetaText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageName: {
    color: "#374151",
    fontSize: 13,
    marginBottom: 8,
  },
  metaRemove: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 4,
  },
  submitPressed: {
    opacity: 0.8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
  success: {
    color: "#047857",
    marginBottom: 12,
  },
});
