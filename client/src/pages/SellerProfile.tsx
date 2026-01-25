import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function SellerProfile() {
  const { id } = useParams<{ id: string }>();
  
  const { data: seller, isLoading: sellerLoading } = useQuery<any>({
    queryKey: ['/api/sellers', id],
  });
  
  const { data: products, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/sellers', id, 'products'],
  });

  const isLoading = sellerLoading || productsLoading;

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

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-muted-foreground">Seller not found</p>
          <Link href="/">
            <span className="text-sm underline mt-4 inline-block cursor-pointer">Return home</span>
          </Link>
        </div>
      </div>
    );
  }

  const availableProducts = products?.filter((p: any) => !p.sold) || [];
  const soldProducts = products?.filter((p: any) => p.sold) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-8 transition-colors" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" />
            BACK TO FEED
          </span>
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 py-8 border-b border-foreground/10"
        >
          <Avatar className="w-20 h-20 border-2 border-foreground">
            <AvatarImage src={seller.profileImageUrl} />
            <AvatarFallback className="text-2xl font-display">
              {seller.firstName?.[0] || 'S'}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold tracking-tight uppercase" data-testid="text-seller-name">
              @{seller.firstName?.toLowerCase() || 'seller'}
            </h1>
            <p className="text-sm text-muted-foreground tracking-widest uppercase">
              {availableProducts.length} LISTINGS AVAILABLE
            </p>
          </div>
        </motion.div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-display font-bold mb-8 tracking-tight uppercase">
            Available Listings
          </h2>
          
          {availableProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {availableProducts.map((product: any) => (
                <ProductCard key={product.id} product={{ ...product, seller }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary/30 border border-dashed border-border">
              <p className="text-muted-foreground">No available listings from this seller</p>
            </div>
          )}
        </div>
        
        {soldProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-display font-bold mb-8 tracking-tight uppercase text-muted-foreground">
              Sold Items
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 opacity-60">
              {soldProducts.map((product: any) => (
                <ProductCard key={product.id} product={{ ...product, seller }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
