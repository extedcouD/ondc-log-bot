import { Octokit } from "@octokit/rest";
import { botUserName } from "../constants/index.js";

export async function generateFinalMessage(
  message: string,
  issueNumber: number
) {
  var token = process.env.GIST_TOKEN;
  if (!token) {
    return "Please add GIST_TOKEN in the environment variables";
  }
  const url = await createGist(token, message, `response-${issueNumber}.txt`);
  if (url) {
    return `:white_check_mark: [View the logs](${url})
      \n please tag me at ${botUserName} in a comment to re-verfiy the logs. or 
      open a new PR to verify new logs.`;
  }
  return url ?? "Failed to create pasteBin";
}

/**
 * Creates a GitHub Gist with the provided content and returns the Gist URL.
 *
 * @param authToken - Your GitHub personal access token with 'gist' scope.
 * @param message - The content to be saved in the Gist.
 * @param fileName - (Optional) The name of the file in the Gist. Defaults to 'response.txt'.
 * @param isPublic - (Optional) Whether the Gist should be public or secret. Defaults to true (public).
 * @returns The URL of the created Gist.
 */
async function createGist(
  authToken: string,
  message: string,
  fileName: string = "response.txt",
  isPublic: boolean = true
): Promise<string | undefined> {
  // Initialize Octokit with authentication
  const octokit = new Octokit({ auth: authToken });

  try {
    // Create the Gist
    const response = await octokit.gists.create({
      files: { [fileName]: { content: message } },
      public: isPublic,
    });

    // Return the URL of the created Gist
    return response.data.html_url;
  } catch (error: any) {
    // Handle errors
    throw new Error(`Failed to create Gist: ${error.message}`);
  }
}
