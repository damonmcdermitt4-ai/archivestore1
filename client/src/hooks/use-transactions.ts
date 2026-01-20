import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to purchase items");
        const error = await res.json();
        throw new Error(error.message || "Failed to process transaction");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      // Also invalidate specific product to update "sold" status
      queryClient.invalidateQueries({ queryKey: [api.products.get.path] });
      
      toast({
        title: "Purchase Successful! 🎉",
        description: "You've bought this item. The seller has been notified.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
