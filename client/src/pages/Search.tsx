import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Loader2 } from "lucide-react";

export default function Search() {
  const [location] = useLocation();
  
  const query = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  }, [location]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!query,
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider">
            {query.toLowerCase() === "sold" ? "Sold Items" : `Search: "${query}"`}
          </h1>
          <p className="text-muted-foreground mt-2">
            {products?.length || 0} results found
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : products?.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed">
            <p className="text-xl font-medium text-muted-foreground">No items found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
