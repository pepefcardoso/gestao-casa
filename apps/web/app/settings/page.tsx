"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Edit2,
  Home,
  MapPin,
  Maximize2,
  Palette,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "../components/UserContext";

interface Member {
  id: string;
  role: "OWNER" | "COLLABORATOR" | "VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface House {
  id: string;
  name: string;
  location: string | null;
  totalArea: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
}

interface Room {
  id: string;
  houseId: string;
  name: string;
  area: string | null;
  colorCode: string | null;
  createdAt: string;
}

interface ValidationErrors {
  houseName?: string;
  houseArea?: string;
  houseLatitude?: string;
  houseLongitude?: string;
  roomName?: string;
  roomArea?: string;
}

const HouseMap = dynamic(() => import("../components/HouseMap"), {
  ssr: false,
  loading: (): React.JSX.Element => (
    <div className="h-[250px] w-full bg-slate-100 rounded-lg flex items-center justify-center animate-pulse">
      <span className="text-xs text-mint-slate-400">Carregando mapa...</span>
    </div>
  ),
});

const PRESET_COLORS: string[] = [
  "#059669", // Emerald
  "#dc2626", // Red
  "#2563eb", // Blue
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#4b5563", // Gray
  "#06b6d4", // Cyan
];

export default function SettingsPage(): React.JSX.Element {
  const { activeUserId, activeHouseId, role } = useUser();

  // House State
  const [_house, setHouse] = useState<House | null>(null);
  const [houseName, setHouseName] = useState<string>("");
  const [houseLocation, setHouseLocation] = useState<string>("");
  const [houseArea, setHouseArea] = useState<string>("");
  const [houseLatitude, setHouseLatitude] = useState<string>("");
  const [houseLongitude, setHouseLongitude] = useState<string>("");
  const [isSavingHouse, setIsSavingHouse] = useState<boolean>(false);
  const [houseSuccessMsg, setHouseSuccessMsg] = useState<string | null>(null);
  const [houseErrorMsg, setHouseErrorMsg] = useState<string | null>(null);

  // Rooms State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [roomsErrorMsg, setRoomsErrorMsg] = useState<string | null>(null);

  // Members / Collaborators State
  const [members, setMembers] = useState<Member[]>([]);
  const [shareEmail, setShareEmail] = useState<string>("");
  const [shareRole, setShareRole] = useState<"COLLABORATOR" | "VIEWER">("COLLABORATOR");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Modals & Actions
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteTargetRoom, setDeleteTargetRoom] = useState<Room | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState<boolean>(false);

  // Room Form State
  const [roomName, setRoomName] = useState<string>("");
  const [roomArea, setRoomArea] = useState<string>("");
  const [roomColor, setRoomColor] = useState<string>(PRESET_COLORS[0]);
  const [isSavingRoom, setIsSavingRoom] = useState<boolean>(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Global Loading/Errors
  const [isLoadingHouse, setIsLoadingHouse] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Fetch house details
  const fetchHouse = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoadingHouse(true);
    setHouseErrorMsg(null);
    try {
      const res = await fetch(`/api/houses/${activeHouseId}`);
      if (res.ok) {
        const data: unknown = await res.json();
        const h = data as House;
        setHouse(h);
        setHouseName(h.name);
        setHouseLocation(h.location || "");
        setHouseArea(h.totalArea || "");
        setHouseLatitude(h.latitude || "");
        setHouseLongitude(h.longitude || "");
      } else if (res.status === 404) {
        setHouseErrorMsg("Casa não encontrada.");
      } else {
        setHouseErrorMsg("Erro ao carregar dados da casa.");
      }
    } catch (err) {
      setHouseErrorMsg("Erro de conexão ao carregar dados da casa.");
      console.error(err);
    } finally {
      setIsLoadingHouse(false);
    }
  }, [activeHouseId]);

  // Fetch rooms list
  const fetchRooms = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoadingRooms(true);
    setRoomsErrorMsg(null);
    try {
      const res = await fetch(`/api/rooms?house_id=${activeHouseId}`);
      if (res.ok) {
        const data: unknown = await res.json();
        setRooms(data as Room[]);
      } else {
        setRoomsErrorMsg("Erro ao carregar cômodos.");
      }
    } catch (err) {
      setRoomsErrorMsg("Erro de conexão ao carregar cômodos.");
      console.error(err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [activeHouseId]);

  // Fetch members list
  const fetchMembers = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    try {
      const res = await fetch(`/api/houses/${activeHouseId}/members`);
      if (res.ok) {
        const data: unknown = await res.json();
        setMembers(data as Member[]);
      }
    } catch (err) {
      console.error("Erro ao buscar membros:", err);
    }
  }, [activeHouseId]);

  useEffect((): void => {
    if (activeHouseId) {
      fetchHouse();
      fetchRooms();
      fetchMembers();
    }
  }, [activeHouseId, fetchHouse, fetchRooms, fetchMembers]);

  // House Form Validation
  const validateHouseForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!houseName.trim()) {
      errors.houseName = "O nome da casa é obrigatório.";
    }
    if (houseArea !== "") {
      const areaNum = Number(houseArea);
      if (Number.isNaN(areaNum) || areaNum <= 0) {
        errors.houseArea = "A área total deve ser maior que zero.";
      }
    }
    if (houseLatitude !== "") {
      const latNum = Number(houseLatitude);
      if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.houseLatitude = "A latitude deve estar entre -90 e 90.";
      }
    }
    if (houseLongitude !== "") {
      const lngNum = Number(houseLongitude);
      if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.houseLongitude = "A longitude deve estar entre -180 e 180.";
      }
    }
    setValidationErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  // Submit House Changes
  const handleHouseSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setHouseSuccessMsg(null);
    setHouseErrorMsg(null);

    // Clear previous house errors
    setValidationErrors((prev) => ({
      ...prev,
      houseName: undefined,
      houseArea: undefined,
      houseLatitude: undefined,
      houseLongitude: undefined,
    }));

    if (!validateHouseForm()) return;

    setIsSavingHouse(true);
    try {
      const payload = {
        name: houseName.trim(),
        location: houseLocation.trim() || null,
        totalArea: houseArea === "" ? null : Number(houseArea),
        latitude: houseLatitude === "" ? null : Number(houseLatitude),
        longitude: houseLongitude === "" ? null : Number(houseLongitude),
      };

      const res = await fetch(`/api/houses/${activeHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: unknown = await res.json();
        const updated = data as House;
        setHouse(updated);
        setHouseName(updated.name);
        setHouseLocation(updated.location || "");
        setHouseArea(updated.totalArea || "");
        setHouseLatitude(updated.latitude || "");
        setHouseLongitude(updated.longitude || "");
        setHouseSuccessMsg("Configurações da casa atualizadas com sucesso!");
      } else {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Erro ao salvar alterações da casa.";
        setHouseErrorMsg(msg);
      }
    } catch (err) {
      setHouseErrorMsg("Erro de conexão ao salvar alterações da casa.");
      console.error(err);
    } finally {
      setIsSavingHouse(false);
    }
  };

  // Open Room Modal (Create)
  const handleNewRoomClick = (): void => {
    setEditingRoom(null);
    setRoomName("");
    setRoomArea("");
    setRoomColor(PRESET_COLORS[0]);
    setRoomFormError(null);
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));
    setIsRoomModalOpen(true);
  };

  // Open Room Modal (Edit)
  const handleEditRoomClick = (room: Room): void => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomArea(room.area || "");
    setRoomColor(room.colorCode || PRESET_COLORS[0]);
    setRoomFormError(null);
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));
    setIsRoomModalOpen(true);
  };

  // Room Form Validation
  const validateRoomForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!roomName.trim()) {
      errors.roomName = "O nome do cômodo é obrigatório.";
    }
    if (roomArea !== "") {
      const areaNum = Number(roomArea);
      if (Number.isNaN(areaNum) || areaNum <= 0) {
        errors.roomArea = "A área deve ser maior que zero.";
      }
    }
    setValidationErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  // Save Room (Create / Edit)
  const handleSaveRoom = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setRoomFormError(null);

    // Clear previous room errors
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));

    if (!validateRoomForm()) return;

    setIsSavingRoom(true);
    try {
      if (editingRoom) {
        // Edit Room (PUT)
        const payload = {
          name: roomName.trim(),
          area: roomArea === "" ? null : Number(roomArea),
          colorCode: roomColor,
        };

        const res = await fetch(`/api/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: unknown = await res.json();
          const updated = data as Room;
          setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setIsRoomModalOpen(false);
        } else {
          const data: unknown = await res.json();
          const msg =
            data && typeof data === "object" && "error" in data
              ? String((data as { error: unknown }).error)
              : "Erro ao atualizar cômodo.";
          setRoomFormError(msg);
        }
      } else {
        // Create Room (POST)
        const payload = {
          houseId: activeHouseId,
          name: roomName.trim(),
          area: roomArea === "" ? null : Number(roomArea),
          colorCode: roomColor,
        };

        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: unknown = await res.json();
          const created = data as Room;
          setRooms((prev) => [...prev, created]);
          setIsRoomModalOpen(false);
        } else {
          const data: unknown = await res.json();
          const msg =
            data && typeof data === "object" && "error" in data
              ? String((data as { error: unknown }).error)
              : "Erro ao criar cômodo.";
          setRoomFormError(msg);
        }
      }
    } catch (err) {
      setRoomFormError("Erro de conexão ao salvar cômodo.");
      console.error(err);
    } finally {
      setIsSavingRoom(false);
    }
  };

  // Delete Room Confirmation
  const handleDeleteRoomConfirm = async (): Promise<void> => {
    if (!deleteTargetRoom) return;

    setIsDeletingRoom(true);
    try {
      const res = await fetch(`/api/rooms/${deleteTargetRoom.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== deleteTargetRoom.id));
        setDeleteTargetRoom(null);
      } else {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Erro ao excluir cômodo.";
        alert(msg);
      }
    } catch (err) {
      alert("Erro de conexão ao excluir cômodo.");
      console.error(err);
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setShareError(null);
    if (!shareEmail.trim()) return;

    setIsSharing(true);
    try {
      const res = await fetch(`/api/houses/${activeHouseId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: shareEmail.trim(),
          role: shareRole,
        }),
      });

      if (res.ok) {
        setShareEmail("");
        fetchMembers();
      } else {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Erro ao compartilhar.";
        setShareError(msg);
      }
    } catch (err) {
      console.error(err);
      setShareError("Erro de rede ao compartilhar.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveMember = async (membershipId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/houses/${activeHouseId}/members/${membershipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchMembers();
      } else {
        const data: unknown = await res.json();
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Erro ao remover membro.";
        alert(msg);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Painel
        </Link>

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-mint-slate-400/30 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0e1717] flex items-center gap-2">
              <Settings className="w-8 h-8 text-emerald-600" />
              Configurações
            </h1>
            <p className="text-sm text-mint-slate-400 mt-1">
              Gerencie as informações da sua residência e a organização de seus cômodos.
            </p>
          </div>

          <nav className="flex space-x-1.5 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/80 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
            >
              Fluxo de Caixa
            </Link>
            <Link
              href="/financing"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
            >
              Simulador
            </Link>
            <Link
              href="/expenses"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
            >
              Despesas
            </Link>
            <Link
              href="/incomes"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
            >
              Receitas
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white shadow-sm text-emerald-700 transition-all"
            >
              Configurações
            </Link>
          </nav>
        </header>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-8">
          {/* House Settings Panel */}
          <section className="bg-white border border-mint-slate-400/20 rounded-xl shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-[#0e1717]">Dados da Casa</h2>
            </div>

            {houseErrorMsg && (
              <div className="p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{houseErrorMsg}</span>
              </div>
            )}

            {houseSuccessMsg && (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{houseSuccessMsg}</span>
              </div>
            )}

            {isLoadingHouse ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-mint-slate-400">Carregando casa...</span>
              </div>
            ) : (
              <form onSubmit={(e): Promise<void> => handleHouseSubmit(e)} className="space-y-4">
                {/* House Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseName"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Nome da Residência *
                  </label>
                  <input
                    id="houseName"
                    type="text"
                    placeholder="Ex: Minha Casa, Apartamento 102"
                    value={houseName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      setHouseName(e.target.value);
                      setHouseSuccessMsg(null);
                    }}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                      validationErrors.houseName ? "border-orange-500" : "border-mint-slate-400/40"
                    }`}
                    disabled={role === "VIEWER"}
                    required
                  />
                  {validationErrors.houseName && (
                    <p className="text-xs text-orange-600 mt-1">{validationErrors.houseName}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseLocation"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Localização / Endereço
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      id="houseLocation"
                      type="text"
                      placeholder="Ex: Jardim Paulista, São Paulo - SP"
                      value={houseLocation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLocation(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-mint-slate-400/40 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all"
                      disabled={role === "VIEWER"}
                    />
                  </div>
                </div>

                {/* Area */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseArea"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Área Total (m²)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                    <input
                      id="houseArea"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 120.50"
                      value={houseArea}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseArea(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full pl-9 pr-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                        validationErrors.houseArea
                          ? "border-orange-500"
                          : "border-mint-slate-400/40"
                      }`}
                      disabled={role === "VIEWER"}
                    />
                  </div>
                  {validationErrors.houseArea && (
                    <p className="text-xs text-orange-600 mt-1">{validationErrors.houseArea}</p>
                  )}
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="houseLatitude"
                      className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Latitude
                    </label>
                    <input
                      id="houseLatitude"
                      type="number"
                      step="any"
                      placeholder="Ex: -23.5505"
                      value={houseLatitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLatitude(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                        validationErrors.houseLatitude
                          ? "border-orange-500"
                          : "border-mint-slate-400/40"
                      }`}
                      disabled={role === "VIEWER"}
                    />
                    {validationErrors.houseLatitude && (
                      <p className="text-xs text-orange-600 mt-1">
                        {validationErrors.houseLatitude}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="houseLongitude"
                      className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Longitude
                    </label>
                    <input
                      id="houseLongitude"
                      type="number"
                      step="any"
                      placeholder="Ex: -46.6333"
                      value={houseLongitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLongitude(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                        validationErrors.houseLongitude
                          ? "border-orange-500"
                          : "border-mint-slate-400/40"
                      }`}
                      disabled={role === "VIEWER"}
                    />
                    {validationErrors.houseLongitude && (
                      <p className="text-xs text-orange-600 mt-1">
                        {validationErrors.houseLongitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Selecionar no Mapa
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clique no mapa para marcar a localização exata ou digite as coordenadas acima.
                  </p>
                  <div className="h-[250px] w-full rounded-lg overflow-hidden border border-mint-slate-400/20 relative">
                    <HouseMap
                      latitude={houseLatitude === "" ? null : Number(houseLatitude)}
                      longitude={houseLongitude === "" ? null : Number(houseLongitude)}
                      onChange={(lat: number, lng: number): void => {
                        setHouseLatitude(String(lat));
                        setHouseLongitude(String(lng));
                        setHouseSuccessMsg(null);
                      }}
                      interactive={role !== "VIEWER"}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingHouse || role === "VIEWER"}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-mint-slate-400/40 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSavingHouse ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </form>
            )}
          </section>

          {/* Collaborators & Sharing Panel */}
          <section className="bg-white border border-mint-slate-400/20 rounded-xl shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-[#0e1717]">Membros e Compartilhamento</h2>
            </div>

            {shareError && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            {/* Invite Form (Only for OWNER) */}
            {role === "OWNER" && (
              <form
                onSubmit={handleShareSubmit}
                className="space-y-3 p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl"
              >
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Convidar Novo Membro
                </span>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email do convidado"
                    value={shareEmail}
                    onChange={(e): void => setShareEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all"
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={shareRole}
                      onChange={(e): void =>
                        setShareRole(e.target.value as "COLLABORATOR" | "VIEWER")
                      }
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-3xs w-full"
                    >
                      <option value="COLLABORATOR">Colaborador (Editar)</option>
                      <option value="VIEWER">Visualizador (Apenas Ver)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSharing}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
                    >
                      {isSharing ? "Convidando..." : "Convidar"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Membros Ativos ({members.length})
              </span>
              <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto pr-1">
                {members.map((member) => {
                  const isOwner = member.role === "OWNER";
                  const isCollaborator = member.role === "COLLABORATOR";

                  return (
                    <div key={member.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 block truncate">
                          {member.user.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {member.user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border tracking-wider ${
                            isOwner
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : isCollaborator
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          {isOwner ? "Dono" : isCollaborator ? "Editar" : "Ver"}
                        </span>
                        {role === "OWNER" && member.user.id !== activeUserId && (
                          <button
                            type="button"
                            onClick={(): void => {
                              handleRemoveMember(member.id);
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                            title="Remover Membro"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Room Management Panel */}
        <section className="lg:col-span-7 bg-white border border-mint-slate-400/20 rounded-xl shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-[#0e1717]">Cômodos Cadastrados</h2>
            </div>
            {role !== "VIEWER" && (
              <button
                onClick={handleNewRoomClick}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Cômodo
              </button>
            )}
          </div>

          {roomsErrorMsg && (
            <div className="p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm">
              {roomsErrorMsg}
            </div>
          )}

          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-mint-slate-400">Carregando cômodos...</span>
            </div>
          ) : rooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(
                (room): React.JSX.Element => (
                  <div
                    key={room.id}
                    className="border border-mint-slate-400/10 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all flex justify-between items-center group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-200/50 shrink-0 shadow-2xs"
                        style={{ backgroundColor: room.colorCode || "#cbd5e1" }}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-[#0e1717] leading-snug">
                          {room.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {room.area ? `${room.area} m²` : "Área não definida"}
                        </p>
                      </div>
                    </div>

                    {role !== "VIEWER" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(): void => handleEditRoomClick(room)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200/50 transition-all cursor-pointer"
                          title="Editar"
                          type="button"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(): void => setDeleteTargetRoom(room)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200/50 transition-all cursor-pointer"
                          title="Excluir"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-mint-slate-400 text-sm flex flex-col items-center gap-2">
              <Palette className="w-8 h-8 opacity-45" />
              <span>Nenhum cômodo cadastrado nesta residência.</span>
            </div>
          )}
        </section>
      </div>

      {/* Room Modal (Create / Edit) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#0e1717]">
                {editingRoom ? "Editar Cômodo" : "Novo Cômodo"}
              </h3>
              <button
                type="button"
                onClick={(): void => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e): Promise<void> => handleSaveRoom(e)} className="p-6 space-y-4">
              {roomFormError && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{roomFormError}</span>
                </div>
              )}

              {/* Room Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="roomName"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Nome do Cômodo *
                </label>
                <input
                  id="roomName"
                  type="text"
                  placeholder="Ex: Quarto Principal, Banheiro Social..."
                  value={roomName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setRoomName(e.target.value)
                  }
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                    validationErrors.roomName ? "border-orange-500" : "border-mint-slate-400/40"
                  }`}
                  required
                />
                {validationErrors.roomName && (
                  <p className="text-xs text-orange-600 mt-1">{validationErrors.roomName}</p>
                )}
              </div>

              {/* Room Area */}
              <div className="space-y-1.5">
                <label
                  htmlFor="roomArea"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Área (m²)
                </label>
                <input
                  id="roomArea"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 12.80"
                  value={roomArea}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setRoomArea(e.target.value)
                  }
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-hidden transition-all ${
                    validationErrors.roomArea ? "border-orange-500" : "border-mint-slate-400/40"
                  }`}
                />
                {validationErrors.roomArea && (
                  <p className="text-xs text-orange-600 mt-1">{validationErrors.roomArea}</p>
                )}
              </div>

              {/* Color Code Selector */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cor de Identificação
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map(
                    (color): React.JSX.Element => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => setRoomColor(color)}
                        className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                          roomColor === color
                            ? "ring-2 ring-offset-2 ring-emerald-600 scale-110 border-transparent shadow-xs"
                            : "border-slate-200 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ),
                  )}
                  {/* Custom color input */}
                  <div className="relative w-7 h-7 rounded-full border border-slate-200 overflow-hidden hover:scale-105 transition-transform flex items-center justify-center bg-slate-50">
                    <input
                      type="color"
                      value={roomColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        setRoomColor(e.target.value)
                      }
                      className="absolute inset-0 w-full h-full p-0 border-0 outline-hidden cursor-pointer opacity-100 scale-150"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(): void => setIsRoomModalOpen(false)}
                  disabled={isSavingRoom}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingRoom}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingRoom ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Delete Confirmation Modal */}
      {deleteTargetRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#0e1717]">Excluir Cômodo?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tem certeza de que deseja excluir o cômodo{" "}
                  <strong className="text-slate-800">"{deleteTargetRoom.name}"</strong>?
                </p>
                <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-800 leading-relaxed font-medium">
                  <strong>Aviso:</strong> Todas as despesas atualmente vinculadas a este cômodo
                  serão desvinculadas (o campo do cômodo será limpo nelas). As despesas em si não
                  serão deletadas.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={(): void => setDeleteTargetRoom(null)}
                disabled={isDeletingRoom}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRoomConfirm}
                disabled={isDeletingRoom}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingRoom ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
