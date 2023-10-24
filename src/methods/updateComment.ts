import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';

interface IUpdateCommentArgs {
  context: Context;
  octokit: Octokit;
  commentId: number;
  commentText: string;
}

export const updateComment = async ({
  context,
  octokit,
  commentId,
  commentText,
}: IUpdateCommentArgs) => {
  try {
    const updateArgs = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: commentId,
      body: commentText,
    };
    if (context.payload.pull_request) {
      await octokit.issues.updateComment(updateArgs);
    } else {
      await octokit.repos.updateCommitComment(updateArgs);
    }
  } catch (error: any) {
    console.warn('Failed to update comment' + error.toString());
  }
};
