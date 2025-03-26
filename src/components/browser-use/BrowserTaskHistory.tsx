
import { useState, useEffect } from "react";
import { useTaskHistory } from "@/hooks/browser-use/use-task-history";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Pause, 
  RotateCw, 
  Search, 
  Calendar, 
  Filter,
  ExternalLink,
  List
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BrowserTaskHistory as TaskHistoryType } from "@/hooks/browser-use/types";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function BrowserTaskHistory() {
  const { taskHistory, isLoading, error, fetchTaskHistory } = useTaskHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  useEffect(() => {
    fetchTaskHistory();
  }, [fetchTaskHistory]);

  // Helper function to get badge variants based on status
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'expired':
        return 'destructive';
      case 'running':
        return 'default';
      case 'stopped':
        return 'secondary';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <RotateCw className="h-4 w-4 animate-spin" />;
      case 'stopped':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTasks = taskHistory.filter((task) => {
    // Filter by search query
    const matchesSearch = 
      task.task_input.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.output && task.output.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by status
    const matchesStatus = 
      statusFilter === "all" || task.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Filter by date range
    let matchesDateRange = true;
    if (dateRange.from) {
      matchesDateRange = matchesDateRange && 
        new Date(task.created_at) >= dateRange.from;
    }
    if (dateRange.to) {
      // Add one day to include the end date
      const toDate = new Date(dateRange.to);
      toDate.setDate(toDate.getDate() + 1);
      matchesDateRange = matchesDateRange && 
        new Date(task.created_at) <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Pagination logic
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  // Function to parse and format step data from output field
  const parseTaskSteps = (output: string | null) => {
    if (!output) return null;
    
    try {
      const data = JSON.parse(output);
      if (data.steps && Array.isArray(data.steps)) {
        return data.steps;
      }
    } catch (e) {
      // If not a valid JSON or doesn't have steps property, return null
      return null;
    }
    
    return null;
  };

  if (isLoading && taskHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RotateCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchTaskHistory} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (taskHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No task history found</p>
          <p className="text-sm text-muted-foreground mt-1">Run browser tasks to see your history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Task History</h2>
        <Button variant="outline" size="sm" onClick={fetchTaskHistory}>
          <RotateCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search task descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setDateRange({ from: undefined, to: undefined })}
                  disabled={!dateRange.from && !dateRange.to}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear date filter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {dateRange.from || dateRange.to ? (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing tasks from {dateRange.from ? format(dateRange.from, 'PPP') : 'all time'} 
            {' to '} 
            {dateRange.to ? format(dateRange.to, 'PPP') : 'present'}
          </p>
          <DatePickerWithRange 
            date={dateRange}
            onDateChange={(newDateRange) => {
              setDateRange({
                from: newDateRange?.from, 
                to: newDateRange?.to
              });
            }}
          />
        </div>
      ) : null}
      
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center h-64 border rounded-md">
          <div className="text-center">
            <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No matching tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            <Button 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setDateRange({ from: undefined, to: undefined });
              }} 
              variant="link" 
              className="mt-2"
            >
              Clear all filters
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {currentTasks.map((task) => (
                <Card key={task.id} className="p-4 overflow-hidden">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="font-medium line-clamp-2">{task.task_input}</div>
                      <Badge variant={getBadgeVariant(task.status)} className="ml-2 flex items-center gap-1">
                        {getStatusIcon(task.status)}
                        <span>{task.status}</span>
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {task.created_at && (
                        <span>
                          Started {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </span>
                      )}
                      {task.completed_at && (
                        <span className="ml-2">
                          • Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-1">
                      {task.result_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex items-center gap-1 h-7"
                          asChild
                        >
                          <a 
                            href={task.result_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Recording
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {task.output && (
                      <div className="mt-2">
                        <Separator className="my-2" />
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1 h-7 p-2">
                              <List className="h-3 w-3" />
                              <span className="text-xs font-medium">View Details</span>
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            {parseTaskSteps(task.output) ? (
                              <div className="mt-2 space-y-2">
                                <p className="text-xs font-medium">Task Steps:</p>
                                {parseTaskSteps(task.output)?.map((step, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 text-xs rounded-md ${
                                      step.status === 'completed' ? 'bg-green-500/10 border border-green-500/20' : 
                                      step.status === 'failed' ? 'bg-red-500/10 border border-red-500/20' : 
                                      'bg-muted/50 border border-border/50'
                                    }`}
                                  >
                                    <div className="flex gap-1 items-start">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[10px] h-5 min-w-6 flex justify-center ${
                                          step.status === 'completed' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700' : 
                                          step.status === 'failed' ? 'bg-red-500/20 hover:bg-red-500/30 text-red-700' : 
                                          'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                      >
                                        {index + 1}
                                      </Badge>
                                      <div>
                                        <p className="font-medium">{step.description}</p>
                                        {step.details && (
                                          <p className="text-muted-foreground mt-1">{step.details}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 p-2 bg-muted rounded-md">
                                <pre className="text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-words">
                                  {task.output}
                                </pre>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }).map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      isActive={currentPage === index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
