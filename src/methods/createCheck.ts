import * as Inputs from './namespaces/Inputs';
import { GitHub } from '@actions/github/lib/utils';
import * as core from '@actions/core';

type Ownership = {
  owner: string;
  repo: string;
};

const formatDate = (): string => {
  return new Date().toISOString();
};

export const createRun = async (
  octokit: InstanceType<typeof GitHub>,
  name: string,
  sha: string,
  ownership: Ownership
): Promise<number> => {
  const { data } = await octokit.rest.checks.create({
    ...ownership,
    head_sha: sha,
    name: name,
    started_at: formatDate(),
  });
  return data.id;
};
