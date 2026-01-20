import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, Share2, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: allProducts, isLoading: productsLoading } = useProducts();

  if (authLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/";
    return null;
  }

  // Filter products for this user (simple client side filter for MVP)
  // In a real app, we'd have a specific endpoint /api/users/:id/products
  const userProducts = allProducts?.filter((p: any) => p.sellerId === user.id) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-xl">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-4xl">{user.firstName?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-col md:flex-row items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold">{user.firstName} {user.lastName}</h1>
                  <p className="text-muted-foreground">@{user.firstName?.toLowerCase()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <Settings className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Los Angeles, CA
                </span>
                <span>•</span>
                <span>{userProducts.length} listings</span>
                <span>•</span>
                <span>124 sold</span>
                <span>•</span>
                <span className="text-primary font-medium">★★★★★ (48 reviews)</span>
              </div>
              
              <p className="text-sm max-w-lg">
                Vintage collector and streetwear enthusiast. I ship daily! 📦 
                Message me for bundles. No returns unless item is not as described.
              </p>
            </div>
          </div>
        </div>
        
        <Separator className="my-8" />

        {/* Listings Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-bold font-display">Active Listings ({userProducts.length})</h2>
          </div>

          {userProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {userProducts.map((product: any) => (
                <ProductCard key={product.id} product={{...product, seller: user}} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-secondary/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">You haven't listed any items yet.</p>
              <Button variant="link" className="mt-2" onClick={() => window.location.href='/sell'}>
                Create your first listing
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
