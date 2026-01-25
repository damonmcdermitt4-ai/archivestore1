import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: favorites, isLoading } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const favoriteProducts = Array.isArray(favorites) 
    ? favorites.map((f: any) => f.product).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8" />
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight uppercase">
              Your Favorites
            </h1>
          </div>

          {favoriteProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {favoriteProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-secondary/50 border border-dashed border-border">
              <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-medium text-muted-foreground">No favorites yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Heart items you love to save them here
              </p>
              <Link href="/">
                <Button className="mt-6">Browse Items</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
