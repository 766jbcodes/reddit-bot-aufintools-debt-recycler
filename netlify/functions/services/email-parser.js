/** Parser for F5Bot emails to extract Reddit post information */
const { decodeURIComponent } = require('url');

class F5BotEmailParser {
  /**
   * Parse F5Bot email to extract Reddit information
   * @param {string} emailBody - The email body text
   * @param {string} emailSubject - The email subject
   * @returns {Object|null} - Reddit info object or null if not found
   */
  static parseEmail(emailBody, emailSubject) {
    // F5Bot uses redirect URLs: https://f5bot.com/url?u=https%3A%2F%2Fwww.reddit.com%2F...
    // First, try to extract and decode F5Bot redirect URLs
    const f5botUrlPattern = /https:\/\/f5bot\.com\/url\?u=([^&\s]+)/;
    const f5botMatch = emailBody.match(f5botUrlPattern);

    let redditUrl = null;
    if (f5botMatch) {
      // Decode the URL parameter
      const encodedUrl = f5botMatch[1];
      try {
        redditUrl = decodeURIComponent(encodedUrl);
      } catch (e) {
        // If decoding fails, try without decode
        redditUrl = encodedUrl;
      }
    }

    // Also try direct Reddit URLs as fallback
    if (!redditUrl) {
      const redditUrlPattern = /https?:\/\/(?:www\.)?reddit\.com\/r\/\w+\/comments\/[^\s\)]+/;
      const redditMatch = emailBody.match(redditUrlPattern);
      if (redditMatch) {
        redditUrl = redditMatch[0];
      }
    }

    if (!redditUrl) {
      return null;
    }

    // Parse Reddit URL to extract post/comment IDs
    // Pattern: /r/subreddit/comments/POST_ID/post_title/c/COMMENT_ID
    // Or: /r/subreddit/comments/POST_ID/post_title/COMMENT_ID
    // Check for /c/ pattern first (comment permalink)
    const commentPattern = /\/r\/\w+\/comments\/(\w+)(?:\/[^/]+)?\/c\/(\w+)/;
    const commentMatch = redditUrl.match(commentPattern);

    let postId, commentId;
    if (commentMatch) {
      postId = commentMatch[1];
      commentId = commentMatch[2];
    } else {
      // Try standard pattern (might be a post or comment)
      const redditIdPattern = /\/r\/\w+\/comments\/(\w+)(?:\/[^/]+)?(?:\/(\w+))?/;
      const idMatch = redditUrl.match(redditIdPattern);
      if (!idMatch) {
        return null;
      }
      postId = idMatch[1];
      // Check if second group looks like a comment ID (alphanumeric, not a post title)
      const potentialComment = idMatch[2];
      // Comment IDs are typically shorter alphanumeric strings
      // Post titles in URLs are longer and may contain hyphens
      if (potentialComment && potentialComment.length < 20 && !potentialComment.includes('-')) {
        commentId = potentialComment;
      } else {
        commentId = null;
      }
    }

    // Extract post/comment content from email body
    // F5Bot typically includes the post title and content
    const content = F5BotEmailParser._extractContent(emailBody, emailSubject, redditUrl);

    return {
      url: redditUrl,
      post_id: postId,
      comment_id: commentId,
      is_comment: commentId !== null,
      content: content,
      subject: emailSubject
    };
  }

  /**
   * Extract the actual post/comment content from email body
   * @param {string} emailBody - The email body text
   * @param {string} subject - The email subject
   * @param {string} redditUrl - The Reddit URL (optional)
   * @returns {string} - Extracted content
   */
  static _extractContent(emailBody, subject, redditUrl = null) {
    // F5Bot emails have a specific format
    // They include the post title and comment text

    // Try to extract the comment text that comes after the title
    // Pattern: Title line, then URL, then the actual comment text
    // The comment text appears after the F5Bot URL and before "Do you have comments"

    // Find the F5Bot URL
    const f5botUrlPattern = /https:\/\/f5bot\.com\/url\?u=[^\s]+/;
    const urlMatch = emailBody.match(f5botUrlPattern);

    if (urlMatch) {
      // Get text after the URL, but before the footer
      const urlEnd = urlMatch.index + urlMatch[0].length;
      // Find where the footer starts
      const footerPatterns = [
        /Do you have comments.*/is,
        /RedPulse\.io.*/is,
        /Want to advertise.*/is,
        /You are receiving.*/is
      ];

      // Extract text after URL
      let textAfterUrl = emailBody.substring(urlEnd, urlEnd + 2000);

      // Remove footer content
      for (const pattern of footerPatterns) {
        textAfterUrl = textAfterUrl.replace(pattern, '');
      }

      // Clean up whitespace and get the actual comment
      let content = textAfterUrl.trim();

      // Also try to get the post title
      const titlePattern = /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/;
      const titleMatch = emailBody.match(titlePattern);
      const title = titleMatch ? titleMatch[1] : null;

      // Combine title and content
      if (title && content) {
        // Remove title if it appears in content
        if (content.toLowerCase().includes(title.toLowerCase())) {
          return content.trim();
        }
        return `${title}\n\n${content}`.trim();
      } else if (content && content.length > 50) {
        return content.trim();
      } else if (title) {
        return title;
      }
    }

    // Fallback: extract post title from F5Bot format
    const titlePattern = /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/;
    const titleMatch = emailBody.match(titlePattern);
    if (titleMatch) {
      return titleMatch[1];
    }

    // Last resort: use subject and first part of body
    return `${subject}\n\n${emailBody.substring(0, 500)}`;
  }
}

module.exports = F5BotEmailParser;

