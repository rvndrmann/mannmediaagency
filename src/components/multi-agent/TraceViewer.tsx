
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChatMessage } from "../chat/ChatMessage";
import { format } from 'date-fns';
import { BarChartBig, Clock, Hammer, Repeat, Users, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

type TraceProps = {
  traceData: any;
  conversationId: string;
};

export const TraceViewer = ({ traceData, conversationId }: TraceProps) => {
  if (!traceData || !traceData.messages || traceData.messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChartBig className="h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Data Available</h3>
          <p className="text-gray-400 text-center max-w-md">
            This conversation has no trace data or the trace data is incomplete.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extract events from trace data
  const extractEvents = () => {
    const events: any[] = [];
    let startTime = 0;
    
    traceData.messages.forEach((message: any) => {
      if (message.trace && message.trace.events) {
        message.trace.events.forEach((event: any) => {
          // Use the timestamp from the event or fallback to message timestamp
          const timestamp = new Date(event.timestamp || message.timestamp).getTime();
          
          // Set the startTime to the first event's timestamp
          if (startTime === 0) {
            startTime = timestamp;
          }
          
          // Calculate relative time from the start of the conversation
          const relativeTime = (timestamp - startTime) / 1000; // in seconds
          
          events.push({
            ...event,
            relativeTime,
            formattedTime: `${relativeTime.toFixed(1)}s`,
            message: message
          });
        });
      }
    });
    
    return events.sort((a, b) => a.relativeTime - b.relativeTime);
  };
  
  const events = extractEvents();
  
  // Prepare timing data for chart
  const prepareTimingData = () => {
    if (events.length === 0) return [];
    
    const apiCallStarts: Record<string, number> = {};
    const data: any[] = [];
    
    events.forEach((event) => {
      if (event.eventType === 'api_call_start') {
        apiCallStarts[event.data.agentType] = event.relativeTime;
      } 
      else if (event.eventType === 'api_call_end' && apiCallStarts[event.data.agentType]) {
        const duration = event.data.duration / 1000; // Convert ms to seconds
        data.push({
          name: `${event.data.agentType} (${event.relativeTime.toFixed(1)}s)`,
          duration: Number(duration.toFixed(2)),
          model: event.data.modelUsed || 'unknown'
        });
      }
    });
    
    return data;
  };
  
  // Prepare event flow data for visualization
  const prepareEventFlow = () => {
    return events.map((event, index) => {
      let name = event.eventType;
      if (event.eventType === 'model_used') {
        name = `Model: ${event.data.model}`;
      } else if (event.eventType === 'thinking') {
        name = `Thinking: ${event.data.agentType}`;
      } else if (event.eventType === 'handoff') {
        name = `Handoff: ${event.data.from} → ${event.data.to}`;
      }
      
      return {
        name,
        value: index,
        time: event.relativeTime.toFixed(1),
        detail: JSON.stringify(event.data).slice(0, 100) + '...'
      };
    });
  };
  
  // Summary stats from trace data
  const summary = traceData.summary || {};
  const totalAgents = summary.agent_types?.length || 0;
  const successRate = summary.success ? '100%' : '0%';
  const totalHandoffs = summary.handoffs || 0;
  const totalToolCalls = summary.tool_calls || 0;
  const duration = summary.duration ? (summary.duration / 1000).toFixed(1) + 's' : 'N/A';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Conversation Analysis</h2>
        <span className="text-xs text-gray-400">ID: {conversationId.slice(0, 8)}...</span>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 text-blue-500 mr-2" />
                  Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAgents}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 text-green-500 mr-2" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{duration}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Repeat className="h-4 w-4 text-purple-500 mr-2" />
                  Handoffs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHandoffs}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Hammer className="h-4 w-4 text-orange-500 mr-2" />
                  Tool Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalToolCalls}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                  Success
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Agent Flow Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Agent Types */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Agents Involved</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.agent_types?.map((agent: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Model Used */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Model Used</h3>
                  <div className="flex items-center">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-sm">
                      {summary.model_used || 'Unknown model'}
                    </span>
                  </div>
                </div>
                
                {/* Messages */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Message Count</h3>
                  <div className="text-xl font-medium">{summary.message_count}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Event Type</th>
                      <th className="px-4 py-2 text-left">Agent</th>
                      <th className="px-4 py-2 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{event.formattedTime}</td>
                        <td className="px-4 py-3">{event.eventType}</td>
                        <td className="px-4 py-3">{event.data?.agentType || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {event.eventType === 'handoff' 
                            ? `${event.data?.from || 'unknown'} → ${event.data?.to || 'unknown'}: ${event.data?.reason || 'No reason'}`
                            : (event.data?.modelUsed 
                              ? `Model: ${event.data.modelUsed}` 
                              : JSON.stringify(event.data || {}).slice(0, 50) + '...'
                              )
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={prepareTimingData()} 
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Duration (seconds)', position: 'insideBottom', offset: -10 }} />
                    <YAxis type="category" dataKey="name" width={180} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} seconds`, 'Duration']}
                      labelFormatter={(label) => `Agent Call: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="duration" fill="#8884d8" name="Response Time" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Message Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {traceData.messages.map((message: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs rounded ${
                          message.agent_type ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {message.agent_type || 'User'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-sm whitespace-pre-wrap">
                      {message.user_message && (
                        <div className="mb-4">
                          <div className="font-medium text-gray-600 mb-1">User:</div>
                          <div className="pl-2 border-l-2 border-gray-200">{message.user_message}</div>
                        </div>
                      )}
                      
                      {message.assistant_response && (
                        <div>
                          <div className="font-medium text-gray-600 mb-1">Assistant:</div>
                          <div className="pl-2 border-l-2 border-blue-200">{message.assistant_response}</div>
                        </div>
                      )}
                    </div>
                    
                    {message.trace && message.trace.events && message.trace.events.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-500 mb-1">Events:</div>
                        <div className="space-y-1">
                          {message.trace.events.map((event: any, eventIdx: number) => (
                            <div key={eventIdx} className="text-xs text-gray-500 flex">
                              <span className="w-24 flex-shrink-0">{event.eventType}</span>
                              <span className="flex-1 truncate">
                                {JSON.stringify(event.data).substring(0, 50)}
                                {JSON.stringify(event.data).length > 50 ? '...' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
