import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { Heart, Search, Plus, User as UserIcon, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: favorites } = useFavorites();
  
  const favoriteCount = Array.isArray(favorites) ? favorites.length : 0;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display font-bold text-2xl tracking-tight uppercase">ARCHIVE EXCHANGE.</span>
        </Link>

        <div className="flex items-center flex-1 max-w-xl mx-8 relative">
          <input 
            type="text"
            placeholder="SEARCH"
            className="w-full h-10 border-b border-foreground bg-transparent focus:outline-none transition-all text-sm font-medium tracking-widest placeholder:text-muted-foreground/50"
          />
          <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/favorites">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative"
                  data-testid="button-favorites-nav"
                >
                  <Heart className="w-5 h-5" />
                  {favoriteCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center font-bold">
                      {favoriteCount}
                    </span>
                  )}
                </Button>
              </Link>
              
              <Link href="/sell">
                <Button 
                  size="sm" 
                  className={`rounded-full gap-2 font-medium ${location === '/sell' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sell Item</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm ring-1 ring-border">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                      <AvatarFallback>{user.firstName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/favorites">
                    <DropdownMenuItem className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Favorites</span>
                      {favoriteCount > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">{favoriteCount}</span>
                      )}
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/api/login">
                <Button variant="ghost" className="font-medium rounded-full">
                  Log in
                </Button>
              </a>
              <a href="/api/login">
                <Button className="font-medium rounded-none bg-foreground text-background hover:bg-foreground/90 transition-all border border-foreground">
                  SIGN UP
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
