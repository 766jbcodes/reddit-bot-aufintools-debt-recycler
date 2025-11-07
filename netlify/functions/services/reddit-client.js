/** Reddit API client for posting responses */
const snoowrap = require('snoowrap');
const {
  REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET,
  REDDIT_USERNAME,
  REDDIT_PASSWORD,
  REDDIT_USER_AGENT
} = require('./config');

class RedditClient {
  constructor() {
    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
      throw new Error('Reddit API credentials are required');
    }

    this.reddit = new snoowrap({
      userAgent: REDDIT_USER_AGENT,
      clientId: REDDIT_CLIENT_ID,
      clientSecret: REDDIT_CLIENT_SECRET,
      username: REDDIT_USERNAME,
      password: REDDIT_PASSWORD
    });

    this._authVerified = false;
  }

  async _verifyAuth() {
    if (this._authVerified) {
      return;
    }
    try {
      await this.reddit.getMe();
      this._authVerified = true;
    } catch (error) {
      throw new Error(`Failed to authenticate with Reddit: ${error.message}`);
    }
  }

  async postComment(postId, commentText) {
    /** Post a comment on a Reddit post */
    await this._verifyAuth();
    try {
      const submission = this.reddit.getSubmission(postId);
      const comment = await submission.reply(commentText);
      return {
        success: true,
        comment_id: comment.id,
        comment_url: `https://reddit.com${comment.permalink}`
      };
    } catch (error) {
      console.error(`Error posting comment: ${error}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async replyToComment(commentId, replyText) {
    /** Reply to a Reddit comment */
    await this._verifyAuth();
    try {
      const comment = this.reddit.getComment(commentId);
      const reply = await comment.reply(replyText);
      return {
        success: true,
        comment_id: reply.id,
        comment_url: `https://reddit.com${reply.permalink}`
      };
    } catch (error) {
      console.error(`Error replying to comment: ${error}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPostContent(postId) {
    /** Get the full content of a Reddit post */
    await this._verifyAuth();
    try {
      const submission = this.reddit.getSubmission(postId);
      const submissionData = await submission.fetch();
      return {
        title: submissionData.title,
        selftext: submissionData.selftext,
        url: submissionData.url,
        permalink: `https://reddit.com${submissionData.permalink}`
      };
    } catch (error) {
      console.error(`Error fetching post: ${error}`);
      return null;
    }
  }
}

module.exports = RedditClient;

