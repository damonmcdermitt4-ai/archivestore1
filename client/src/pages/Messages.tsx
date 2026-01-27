import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newConversation, setNewConversation] = useState<{ productId: number; sellerId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const productId = params.get("product");
    const sellerId = params.get("seller");
    if (productId && sellerId) {
      setNewConversation({ productId: parseInt(productId), sellerId });
      setSelectedConversation(parseInt(productId));
    }
  }, [location]);

  const { data: conversations, isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages/product", selectedConversation],
    queryFn: async () => {
      const res = await fetch(`/api/messages/product/${selectedConversation}`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!selectedConversation,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ productId, receiverId, content }: { productId: number; receiverId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", { productId, receiverId, content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/product", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  if (authLoading) return null;

  if (!user) {
    setLocation("/");
    return null;
  }

  const selectedConv = conversations?.find((c: any) => c.productId === selectedConversation);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    if (newConversation && selectedConversation === newConversation.productId) {
      sendMutation.mutate({
        productId: newConversation.productId,
        receiverId: newConversation.sellerId,
        content: newMessage.trim(),
      });
    } else if (selectedConv) {
      sendMutation.mutate({
        productId: selectedConv.productId,
        receiverId: selectedConv.otherUserId,
        content: newMessage.trim(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold uppercase tracking-wider mb-8">Messages</h1>

        <div className="grid md:grid-cols-3 gap-6 min-h-[60vh]">
          <div className="md:col-span-1 border-r pr-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Conversations
            </h2>
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-2">
                {conversations.map((conv: any) => (
                  <button
                    key={conv.productId}
                    onClick={() => setSelectedConversation(conv.productId)}
                    className={`w-full text-left p-3 border transition-colors ${
                      selectedConversation === conv.productId
                        ? "border-foreground bg-secondary/50"
                        : "border-transparent hover:bg-secondary/30"
                    }`}
                    data-testid={`conversation-${conv.productId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conv.otherUser?.profileImageUrl} />
                        <AvatarFallback>{conv.otherUser?.firstName?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Re: {conv.product?.title || "Item"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col">
            {selectedConversation && (selectedConv || newConversation) ? (
              <>
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    {selectedConv?.product?.imageUrl && (
                      <Link href={`/products/${selectedConversation}`}>
                        <img
                          src={selectedConv.product.imageUrl}
                          alt=""
                          className="w-12 h-14 object-cover"
                        />
                      </Link>
                    )}
                    <div>
                      <Link href={`/products/${selectedConversation}`}>
                        <h3 className="font-semibold uppercase hover:underline" data-testid="text-conversation-title">
                          {selectedConv?.product?.title || `Product #${selectedConversation}`}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground" data-testid="text-conversation-with">
                        {selectedConv 
                          ? `with ${selectedConv.otherUser?.firstName} ${selectedConv.otherUser?.lastName}`
                          : "Start a new conversation"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[400px] mb-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : messages?.length > 0 ? (
                    messages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 ${
                            msg.senderId === user.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No messages yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
