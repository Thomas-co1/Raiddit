import { ArrowsOutSimple, XCircle } from "phosphor-react-native";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type ImageViewerModalProps = {
  visible: boolean;
  imageUri: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

export function ImageViewerModal({
  visible,
  imageUri,
  title,
  subtitle,
  onClose,
}: ImageViewerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.chrome} pointerEvents="box-none">
          <View style={styles.topBar}>
            <View style={styles.topTextWrap}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <XCircle size={34} color="#ffffff" weight="fill" />
            </Pressable>
          </View>

          <Pressable style={styles.imageCard} onPress={() => {}}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" /> : null}
          </Pressable>

          <View style={styles.footer}>
            <View style={styles.footerChip}>
              <ArrowsOutSimple size={14} color="#f8fafc" weight="bold" />
              <Text style={styles.footerText}>Touchez autour de l&apos;image pour fermer</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.96)",
    justifyContent: "center",
  },
  chrome: {
    flex: 1,
    paddingTop: 42,
    paddingHorizontal: 14,
    paddingBottom: 22,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  topTextWrap: {
    flex: 1,
    paddingTop: 6,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    alignSelf: "flex-start",
  },
  imageCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  footer: {
    alignItems: "center",
  },
  footerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  footerText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
});
