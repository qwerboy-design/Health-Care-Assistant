// MCP 相關類型定義

export interface MCPClientConfig {
  serverUrl: string;
  apiKey?: string;
}

export interface MCPRequest {
  message: string;
  workloadLevel: 'instant' | 'basic' | 'standard' | 'professional';
  selectedFunction?: 'lab' | 'radiology' | 'medical_record' | 'medication';
  fileUrl?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface MCPResponse {
  content: string;
  skillsUsed?: string[];
  metadata?: Record<string, any>;
}
