import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function useFavorites(enabled: boolean = true) {
  return useQuery({
    queryKey: ["/api/favorites"],
    enabled,
  });
}

export function useIsFavorited(productId: number) {
  return useQuery({
    queryKey: ["/api/favorites", productId],
    enabled: false, // Only fetch when user is logged in
  });
}

export function useAddFavorite() {
  return useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("POST", `/api/favorites/${productId}`);
      return { ...(await res.json()), productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", data.productId, "likes"] });
    },
  });
}

export function useRemoveFavorite() {
  return useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("DELETE", `/api/favorites/${productId}`);
      return { ...(await res.json()), productId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", data.productId, "likes"] });
    },
  });
}

export function useToggleFavorite() {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  return {
    toggle: async (productId: number, isFavorited: boolean) => {
      if (isFavorited) {
        await removeFavorite.mutateAsync(productId);
      } else {
        await addFavorite.mutateAsync(productId);
      }
    },
    isPending: addFavorite.isPending || removeFavorite.isPending,
  };
}

export function useProductsWithLikes() {
  return useQuery({
    queryKey: ["/api/products/with-likes"],
  });
}
