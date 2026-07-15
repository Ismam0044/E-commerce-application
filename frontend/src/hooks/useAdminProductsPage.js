import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../lib/api.js";

export function useAdminProductsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me", { getToken }),
  });

  const isAdmin = meData?.user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch("/api/admin/products", { getToken }),
    enabled: isAdmin,
  });

  const products = data?.products ?? [];

  const saveMutation = useMutation({
    mutationFn: ({ body, id }) =>
      apiFetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
        getToken,
        method: id ? "PATCH" : "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/admin/products/${id}`, { getToken, method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  return {
    getToken,
    meData,
    modalOpen,
    setModalOpen,
    editing,
    setEditing,
    products,
    isLoading,
    saveMutation,
    deleteMutation,
  };
}
