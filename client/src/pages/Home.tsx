import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Home() {
  const { data: products, isLoading, error } = useProducts();

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

  // Hero section for visual impact
  const Hero = () => (
    <div className="relative bg-background text-foreground py-12 px-4 overflow-hidden mb-12 mx-4 mt-4 border-b border-foreground/10">
      <div className="relative container mx-auto text-center max-w-3xl space-y-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-display font-bold tracking-tighter leading-none uppercase"
        >
          Curated <br/>Editorial
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm md:text-base text-muted-foreground font-light max-w-xl mx-auto tracking-widest uppercase"
        >
          Avant-Garde. Minimalist. Editorial.
        </motion.p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <Hero />

      <main id="feed" className="container mx-auto px-4">
        <div className="flex items-baseline justify-between mb-8">
          <div className="flex items-baseline gap-6">
            <h2 className="text-3xl font-display font-bold">Fresh on the feed</h2>
            <Link href="/sell">
              <span className="text-sm font-medium tracking-widest uppercase cursor-pointer hover:opacity-70 transition-opacity border-b border-foreground pb-0.5">
                Post Listing +
              </span>
            </Link>
          </div>
          <Button variant="link" className="text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-secondary/50 rounded-2xl border border-dashed border-border">
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
