import FormData from 'form-data';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { IBuildUploadResponse } from '../types/types';

export const uploadBuild = async (
  url: URL,
  apiKey: string,
  buildPath: string
): Promise<IBuildUploadResponse> => {
  if (!existsSync(buildPath)) {
    throw new Error('Build file not found');
  }

  const fileName = path.basename(buildPath);
  const fileData = await readFile(buildPath);
  const formData = new FormData();
  formData.append('file', fileData, {
    filename: fileName,
    filepath: buildPath,
  });

  const buildUpload = await fetch(`${url}builds`, {
    method: 'POST',
    body: formData,
    headers: {
      'x-app-api-key': apiKey,
      'User-Agent': 'moropo-github-action',
    },
  });

  const responseJson = await buildUpload.json();

  if (!buildUpload.ok) {
    throw new Error(`Failed to upload build: ${JSON.stringify(responseJson)}`);
  }
  console.info('Successfully uploaded build.');

  return responseJson;
};
