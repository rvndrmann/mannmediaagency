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
      'total_traces', COALESCE((SELECT total_conversations FROM trace_metrics), 0),
      'total_messages', COALESCE((SELECT total_messages FROM trace_metrics), 0),
      'total_handoffs', COALESCE((SELECT total_handoffs FROM trace_metrics), 0),
      'total_tool_calls', COALESCE((SELECT total_tool_calls FROM trace_metrics), 0),
      'avg_response_time', COALESCE((SELECT avg_duration FROM trace_metrics), 0),
      'agent_usage', COALESCE(
        (SELECT jsonb_object_agg(agent_type, usage_count)
        FROM agent_counts),
        '{}'::jsonb
      ),
      'model_usage', COALESCE(
        (SELECT jsonb_object_agg(model, usage_count)
        FROM model_usage),
        '{}'::jsonb
      )
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
      'messages', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'agent_type', agent_type,
            'user_message', user_message,
            'assistant_response', assistant_response,
            'timestamp', timestamp,
            'has_attachments', has_attachments,
            'trace', metadata->'trace'
          ) ORDER BY timestamp
        ),
        '[]'::jsonb
      ),
      'summary', jsonb_build_object(
        'agent_types', COALESCE(
          (SELECT jsonb_agg(DISTINCT agent_type)
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          '[]'::jsonb
        ),
        'duration', COALESCE(
          (SELECT MAX((metadata->'trace'->>'duration')::numeric)
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          0
        ),
        'handoffs', COALESCE(
          (SELECT SUM(COALESCE((metadata->'trace'->'summary'->>'handoffs')::numeric, 0))
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          0
        ),
        'tool_calls', COALESCE(
          (SELECT SUM(COALESCE((metadata->'trace'->'summary'->>'toolCalls')::numeric, 0))
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          0
        ),
        'message_count', COALESCE(
          (SELECT COUNT(*)
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          0
        ),
        'model_used', (
          SELECT metadata->'trace'->'summary'->>'modelUsed'
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param
          LIMIT 1
        ),
        'success', COALESCE(
          (SELECT bool_and(
            CASE 
              WHEN metadata->'trace'->'summary'->>'success' = 'true' THEN true
              ELSE false
            END
          )
          FROM agent_interactions
          WHERE 
            metadata->'trace'->>'runId' = conversation_id AND
            user_id = user_id_param),
          false
        )
      )
    ) INTO result
  FROM agent_interactions
  WHERE 
    metadata->'trace'->>'runId' = conversation_id AND
    user_id = user_id_param;
    
  RETURN COALESCE(result, '{}'::jsonb);
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
    FROM agent_interactions
    WHERE 
      user_id = user_id_param AND
      metadata->'trace'->>'runId' IS NOT NULL
    GROUP BY metadata->'trace'->>'runId'
  )
  SELECT 
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'conversation_id', conversation_id,
          'start_time', start_time,
          'end_time', end_time,
          'message_count', message_count,
          'agent_types', to_jsonb(agent_types),
          'model_used', model_used
        ) ORDER BY start_time DESC
      ),
      '[]'::jsonb
    ) INTO result
  FROM conversations;
    
  RETURN result;
END;
$$;