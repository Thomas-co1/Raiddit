import { authService } from "@/services/api";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [plainPassword, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = useCallback(async () => {
    if (!email || !username || !plainPassword) {
      setError("Email, pseudo et mot de passe requis");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await authService.register(email.trim(), username.trim(), plainPassword);

      setSuccess("Compte créé. Tu peux te connecter.");
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le compte");
    } finally {
      setLoading(false);
    }
  }, [email, username, plainPassword, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Créer un compte</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Pseudo"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          editable={!loading}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          value={plainPassword}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Créer mon compte</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            router.replace("/(auth)/login");
          }}
          disabled={loading}
          style={styles.linkWrap}
        >
          <Text style={styles.linkText}>J&apos;ai déjà un compte</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: "#000",
  },
  button: {
    backgroundColor: "#ff4500",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#d32f2f",
    marginBottom: 12,
    textAlign: "center",
  },
  success: {
    color: "#047857",
    marginBottom: 12,
    textAlign: "center",
  },
  linkWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#ff4500",
    fontSize: 14,
    fontWeight: "600",
  },
});
