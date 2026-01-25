import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = "new" | "recommended";

export default function Home() {
  const { data: products, isLoading, error } = useProducts();
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("new");

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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center flex-col gap-4">
          <p className="text-destructive font-medium">Something went wrong loading the feed.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const sortedProducts = [...(products || [])].sort((a: any, b: any) => {
    if (sortBy === "new") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return b.price - a.price;
    }
  });

  const displayProducts = showAll ? sortedProducts : sortedProducts.slice(0, 8);

  const brands = [
    "14th addiction", "20471120", "OLD CURIOSITY SHOP",
    "YASUYUKI ISHII", "beauty:beast", "KMRii",
    "ifsixwasnine", "L.G.B.", "HYSTERIC GLAMOUR",
    "UNDERCOVER", "number (N)ine", "JUNYA WATANABE",
    "craig morrison", "ISSEY MIYAKE", "PPFM",
    "tornadomart", "SHARE SPIRIT", "semantic design"
  ];

  const Hero = () => (
    <div className="relative bg-background text-foreground py-12 px-4 overflow-hidden mb-12 mx-4 mt-4 border-b border-foreground/10">
      <div className="relative container mx-auto text-center max-w-5xl space-y-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-muted-foreground/40"
        >
          {brands.map((brand, i) => (
            <span 
              key={i} 
              className="text-sm md:text-base lg:text-lg font-display tracking-wide whitespace-nowrap"
              style={{ 
                fontWeight: Math.random() > 0.5 ? 400 : 600,
                fontSize: `${0.75 + Math.random() * 0.5}rem`
              }}
            >
              {brand}
            </span>
          ))}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-[0.2em] leading-tight uppercase"
          data-testid="text-hero-title"
        >
          Official Archive <br className="hidden sm:block" />Marketplace
        </motion.h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <Hero />

      <main id="feed" className="container mx-auto px-4">
        <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-baseline gap-6">
            <h2 className="text-3xl font-display font-bold">Listings</h2>
            <Link href="/sell">
              <span className="text-sm font-medium tracking-widest uppercase cursor-pointer hover:opacity-70 transition-opacity border-b border-foreground pb-0.5" data-testid="link-post-listing">
                Post Listing +
              </span>
            </Link>
          </div>
          
          {!showAll ? (
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll(true)}
              data-testid="button-view-all"
            >
              View all <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-sort">
                    {sortBy === "new" ? "NEW" : "RECOMMENDED"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setSortBy("new")}
                    className={sortBy === "new" ? "font-bold" : ""}
                    data-testid="sort-option-new"
                  >
                    NEW
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy("recommended")}
                    className={sortBy === "recommended" ? "font-bold" : ""}
                    data-testid="sort-option-recommended"
                  >
                    RECOMMENDED
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground text-sm"
                onClick={() => setShowAll(false)}
                data-testid="button-show-less"
              >
                Show less
              </Button>
            </div>
          )}
        </div>

        {displayProducts && displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {displayProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-secondary/50 border border-dashed border-border">
            <p className="text-xl font-medium text-muted-foreground">No items found yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to list something!</p>
            <Link href="/sell">
              <Button className="mt-6">List an Item</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
