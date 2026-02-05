
export enum InputType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  WEB = 'WEB'
}

export enum VideoMode {
  URL = 'URL',
  FILE = 'FILE'
}

export interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  conclusion: string;
  detailedAnalysis?: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface ProcessingState {
  isAnalyzing: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

export interface FileData {
  name: string;
  type: string;
  base64: string;
  rawText?: string;
}
