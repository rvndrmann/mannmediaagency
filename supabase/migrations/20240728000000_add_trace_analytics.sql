
-- Add RLS policy to agent_interactions table if not already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_interactions' 
        AND policyname = 'Users can view their own agent interactions'
    ) THEN
        CREATE POLICY "Users can view their own agent interactions" 
        ON public.agent_interactions 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create or update function to get agent trace analytics
CREATE OR REPLACE FUNCTION public.get_agent_trace_analytics(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH agent_counts AS (
    SELECT 
      agent_type,
      COUNT(*) as usage_count
    FROM agent_interactions
    WHERE user_id = user_id_param
    GROUP BY agent_type
  ),
  trace_metrics AS (
    SELECT
      COUNT(*) as total_interactions,
      COUNT(DISTINCT metadata->'trace'->>'runId') as total_conversations,
      AVG((metadata->'trace'->>'duration')::numeric) as avg_duration,
      SUM(CASE WHEN metadata->'trace'->'summary'->>'success' = 'true' THEN 1 ELSE 0 END) as successful_traces,
      SUM(COALESCE((metadata->'trace'->'summary'->>'handoffs')::numeric, 0)) as total_handoffs,
      SUM(COALESCE((metadata->'trace'->'summary'->>'toolCalls')::numeric, 0)) as total_tool_calls,
      SUM(COALESCE((metadata->'trace'->'summary'->>'messageCount')::numeric, 0)) as total_messages
    FROM agent_interactions
    WHERE 
      user_id = user_id_param AND
      metadata->'trace' IS NOT NULL
  ),
  model_usage AS (
    SELECT
      COALESCE(metadata->'trace'->'summary'->>'modelUsed', 'unknown') as model,
      COUNT(*) as usage_count
    FROM agent_interactions
    WHERE 
      user_id = user_id_param AND
      metadata->'trace' IS NOT NULL
    GROUP BY metadata->'trace'->'summary'->>'modelUsed'
  )
  SELECT
    jsonb_build_object(
      'agent_usage', (SELECT jsonb_object_agg(agent_type, usage_count) FROM agent_counts),
      'total_interactions', (SELECT total_interactions FROM trace_metrics),
      'total_conversations', (SELECT total_conversations FROM trace_metrics),
      'avg_duration_ms', (SELECT avg_duration FROM trace_metrics),
      'success_rate', CASE 
                          WHEN (SELECT total_interactions FROM trace_metrics) > 0 
                          THEN (SELECT successful_traces::float / total_interactions FROM trace_metrics) 
                          ELSE 0 
                       END,
      'total_handoffs', (SELECT total_handoffs FROM trace_metrics),
      'total_tool_calls', (SELECT total_tool_calls FROM trace_metrics),
      'total_messages', (SELECT total_messages FROM trace_metrics),
      'model_usage', (SELECT jsonb_object_agg(model, usage_count) FROM model_usage)
    ) INTO result;
    
  RETURN result;
END;
$$;

-- Create or update function to get trace details for a specific conversation
CREATE OR REPLACE FUNCTION public.get_conversation_trace(conversation_id TEXT, user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'messages', jsonb_agg(
        jsonb_build_object(
          'agent_type', agent_type,
          'user_message', user_message,
          'assistant_response', assistant_response,
          'timestamp', timestamp,
          'has_attachments', has_attachments,
          'trace', metadata->'trace'
        ) ORDER BY timestamp
      ),
      'summary', jsonb_build_object(
        'agent_types', (
          SELECT jsonb_agg(DISTINCT agent_type)
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        ),
        'duration', (
          SELECT MAX((metadata->'trace'->>'duration')::numeric)
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        ),
        'handoffs', (
          SELECT SUM(COALESCE((metadata->'trace'->'summary'->>'handoffs')::numeric, 0))
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        ),
        'tool_calls', (
          SELECT SUM(COALESCE((metadata->'trace'->'summary'->>'toolCalls')::numeric, 0))
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        ),
        'message_count', (
          SELECT SUM(COALESCE((metadata->'trace'->'summary'->>'messageCount')::numeric, 0))
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        ),
        'model_used', (
          SELECT metadata->'trace'->'summary'->>'modelUsed'
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
          LIMIT 1
        ),
        'success', (
          SELECT bool_and(
            CASE 
              WHEN metadata->'trace'->'summary'->>'success' = 'true' THEN true
              ELSE false
            END
          )
          FROM public.agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
        )
      )
    ) INTO result
  FROM public.agent_interactions
  WHERE 
    metadata->'trace'->>'runId' = conversation_id AND
    user_id = user_id_param;
    
  RETURN result;
END;
$$;

-- Create or update function to get a list of conversations for a user
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH conversations AS (
    SELECT DISTINCT 
      metadata->'trace'->>'runId' as conversation_id,
      MIN(timestamp) as start_time,
      MAX(timestamp) as end_time,
      COUNT(*) as message_count,
      ARRAY_AGG(DISTINCT agent_type) as agent_types,
      MAX(COALESCE((metadata->'trace'->'summary'->>'modelUsed')::text, 'unknown')) as model_used
    FROM public.agent_interactions
    WHERE 
      user_id = user_id_param AND
      metadata->'trace'->>'runId' IS NOT NULL
    GROUP BY metadata->'trace'->>'runId'
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'conversation_id', conversation_id,
        'start_time', start_time,
        'end_time', end_time,
        'message_count', message_count,
        'agent_types', to_jsonb(agent_types),
        'model_used', model_used
      ) ORDER BY start_time DESC
    ) INTO result
  FROM conversations;
    
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
