import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCompleteCheckout } from "@/hooks/use-transactions";
import { Navbar } from "@/components/Navbar";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { mutate: completeCheckout, isPending, isSuccess, isError } = useCompleteCheckout();
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (hasTriggered) return;
    
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const productId = params.get('product_id');

    if (sessionId && productId) {
      setHasTriggered(true);
      // This is a fallback - the webhook should handle fulfillment
      // but we call this to ensure immediate UI feedback
      completeCheckout({ sessionId, productId });
    }
  }, [hasTriggered, completeCheckout]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center">
          {isPending && (
            <>
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" data-testid="loading-spinner" />
              <h1 className="text-2xl font-display font-bold mb-4">PROCESSING ORDER</h1>
              <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
            </>
          )}

          {isSuccess && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" data-testid="success-icon" />
              <h1 className="text-2xl font-display font-bold mb-4">ORDER CONFIRMED</h1>
              <p className="text-muted-foreground mb-8">
                Thank you for your purchase. The seller has been notified and will ship your item soon.
              </p>
              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
                data-testid="button-continue-shopping"
              >
                CONTINUE SHOPPING
              </Button>
            </>
          )}

          {isError && (
            <>
              <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-3xl text-destructive">!</span>
              </div>
              <h1 className="text-2xl font-display font-bold mb-4">SOMETHING WENT WRONG</h1>
              <p className="text-muted-foreground mb-8">
                There was an issue processing your order. Please contact support if you were charged.
              </p>
              <Button 
                onClick={() => setLocation("/")}
                variant="outline"
                className="w-full"
                data-testid="button-back-home"
              >
                BACK TO HOME
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
