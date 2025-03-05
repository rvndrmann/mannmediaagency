
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, ExternalLink, Copy, Trash, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { format, addDays } from "date-fns";
import { DateRange } from "react-day-picker";

interface CustomOrderLink {
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
  const [links, setLinks] = useState<CustomOrderLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    custom_rate: "0",
    credits_amount: "5",
    require_phone: true,
  });
  const [expiryDate, setExpiryDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("custom_order_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setLinks(data || []);
    } catch (error: any) {
      toast.error("Failed to load custom order links");
      console.error("Error fetching links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, require_phone: checked }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!formData.title || parseFloat(formData.custom_rate) <= 0) {
        toast.error("Please provide a title and valid rate");
        return;
      }

      const expiryDays = expiryDate?.to
        ? Math.ceil(
            (expiryDate.to.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
          )
        : 30;

      const { data, error } = await supabase.rpc("create_custom_order_link", {
        title_param: formData.title,
        description_param: formData.description || null,
        custom_rate_param: parseFloat(formData.custom_rate),
        credits_amount_param: parseFloat(formData.credits_amount),
        require_phone_param: formData.require_phone,
        expiry_days_param: expiryDays,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Custom order link created successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Failed to create link");
      console.error("Error creating link:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      custom_rate: "0",
      credits_amount: "5",
      require_phone: true,
    });
    setExpiryDate({
      from: new Date(),
      to: addDays(new Date(), 30),
    });
  };

  const copyLinkToClipboard = (link: CustomOrderLink) => {
    const url = `${window.location.origin}/custom-order/${link.access_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    toast.success("Link copied to clipboard");
    
    setTimeout(() => {
      setCopiedLinkId(null);
    }, 3000);
  };

  const toggleActiveStatus = async (link: CustomOrderLink) => {
    try {
      const { error } = await supabase
        .from("custom_order_links")
        .update({ is_active: !link.is_active })
        .eq("id", link.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success(
        `Link ${link.is_active ? "deactivated" : "activated"} successfully`
      );
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Failed to update link status");
      console.error("Error updating link status:", error);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("custom_order_links")
        .delete()
        .eq("id", linkId);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Link deleted successfully");
      fetchLinks();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete link");
      console.error("Error deleting link:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Custom Order Links</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create Custom Order Link</DialogTitle>
              <DialogDescription>
                Create a shareable link with custom parameters for clients to
                submit orders.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="E.g. Premium Product Shoot"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Special package details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="custom_rate">Custom Rate (₹)</Label>
                  <Input
                    id="custom_rate"
                    name="custom_rate"
                    value={formData.custom_rate}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="credits_amount">Credits Amount</Label>
                  <Input
                    id="credits_amount"
                    name="credits_amount"
                    value={formData.credits_amount}
                    onChange={handleInputChange}
                    type="number"
                    min="1"
                    step="1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <DatePickerWithRange
                  date={expiryDate}
                  onDateChange={setExpiryDate}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="require_phone"
                  checked={formData.require_phone}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="require_phone">Require Phone Number</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : links.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Card
              key={link.id}
              className={`${
                !link.is_active ? "opacity-70 bg-gray-100" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                  <div className="space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLinkToClipboard(link)}
                    >
                      {copiedLinkId === link.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveStatus(link)}
                    >
                      {link.is_active ? (
                        <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      ) : (
                        <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLink(link.id)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {link.description && <p>{link.description}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-medium">₹{link.custom_rate}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Credits</p>
                      <p className="font-medium">{link.credits_amount}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-500">Code</p>
                      <p className="font-medium">{link.access_code}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expiry</p>
                      <p className="font-medium">
                        {link.expiry_date
                          ? format(new Date(link.expiry_date), "dd MMM yyyy")
                          : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        window.open(
                          `/custom-order/${link.access_code}`,
                          "_blank"
                        );
                      }}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Open Form
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No custom order links created yet</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Link
          </Button>
        </div>
      )}
    </div>
  );
};
