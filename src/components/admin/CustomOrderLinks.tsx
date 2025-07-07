
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { CustomLinkButton } from "./CustomLinkButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Plus, Loader2 } from "lucide-react";

interface OrderLink {
  id: string;
  title: string;
  description: string | null;
  custom_rate: number;
  credits_amount: number;
  require_phone: boolean;
  access_code: string;
  expiry_date: string | null;
  created_at: string;
  is_active: boolean;
}

export const CustomOrderLinks = () => {
  const [links, setLinks] = useState<OrderLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    custom_rate: 0,
    credits_amount: 5,
    require_phone: true,
    expiry_date: "",
  });
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    fetchLinks();
    // Set base URL for link generation
    setBaseUrl(`${window.location.origin}/order/`);
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_order_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      console.error("Error fetching links:", error);
      toast.error("Failed to load order links");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "custom_rate" || name === "credits_amount" ? Number(value) : value,
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      require_phone: checked,
    }));
  };

  const createLink = async () => {
    try {
      setIsCreating(true);

      // Generate a unique access code
      const accessCode = Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase
        .from("custom_order_links")
        .insert({
          title: form.title,
          description: form.description || null,
          custom_rate: form.custom_rate,
          credits_amount: form.credits_amount,
          require_phone: form.require_phone,
          access_code: accessCode,
          expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Order link created successfully");
      setLinks((prev) => [data as OrderLink, ...prev]);
      setFormOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating link:", error);
      toast.error(error.message || "Failed to create order link");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleLinkStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("custom_order_links")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((link) =>
          link.id === id ? { ...link, is_active: !currentStatus } : link
        )
      );

      toast.success(
        `Link ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error: any) {
      console.error("Error toggling link status:", error);
      toast.error("Failed to update link status");
    }
  };

  const copyToClipboard = (accessCode: string) => {
    const linkUrl = `${baseUrl}${accessCode}`;
    navigator.clipboard.writeText(linkUrl);
    toast.success("Link copied to clipboard");
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      custom_rate: 0,
      credits_amount: 5,
      require_phone: true,
      expiry_date: "",
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiry";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Custom Order Links</CardTitle>
          <CardDescription>
            Create and manage shareable order links with custom rates
          </CardDescription>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Order Link</DialogTitle>
              <DialogDescription>
                Create a shareable link that clients can use to place custom orders
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Avatar Image Editing"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Upload your product photos for professional editing"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="custom_rate">
                    Custom Rate (₹)
                  </Label>
                  <Input
                    id="custom_rate"
                    name="custom_rate"
                    type="number"
                    min="0"
                    value={form.custom_rate}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="credits_amount">
                    Credits to Use
                  </Label>
                  <Input
                    id="credits_amount"
                    name="credits_amount"
                    type="number"
                    min="1"
                    value={form.credits_amount}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry_date">
                  Expiry Date (Optional)
                </Label>
                <Input
                  id="expiry_date"
                  name="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={handleFormChange}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="require_phone"
                  checked={form.require_phone}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="require_phone">
                  Require phone number
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createLink} 
                disabled={!form.title || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Link'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : links.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {link.title}
                    {link.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {link.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {link.custom_rate > 0 ? `₹${link.custom_rate}` : "Free"}
                  </TableCell>
                  <TableCell>{link.credits_amount}</TableCell>
                  <TableCell>{new Date(link.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{formatDate(link.expiry_date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div
                        className={`h-2 w-2 rounded-full mr-2 ${
                          link.is_active
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      {link.is_active ? "Active" : "Inactive"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(link.access_code)}
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy link</span>
                      </Button>
                      <CustomLinkButton 
                        accessCode={link.access_code} 
                        baseUrl={baseUrl} 
                      />
                      <Button
                        variant={link.is_active ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleLinkStatus(link.id, link.is_active)}
                      >
                        {link.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No custom order links created yet.</p>
            <p className="text-sm mt-2">
              Create a link to share with clients for custom orders.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
