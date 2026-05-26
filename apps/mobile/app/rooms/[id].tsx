import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
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

export default function RoomDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { userId, role } = useMobileUser();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [room, setRoom] = useState<RoomClient | null>(null);
  const [expenses, setExpenses] = useState<ExpenseClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomAndExpenses = useCallback(async (): Promise<void> => {
    if (!id) {
      setError("ID do cômodo inválido.");
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const [roomRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/rooms/${id}`, { headers: { "x-user-id": userId } }),
        fetch(`${API_URL}/expenses?room_id=${id}`, { headers: { "x-user-id": userId } }),
      ]);

      if (!roomRes.ok) {
        if (roomRes.status === 404) {
          throw new Error("Cômodo não encontrado.");
        }
        throw new Error("Erro ao carregar dados do cômodo.");
      }

      if (!expensesRes.ok) {
        throw new Error("Erro ao carregar despesas do cômodo.");
      }

      const roomData: unknown = await roomRes.json();
      const expensesData: unknown = await expensesRes.json();

      setRoom(roomData as RoomClient);

      if (Array.isArray(expensesData)) {
        setExpenses(expensesData as ExpenseClient[]);
      } else {
        throw new Error("Dados de despesas inválidos.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro de conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback((): void => {
      fetchRoomAndExpenses();
    }, [fetchRoomAndExpenses]),
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchRoomAndExpenses();
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

  // Calculate totals
  const totalConfirmed = expenses
    .filter((e): boolean => e.status === "CONFIRMED")
    .reduce((sum, e): number => sum + Number(e.totalAmount), 0);

  const totalBudgeted = expenses
    .filter((e): boolean => e.status === "BUDGET")
    .reduce((sum, e): number => sum + Number(e.totalAmount), 0);

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
      item.priority === "HIGH" ? "#e11d48" : item.priority === "MEDIUM" ? "#d97706" : "#475569";

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
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backButton} onPress={(): void => router.back()}>
            <Lucide name="arrow-left" size={24} color="#0e1717" />
          </TouchableOpacity>
          <Text style={styles.loadingHeaderTitle}>Detalhes do Cômodo</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Carregando informações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !room) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backButton} onPress={(): void => router.back()}>
            <Lucide name="arrow-left" size={24} color="#0e1717" />
          </TouchableOpacity>
          <Text style={styles.loadingHeaderTitle}>Erro</Text>
        </View>
        <View style={styles.centerContainer}>
          <Lucide name="alert-triangle" size={48} color="#ea580c" />
          <Text style={styles.errorText}>{error || "Cômodo não encontrado."}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRoomAndExpenses}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const roomColor = room.colorCode || "#059669";
  const displayArea = room.area
    ? `${Number(room.area).toLocaleString("pt-BR")} m²`
    : "Área não informada";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Dynamic Colored Header */}
      <View style={[styles.roomHeader, { backgroundColor: roomColor }]}>
        <View style={styles.headerTopBar}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={(): void => router.back()}
            accessibilityLabel="Voltar"
          >
            <Lucide name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {room.name}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.headerMeta}>
          <Lucide name="layout" size={16} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.headerAreaText}>{displayArea}</Text>
        </View>
      </View>

      {/* Summary totals inside the room */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBgConfirmed}>
            <Lucide name="check-circle" size={18} color="#e11d48" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Confirmado</Text>
            <Text style={[styles.summaryValue, { color: "#e11d48" }]}>
              {formatCurrency(totalConfirmed)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBgBudgeted}>
            <Lucide name="clock" size={18} color="#d97706" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Planejado</Text>
            <Text style={[styles.summaryValue, { color: "#d97706" }]}>
              {formatCurrency(totalBudgeted)}
            </Text>
          </View>
        </View>
      </View>

      {/* Expenses Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Despesas Vinculadas</Text>
        <Text style={styles.expensesCountText}>
          {expenses.length} {expenses.length === 1 ? "despesa" : "despesas"}
        </Text>
      </View>

      {/* Expenses FlatList */}
      <FlatList
        data={expenses}
        keyExtractor={keyExtractor}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[roomColor]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Lucide name="receipt" size={48} color="#8fa3a3" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Nenhuma despesa</Text>
            <Text style={styles.emptySubtitle}>
              Este cômodo não possui nenhuma despesa vinculada no momento.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f4",
  },
  loadingHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#8fa3a3",
  },
  loadingHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0e1717",
    marginLeft: 16,
  },
  backButton: {
    padding: 4,
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
    color: "#8fa3a3",
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
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  roomHeader: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBackButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerPlaceholder: {
    width: 32,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  headerAreaText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginLeft: 6,
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.2)",
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryIconBgConfirmed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(225, 29, 72, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  summaryIconBgBudgeted: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8fa3a3",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0e1717",
  },
  expensesCountText: {
    fontSize: 12,
    color: "#8fa3a3",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  expenseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmedCard: {
    backgroundColor: "#fff1f2", // very light rose background
  },
  budgetedCard: {
    backgroundColor: "#fef3c7", // very light amber background
  },
  confirmedAccent: {
    borderColor: "rgba(225, 29, 72, 0.25)",
  },
  budgetedAccent: {
    borderColor: "rgba(217, 119, 6, 0.25)",
  },
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
    color: "#0e1717",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  metaDot: {
    fontSize: 12,
    color: "#8fa3a3",
    marginHorizontal: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmedBadgeBg: {
    backgroundColor: "rgba(225, 29, 72, 0.15)",
  },
  budgetedBadgeBg: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  confirmedBadgeText: {
    color: "#be123c",
  },
  budgetedBadgeText: {
    color: "#b45309",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(143, 163, 163, 0.15)",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  amountLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
    marginBottom: 2,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0e1717",
  },
  installmentsText: {
    fontSize: 11,
    color: "#475569",
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
    backgroundColor: "#d97706", // amber color for confirmation action
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#d97706",
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
    color: "#0e1717",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#8fa3a3",
    textAlign: "center",
    lineHeight: 18,
  },
});
