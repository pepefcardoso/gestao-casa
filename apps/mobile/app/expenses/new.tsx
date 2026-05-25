import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import type React from "react";
import { useEffect, useState } from "react";
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
import { projectInstallments } from "../../../../libs/shared-logic/src/utils/project-installments";
import { Lucide } from "../../components/LucideIcon";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type CategoryType = "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface RoomOption {
  id: string;
  name: string;
  colorCode: string | null;
}

const CATEGORIES: {
  label: string;
  value: CategoryType;
  icon: "receipt" | "shopping-bag" | "wrench" | "sofa" | "tv" | "hammer";
}[] = [
  { label: "Imposto", value: "TAX", icon: "receipt" },
  { label: "Produto", value: "PRODUCT", icon: "shopping-bag" },
  { label: "Serviço", value: "SERVICE", icon: "wrench" },
  { label: "Mobília", value: "FURNITURE", icon: "sofa" },
  { label: "Eletro", value: "APPLIANCE", icon: "tv" },
  { label: "Reforma", value: "RENOVATION", icon: "hammer" },
];

const PRIORITIES: {
  label: string;
  value: PriorityType;
  color: string;
  icon: "alert-triangle" | "circle" | "arrow-down";
}[] = [
  { label: "Alta", value: "HIGH", color: "#ea580c", icon: "alert-triangle" },
  { label: "Média", value: "MEDIUM", color: "#2563eb", icon: "circle" },
  { label: "Baixa", value: "LOW", color: "#64748b", icon: "arrow-down" },
];

const clientExpenseSchema = z.object({
  description: z.string().trim().min(1, "A descrição da despesa é obrigatória"),
  totalAmount: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine((val): boolean => val > 0, {
      message: "O valor total deve ser maior que 0",
    }),
  installmentsCount: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine((val): boolean => Number.isInteger(val) && val >= 1 && val <= 360, {
      message: "A quantidade de parcelas deve ser entre 1 e 360",
    }),
});

type FormFields = z.infer<typeof clientExpenseSchema>;

interface FormErrors {
  description?: string;
  totalAmount?: string;
  installmentsCount?: string;
  submit?: string;
}

