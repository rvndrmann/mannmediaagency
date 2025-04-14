import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder, CustomOrderMedia } from "@/types/custom-order";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, Loader2, Send, Upload, ImageIcon, VideoIcon, Trash, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const AdminCustomOrders = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [orderImages, setOrderImages] = useState<{ image_url: string }[]>([]);
  const [viewImageDialogOpen, setViewImageDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [credits, setCredits] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [userData, setUserData] = useState<{[key: string]: {username: string | null}}>({});
  
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploading, setUploading] = useState(false);
  const [orderMedia, setOrderMedia] = useState<CustomOrderMedia[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('custom_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Explicitly set a high limit
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setOrders(data as CustomOrder[]);
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        if (profilesData) {
          const userMap: {[key: string]: {username: string | null}} = {};
          profilesData.forEach(profile => {
            userMap[profile.id] = { username: profile.username };
          });
          setUserData(userMap);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (order: CustomOrder) => {
    setSelectedOrder(order);
    setAdminNotes(order.admin_notes || "");
    setCredits(order.credits_used);
    setStatus(order.status);
    setDeliveryUrl(order.delivery_url || "");
    setDeliveryMessage(order.delivery_message || "");
    setActiveTab("details");
    setOrderLoading(true);
    
    try {
      const { data: imagesData, error: imagesError } = await supabase
        .from('custom_order_images')
        .select('image_url')
        .eq('order_id', order.id);
      
      if (imagesError) throw imagesError;
      
      setOrderImages(imagesData as { image_url: string }[]);

      try {
        const { data: mediaData, error: mediaError } = await supabase
          .from('custom_order_media')
          .select('*')
          .eq('order_id', order.id);
        
        if (mediaError) {
          console.warn("Error fetching media (table might not exist yet):", mediaError);
          setOrderMedia([]);
        } else {
          setOrderMedia(mediaData as CustomOrderMedia[]);
        }
      } catch (error) {
        console.warn("Error fetching media (table might not exist yet):", error);
        setOrderMedia([]);
      }
    } catch (error) {
      console.error("Error fetching order media:", error);
      toast.error("Failed to load order media");
    } finally {
      setOrderLoading(false);
    }
  };

  const updateOrder = async () => {
    if (!selectedOrder) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.rpc(
        'update_custom_order_status',
        { 
          order_id_param: selectedOrder.id,
          new_status: status,
          admin_notes_text: adminNotes
        }
      );
      
      if (error) throw error;
      
      toast.success("Order updated successfully");
      
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              status: status as 'pending' | 'in_progress' | 'completed' | 'failed', 
              admin_notes: adminNotes, 
              credits_used: credits 
            } 
          : order
      ));
      
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const deliverOrder = async () => {
    if (!selectedOrder) return;
    
    if (!deliveryUrl.trim() && orderMedia.length === 0) {
      toast.error("Please provide either a delivery URL or upload media files");
      return;
    }
    
    setDelivering(true);
    try {
      const { error } = await supabase.rpc(
        'deliver_custom_order',
        { 
          order_id_param: selectedOrder.id,
          delivery_url_param: deliveryUrl,
          delivery_message_param: deliveryMessage
        }
      );
      
      if (error) throw error;
      
      toast.success("Order delivered successfully");
      
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              status: 'completed',
              delivery_url: deliveryUrl,
              delivery_message: deliveryMessage,
              delivered_at: new Date().toISOString()
            } 
          : order
      ));
      
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error delivering order:", error);
      toast.error("Failed to deliver order");
    } finally {
      setDelivering(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    
    try {
      const { error } = await supabase
        .from('custom_order_media')
        .delete()
        .eq('id', mediaId);
      
      if (error) throw error;
      
      setOrderMedia(prev => prev.filter(media => media.id !== mediaId));
      toast.success("Media deleted successfully");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Failed to delete media");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const uploadMedia = async () => {
    if (!selectedOrder || selectedFiles.length === 0) return;
    
    setUploading(true);
    const uploadPromises = selectedFiles.map(async (file, index) => {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev[file.name] >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [file.name]: prev[file.name] + 10 };
          });
        }, 300);
        
        let bucketExistsOrCreated = false;
        
        try {
          const { data: filesList, error: listError } = await supabase.storage
            .from('custom-order-media')
            .list();
          
          if (!listError) {
            bucketExistsOrCreated = true;
          }
        } catch (error) {
          console.warn("Error checking bucket, will attempt to create:", error);
        }
        
        if (!bucketExistsOrCreated) {
          console.log("Bucket appears not to exist, but this user can't create it via the API.");
          console.log("Using the existing bucket or it should be created via migrations");
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedOrder.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-order-media')
          .upload(fileName, file);
        
        if (uploadError) {
          throw new Error(`Upload error: ${uploadError.message}`);
        }
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        const { data: publicUrlData } = supabase.storage
          .from('custom-order-media')
          .getPublicUrl(fileName);
        
        const { data: mediaData, error: insertError } = await supabase
          .from('custom_order_media')
          .insert({
            order_id: selectedOrder.id,
            media_url: publicUrlData.publicUrl,
            media_type: mediaType,
            thumbnail_url: mediaType === 'image' ? publicUrlData.publicUrl : null,
            original_filename: file.name
          })
          .select()
          .single();
        
        if (insertError) {
          throw new Error(`Database error: ${insertError.message}`);
        }
        
        setOrderMedia(prev => [mediaData as CustomOrderMedia, ...prev]);
        
        return publicUrlData.publicUrl;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
        return null;
      }
    });
    
    try {
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} of ${selectedFiles.length} files`);
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error("Error during uploads:", error);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const viewImage = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setViewImageDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Custom Orders</h2>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {userData[order.user_id]?.username || order.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                        order.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell>{formatDate(order.updated_at)}</TableCell>
                  <TableCell>{order.credits_used}</TableCell>
                  <TableCell>
                    {order.delivered_at ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => viewOrderDetails(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order ID: {selectedOrder.id}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="details">Order Details</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                {orderLoading ? (
                  <div className="flex justify-center my-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Status</h3>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Credits Used</h3>
                        <Input 
                          type="number" 
                          value={credits} 
                          onChange={(e) => setCredits(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Client Remark</h3>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <p className="whitespace-pre-line">
                            {selectedOrder.remark || "No remarks provided"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Admin Notes</h3>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this order..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-4">Attached Images</h3>
                      {orderImages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No images attached</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {orderImages.map((img, index) => (
                            <div 
                              key={index} 
                              className="relative group cursor-pointer border rounded-md overflow-hidden"
                              onClick={() => viewImage(img.image_url)}
                            >
                              <img 
                                src={img.image_url} 
                                alt={`Order image ${index + 1}`}
                                className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter className="mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedOrder(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={updateOrder}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="media">
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Upload Media Files</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload images or videos to include with order delivery
                    </p>
                    
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                    
                    <div className="flex gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select Files
                      </Button>
                      
                      <Button 
                        onClick={uploadMedia}
                        disabled={uploading || selectedFiles.length === 0}
                        className="flex-1"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Upload Selected Files'
                        )}
                      </Button>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2 mb-6">
                        <h4 className="text-sm font-medium">Files to Upload</h4>
                        {selectedFiles.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center mr-2">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <VideoIcon className="h-4 w-4" />
                                )}
                              </div>
                              <div className="text-sm truncate max-w-[200px]">{file.name}</div>
                            </div>
                            
                            <div className="flex items-center">
                              {uploadProgress[file.name] > 0 && (
                                <div className="w-20 mr-2">
                                  <Progress value={uploadProgress[file.name]} className="h-2" />
                                </div>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeFile(index)}
                                disabled={uploading}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-4">Media Files</h3>
                    
                    {orderMedia.length === 0 && orderImages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No media attached to this order</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {orderImages.map((img, index) => (
                          <div 
                            key={`legacy-${index}`} 
                            className="relative group cursor-pointer border rounded-md overflow-hidden"
                            onClick={() => viewImage(img.image_url)}
                          >
                            <img 
                              src={img.image_url} 
                              alt={`Order image ${index + 1}`}
                              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ))}
                        
                        {orderMedia.map((media) => (
                          <div 
                            key={media.id} 
                            className="relative group border rounded-md overflow-hidden"
                          >
                            {media.media_type === 'image' ? (
                              <div 
                                className="cursor-pointer"
                                onClick={() => viewImage(media.media_url)}
                              >
                                <img 
                                  src={media.media_url} 
                                  alt={media.original_filename || "Order media"}
                                  className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-48">
                                <video 
                                  src={media.media_url}
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              </div>
                            )}
                            
                            <div className="p-2 flex justify-between items-center">
                              <div className="flex items-center">
                                <Badge variant="outline" className="text-xs">
                                  {media.media_type}
                                </Badge>
                                {media.original_filename && (
                                  <span className="text-xs text-muted-foreground ml-2 truncate max-w-[100px]">
                                    {media.original_filename}
                                  </span>
                                )}
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMedia(media.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedOrder(null)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="delivery">
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Delivery URL (Optional)</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add a link to the delivered content (Google Drive, Dropbox, etc.)
                    </p>
                    <Input 
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Delivery Message</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add a message for the client about their delivered content
                    </p>
                    <Textarea
                      value={deliveryMessage}
                      onChange={(e) => setDeliveryMessage(e.target.value)}
                      placeholder="Thank you for your order! Here's your requested content..."
                      rows={4}
                    />
                  </div>

                  {selectedOrder.delivered_at && (
                    <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-md">
                      <h3 className="text-sm font-medium mb-2 text-green-800 dark:text-green-400">
                        Order Already Delivered
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-500">
                        Delivered on: {formatDate(selectedOrder.delivered_at)}
                      </p>
                      {selectedOrder.delivery_url && (
                        <a 
                          href={selectedOrder.delivery_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                        >
                          View Delivered Content
                        </a>
                      )}
                    </div>
                  )}

                  <DialogFooter className="mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedOrder(null)}
                      disabled={delivering}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={deliverOrder}
                      disabled={delivering || 
                                (orderMedia.length === 0 && !deliveryUrl.trim()) || 
                                !!selectedOrder.delivered_at}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {delivering ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Delivering...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {selectedOrder.delivered_at ? 'Already Delivered' : 'Deliver to Client'}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center my-4">
            <img src={currentImage} alt="Order image" className="max-h-[70vh] object-contain" />
          </div>
          <DialogFooter>
            <Button onClick={() => setViewImageDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
