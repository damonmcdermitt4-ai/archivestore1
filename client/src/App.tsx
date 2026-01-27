import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import ProductDetails from "@/pages/ProductDetails";
import Sell from "@/pages/Sell";
import Profile from "@/pages/Profile";
import SellerProfile from "@/pages/SellerProfile";
import Favorites from "@/pages/Favorites";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import Search from "@/pages/Search";
import Orders from "@/pages/Orders";
import Messages from "@/pages/Messages";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products/:id" component={ProductDetails} />
      <Route path="/sell" component={Sell} />
      <Route path="/profile" component={Profile} />
      <Route path="/sellers/:id" component={SellerProfile} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/search" component={Search} />
      <Route path="/orders" component={Orders} />
      <Route path="/messages" component={Messages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
