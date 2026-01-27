import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Package, Truck, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"purchases" | "sales">("purchases");
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const { data: purchases, isLoading: purchasesLoading } = useQuery<any[]>({
    queryKey: ["/api/orders/purchases"],
    enabled: !!user && activeTab === "purchases",
  });

  const { data: sales, isLoading: salesLoading } = useQuery<any[]>({
    queryKey: ["/api/orders/sales"],
    enabled: !!user && activeTab === "sales",
  });

  const shipMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }: { orderId: number; trackingNumber: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/ship`, { trackingNumber });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/sales"] });
      toast({ title: "Order marked as shipped!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to mark as shipped", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading) return null;

  if (!user) {
    setLocation("/");
    return null;
  }

  const isLoading = activeTab === "purchases" ? purchasesLoading : salesLoading;
  const orders = activeTab === "purchases" ? purchases : sales;

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold uppercase tracking-wider mb-8">Orders</h1>

        <div className="flex gap-4 mb-8 border-b">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("purchases")}
            className={`pb-4 px-2 text-sm font-medium uppercase tracking-widest transition-colors ${
              activeTab === "purchases"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="button-tab-purchases"
          >
            My Purchases
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("sales")}
            className={`pb-4 px-2 text-sm font-medium uppercase tracking-widest transition-colors ${
              activeTab === "sales"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="button-tab-sales"
          >
            My Sales
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Card key={order.id} className="p-4">
                <div className="flex gap-4">
                  {order.product?.imageUrl && (
                    <Link href={`/products/${order.product.id}`}>
                      <img
                        src={order.product.imageUrl}
                        alt={order.product.title}
                        className="w-20 h-24 object-cover"
                      />
                    </Link>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/products/${order.product?.id}`}>
                          <h3 className="font-semibold uppercase hover:underline">
                            {order.product?.title || "Product"}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">{formatPrice(order.amount)}</p>
                        {order.shippingCost > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {formatPrice(order.shippingCost)} shipping
                          </p>
                        )}
                      </div>
                    </div>

                    {activeTab === "purchases" && (
                      <div className="pt-2 border-t">
                        {order.shipped ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Shipped</span>
                            {order.trackingNumber && (
                              <span className="text-sm ml-2">
                                Tracking: <span className="font-mono">{order.trackingNumber}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="w-4 h-4" />
                            <span className="text-sm">Awaiting shipment</span>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "sales" && (
                      <div className="pt-2 border-t">
                        {order.shipped ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Shipped</span>
                            <span className="text-sm font-mono ml-2">{order.trackingNumber}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Enter tracking number"
                              value={trackingInputs[order.id] || ""}
                              onChange={(e) =>
                                setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })
                              }
                              className="flex-1 h-9"
                              data-testid={`input-tracking-${order.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() =>
                                shipMutation.mutate({
                                  orderId: order.id,
                                  trackingNumber: trackingInputs[order.id],
                                })
                              }
                              disabled={!trackingInputs[order.id] || shipMutation.isPending}
                              data-testid={`button-ship-${order.id}`}
                            >
                              <Truck className="w-4 h-4 mr-1" />
                              Ship
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Earnings after fees: {formatPrice(order.amount - order.fee)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground">
              {activeTab === "purchases" ? "No purchases yet" : "No sales yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === "purchases"
                ? "Items you buy will appear here"
                : "When you sell something, it will appear here"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
