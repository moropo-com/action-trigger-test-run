import { IMessageData } from '../types/types';

export const buildMessageString = ({
  buildId,
  devices,
  tests,
  expoReleaseChannel,
  url,
}: IMessageData) => `
## Moropo Test Run

### Summary

**Build:** ${buildId}

**Release Channel:** ${expoReleaseChannel}

| **Device(s):**       | **Test(s):**        |
| -------------------- | ------------------- |
| ${devices} | ${tests} |

[View Results](${url})
`;
