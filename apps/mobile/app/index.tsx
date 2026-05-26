import { useFocusEffect, useRouter } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Lucide } from "../components/LucideIcon";
import { useMobileUser, PRESET_USERS } from "./globalState";

interface HouseClient {
  id: string;
  name: string;
  location: string | null;
  totalArea: string | null;
  createdAt: string;
}

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
const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { userId, role, changeUser } = useMobileUser();
  const [house, setHouse] = useState<HouseClient | null>(null);
  const [rooms, setRooms] = useState<RoomClient[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const [houseRes, roomsRes, expensesRes] = await Promise.all([
        fetch(`${API_URL}/houses/${FALLBACK_HOUSE_ID}`, { headers: { "x-user-id": userId } }),
        fetch(`${API_URL}/rooms?house_id=${FALLBACK_HOUSE_ID}`, { headers: { "x-user-id": userId } }),
        fetch(`${API_URL}/expenses?house_id=${FALLBACK_HOUSE_ID}`, { headers: { "x-user-id": userId } }),
      ]);

      let houseData: HouseClient | null = null;
      if (houseRes.status === 404) {
        houseData = {
          id: FALLBACK_HOUSE_ID,
          name: "Minha Casa",
          location: "Localização não configurada",
          totalArea: null,
          createdAt: new Date().toISOString(),
        };
      } else if (!houseRes.ok) {
        throw new Error("Não foi possível carregar os dados da casa.");
      } else {
        const data: unknown = await houseRes.json();
        houseData = data as HouseClient;
      }

      if (!roomsRes.ok) {
        throw new Error("Não foi possível carregar os cômodos.");
      }
      const roomsData: unknown = await roomsRes.json();

      if (!expensesRes.ok) {
        throw new Error("Não foi possível carregar as despesas.");
      }
      const expensesData: unknown = await expensesRes.json();

      setHouse(houseData);

      if (Array.isArray(roomsData)) {
        const filteredRooms = (roomsData as RoomClient[]).filter(
          (r): boolean => r.houseId === FALLBACK_HOUSE_ID,
        );
        setRooms(filteredRooms);
      } else {
        throw new Error("Dados de cômodos inválidos.");
      }

      if (Array.isArray(expensesData)) {
        setExpenses(expensesData as ExpenseClient[]);
      } else {
        throw new Error("Dados de despesas inválidos.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback((): void => {
      fetchDashboardData();
    }, [fetchDashboardData]),
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (val: number): string => {
    return `R$ ${val
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  const totalOutflow = expenses.reduce((sum, exp): number => {
    return sum + Number(exp.totalAmount);
  }, 0);

  const highPriorityCount = expenses.filter((e): boolean => e.priority === "HIGH").length;

  const displayArea =
    house?.totalArea && Number(house.totalArea) > 0
      ? `${Number(house.totalArea).toLocaleString("pt-BR")} m²`
      : "Área não informada";

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gestão Casa</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Carregando painel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !house) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Gestão Casa</Text>
        </View>
        <View style={styles.centerContainer}>
          <Lucide name="alert-triangle" size={48} color="#ea580c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
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
        <View style={styles.headerTitleRow}>
          <Lucide name="home" size={24} color="#059669" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Gestão Casa</Text>
        </View>
        <Text style={styles.headerSubtitle}>Seu painel residencial</Text>
      </View>

      {/* User Switcher */}
      <View style={styles.userSwitcherRow}>
        <Text style={styles.userSwitcherLabel}>Usuário:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userSwitcherScroll}>
          {PRESET_USERS.map((u) => {
            const isSelected = u.id === userId;
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.userPill, isSelected && styles.userPillSelected]}
                onPress={(): Promise<void> => changeUser(u.id)}
              >
                <Text style={[styles.userPillText, isSelected && styles.userPillTextSelected]}>
                  {u.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{role}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#059669"]} />
        }
      >
        {/* Property Info Card */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Lucide name="home" size={24} color="#059669" />
            <View style={styles.propertyNameContainer}>
              <Text style={styles.propertyName} numberOfLines={1}>
                {house?.name || "Minha Casa"}
              </Text>
              <Text style={styles.propertyTag}>Imóvel Registrado</Text>
            </View>
          </View>

          <View style={styles.propertyDivider} />

          <View style={styles.propertyDetailsRow}>
            <View style={styles.propertyDetailItem}>
              <View style={styles.detailIconRow}>
                <Lucide name="map-pin" size={14} color="#8fa3a3" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Localização</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>
                {house?.location || "Não informada"}
              </Text>
            </View>

            <View style={styles.propertyDetailItem}>
              <View style={styles.detailIconRow}>
                <Lucide name="layout" size={14} color="#8fa3a3" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>Área Total</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>
                {displayArea}
              </Text>
            </View>
          </View>
        </View>

        {/* Operational Statistics */}
        <Text style={styles.sectionTitle}>Estatísticas Operacionais</Text>

        <View style={styles.totalOutflowCard}>
          <View style={styles.outflowHeader}>
            <Text style={styles.outflowLabel}>Saída Total (Geral)</Text>
            <Lucide name="trending-down" size={20} color="#e11d48" />
          </View>
          <Text style={styles.outflowValue}>{formatCurrency(totalOutflow)}</Text>
          <Text style={styles.outflowSubtext}>Soma de todas as despesas e orçamentos</Text>
        </View>

        <View style={styles.statsGridRow}>
          <View style={styles.statMiniCard}>
            <View style={styles.statMiniHeader}>
              <Text style={styles.statMiniLabel}>Cômodos</Text>
              <Lucide name="layout" size={18} color="#059669" />
            </View>
            <Text style={styles.statMiniValue}>{rooms.length}</Text>
            <Text style={styles.statMiniSubtext}>Espaços cadastrados</Text>
          </View>

          <View style={styles.statMiniCard}>
            <View style={styles.statMiniHeader}>
              <Text style={styles.statMiniLabel}>Críticos</Text>
              <Lucide name="alert-triangle" size={18} color="#ea580c" />
            </View>
            <Text style={[styles.statMiniValue, { color: "#ea580c" }]}>{highPriorityCount}</Text>
            <Text style={styles.statMiniSubtext}>Prioridade alta</Text>
          </View>
        </View>

        {/* Quick Actions Shortcuts */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>

        <View style={styles.shortcutsGrid}>
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutCard}
              activeOpacity={0.7}
              onPress={(): void => router.push("/rooms/index")}
            >
              <View style={styles.shortcutIconBg}>
                <Lucide name="eye" size={22} color="#059669" />
              </View>
              <Text style={styles.shortcutTitle}>Ver Cômodos</Text>
              <Text style={styles.shortcutDesc}>Listar espaços cadastrados</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutCard, role === "VIEWER" && styles.shortcutCardDisabled]}
              activeOpacity={role === "VIEWER" ? 1 : 0.7}
              onPress={(): void => {
                if (role !== "VIEWER") {
                  router.push("/rooms/new");
                }
              }}
            >
              <View style={[styles.shortcutIconBg, role === "VIEWER" && styles.shortcutIconBgDisabled]}>
                <Lucide name="plus" size={22} color={role === "VIEWER" ? "#8fa3a3" : "#059669"} />
              </View>
              <Text style={[styles.shortcutTitle, role === "VIEWER" && styles.shortcutTextDisabled]}>Adicionar Cômodo</Text>
              <Text style={styles.shortcutDesc}>{role === "VIEWER" ? "Acesso restrito" : "Criar novo cômodo"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutCard}
              activeOpacity={0.7}
              onPress={(): void => router.push("/expenses")}
            >
              <View style={styles.shortcutIconBg}>
                <Lucide name="receipt" size={22} color="#059669" />
              </View>
              <Text style={styles.shortcutTitle}>Lista de Despesas</Text>
              <Text style={styles.shortcutDesc}>Ver todos os gastos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shortcutCard, role === "VIEWER" && styles.shortcutCardDisabled]}
              activeOpacity={role === "VIEWER" ? 1 : 0.7}
              onPress={(): void => {
                if (role !== "VIEWER") {
                  router.push("/expenses/new");
                }
              }}
            >
              <View style={[styles.shortcutIconBg, role === "VIEWER" && styles.shortcutIconBgDisabled]}>
                <Lucide name="plus-circle" size={22} color={role === "VIEWER" ? "#8fa3a3" : "#059669"} />
              </View>
              <Text style={[styles.shortcutTitle, role === "VIEWER" && styles.shortcutTextDisabled]}>Nova Despesa</Text>
              <Text style={styles.shortcutDesc}>{role === "VIEWER" ? "Acesso restrito" : "Registrar novo gasto"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f4",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(143, 163, 163, 0.3)",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0e1717",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#8fa3a3",
    marginTop: 2,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
  propertyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.3)",
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  propertyNameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0e1717",
  },
  propertyTag: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 1,
  },
  propertyDivider: {
    height: 1,
    backgroundColor: "rgba(143, 163, 163, 0.15)",
    marginVertical: 12,
  },
  propertyDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  propertyDetailItem: {
    flex: 1,
  },
  detailIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#8fa3a3",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0e1717",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0e1717",
    marginBottom: 12,
  },
  totalOutflowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.3)",
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  outflowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  outflowLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8fa3a3",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outflowValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0e1717",
    fontFamily: "System",
  },
  outflowSubtext: {
    fontSize: 11,
    color: "#8fa3a3",
    marginTop: 6,
  },
  statsGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statMiniCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.3)",
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statMiniHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statMiniLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8fa3a3",
  },
  statMiniValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0e1717",
  },
  statMiniSubtext: {
    fontSize: 10,
    color: "#8fa3a3",
    marginTop: 4,
  },
  shortcutsGrid: {
    marginBottom: 12,
  },
  shortcutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shortcutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.3)",
    shadowColor: "#0e1717",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  shortcutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0e1717",
    marginBottom: 4,
  },
  shortcutDesc: {
    fontSize: 11,
    color: "#8fa3a3",
    lineHeight: 14,
  },
  userSwitcherRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(143, 163, 163, 0.15)",
  },
  userSwitcherLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8fa3a3",
    marginRight: 8,
  },
  userSwitcherScroll: {
    alignItems: "center",
    gap: 6,
  },
  userPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.2)",
    backgroundColor: "#f5f7f7",
  },
  userPillSelected: {
    borderColor: "#059669",
    backgroundColor: "rgba(5, 150, 105, 0.08)",
  },
  userPillText: {
    fontSize: 11,
    color: "#8fa3a3",
    fontWeight: "600",
  },
  userPillTextSelected: {
    color: "#059669",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(143, 163, 163, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(143, 163, 163, 0.2)",
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#8fa3a3",
  },
  shortcutCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#f5f7f7",
  },
  shortcutIconBgDisabled: {
    backgroundColor: "rgba(143, 163, 163, 0.1)",
  },
  shortcutTextDisabled: {
    color: "#8fa3a3",
  },
});
