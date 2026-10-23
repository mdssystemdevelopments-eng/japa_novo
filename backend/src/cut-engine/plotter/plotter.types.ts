export type PlotterDispatchResult = {
  state: 'FILE_READY' | 'NETWORK_SENT' | 'NEEDS_LOCAL_AGENT' | 'FAILED' | 'SIMULATION';
  message: string;
  files?: { format: string; fileName: string; content: string }[];
  bytesSent?: number;
};

export type PlotterProfileConfig = {
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  localAgentUrl?: string;
};
