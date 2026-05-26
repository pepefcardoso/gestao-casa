import { useFocusEffect, useRouter } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Lucide } from "../../components/LucideIcon";
import { useMobileUser } from "../globalState";

interface RoomClient {
  id: string;
  houseId: string;
  name: string;
  area: string | null;
  colorCode: string | null;
  createdAt: string;
}

interface ExpenseClient {
  id: string;
  roomId: string | null;
  description: string;
  totalAmount: string;
  installmentsCount: number;
  status: "BUDGET" | "CONFIRMED";
  category: "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  createdAt: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const CATEGORY_LABELS: Record<ExpenseClient["category"], string> = {
  TAX: "Imposto",
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  FURNITURE: "Mobília",
  APPLIANCE: "Eletrodoméstico",
  RENOVATION: "Reforma",
};

const PRIORITY_LABELS: Record<ExpenseClient["priority"], string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const PRIORITIES = [
  { label: "Todas", value: "ALL" },
  { label: "Alta", value: "HIGH" },
  { label: "Média", value: "MEDIUM" },
  { label: "Baixa", value: "LOW" },
] as const;

export default function ExpenseListScreen(): React.JSX.Element {
  const router = useRouter();
  const { userId, role } = useMobileUser();

  // Data State
  const [expenses, setExpenses] = useState<ExpenseClient[]>([]);
  const [rooms, setRooms] = useState<RoomClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">(
    "ALL",
  );
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState<boolean>(false);

  // Fetch Data
  const fetchData = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const [expensesRes, roomsRes] = await Promise.all([
        fetch(`${API_URL}/expenses`, { headers: { "x-user-id": userId } }),
        fetch(`${API_URL}/rooms`, { headers: { "x-user-id": userId } }),
      ]);

      if (!expensesRes.ok) {
        throw new Error("Não foi possível carregar as despesas.");
      }
      if (!roomsRes.ok) {
        throw new Error("Não foi possível carregar os cômodos.");
      }

      const expensesData: unknown = await expensesRes.json();
      const roomsData: unknown = await roomsRes.json();

      if (Array.isArray(expensesData)) {
        setExpenses(expensesData as ExpenseClient[]);
      } else {
        throw new Error("Dados de despesas inválidos.");
      }

      if (Array.isArray(roomsData)) {
        setRooms(roomsData as RoomClient[]);
      } else {
        throw new Error("Dados de cômodos inválidos.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback((): void => {
      fetchData();
    }, [fetchData]),
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleToggleStatus = async (expense: ExpenseClient): Promise<void> => {
    if (expense.status === "CONFIRMED") return;
    if (role === "VIEWER") return;

    // Save previous state for rollback on API failure
    const previousExpenses = [...expenses];

    // Optimistically update
    const updatedExpenses = expenses.map(
      (e): ExpenseClient => (e.id === expense.id ? { ...e, status: "CONFIRMED" as const } : e),
    );
    setExpenses(updatedExpenses);

    try {
      const payload = {
        roomId: expense.roomId,
        description: expense.description,
        totalAmount: Number(expense.totalAmount),
        installmentsCount: expense.installmentsCount,
        status: "CONFIRMED",
        category: expense.category,
        priority: expense.priority,
        dueDate: expense.dueDate,
      };

      const response = await fetch(`${API_URL}/expenses/${expense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a despesa no servidor.");
      }
    } catch (err: unknown) {
      // Revert state on failure
      setExpenses(previousExpenses);
      Alert.alert(
        "Erro ao atualizar",
        err instanceof Error ? err.message : "Erro ao atualizar o status da despesa.",
      );
    }
  };

  const formatCurrency = (val: number): string => {
    return `R$ ${val
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch {
      return "";
    }
  };

  // Filter computation
  const filteredExpenses = expenses.filter((e): boolean => {
    const matchesRoom = selectedRoomId === null || e.roomId === selectedRoomId;
    const matchesPriority = selectedPriority === "ALL" || e.priority === selectedPriority;
    return matchesRoom && matchesPriority;
  });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const keyExtractor = (item: ExpenseClient): string => item.id;

  const renderExpenseItem = ({ item }: { item: ExpenseClient }): React.JSX.Element => {
    const isConfirmed = item.status === "CONFIRMED";
    const cardStyle = isConfirmed ? styles.confirmedCard : styles.budgetedCard;
    const borderAccentStyle = isConfirmed ? styles.confirmedAccent : styles.budgetedAccent;
    const badgeBgStyle = isConfirmed ? styles.confirmedBadgeBg : styles.budgetedBadgeBg;
    const badgeTextStyle = isConfirmed ? styles.confirmedBadgeText : styles.budgetedBadgeText;

    const amountValue = Number(item.totalAmount);
    const formattedAmount = formatCurrency(amountValue);
    const formattedDate = formatDate(item.dueDate);

    // Color based on priority
    const priorityColor =
      item.priority === "HIGH" ? "#E11D48" : item.priority === "MEDIUM" ? "#D97706" : "#86868B";

    const expenseRoom = rooms.find((r) => r.id === item.roomId);

    return (
      <View style={[styles.expenseCard, cardStyle, borderAccentStyle]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.expenseDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{CATEGORY_LABELS[item.category]}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
            {expenseRoom && (
              <View style={styles.roomLabelContainer}>
                <View
                  style={[
                    styles.roomMiniDot,
                    { backgroundColor: expenseRoom.colorCode || "#86868B" },
                  ]}
                />
                <Text style={styles.roomLabelText}>{expenseRoom.name}</Text>
              </View>
            )}
          </View>

          <View style={[styles.statusBadge, badgeBgStyle]}>
            <Text style={[styles.statusBadgeText, badgeTextStyle]}>
              {isConfirmed ? "Confirmado" : "Planejado"}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Valor Total</Text>
            <Text style={styles.expenseAmount}>{formattedAmount}</Text>
            {item.installmentsCount > 1 && (
              <Text style={styles.installmentsText}>
                {item.installmentsCount}x de {formatCurrency(amountValue / item.installmentsCount)}
              </Text>
            )}
          </View>

          <View style={styles.cardFooterRight}>
            <View style={styles.priorityRow}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityLabel, { color: priorityColor }]}>
                {PRIORITY_LABELS[item.priority]}
              </Text>
            </View>

            {!isConfirmed && role !== "VIEWER" && (
              <TouchableOpacity
                style={styles.confirmButton}
                activeOpacity={0.7}
                onPress={(): Promise<void> => handleToggleStatus(item)}
                accessibilityLabel="Confirmar despesa"
              >
                <Lucide name="check" size={14} color="#ffffff" style={styles.confirmButtonIcon} />
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={(): void => router.back()}>
            <Lucide name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Despesas</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando despesas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={(): void => router.back()}>
            <Lucide name="arrow-left" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Despesas</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <Lucide name="alert-triangle" size={48} color="#ea580c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={(): void => router.back()}
          accessibilityLabel="Voltar"
        >
          <Lucide name="arrow-left" size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Despesas</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Filters Area */}
      <View style={styles.filtersContainer}>
        {/* Room Filter Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Filtrar por Cômodo</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={(): void => setIsRoomPickerOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownTriggerLeft}>
              {selectedRoom ? (
                <>
                  <View
                    style={[
                      styles.roomDot,
                      { backgroundColor: selectedRoom.colorCode || "#86868B" },
                    ]}
                  />
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {selectedRoom.name}
                  </Text>
                </>
              ) : (
                <>
                  <Lucide
                    name="home"
                    size={16}
                    color="#86868B"
                    style={styles.dropdownTriggerIcon}
                  />
                  <Text style={styles.dropdownTriggerText}>Todos os Cômodos</Text>
                </>
              )}
            </View>
            <Lucide name="chevron-down" size={18} color="#86868B" />
          </TouchableOpacity>
        </View>

        {/* Priority Filter Segmented Control */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Filtrar por Prioridade</Text>
          <View style={styles.segmentedControl}>
            {PRIORITIES.map((prio): React.JSX.Element => {
              const isActive = selectedPriority === prio.value;
              return (
                <TouchableOpacity
                  key={prio.value}
                  style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                  onPress={(): void => setSelectedPriority(prio.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.segmentButtonText, isActive && styles.segmentButtonTextActive]}
                  >
                    {prio.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={keyExtractor}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#10B981"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Lucide name="receipt" size={48} color="#86868B" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Nenhuma despesa</Text>
            <Text style={styles.emptySubtitle}>
              Não encontramos nenhuma despesa para os filtros selecionados.
            </Text>
          </View>
        }
      />

      {/* Room Selection Modal */}
      <Modal
        visible={isRoomPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={(): void => setIsRoomPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={(): void => setIsRoomPickerOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cômodo</Text>
              <TouchableOpacity
                onPress={(): void => setIsRoomPickerOpen(false)}
                accessibilityLabel="Fechar"
              >
                <Lucide name="x" size={20} color="#1D1D1F" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, selectedRoomId === null && styles.modalItemActive]}
                onPress={(): void => {
                  setSelectedRoomId(null);
                  setIsRoomPickerOpen(false);
                }}
              >
                <View style={styles.modalItemLeft}>
                  <Lucide
                    name="home"
                    size={16}
                    color={selectedRoomId === null ? "#10B981" : "#86868B"}
                    style={styles.modalItemIcon}
                  />
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedRoomId === null && styles.modalItemTextActive,
                    ]}
                  >
                    Todos os Cômodos
                  </Text>
                </View>
                {selectedRoomId === null && <Lucide name="check" size={18} color="#10B981" />}
              </TouchableOpacity>

              {rooms.map((room): React.JSX.Element => {
                const isActive = selectedRoomId === room.id;
                const dotColor = room.colorCode || "#86868B";
                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={(): void => {
                      setSelectedRoomId(room.id);
                      setIsRoomPickerOpen(false);
                    }}
                  >
                    <View style={styles.modalItemLeft}>
                      <View style={[styles.modalColorDot, { backgroundColor: dotColor }]} />
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                        {room.name}
                      </Text>
                    </View>
                    {isActive && <Lucide name="check" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Action Button (FAB) */}
      {role !== "VIEWER" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={(): void => router.push("/expenses/new")}
          activeOpacity={0.8}
          accessibilityLabel="Nova despesa"
        >
          <Lucide name="plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  headerPlaceholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#86868B",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ea580c",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  filtersContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#86868B",
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerIcon: {
    marginRight: 8,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D1D1F",
  },
  roomDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#EBEBEF",
    borderRadius: 8,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#86868B",
  },
  segmentButtonTextActive: {
    color: "#10B981",
  },
  listContent: {
    padding: 16,
    paddingBottom: 88, // space for FAB
    flexGrow: 1,
  },
  expenseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
  confirmedCard: {
    backgroundColor: "#FFF1F2",
  },
  budgetedCard: {
    backgroundColor: "#FFFBEB",
  },
  confirmedAccent: {},
  budgetedAccent: {},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1D1D1F",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#86868B",
    fontWeight: "500",
  },
  metaDot: {
    fontSize: 12,
    color: "#86868B",
    marginHorizontal: 6,
  },
  roomLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(134, 134, 139, 0.1)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roomMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  roomLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#86868B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedBadgeBg: {
    backgroundColor: "rgba(225, 29, 72, 0.1)",
  },
  budgetedBadgeBg: {
    backgroundColor: "rgba(217, 119, 6, 0.1)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  confirmedBadgeText: {
    color: "#E11D48",
  },
  budgetedBadgeText: {
    color: "#D97706",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(134, 134, 139, 0.15)",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 11,
    color: "#86868B",
    fontWeight: "500",
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  installmentsText: {
    fontSize: 11,
    color: "#86868B",
    marginTop: 2,
  },
  cardFooterRight: {
    alignItems: "flex-end",
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  confirmButtonIcon: {
    marginRight: 4,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: 48,
  },
  emptyIcon: {
    opacity: 0.4,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#86868B",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(134, 134, 139, 0.2)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalItemIcon: {
    marginRight: 10,
  },
  modalItemText: {
    fontSize: 15,
    color: "#1D1D1F",
    fontWeight: "500",
  },
  modalItemTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  modalColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#10B981",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
