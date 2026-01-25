import { Link, useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product & { 
    seller?: { firstName: string; lastName: string; profileImageUrl: string };
    likeCount?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const isSold = product.sold;
  const { user } = useAuth();
  const { data: favorites } = useFavorites();
  const { toggle, isPending } = useToggleFavorite();
  const [, setLocation] = useLocation();
  
  const isFavorited = Array.isArray(favorites) && favorites.some((f: any) => f.productId === product.id);
  
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isPending) return;
    await toggle(product.id, isFavorited);
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-navigate]')) {
      return;
    }
    setLocation(`/products/${product.id}`);
  };
  
  return (
    <div 
      className="block group cursor-pointer" 
      onClick={handleCardClick}
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary mb-3">
        {isSold && (
          <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="font-display font-bold text-white text-2xl tracking-widest uppercase border-2 border-white px-4 py-2 rotate-[-12deg]">
              Sold
            </span>
          </div>
        )}
        
        <img 
          src={product.imageUrl} 
          alt={product.title}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {user && (
          <button
            onClick={handleFavoriteClick}
            disabled={isPending}
            data-no-navigate
            className={cn(
              "absolute top-3 right-3 p-2 transition-all z-20",
              "bg-background/80 backdrop-blur-sm border border-border",
              "hover:bg-background hover:scale-110",
              isPending && "opacity-50 cursor-not-allowed"
            )}
            data-testid={`button-favorite-${product.id}`}
          >
            <Heart 
              className={cn(
                "w-4 h-4 transition-colors",
                isFavorited ? "fill-red-500 text-red-500" : "text-foreground"
              )} 
            />
          </button>
        )}
        
        {product.likeCount !== undefined && product.likeCount > 0 && (
          <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm border border-border px-2 py-1 flex items-center gap-1">
            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
            <span className="text-xs font-medium">{product.likeCount}</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 px-1">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-medium text-base truncate group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <span className="font-display font-bold text-lg flex-shrink-0">
            ${(product.price / 100).toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
             {product.seller && (
               <Link 
                 href={`/sellers/${product.sellerId}`} 
                 className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                 onClick={(e) => e.stopPropagation()}
                 data-no-navigate
                 data-testid={`link-seller-${product.sellerId}`}
               >
                 <Avatar className="w-5 h-5">
                   <AvatarImage src={product.seller.profileImageUrl} />
                   <AvatarFallback className="text-[10px]">{product.seller.firstName[0]}</AvatarFallback>
                 </Avatar>
                 <span className="truncate max-w-[100px] text-xs underline-offset-2 hover:underline">
                   @{product.seller.firstName.toLowerCase()}
                 </span>
               </Link>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
