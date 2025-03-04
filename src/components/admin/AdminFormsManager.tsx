
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlusCircle, Eye, Copy, Trash, Edit, ListPlus, FileText, PlusSquare, MinusSquare, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CustomOrderForm {
  id: string;
  title: string;
  description: string | null;
  fields: any[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  access_code: string | null;
  require_phone: boolean;
}

interface PaymentLink {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  access_code: string | null;
  expiry_date: string | null;
}

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// Form validation schema
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  require_phone: z.boolean().default(true),
  access_code: z.string().optional(),
});

// Payment link validation schema
const paymentLinkSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  amount: z.number().min(1, { message: "Amount must be greater than 0" }),
  currency: z.string().default("INR"),
  is_active: z.boolean().default(true),
  access_code: z.string().optional(),
  expiry_date: z.string().optional(),
});

export const AdminFormsManager = () => {
  const [activeTab, setActiveTab] = useState("forms");
  const [forms, setForms] = useState<CustomOrderForm[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomOrderForm | null>(null);
  const [editingPaymentLink, setEditingPaymentLink] = useState<PaymentLink | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Form for creating/editing forms
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      is_active: true,
      require_phone: true,
      access_code: "",
    },
  });

  // Form for creating/editing payment links
  const paymentForm = useForm<z.infer<typeof paymentLinkSchema>>({
    resolver: zodResolver(paymentLinkSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 299,
      currency: "INR",
      is_active: true,
      access_code: "",
      expiry_date: "",
    },
  });

  useEffect(() => {
    if (activeTab === "forms") {
      fetchForms();
    } else if (activeTab === "payments") {
      fetchPaymentLinks();
    }
  }, [activeTab]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_order_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      console.error("Error fetching forms:", error);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentLinks(data || []);
    } catch (error: any) {
      console.error("Error fetching payment links:", error);
      toast.error("Failed to load payment links");
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type: "text",
      label: `Field ${formFields.length + 1}`,
      placeholder: "",
      required: false,
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFormFields(
      formFields.map(field => (field.id === id ? { ...field, ...updates } : field))
    );
  };

  const handleAddOption = (fieldId: string) => {
    setFormFields(
      formFields.map(field => {
        if (field.id === fieldId) {
          const options = field.options || [];
          return {
            ...field,
            options: [...options, ""]
          };
        }
        return field;
      })
    );
  };

  const handleUpdateOption = (fieldId: string, index: number, value: string) => {
    setFormFields(
      formFields.map(field => {
        if (field.id === fieldId && field.options) {
          const newOptions = [...field.options];
          newOptions[index] = value;
          return { ...field, options: newOptions };
        }
        return field;
      })
    );
  };

  const handleRemoveOption = (fieldId: string, index: number) => {
    setFormFields(
      formFields.map(field => {
        if (field.id === fieldId && field.options) {
          const newOptions = [...field.options];
          newOptions.splice(index, 1);
          return { ...field, options: newOptions };
        }
        return field;
      })
    );
  };

  const resetFormModal = () => {
    form.reset({
      title: "",
      description: "",
      is_active: true,
      require_phone: true,
      access_code: "",
    });
    setFormFields([]);
    setEditingForm(null);
    setFormModalOpen(false);
  };

  const resetPaymentModal = () => {
    paymentForm.reset({
      title: "",
      description: "",
      amount: 299,
      currency: "INR",
      is_active: true,
      access_code: "",
      expiry_date: "",
    });
    setEditingPaymentLink(null);
    setPaymentModalOpen(false);
  };

  const handleEditForm = (formData: CustomOrderForm) => {
    setEditingForm(formData);
    form.reset({
      title: formData.title,
      description: formData.description || "",
      is_active: formData.is_active,
      require_phone: formData.require_phone,
      access_code: formData.access_code || "",
    });
    setFormFields(formData.fields || []);
    setFormModalOpen(true);
  };

  const handleEditPaymentLink = (linkData: PaymentLink) => {
    setEditingPaymentLink(linkData);
    paymentForm.reset({
      title: linkData.title,
      description: linkData.description || "",
      amount: linkData.amount,
      currency: linkData.currency,
      is_active: linkData.is_active,
      access_code: linkData.access_code || "",
      expiry_date: linkData.expiry_date ? new Date(linkData.expiry_date).toISOString().slice(0, 16) : "",
    });
    setPaymentModalOpen(true);
  };

  const onSubmitForm = async (values: z.infer<typeof formSchema>) => {
    try {
      // Validate that there's at least one field
      if (formFields.length === 0) {
        toast.error("Please add at least one field to the form");
        return;
      }

      const formData = {
        ...values,
        fields: formFields,
      };

      let result;
      if (editingForm) {
        // Update existing form
        result = await supabase
          .from("custom_order_forms")
          .update(formData)
          .eq("id", editingForm.id);
      } else {
        // Create new form
        result = await supabase
          .from("custom_order_forms")
          .insert(formData);
      }

      if (result.error) throw result.error;

      toast.success(editingForm ? "Form updated successfully" : "Form created successfully");
      resetFormModal();
      fetchForms();
    } catch (error: any) {
      console.error("Error saving form:", error);
      toast.error(error.message || "Failed to save form");
    }
  };

  const onSubmitPaymentLink = async (values: z.infer<typeof paymentLinkSchema>) => {
    try {
      let result;
      if (editingPaymentLink) {
        // Update existing payment link
        result = await supabase
          .from("payment_links")
          .update(values)
          .eq("id", editingPaymentLink.id);
      } else {
        // Create new payment link
        result = await supabase
          .from("payment_links")
          .insert(values);
      }

      if (result.error) throw result.error;

      toast.success(editingPaymentLink ? "Payment link updated successfully" : "Payment link created successfully");
      resetPaymentModal();
      fetchPaymentLinks();
    } catch (error: any) {
      console.error("Error saving payment link:", error);
      toast.error(error.message || "Failed to save payment link");
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("custom_order_forms")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Form deleted successfully");
      setForms(forms.filter(form => form.id !== id));
    } catch (error: any) {
      console.error("Error deleting form:", error);
      toast.error(error.message || "Failed to delete form");
    }
  };

  const handleDeletePaymentLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment link? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("payment_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Payment link deleted successfully");
      setPaymentLinks(paymentLinks.filter(link => link.id !== id));
    } catch (error: any) {
      console.error("Error deleting payment link:", error);
      toast.error(error.message || "Failed to delete payment link");
    }
  };

  const copyFormLink = (formId: string, accessCode?: string | null) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/form/${formId}${accessCode ? `?code=${accessCode}` : ''}`;
    navigator.clipboard.writeText(url);
    toast.success("Form link copied to clipboard");
  };

  const copyPaymentLink = (paymentId: string, accessCode?: string | null) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/payment-link/${paymentId}${accessCode ? `?code=${accessCode}` : ''}`;
    navigator.clipboard.writeText(url);
    toast.success("Payment link copied to clipboard");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="forms">Custom Order Forms</TabsTrigger>
          <TabsTrigger value="payments">Payment Links</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Custom Order Forms</h2>
            <Button onClick={() => setFormModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : forms.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                <p className="text-muted-foreground">No custom order forms created yet.</p>
                <Button className="mt-4" variant="outline" onClick={() => setFormModalOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>
                        <div className="font-medium">{form.title}</div>
                        <div className="text-xs text-muted-foreground">{form.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          form.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(form.created_at)}</TableCell>
                      <TableCell>
                        {form.access_code ? (
                          <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded-full">
                            Access Code Required
                          </span>
                        ) : (
                          <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full">
                            Public Access
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => copyFormLink(form.id, form.access_code)}
                            title="Copy Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditForm(form)}
                            title="Edit Form"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteForm(form.id)}
                            title="Delete Form"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Payment Links</h2>
            <Button onClick={() => setPaymentModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Payment Link
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : paymentLinks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                <p className="text-muted-foreground">No payment links created yet.</p>
                <Button className="mt-4" variant="outline" onClick={() => setPaymentModalOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Payment Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="font-medium">{link.title}</div>
                        <div className="text-xs text-muted-foreground">{link.description}</div>
                      </TableCell>
                      <TableCell>
                        {link.currency} {link.amount}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          link.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {link.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(link.created_at)}</TableCell>
                      <TableCell>
                        {link.access_code ? (
                          <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-1 rounded-full">
                            Access Code Required
                          </span>
                        ) : (
                          <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full">
                            Public Access
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => copyPaymentLink(link.id, link.access_code)}
                            title="Copy Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditPaymentLink(link)}
                            title="Edit Payment Link"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeletePaymentLink(link.id)}
                            title="Delete Payment Link"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form creation/editing modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? "Edit Form" : "Create New Form"}</DialogTitle>
            <DialogDescription>
              {editingForm 
                ? "Update your custom order form details and fields."
                : "Create a custom order form to collect information from users."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter form title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Briefly describe this form (optional)"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Make this form available to users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="require_phone"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Phone</FormLabel>
                        <FormDescription>
                          Require phone verification
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Create a code to restrict access" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank for public access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Form Fields</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddField}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                {formFields.length === 0 ? (
                  <div className="text-center py-4 border rounded-md bg-muted/50">
                    <p className="text-muted-foreground">No fields added yet. Click "Add Field" to create your form.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formFields.map((field, index) => (
                      <div key={field.id} className="border rounded-md p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Field {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveField(field.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`field-${field.id}-label`}>Field Label</Label>
                            <Input
                              id={`field-${field.id}-label`}
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="Enter field label"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`field-${field.id}-type`}>Field Type</Label>
                            <select
                              id={`field-${field.id}-type`}
                              value={field.type}
                              onChange={(e) => updateField(field.id, { 
                                type: e.target.value as FormField['type'],
                                options: e.target.value === 'select' ? [''] : undefined
                              })}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Text Area</option>
                              <option value="number">Number</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="select">Select</option>
                            </select>
                          </div>
                        </div>

                        {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                          <div className="space-y-2">
                            <Label htmlFor={`field-${field.id}-placeholder`}>Placeholder</Label>
                            <Input
                              id={`field-${field.id}-placeholder`}
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                              placeholder="Enter placeholder text"
                            />
                          </div>
                        )}

                        {field.type === 'select' && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>Options</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleAddOption(field.id)}
                              >
                                <PlusSquare className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            {(field.options || []).length === 0 ? (
                              <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                                Click "Add Option" to add items to this dropdown
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {(field.options || []).map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => handleUpdateOption(field.id, optIndex, e.target.value)}
                                      placeholder={`Option ${optIndex + 1}`}
                                    />
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleRemoveOption(field.id, optIndex)}
                                      className="h-8 w-8 text-red-500"
                                    >
                                      <MinusSquare className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`field-${field.id}-required`}
                            checked={field.required}
                            onCheckedChange={(checked) => 
                              updateField(field.id, { required: checked === true })
                            }
                          />
                          <Label 
                            htmlFor={`field-${field.id}-required`}
                            className="text-sm font-normal"
                          >
                            This field is required
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetFormModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingForm ? "Update Form" : "Create Form"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment link creation/editing modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPaymentLink ? "Edit Payment Link" : "Create Payment Link"}</DialogTitle>
            <DialogDescription>
              {editingPaymentLink 
                ? "Update your payment link details."
                : "Create a payment link that can be shared with customers."}
            </DialogDescription>
          </DialogHeader>

          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPaymentLink)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={paymentForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter payment title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Briefly describe this payment (optional)"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter amount" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...field}
                      >
                        <option value="INR">INR (Indian Rupee)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={paymentForm.control}
                  name="access_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Code (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Create a code to restrict access" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank for public access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank for no expiry
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Make this payment link available to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetPaymentModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPaymentLink ? "Update Payment Link" : "Create Payment Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
