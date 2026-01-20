import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProduct } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { insertProductSchema } from "@shared/schema";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";

// Extend schema for form validation
const formSchema = insertProductSchema.extend({
  price: z.coerce.number().min(100, "Price must be at least $1.00"), // Input as number, validated as cents
});

type FormValues = z.infer<typeof formSchema>;

export default function Sell() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { mutate: createProduct, isPending } = useCreateProduct();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      price: undefined,
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/"); // Or show a toast
    }
  }, [user, authLoading, setLocation]);

  const onSubmit = (data: FormValues) => {
    createProduct(data);
  };

  const imageUrl = form.watch("imageUrl");

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold">List an Item</h1>
            <p className="text-muted-foreground">Turn your closet into cash. It only takes a minute.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Image Preview / Input */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Photos</Label>
              <Card className="p-4 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors bg-secondary/20">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                     <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-sm">Image URL (Unsplash)</Label>
                      <Input 
                        id="imageUrl" 
                        placeholder="https://images.unsplash.com/..." 
                        {...form.register("imageUrl")}
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        For this demo, please paste a valid image URL.
                      </p>
                      {form.formState.errors.imageUrl && (
                        <p className="text-sm text-destructive">{form.formState.errors.imageUrl.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="aspect-[3/4] bg-secondary rounded-lg overflow-hidden flex items-center justify-center border">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <span className="text-sm">Preview will appear here</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Item Details */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Vintage Nike Sweatshirt" 
                  {...form.register("title")}
                  className="h-12 text-lg bg-background"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your item (brand, condition, size, flaws)" 
                  {...form.register("description")}
                  className="min-h-[150px] resize-none text-base bg-background"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-semibold">Price (cents)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input 
                    id="price" 
                    type="number"
                    placeholder="2500 (for $25.00)" 
                    {...form.register("price")}
                    className="pl-8 h-12 text-lg font-mono bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter price in cents (e.g. 2500 = $25.00)</p>
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPending ? "Posting..." : "Post Listing"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
