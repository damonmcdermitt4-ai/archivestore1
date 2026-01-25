import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product & { seller?: { firstName: string; lastName: string; profileImageUrl: string } };
}

export function ProductCard({ product }: ProductCardProps) {
  const isSold = product.sold;
  
  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-secondary mb-3">
        {isSold && (
          <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="font-display font-bold text-white text-2xl tracking-widest uppercase border-2 border-white px-4 py-2 rotate-[-12deg]">
              Sold
            </span>
          </div>
        )}
        
        {/* Descriptive alt text for Unsplash images */}
        <img 
          src={product.imageUrl} 
          alt={product.title}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        
        {/* Overlay gradient for text readability if needed, though we position outside mostly */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 left-3">
           {/* If we had a 'likes' feature, it would go here */}
        </div>
      </div>

      <div className="space-y-1.5 px-1">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-base truncate pr-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <span className="font-display font-bold text-lg">
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
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            SIZE M
          </span>
        </div>
      </div>
    </Link>
  );
}
