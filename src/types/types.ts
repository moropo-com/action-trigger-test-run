export interface IMessageData {
  buildId: string;
  devices: string;
  tests: string;
  expoReleaseChannel: string;
  url: string;
}

export interface IPollTestRunStatusResponse {
  message: string;
  passed: boolean;
  complete: boolean;
}

export interface ITriggerTestRunResponseBody {
  message: string;
  testRunInfo: {
    id: number;
    buildId: string;
    devices: string[];
    tests: string[];
    expoReleaseChannel: string;
    url: string;
  };
}

export interface ITriggerTestRunResponse {
  statusCode: number;
  body: string;
}

export interface IBuildUploadResponse {
  message?: string;
  buildId?: number;
}

export interface IPollArgs {
  sleep: number;
  prevErrorCount?: number;
}
