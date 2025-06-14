
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History,
  Calendar,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  StopCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTaskHistory } from '@/hooks/browser-use/use-task-history';
import { useAuth } from '@/hooks/use-auth';

export const BrowserTaskHistory = () => {
  const { user } = useAuth();
  const { 
    history, 
    loading, 
    error, 
    refetch 
  } = useTaskHistory(user?.id);

  useEffect(() => {
    if (user?.id) {
      refetch();
    }
  }, [user?.id, refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'stopped':
        return <StopCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Task History
        </CardTitle>
        <Button onClick={refetch} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No task history found</p>
            <p className="text-sm">Your completed tasks will appear here</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {history.map((task) => (
              <div
                key={task.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2 mb-2">
                      {task.task_input}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {task.environment && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span className="capitalize">{task.environment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${getStatusColor(task.status)} flex items-center gap-1`}
                  >
                    {getStatusIcon(task.status)}
                    <span className="capitalize">{task.status}</span>
                  </Badge>
                </div>

                {task.output && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <p className="line-clamp-2">{task.output}</p>
                  </div>
                )}

                {task.result_url && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(task.result_url, '_blank')}
                      className="text-xs"
                    >
                      View Result
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
