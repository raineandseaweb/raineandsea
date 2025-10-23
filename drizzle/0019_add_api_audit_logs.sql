-- Create api_audit_logs table
CREATE TABLE api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Information
  user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  session_id VARCHAR(255),

  -- Request Information
  request_method VARCHAR(10) NOT NULL,
  request_path TEXT NOT NULL,
  request_query JSONB,
  request_body JSONB,
  request_size INTEGER,

  -- Response Information
  response_status INTEGER NOT NULL,
  response_time_ms INTEGER,
  response_size INTEGER,

  -- Request Metadata
  ip_address INET,
  user_agent TEXT,
  referer TEXT,

  -- Context
  endpoint_type VARCHAR(50),
  action VARCHAR(100),
  error_type VARCHAR(100),
  error_message TEXT,

  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON api_audit_logs(user_id);
CREATE INDEX idx_audit_logs_user_email ON api_audit_logs(user_email);
CREATE INDEX idx_audit_logs_user_role ON api_audit_logs(user_role);
CREATE INDEX idx_audit_logs_request_path ON api_audit_logs(request_path);
CREATE INDEX idx_audit_logs_endpoint_type ON api_audit_logs(endpoint_type);
CREATE INDEX idx_audit_logs_response_status ON api_audit_logs(response_status);
CREATE INDEX idx_audit_logs_created_at ON api_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_session_id ON api_audit_logs(session_id);
CREATE INDEX idx_audit_logs_user_time ON api_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_error ON api_audit_logs(error_type, created_at DESC) WHERE error_type IS NOT NULL;

