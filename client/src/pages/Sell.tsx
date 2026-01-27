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
import { Loader2, Image as ImageIcon, Package, Truck, Upload, Globe } from "lucide-react";
import { insertProductSchema, PACKAGE_SIZES, CONDITION_OPTIONS } from "@shared/schema";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpload } from "@/hooks/use-upload";

const formSchema = insertProductSchema.omit({ imageUrl: true }).extend({
  price: z.coerce.number().min(1, "Price must be at least $1.00"),
  internationalShippingPrice: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Sell() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [uploadedImagePath, setUploadedImagePath] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imageError, setImageError] = useState<string>("");
  const [showInternational, setShowInternational] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setUploadedImagePath(response.objectPath);
      setImageError("");
    },
    onError: (error) => {
      setImageError(error.message);
      setPreviewUrl("");
      setUploadedImagePath("");
    },
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      brand: "",
      condition: "good",
      price: undefined,
      packageSize: "medium",
      shippingPaidBy: "buyer",
      internationalShippingPrice: undefined,
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      await uploadFile(file);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (!uploadedImagePath) {
      setImageError("Please upload an image");
      return;
    }
    const priceInCents = Math.round(data.price * 100);
    const internationalShippingPriceInCents = data.internationalShippingPrice 
      ? Math.round(data.internationalShippingPrice * 100) 
      : undefined;
    createProduct({
      ...data,
      price: priceInCents,
      internationalShippingPrice: internationalShippingPriceInCents,
      imageUrl: uploadedImagePath,
    });
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight uppercase">List an Item</h1>
            <p className="text-muted-foreground tracking-wide">Turn your closet into cash. It only takes a minute.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <Label className="text-base font-semibold uppercase tracking-widest">Photos</Label>
              <Card className="p-4 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors bg-secondary/20">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-image-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 flex flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-upload-image"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="text-sm uppercase tracking-wide">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span className="text-sm uppercase tracking-wide">
                            {uploadedImagePath ? "Change Image" : "Upload Image"}
                          </span>
                        </>
                      )}
                    </Button>
                    {uploadedImagePath && (
                      <p className="text-xs text-green-600">Image uploaded successfully</p>
                    )}
                    {imageError && (
                      <p className="text-sm text-destructive">{imageError}</p>
                    )}
                  </div>
                  
                  <div className="aspect-[3/4] bg-secondary overflow-hidden flex items-center justify-center border" data-testid="image-preview">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <span className="text-sm uppercase tracking-wide">Preview</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold uppercase tracking-widest">Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Vintage Nike Sweatshirt" 
                  {...form.register("title")}
                  className="h-12 text-lg bg-background"
                  data-testid="input-title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand" className="text-base font-semibold uppercase tracking-widest">Brand</Label>
                <Input 
                  id="brand" 
                  placeholder="e.g. Nike, Comme des Garcons, Vintage" 
                  {...form.register("brand")}
                  className="h-12 text-lg bg-background"
                  data-testid="input-brand"
                />
                <p className="text-xs text-muted-foreground">Optional - helps buyers find your item</p>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold uppercase tracking-widest">Condition</Label>
                <RadioGroup
                  value={form.watch("condition")}
                  onValueChange={(value) => form.setValue("condition", value as "new" | "like_new" | "good" | "fair" | "vintage")}
                  className="grid gap-2"
                  data-testid="radio-condition"
                >
                  {(Object.entries(CONDITION_OPTIONS) as [string, typeof CONDITION_OPTIONS.new][]).map(([key, cond]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-4 p-3 border cursor-pointer transition-colors ${
                        form.watch("condition") === key 
                          ? "border-foreground bg-secondary/50" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <RadioGroupItem value={key} id={`condition-${key}`} data-testid={`radio-condition-${key}`} />
                      <div className="flex-1">
                        <div className="font-semibold uppercase tracking-wide text-sm">{cond.label}</div>
                        <div className="text-xs text-muted-foreground">{cond.description}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold uppercase tracking-widest">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your item in detail - measurements, flaws, history..." 
                  {...form.register("description")}
                  className="min-h-[150px] resize-none text-base bg-background"
                  data-testid="input-description"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-semibold uppercase tracking-widest">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input 
                    id="price" 
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="25.00" 
                    {...form.register("price")}
                    className="pl-8 h-12 text-lg font-mono bg-background"
                    data-testid="input-price"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter price in dollars</p>
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5" />
                <h2 className="text-lg font-semibold tracking-widest uppercase">Shipping</h2>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold uppercase tracking-widest">Package Size</Label>
                <RadioGroup
                  value={form.watch("packageSize")}
                  onValueChange={(value) => form.setValue("packageSize", value as "small" | "medium" | "large")}
                  className="grid gap-3"
                  data-testid="radio-package-size"
                >
                  {(Object.entries(PACKAGE_SIZES) as [string, typeof PACKAGE_SIZES.small][]).map(([key, size]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                        form.watch("packageSize") === key 
                          ? "border-foreground bg-secondary/50" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <RadioGroupItem value={key} id={`size-${key}`} data-testid={`radio-size-${key}`} />
                      <div className="flex-1">
                        <div className="font-semibold uppercase tracking-wide">{size.label}</div>
                        <div className="text-sm text-muted-foreground">{size.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Max weight: {size.maxWeight} lb
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold uppercase tracking-widest">Who Pays Shipping?</Label>
                <RadioGroup
                  value={form.watch("shippingPaidBy")}
                  onValueChange={(value) => form.setValue("shippingPaidBy", value as "buyer" | "seller")}
                  className="grid gap-3"
                  data-testid="radio-shipping-paid-by"
                >
                  <label
                    className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                      form.watch("shippingPaidBy") === "buyer" 
                        ? "border-foreground bg-secondary/50" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value="buyer" id="shipping-buyer" data-testid="radio-shipping-buyer" />
                    <div className="flex-1">
                      <div className="font-semibold uppercase tracking-wide">Buyer Pays</div>
                      <div className="text-sm text-muted-foreground">Shipping cost added at checkout</div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                      form.watch("shippingPaidBy") === "seller" 
                        ? "border-foreground bg-secondary/50" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value="seller" id="shipping-seller" data-testid="radio-shipping-seller" />
                    <div className="flex-1">
                      <div className="font-semibold uppercase tracking-wide flex items-center gap-2">
                        Free Shipping
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="text-sm text-muted-foreground">You cover shipping costs</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <label
                  className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                    showInternational
                      ? "border-foreground bg-secondary/50" 
                      : "border-border hover:border-muted-foreground"
                  }`}
                  data-testid="toggle-international-shipping"
                >
                  <input
                    type="checkbox"
                    checked={showInternational}
                    onChange={(e) => {
                      setShowInternational(e.target.checked);
                      if (!e.target.checked) {
                        form.setValue("internationalShippingPrice", undefined);
                      }
                    }}
                    className="w-5 h-5 accent-foreground"
                  />
                  <div className="flex-1">
                    <div className="font-semibold uppercase tracking-wide flex items-center gap-2">
                      Offer International Shipping
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">Set a custom flat rate for international buyers</div>
                  </div>
                </label>

                {showInternational && (
                  <div className="space-y-2 pl-4 border-l-2 border-foreground/20">
                    <Label htmlFor="internationalShippingPrice" className="text-sm font-medium uppercase tracking-widest">
                      International Shipping Price
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                      <Input 
                        id="internationalShippingPrice" 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="35.00" 
                        {...form.register("internationalShippingPrice")}
                        className="pl-8 h-12 text-lg font-mono bg-background"
                        data-testid="input-international-shipping"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You'll need to add tracking manually to get paid for international orders.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={isPending || isUploading || !uploadedImagePath}
              data-testid="button-post-listing"
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPending ? "Posting..." : !uploadedImagePath ? "Upload an Image First" : "Post Listing"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