export default function NewExpenseScreen(): React.JSX.Element {
  const router = useRouter();

  // Form Fields State
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [status, setStatus] = useState<"BUDGET" | "CONFIRMED">("CONFIRMED");
  const [category, setCategory] = useState<CategoryType>("PRODUCT");
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [roomId, setRoomId] = useState<string | null>(null);

  // Payment Type & Installments
  const [paymentType, setPaymentType] = useState<"UPFRONT" | "INSTALLMENTS">("UPFRONT");
  const [installmentsCount, setInstallmentsCount] = useState<string>("1");

  // Auxiliary UI State
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Load Rooms for Picker
  useEffect((): (() => void) => {
    let active = true;
    const fetchRooms = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/rooms`);
        if (!response.ok) {
          throw new Error("Erro ao carregar cômodos");
        }
        const data: unknown = await response.json();
        if (active && Array.isArray(data)) {
          const mappedRooms = (
            data as { id: string; name: string; colorCode: string | null }[]
          ).map(
            (r): RoomOption => ({
              id: r.id,
              name: r.name,
              colorCode: r.colorCode,
            }),
          );
          setRooms(mappedRooms);
        }
      } catch (err: unknown) {
        console.warn("Failed to load rooms, proceeding with empty list:", err);
      } finally {
        if (active) {
          setIsLoadingRooms(false);
        }
      }
    };
    fetchRooms();
    return (): void => {
      active = false;
    };
  }, []);

  // Format Helper
  const formatCurrency = (val: number): string => {
    return `R$ ${val
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  // Live calculations
  const parsedAmount = Number(totalAmount) || 0;
  const parsedInstallmentsCount = paymentType === "UPFRONT" ? 1 : Number(installmentsCount) || 1;
  const perMonthAmount = parsedAmount / parsedInstallmentsCount;

  const handleInstallmentsChange = (text: string): void => {
    const clean = text.replace(/[^0-9]/g, "");
    if (clean === "") {
      setInstallmentsCount("");
      return;
    }
    const parsed = parseInt(clean, 10);
    if (parsed > 360) {
      setInstallmentsCount("360");
      return;
    }
    setInstallmentsCount(parsed.toString());
  };

  const handleSliderChange = (val: number): void => {
    setInstallmentsCount(Math.round(val).toString());
  };

  const validateForm = (): FormFields | null => {
    const values = {
      description,
      totalAmount: totalAmount === "" ? undefined : totalAmount,
      installmentsCount: parsedInstallmentsCount,
    };

    const result = clientExpenseSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === "description") {
          fieldErrors.description = issue.message;
        } else if (path === "totalAmount") {
          fieldErrors.totalAmount = issue.message;
        } else if (path === "installmentsCount") {
          fieldErrors.installmentsCount = issue.message;
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

    try {
      // 1. Generate all installments using shared pure logic
      const installments = projectInstallments({
        description: validatedData.description,
        totalAmount: validatedData.totalAmount,
        installmentsCount: validatedData.installmentsCount,
        status,
        category,
        priority,
        roomId: roomId || null,
        dueDate: new Date(), // defaults to today
      });

      // 2. POST all entries to the backend API route in sequence
      for (const inst of installments) {
        const response = await fetch(`${API_URL}/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inst),
        });

        if (!response.ok) {
          const responseData: unknown = await response.json();
          const errorMsg =
            responseData && typeof responseData === "object" && "error" in responseData
              ? String((responseData as { error: unknown }).error)
              : "Falha ao registrar despesa.";
          throw new Error(errorMsg);
        }
      }

      // 3. Go back on success
      router.back();
    } catch (err: unknown) {
      setErrors((prev) => ({
        ...prev,
        submit: err instanceof Error ? err.message : "Erro ao salvar a despesa no servidor.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={(): void => router.back()}
          disabled={isSubmitting}
        >
          <Lucide name="arrow-left" size={24} color="#0e1717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Gasto</Text>
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

          {/* Status Toggle (Large Tap Target) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status da Despesa</Text>
            <View style={styles.statusToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.statusToggleButton,
                  status === "BUDGET" && styles.statusToggleBudgetActive,
                ]}
                onPress={(): void => setStatus("BUDGET")}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Lucide
                  name="piggy-bank"
                  size={20}
                  color={status === "BUDGET" ? "#ffffff" : "#64748b"}
                  style={styles.statusToggleIcon}
                />
                <Text
                  style={[
                    styles.statusToggleText,
                    status === "BUDGET" && styles.statusToggleTextActive,
                  ]}
                >
                  Planejado (Orçamento)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusToggleButton,
                  status === "CONFIRMED" && styles.statusToggleConfirmedActive,
                ]}
                onPress={(): void => setStatus("CONFIRMED")}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Lucide
                  name="check-circle"
                  size={20}
                  color={status === "CONFIRMED" ? "#ffffff" : "#64748b"}
                  style={styles.statusToggleIcon}
                />
                <Text
                  style={[
                    styles.statusToggleText,
                    status === "CONFIRMED" && styles.statusToggleTextActive,
                  ]}
                >
                  Confirmado (Gasto)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "description" && styles.inputFocused,
                errors.description !== undefined && styles.inputError,
              ]}
              placeholder="Ex: Sofá de Couro, Pintura da Fachada..."
              placeholderTextColor="#8fa3a3"
              value={description}
              onChangeText={setDescription}
              onFocus={(): void => setFocusedField("description")}
              onBlur={(): void => setFocusedField(null)}
              editable={!isSubmitting}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Amount */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Valor Total (R$) *</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "totalAmount" && styles.inputFocused,
                errors.totalAmount !== undefined && styles.inputError,
              ]}
              placeholder="Ex: 1500.00"
              placeholderTextColor="#8fa3a3"
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
              onFocus={(): void => setFocusedField("totalAmount")}
              onBlur={(): void => setFocusedField(null)}
              editable={!isSubmitting}
            />
            {errors.totalAmount && <Text style={styles.errorText}>{errors.totalAmount}</Text>}
          </View>

          {/* Payment Type Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Forma de Pagamento</Text>
            <View style={styles.paymentSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentSelectorButton,
                  paymentType === "UPFRONT" && styles.paymentSelectorActive,
                ]}
                onPress={(): void => {
                  setPaymentType("UPFRONT");
                  setInstallmentsCount("1");
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.paymentSelectorText,
                    paymentType === "UPFRONT" && styles.paymentSelectorTextActive,
                  ]}
                >
                  À Vista
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentSelectorButton,
                  paymentType === "INSTALLMENTS" && styles.paymentSelectorActive,
                ]}
                onPress={(): void => {
                  setPaymentType("INSTALLMENTS");
                  if (installmentsCount === "1") {
                    setInstallmentsCount("2"); // default parcel to 2 when switching
                  }
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.paymentSelectorText,
                    paymentType === "INSTALLMENTS" && styles.paymentSelectorTextActive,
                  ]}
                >
                  Parcelado
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Installments Controls (Slider + Text Input + Live Preview) */}
          {paymentType === "INSTALLMENTS" && (
            <View style={styles.installmentsWrapper}>
              <View style={styles.livePreviewContainer}>
                <Lucide name="calculator" size={18} color="#059669" style={styles.previewIcon} />
                <Text style={styles.livePreviewText}>
                  {formatCurrency(parsedAmount)} ÷ {parsedInstallmentsCount} ={" "}
                  <Text style={styles.livePreviewHighlighted}>
                    {formatCurrency(perMonthAmount)}
                  </Text>
                  /mês
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Quantidade de Parcelas</Text>
                <View style={styles.sliderTextInputRow}>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={24}
                    step={1}
                    value={Math.min(24, Number(installmentsCount) || 1)}
                    onValueChange={handleSliderChange}
                    minimumTrackTintColor="#059669"
                    maximumTrackTintColor="#cbd5e1"
                    thumbTintColor="#059669"
                    disabled={isSubmitting}
                  />
                  <TextInput
                    style={[
                      styles.installmentsInput,
                      focusedField === "installmentsCount" && styles.inputFocused,
                      errors.installmentsCount !== undefined && styles.inputError,
                    ]}
                    keyboardType="number-pad"
                    value={installmentsCount}
                    onChangeText={handleInstallmentsChange}
                    onFocus={(): void => setFocusedField("installmentsCount")}
                    onBlur={(): void => setFocusedField(null)}
                    editable={!isSubmitting}
                    maxLength={3}
                  />
                </View>
                {errors.installmentsCount && (
                  <Text style={styles.errorText}>{errors.installmentsCount}</Text>
                )}
                <Text style={styles.helperText}>
                  Use o slider até 24 ou digite no campo ao lado até 360 parcelas.
                </Text>
              </View>
            </View>
          )}

          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(
                (cat): React.JSX.Element => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      category === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={(): void => setCategory(cat.value)}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>

          {/* Priority Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(
                (prio): React.JSX.Element => (
                  <TouchableOpacity
                    key={prio.value}
                    style={[
                      styles.priorityChip,
                      { borderColor: `${prio.color}44` },
                      priority === prio.value && {
                        backgroundColor: prio.color,
                        borderColor: prio.color,
                      },
                    ]}
                    onPress={(): void => setPriority(prio.value)}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <View style={styles.priorityLabelContainer}>
                      <Lucide
                        name={prio.icon}
                        size={14}
                        color={priority === prio.value ? "#ffffff" : prio.color}
                        style={styles.priorityIcon}
                      />
                      <Text
                        style={[
                          styles.priorityChipText,
                          { color: prio.color },
                          priority === prio.value && styles.priorityChipTextActive,
                        ]}
                      >
                        {prio.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>

          {/* Room Selector (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Cômodo Associado (Opcional)</Text>
            {isLoadingRooms ? (
              <ActivityIndicator size="small" color="#059669" style={styles.loader} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomsScrollContent}
              >
                <TouchableOpacity
                  style={[styles.roomChip, roomId === null && styles.roomChipActive]}
                  onPress={(): void => setRoomId(null)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.roomChipText, roomId === null && styles.roomChipTextActive]}>
                    Nenhum
                  </Text>
                </TouchableOpacity>

                {rooms.map((room): React.JSX.Element => {
                  const isActive = roomId === room.id;
                  const dotColor = room.colorCode || "#8fa3a3";
                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.roomChip,
                        isActive && styles.roomChipActive,
                        isActive && { borderColor: dotColor },
                      ]}
                      onPress={(): void => setRoomId(room.id)}
                      disabled={isSubmitting}
                    >
                      <View style={styles.roomChipContent}>
                        <View style={[styles.roomColorDot, { backgroundColor: dotColor }]} />
                        <Text
                          style={[
                            styles.roomChipText,
                            isActive && styles.roomChipTextActive,
                            isActive && { color: "#0e1717" },
                          ]}
                        >
                          {room.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Actions */}
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
    padding: 20,
    paddingBottom: 40,
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
  statusToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 4,
  },
  statusToggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  statusToggleIcon: {
    marginRight: 6,
  },
  statusToggleBudgetActive: {
    backgroundColor: "#d97706",
  },
  statusToggleConfirmedActive: {
    backgroundColor: "#059669",
  },
  statusToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  statusToggleTextActive: {
    color: "#ffffff",
  },
  paymentSelectorContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#8fa3a3",
    borderRadius: 8,
    overflow: "hidden",
  },
  paymentSelectorButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentSelectorActive: {
    backgroundColor: "#059669",
  },
  paymentSelectorText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  paymentSelectorTextActive: {
    color: "#ffffff",
  },
  installmentsWrapper: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  livePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewIcon: {
    marginRight: 8,
  },
  livePreviewText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  livePreviewHighlighted: {
    color: "#059669",
    fontWeight: "700",
  },
  sliderTextInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slider: {
    flex: 1,
    height: 40,
    marginRight: 16,
  },
  installmentsInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#8fa3a3",
    borderRadius: 8,
    width: 64,
    height: 44,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#0e1717",
  },
  helperText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  categoryChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  categoryChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityChip: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: "center",
  },
  priorityLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityIcon: {
    marginRight: 6,
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  priorityChipTextActive: {
    color: "#ffffff",
  },
  loader: {
    paddingVertical: 12,
  },
  roomsScrollContent: {
    paddingVertical: 4,
  },
  roomChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  roomChipActive: {
    borderColor: "#0e1717",
    borderWidth: 1.5,
  },
  roomChipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  roomChipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  roomChipTextActive: {
    color: "#0e1717",
    fontWeight: "600",
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
