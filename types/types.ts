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

export interface ITriggerTestRunResponse {
  message: string;
  testRunInfo: {
    buildId: string;
    devices: string[];
    tests: string[];
    expoReleaseChannel: string;
    url: string;
  };
}

export interface IBuildUploadResponse {
  message?: string;
  buildId?: number;
}

export interface IPollArgs {
  sleep: number;
  prevErrorCount?: number;
}
