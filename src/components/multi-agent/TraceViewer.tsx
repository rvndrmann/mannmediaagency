
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
                  <Zap className="h-4 w-4 text-amber-500 mr-2" />
                  Success
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate}</div>
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
                  <Hammer className="h-4 w-4 text-red-500 mr-2" />
                  Tool Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalToolCalls}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Agent Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <div className="flex items-center">
                  {(summary.agent_types || []).map((agent: string, index: number) => (
                    <div key={index} className="flex items-center">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-md">
                        {agent}
                      </div>
                      {index < (summary.agent_types?.length || 0) - 1 && (
                        <div className="mx-2 text-gray-400">→</div>
                      )}
                    </div>
                  ))}
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
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {events.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className="text-sm font-mono w-16 text-gray-400 flex-shrink-0">
                      {event.formattedTime}
                    </div>
                    <div className="ml-4 flex items-start">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <div className="border-l-2 border-gray-700 ml-1 pl-4 pb-6 -mb-2 w-full">
                        <div className="text-sm font-semibold text-gray-300">
                          {event.eventType}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            (Agent: {event.agentType})
                          </span>
                        </div>
                        <div className="mt-1 p-2 bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>API Call Durations</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepareTimingData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tick={{ fontSize: 12 }} 
                  />
                  <YAxis label={{ value: 'Duration (s)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => [`${value} seconds`, 'Duration']}
                    labelFormatter={(label) => `Call: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="duration" fill="#8884d8" name="API Call Duration" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Event Flow</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareEventFlow()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }} 
                  />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip 
                    formatter={(value, name, props) => [props.payload.detail, 'Event Details']}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Line 
                    type="stepAfter" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    dot={{ fill: '#8884d8', r: 6 }} 
                    activeDot={{ r: 8 }} 
                    name="Event Sequence"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Messages</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[800px] overflow-y-auto pr-2">
              <div className="space-y-6">
                {traceData.messages.map((message: any, index: number) => (
                  <div key={index} className="border border-gray-700 rounded-md p-4">
                    <div className="flex justify-between mb-2">
                      <div className="font-medium">
                        {message.role === 'user' ? 'User' : `Assistant (${message.agent_type})`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(message.timestamp), 'MMM dd, HH:mm:ss')}
                      </div>
                    </div>
                    <div className="mb-4 whitespace-pre-wrap text-sm">
                      {message.role === 'user' ? message.user_message : message.assistant_response}
                    </div>
                    
                    {message.trace && (
                      <div className="mt-2">
                        <Separator className="my-2" />
                        <div className="text-xs font-medium text-gray-400 mb-1">Trace Metadata</div>
                        <div className="bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify({
                            modelUsed: message.trace.modelUsed,
                            duration: message.trace.duration,
                            handoffs: message.trace?.summary?.handoffs,
                            toolCalls: message.trace?.summary?.toolCalls,
                            success: message.trace?.summary?.success
                          }, null, 2)}
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
