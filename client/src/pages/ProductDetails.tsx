import { useRoute } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ShieldCheck, Truck, RefreshCw, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { PACKAGE_SIZES, type PackageSize } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function ProductDetails() {
  const [, params] = useRoute("/products/:id");
  const id = parseInt(params?.id || "0");
  const { data: product, isLoading } = useProduct(id);
  const { mutate: buy, isPending } = useCreateTransaction();
  const { user } = useAuth();

  const { data: shippingEstimate } = useQuery<{
    estimatedCost: number;
    shippingPaidBy: string;
    packageSize: PackageSize;
  }>({
    queryKey: [`/api/shipping/estimate/${id}`],
    enabled: !!product && id > 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Item not found</h1>
          <p className="text-muted-foreground">This item may have been deleted or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === product.sellerId;
  const isSold = product.sold;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto">
          {/* Left Column: Image */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-secondary relative shadow-sm border">
               {isSold && (
                <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <span className="font-display font-bold text-white text-4xl tracking-widest uppercase border-4 border-white px-8 py-4 rotate-[-12deg]">
                    Sold
                  </span>
                </div>
              )}
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col h-full space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">
                  {product.title}
                </h1>
              </div>
              
              <div className="text-3xl font-medium text-foreground">
                ${(product.price / 100).toFixed(2)}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="bg-secondary px-3 py-1 rounded-full text-foreground font-medium">Size M</span>
                <span className="bg-secondary px-3 py-1 rounded-full text-foreground font-medium">Brand New</span>
                <span className="bg-secondary px-3 py-1 rounded-full text-foreground font-medium">Vintage</span>
              </div>

              {/* Shipping Info */}
              {shippingEstimate && (
                <div className="flex items-center gap-3 p-4 bg-secondary/50 border border-border" data-testid="shipping-info">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {shippingEstimate.shippingPaidBy === "seller" ? (
                        <span className="font-semibold uppercase tracking-wide text-sm" data-testid="text-free-shipping">
                          Free Shipping
                        </span>
                      ) : (
                        <span className="font-semibold uppercase tracking-wide text-sm" data-testid="text-shipping-cost">
                          + ${(shippingEstimate.estimatedCost / 100).toFixed(2)} Shipping
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {PACKAGE_SIZES[shippingEstimate.packageSize]?.label} package
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Seller Info */}
            {product.seller && (
              <a 
                href={`/sellers/${product.sellerId}`}
                className="flex items-center p-4 bg-secondary/50 border border-border hover:bg-secondary transition-colors"
                data-testid="link-seller-profile"
              >
                <Avatar className="h-12 w-12 border-2 border-background mr-4">
                  <AvatarImage src={product.seller.profileImageUrl} />
                  <AvatarFallback>{product.seller.firstName?.[0] || 'S'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-sm" data-testid="text-seller-handle">@{product.seller.firstName?.toLowerCase() || 'seller'}</p>
                  <p className="text-xs text-muted-foreground">View all listings</p>
                </div>
              </a>
            )}

            {/* Actions */}
            <div className="space-y-4 pt-4">
              {!isSold ? (
                isOwner ? (
                  <Button className="w-full h-14 text-lg rounded-xl" variant="secondary" disabled>
                    You own this item
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    onClick={() => buy(product.id)}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isPending ? "Processing..." : "Buy Now"}
                  </Button>
                )
              ) : (
                <Button className="w-full h-14 text-lg rounded-xl" disabled variant="outline">
                  Sold Out
                </Button>
              )}
              
              {!isOwner && !isSold && (
                <p className="text-xs text-center text-muted-foreground">
                  Transactions are secure and encrypted.
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-bold font-display text-lg">Description</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center pt-4">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-secondary p-3 rounded-full">
                  <ShieldCheck className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Buyer Protection</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-secondary p-3 rounded-full">
                  <Truck className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Fast Shipping</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-secondary p-3 rounded-full">
                  <RefreshCw className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">30-Day Returns</span>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
