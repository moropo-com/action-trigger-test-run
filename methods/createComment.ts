import { Context } from '@actions/github/lib/context';
import { Octokit } from '@octokit/rest';

interface ICreateCommentArgs {
  commentText: string;
  context: Context;
  octokit: Octokit;
}

export const createComment = async ({
  commentText,
  context,
  octokit,
}: ICreateCommentArgs) => {
  try {
    let commentId: number;
    if (context.payload.pull_request) {
      const {
        data: { id },
      } = await octokit.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: commentText,
      });
      commentId = id;
    } else {
      const {
        data: { id },
      } = await octokit.repos.createCommitComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: context.sha,
        body: commentText,
      });
      commentId = id;
    }
    return { commentId, error: null };
  } catch (error) {
    console.warn(
      'Failed to create comment, please ensure you have provided a valid github token and that the workflow has the correct permissions.'
    );
    return { commentId: null, error };
  }
};
