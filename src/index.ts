import { Probot } from "probot";
import { checkBotTagged } from "./utils/general.js";
import { IssueComment } from "./types/interface.js";
import { chatRunner } from "./controller/index.js";
import { botUserName } from "./constants/index.js";
import { labelPr } from "./utils/gitUtil.js";
import { generateFinalMessage } from "./services/gistService.js";

export default (app: Probot) => {
  app.on(["pull_request.opened", "pull_request.reopened"], async (context) => {
    const prComment = context.issue({
      body: `Thanks for opening this PR! Please tag me at ${botUserName} in a comment to verify the logs. `,
    });
    await context.octokit.issues.createComment(prComment);
  });
  app.on("issue_comment.created", async (context) => {
    if (context.isBot) {
      return;
    }
    const newComment = context.payload.comment.body;
    if (!checkBotTagged(newComment)) {
      return;
    }
    if (context.payload.issue.pull_request == undefined) {
      return;
    }

    // const changedFiles = context.payload.issue.pull_request.
    // console.log(JSON.stringify(context, null, 2));

    // Check if the comment is on a pull request (since PRs are treated as issues in GitHub's API)
    const issueNumber = context.payload.issue.number;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    const changedFiles = await context.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: issueNumber,
    });
    // const changedFilesList = changedFiles.data.map((file) => file.filename);
    // console.log("changedFilesList", changedFilesList);

    // Fetch all comments on the pull request/issue
    const { data: comments } = await context.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });
    console.log("comments", comments);
    var prevComments: IssueComment[] = comments.map((c) => {
      return { comment: c.body ?? "", type: c.user?.type || "" };
    });

    const response = await chatRunner(
      { comment: newComment, type: "user" },
      prevComments
    );
    const responseBack = response.response;
    let finalResponse = responseBack;

    if (responseBack) {
      if (response.domain) {
        labelPr(response.domain, context);
      }
      if (responseBack.length > 1000) {
        finalResponse = await generateFinalMessage(responseBack, issueNumber);
      }
      if (response.required) {
        finalResponse += "\n\n" + "Required Structure: \n";
        // const tree = generateFolderTree(response.required);
        // finalResponse += tree;
      }
      console.log("finalResponse", finalResponse);

      const prComment = context.issue({
        body: finalResponse.slice(0, 65535),
      });
      await context.octokit.issues.createComment(prComment);
    }
  });
};
