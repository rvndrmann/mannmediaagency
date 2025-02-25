
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type WorkRequest = Database["public"]["Tables"]["work_requests"]["Row"];

interface WorkRequestsListProps {
  requests: WorkRequest[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-600";
    case "assigned":
      return "bg-blue-500/20 text-blue-600";
    case "completed":
      return "bg-green-500/20 text-green-600";
    default:
      return "bg-gray-500/20 text-gray-600";
  }
};

export const WorkRequestsList = ({ requests }: WorkRequestsListProps) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No work requests found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.title}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(request.status)} variant="secondary">
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell>{request.credits_required}</TableCell>
              <TableCell>{format(new Date(request.created_at), "PPp")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
