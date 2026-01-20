import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Search, Plus, User as UserIcon, LogOut } from "lucide-react";
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg transform group-hover:rotate-12 transition-transform duration-300">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">Thrift.</span>
        </Link>

        {/* Search Bar - Hidden on mobile, visible on tablet+ */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search for items..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-none focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-sm font-medium"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
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
                <Button className="font-medium rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  Sign up
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
