import { apiClient } from "@gestao-casa/shared-logic/api-client/index";
import { useFocusEffect, useRouter } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

export default function RoomsIndexScreen(): React.JSX.Element {
  const router = useRouter();
  const { role } = useMobileUser();
  const [rooms, setRooms] = useState<RoomClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHouseId, setActiveHouseId] = useState<string>(FALLBACK_HOUSE_ID);

  const fetchRooms = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const data = await apiClient.get("/api/rooms");
      if (Array.isArray(data)) {
        setRooms(data as RoomClient[]);
        if (data.length > 0 && data[0].houseId) {
          setActiveHouseId(data[0].houseId);
        }
      } else {
        throw new Error("Dados de resposta inválidos.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback((): void => {
      fetchRooms();
    }, [fetchRooms]),
  );

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const handleNavigateToNewRoom = (): void => {
    router.push({
      pathname: "/rooms/new",
      params: { houseId: activeHouseId },
    });
  };

  const keyExtractor = (item: RoomClient): string => item.id;

  const renderRoomItem = ({ item }: { item: RoomClient }): React.JSX.Element => {
    const displayArea = item.area
      ? `${Number(item.area).toLocaleString("pt-BR")} m²`
      : "Área não informada";
    const dotColor = item.colorCode || "#86868B";

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={(): void => router.push(`/rooms/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeftContent}>
          <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
          <View style={styles.roomInfo}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.roomArea}>{displayArea}</Text>
          </View>
        </View>
        <View style={[styles.arrowContainer, { borderColor: dotColor }]}>
          <Lucide name="chevron-right" size={20} color="#86868B" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cômodos</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando cômodos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cômodos</Text>
        </View>
        <View style={styles.centerContainer}>
          <Lucide name="alert-triangle" size={48} color="#ea580c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRooms}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cômodos</Text>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={keyExtractor}
        renderItem={renderRoomItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#10B981"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Lucide name="home" size={64} color="#86868B" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Nenhum cômodo ainda</Text>
            <Text style={styles.emptySubtitle}>
              Toque no botão abaixo para registrar o primeiro cômodo da sua casa.
            </Text>
          </View>
        }
      />

      {role !== "VIEWER" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNavigateToNewRoom}
          activeOpacity={0.8}
          accessibilityLabel="Adicionar novo cômodo"
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1D1D1F",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Safe space for FAB
    flexGrow: 1,
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
  roomCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
  cardLeftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  roomArea: {
    fontSize: 13,
    color: "#86868B",
    fontVariant: ["tabular-nums"],
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(134, 134, 139, 0.1)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 64,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#86868B",
    textAlign: "center",
    lineHeight: 20,
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
