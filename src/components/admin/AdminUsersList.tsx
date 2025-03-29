
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, AdminUser } from "@/types/custom-order";
import { SupabaseError } from "@/integrations/supabase/rpc-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, X } from "lucide-react";

export const AdminUsersList = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<{[key: string]: boolean}>({});
  const [newAdminId, setNewAdminId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAdminsWithRPC();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          user => 
            user.username?.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with credits
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          user_credits (
            credits_remaining
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminsWithRPC = async () => {
    try {
      // Use RPC to get admin users
      const { data, error } = await supabase.rpc('get_admin_users');
      
      if (error) throw error;
      
      const adminMap: {[key: string]: boolean} = {};
      if (Array.isArray(data)) {
        data.forEach((admin: { user_id: string }) => {
          adminMap[admin.user_id] = true;
        });
      }
      
      setAdmins(adminMap);
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  };

  const addAdmin = async () => {
    if (!newAdminId.trim()) {
      toast.error("Please enter a valid user ID");
      return;
    }
    
    setAddingAdmin(true);
    try {
      // First check if user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', newAdminId)
        .single();
      
      if (userError || !userData) {
        toast.error("User not found with that ID");
        return;
      }
      
      // Add user as admin using RPC
      const { error } = await supabase.rpc(
        'add_admin_user',
        { admin_user_id: newAdminId }
      );
      
      if (error) {
        const supabaseError = error as SupabaseError;
        if (supabaseError.code === '23505') {
          toast.error("User is already an admin");
        } else {
          throw error;
        }
      } else {
        toast.success("Admin added successfully");
        setNewAdminId("");
        setAdmins({...admins, [newAdminId]: true});
      }
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Failed to add admin");
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      // Remove admin using RPC
      const { error } = await supabase.rpc(
        'remove_admin_user',
        { admin_user_id: userId }
      );
      
      if (error) throw error;
      
      toast.success("Admin removed successfully");
      
      // Update local state
      const newAdmins = {...admins};
      delete newAdmins[userId];
      setAdmins(newAdmins);
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Failed to remove admin");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">User Management</h2>
        
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-8 w-full md:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="User ID to add as admin"
              value={newAdminId}
              onChange={(e) => setNewAdminId(e.target.value)}
              className="w-full md:w-[250px]"
            />
            <Button 
              onClick={addAdmin}
              disabled={addingAdmin || !newAdminId.trim()}
            >
              {addingAdmin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.username || 'No username'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {user.id}
                  </TableCell>
                  <TableCell>
                    {user.user_credits?.[0]?.credits_remaining || 0}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    {admins[user.id] ? (
                      <Badge className="bg-purple-500">Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {admins[user.id] && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdmin(user.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Admin
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
