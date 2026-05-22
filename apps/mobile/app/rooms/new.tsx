import { Lucide } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type React from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const COLOR_PRESETS = [
  { name: "Emerald", hex: "#059669" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Slate", hex: "#475569" },
];

const clientRoomSchema = z.object({
  name: z.string().trim().min(1, "O nome do cômodo é obrigatório"),
  area: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number())
    .optional()
    .refine(
      (val): boolean => {
        if (val === undefined) return true;
        return val > 0;
      },
      { message: "A área do cômodo deve ser maior que 0" },
    ),
});

type FormFields = z.infer<typeof clientRoomSchema>;

interface FormErrors {
  name?: string;
  area?: string;
  submit?: string;
}

export default function NewRoomScreen(): React.JSX.Element {
  const router = useRouter();
  const { houseId } = useLocalSearchParams<{ houseId: string }>();

  const [name, setName] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [colorCode, setColorCode] = useState<string>("#059669");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateForm = (): FormFields | null => {
    const values = {
      name,
      area: area === "" ? undefined : area,
    };

    const result = clientRoomSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === "name") {
          fieldErrors.name = issue.message;
        } else if (path === "area") {
          fieldErrors.area = issue.message;
        }
      }
      setErrors(fieldErrors);
      return null;
    }

    setErrors({});
    return result.data;
  };

  const handleSave = async (): Promise<void> => {
    const validatedData = validateForm();
    if (!validatedData) return;

    setIsSubmitting(true);
    setErrors({});

    const activeHouseId = houseId || "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

    try {
      const payload = {
        name: validatedData.name,
        area: validatedData.area,
        colorCode,
        houseId: activeHouseId,
      };

      const response = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData: unknown = await response.json();

      if (!response.ok) {
        const errorMsg =
          responseData && typeof responseData === "object" && "error" in responseData
            ? String((responseData as { error: unknown }).error)
            : "Falha ao salvar cômodo.";
        throw new Error(errorMsg);
      }

      router.back();
    } catch (err: unknown) {
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Erro de conexão com o servidor.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={(): void => router.back()}
          disabled={isSubmitting}
        >
          <Lucide name="arrow-left" size={24} color="#0e1717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Cômodo</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {errors.submit && (
            <View style={styles.errorBanner}>
              <Lucide name="alert-triangle" size={20} color="#ffffff" style={styles.errorIcon} />
              <Text style={styles.errorBannerText}>{errors.submit}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome do Cômodo *</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "name" && styles.inputFocused,
                errors.name !== undefined && styles.inputError,
              ]}
              placeholder="Ex: Sala de Estar, Cozinha..."
              placeholderTextColor="#8fa3a3"
              value={name}
              onChangeText={setName}
              onFocus={(): void => setFocusedField("name")}
              onBlur={(): void => setFocusedField(null)}
              editable={!isSubmitting}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Área (m²)</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "area" && styles.inputFocused,
                errors.area !== undefined && styles.inputError,
              ]}
              placeholder="Ex: 15.5 (opcional)"
              placeholderTextColor="#8fa3a3"
              keyboardType="numeric"
              value={area}
              onChangeText={setArea}
              onFocus={(): void => setFocusedField("area")}
              onBlur={(): void => setFocusedField(null)}
              editable={!isSubmitting}
            />
            {errors.area && <Text style={styles.errorText}>{errors.area}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cor de Identificação</Text>
            <View style={styles.presetContainer}>
              {COLOR_PRESETS.map(
                (preset): React.JSX.Element => (
                  <TouchableOpacity
                    key={preset.hex}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: preset.hex },
                      colorCode === preset.hex && styles.colorSwatchActive,
                    ]}
                    onPress={(): void => setColorCode(preset.hex)}
                    disabled={isSubmitting}
                  />
                ),
              )}
            </View>

            <TextInput
              style={[
                styles.input,
                styles.hexInput,
                focusedField === "color" && styles.inputFocused,
              ]}
              placeholder="#000000"
              placeholderTextColor="#8fa3a3"
              value={colorCode}
              onChangeText={setColorCode}
              onFocus={(): void => setFocusedField("color")}
              onBlur={(): void => setFocusedField(null)}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={(): void => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f4",
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#8fa3a3",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0e1717",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 24,
  },
  errorBanner: {
    backgroundColor: "#ea580c",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorBannerText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0e1717",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#8fa3a3",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0e1717",
  },
  inputFocused: {
    borderColor: "#059669",
    borderWidth: 2,
  },
  inputError: {
    borderColor: "#ea580c",
  },
  errorText: {
    fontSize: 12,
    color: "#ea580c",
    marginTop: 4,
  },
  presetContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#0e1717",
    transform: [{ scale: 1.1 }],
  },
  hexInput: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#8fa3a3",
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
