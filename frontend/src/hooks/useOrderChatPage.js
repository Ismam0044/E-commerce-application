import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { StreamChat } from "stream-chat";

export function useOrderChatPage() {
  const { id } = useParams();
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);

  const { data: orderData } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch(`/api/orders/${id}`, { getToken }),
    enabled: Boolean(id) && isSignedIn,
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me", { getToken }),
    enabled: isSignedIn,
  });

  const order = orderData?.order;
  const paid = order?.status === "paid";
  const canInvite = meData?.user?.role === "support" || meData?.user?.role === "admin";

  useEffect(() => {
    if (!paid || !id || !isSignedIn) return undefined;

    let chatClient;
    let cancelled = false;

    async function connectOrderChat() {
      const token = await apiFetch("/api/stream/token", { getToken, method: "POST" });
      const { channelId } = await apiFetch(`/api/orders/${id}/stream-channel`, {
        getToken,
        method: "POST",
      });

      chatClient = new StreamChat(token.apiKey);
      await chatClient.connectUser({ id: token.userId, name: token.name }, token.token);

      const activeChannel = chatClient.channel("messaging", channelId);
      await activeChannel.watch();

      if (cancelled) {
        await chatClient.disconnectUser().catch(() => {});
        return;
      }

      setClient(chatClient);
      setChannel(activeChannel);
    }

    connectOrderChat().catch((e) => {
      setError(e instanceof Error ? e.message : "Chat failed to load");
    });

    return () => {
      cancelled = true;
      chatClient?.disconnectUser().catch(() => {});
    };
  }, [paid, id, getToken, isSignedIn]);

  const inviteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/orders/${id}/video-invite`, { getToken, method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
  });

  return {
    paid,
    client,
    error,
    channel,
    canInvite,
    inviteMutation,
  };
}
