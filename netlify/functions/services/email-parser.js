/** Parser for F5Bot emails to extract Reddit post information */
// decodeURIComponent is a global function in Node.js

class F5BotEmailParser {
  /**
   * Decode quoted-printable text
   * @param {string} text - Quoted-printable encoded text
   * @returns {string} - Decoded text
   */
  static _decodeQuotedPrintable(text) {
    // First handle soft line breaks (must be done first)
    let decoded = text.replace(/=\r?\n/g, '');
    
    // Handle common quoted-printable sequences that are safe to decode
    // We decode these first to avoid corrupting URL-encoded content
    decoded = decoded
      .replace(/=0A/g, '\n') // Handle =0A -> newline
      .replace(/=0D/g, '\r') // Handle =0D -> carriage return
      .replace(/=20/g, ' ') // Handle =20 -> space
      .replace(/=09/g, '\t') // Handle =09 -> tab
      .replace(/=3D/g, '='); // Handle =3D -> = (do this last to avoid double-decoding)
    
    // For other hex sequences, be more careful - only decode if they're not part of URL encoding
    // URL encoding uses %XX, so =XX that's not in a URL context can be decoded
    // But to be safe, we'll only decode common sequences and leave the rest
    const commonHexCodes = {
      '21': '!', '22': '"', '23': '#', '24': '$', '25': '%',
      '26': '&', '27': "'", '28': '(', '29': ')', '2A': '*',
      '2B': '+', '2C': ',', '2D': '-', '2E': '.', '2F': '/',
      '3A': ':', '3B': ';', '3C': '<', '3E': '>', '3F': '?',
      '40': '@', '5B': '[', '5C': '\\', '5D': ']', '5E': '^',
      '60': '`', '7B': '{', '7C': '|', '7D': '}', '7E': '~'
    };
    
    // Only decode if it's a common printable character that's not part of URL encoding
    // We'll be conservative and only decode a few more safe ones
    decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      const upperHex = hex.toUpperCase();
      // Skip if already handled
      if (['3D', '0A', '0D', '20', '09'].includes(upperHex)) {
        return match;
      }
      // Only decode if it's a common safe character
      if (commonHexCodes[upperHex]) {
        return commonHexCodes[upperHex];
      }
      // For others, leave as-is to avoid corrupting URL encoding
      return match;
    });
    
    return decoded;
  }

  /**
   * Parse F5Bot email to extract Reddit information
   * @param {string} emailBody - The email body text
   * @param {string} emailSubject - The email subject
   * @returns {Object|null} - Reddit info object or null if not found
   */
  static parseEmail(emailBody, emailSubject) {
    // Decode quoted-printable if present (handles =3D, =0A, etc.)
    // First, remove soft line breaks (lines ending with =)
    let processedBody = emailBody.replace(/=\r?\n/g, '');
    
    let decodedBody = processedBody;
    if (processedBody.includes('=3D') || processedBody.includes('=0A') || processedBody.includes('=')) {
      decodedBody = F5BotEmailParser._decodeQuotedPrintable(processedBody);
    }

    // F5Bot uses redirect URLs: https://f5bot.com/url?u=https%3A%2F%2Fwww.reddit.com%2F...
    // Pattern needs to handle both regular and quoted-printable encoded URLs
    // Try multiple patterns to catch different encodings
    // Note: URLs may span multiple lines in quoted-printable, so we need to handle that
    const f5botUrlPatterns = [
      /https:\/\/f5bot\.com\/url\?u=([^&\s]+)/, // Standard pattern
      /https:\/\/f5bot\.com\/url\?u=3D([^&\s]+)/, // Quoted-printable =3D
      /https:\/\/f5bot\.com\/url\?u%3D([^&\s]+)/, // URL encoded
      /f5bot\.com\/url\?u=([^&\s\)]+)/, // More flexible
      // Pattern that handles URLs split across lines (quoted-printable soft breaks)
      /f5bot\.com\/url\?u=3D?([^&\s\)]+)/ // Handle =3D and regular
    ];

    let f5botMatch = null;
    for (const pattern of f5botUrlPatterns) {
      f5botMatch = decodedBody.match(pattern) || processedBody.match(pattern) || emailBody.match(pattern);
      if (f5botMatch) break;
    }
    
    // If still no match, try a more aggressive pattern that handles line breaks
    if (!f5botMatch) {
      // Remove all whitespace/newlines and try again
      const noWhitespace = decodedBody.replace(/\s+/g, '');
      f5botMatch = noWhitespace.match(/f5bot\.com\/url\?u=3D?([^&]+)/);
    }

    let redditUrl = null;
    if (f5botMatch) {
      // After decoding quoted-printable, the URL should be on one line
      // Extract the full u= parameter value using regex on decoded body
      const urlParamMatch = decodedBody.match(/f5bot\.com\/url\?u=([^&\s]+)/);
      
      if (urlParamMatch && urlParamMatch[1]) {
        let encodedUrl = urlParamMatch[1];
        
        try {
          // Decode URL (it's already URL-encoded)
          redditUrl = decodeURIComponent(encodedUrl);
        } catch (e) {
          console.log(`[DEBUG] Failed to decode URL parameter: ${e.message}`);
          // If that fails, try cleaning up and decoding again
          encodedUrl = encodedUrl.replace(/=3D/g, '=').replace(/=0A/g, '').replace(/=0D/g, '');
          try {
            redditUrl = decodeURIComponent(encodedUrl);
          } catch (e2) {
            redditUrl = encodedUrl;
          }
        }
      }
      
      // Fallback if urlParamMatch didn't work
      if (!redditUrl && f5botMatch[1]) {
        let encodedUrl = f5botMatch[1].replace(/=3D/g, '=').replace(/=0A/g, '').replace(/=0D/g, '');
        try {
          redditUrl = decodeURIComponent(encodedUrl);
        } catch (e) {
          redditUrl = encodedUrl;
        }
      }
    }

    // Also try direct Reddit URLs as fallback (check both decoded and original body)
    if (!redditUrl) {
      const redditUrlPatterns = [
        /https?:\/\/(?:www\.)?reddit\.com\/r\/\w+\/comments\/[^\s\)\?]+/,
        /reddit\.com\/r\/\w+\/comments\/[^\s\)\?]+/
      ];
      
      for (const pattern of redditUrlPatterns) {
        const redditMatch = decodedBody.match(pattern) || emailBody.match(pattern);
        if (redditMatch) {
          redditUrl = redditMatch[0];
          // Ensure it has the protocol
          if (!redditUrl.startsWith('http')) {
            redditUrl = 'https://' + redditUrl;
          }
          break;
        }
      }
    }

    if (!redditUrl) {
      return null;
    }

    // Clean up the Reddit URL - remove query parameters for parsing
    const cleanUrl = redditUrl.split('?')[0];
    
    // Parse Reddit URL to extract post/comment IDs
    // Pattern: /r/subreddit/comments/POST_ID/post_title/c/COMMENT_ID
    // Or: /r/subreddit/comments/POST_ID/post_title/COMMENT_ID
    // Check for /c/ pattern first (comment permalink)
    const commentPattern = /\/r\/\w+\/comments\/(\w+)(?:\/[^/]+)?\/c\/(\w+)/;
    const commentMatch = cleanUrl.match(commentPattern);

    let postId, commentId;
    if (commentMatch) {
      postId = commentMatch[1];
      commentId = commentMatch[2];
    } else {
      // Try standard pattern (might be a post or comment)
      const redditIdPattern = /\/r\/\w+\/comments\/(\w+)(?:\/[^/]+)?(?:\/(\w+))?/;
      const idMatch = cleanUrl.match(redditIdPattern);
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
    // Decode quoted-printable if needed
    let decodedBody = emailBody;
    if (emailBody.includes('=3D') || emailBody.includes('=0A')) {
      decodedBody = F5BotEmailParser._decodeQuotedPrintable(emailBody);
    }

    // F5Bot emails have a specific format
    // They include the post title and comment text
    // The comment text is often in a monospace span in HTML, or appears after the URL in plain text

    // First, try to extract the comment text that appears after "Reddit Comment" or similar
    // Look for text between the URL and the footer
    const bodyToSearch = decodedBody.length > emailBody.length ? decodedBody : emailBody;

    // Pattern 1: Look for the actual comment text
    // In F5Bot emails, the comment text often:
    // - Starts with common sentence starters
    // - Contains substantial content (multiple sentences)
    // - Appears after the URL or "Reddit Comment" text
    // - Is usually 100+ characters
    
    // Try multiple patterns to find substantial content
    // Priority: Look for content that mentions debt recycling or financial terms first
    const financialTerms = ['debt recycling', 'borrow to invest', 'loan', 'redraw', 'investment', 'ETF', 'tax deduct', 'equity', 'leveraged'];
    const contentPatterns = [
      // Pattern: Find text mentioning financial/debt recycling terms (highest priority)
      new RegExp(`(?:If you|When you|You can|This is|It is|I|We|They|The|In terms|Should aim)[^.!?]*(?:${financialTerms.join('|')})[^.!?]{20,400}[.!?]`, 'i'),
      // Pattern: Find text that starts with common phrases and is substantial
      /(?:If you|When you|You can|This is|It is|I think|I believe|We|They|The|In terms|Should aim)[^.!?]{30,600}[.!?]/i,
      // Pattern: Find any substantial paragraph (100+ chars between periods)
      /[A-Z][^.!?]{100,600}[.!?]/,
      // Pattern: Look for text after URL that's substantial
      /f5bot\.com[^\n]*\n\s*([A-Z][^.!?]{50,600}[.!?])/i
    ];
    
    let substantialMatch = null;
    for (const pattern of contentPatterns) {
      substantialMatch = bodyToSearch.match(pattern);
      if (substantialMatch) {
        // Use the first capture group if available, otherwise use the full match
        substantialMatch = substantialMatch[1] || substantialMatch[0];
        break;
      }
    }
    
    if (substantialMatch) {
      let potentialContent = (typeof substantialMatch === 'string' ? substantialMatch : substantialMatch[0] || substantialMatch).trim();
      // Remove footer patterns
      const footerPatterns = [
        /Do you have comments.*/is,
        /RedPulse\.io.*/is,
        /Want to advertise.*/is,
        /You are receiving.*/is,
        /IMPROVE YOUR AI SEARCH.*/is,
        /LaunchClub\.ai.*/is,
        /40% of citations.*/is
      ];
      
      for (const pattern of footerPatterns) {
        potentialContent = potentialContent.replace(pattern, '');
      }
      
      potentialContent = potentialContent.trim();
      if (potentialContent.length > 50) {
        // Get title if available
        const titlePatterns = [
          /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/,
          /Reddit Comments[^:]*:\s*([^\n]+)/
        ];
        
        let title = null;
        for (const pattern of titlePatterns) {
          const titleMatch = bodyToSearch.match(pattern);
          if (titleMatch) {
            title = titleMatch[1].trim();
            break;
          }
        }
        
        if (title && !potentialContent.toLowerCase().includes(title.toLowerCase())) {
          return `${title}\n\n${potentialContent}`;
        }
        return potentialContent;
      }
    }
    
    // Pattern 2: Look for text after "Reddit Comment" link and before footer
    // The comment text often appears right after the link
    const commentAfterLinkPattern = /(?:Reddit Comment|reddit\.com)[^\n]*\n\s*([^\n]+(?:\n[^\n]+){0,10})/i;
    const commentMatch = bodyToSearch.match(commentAfterLinkPattern);
    
    if (commentMatch && commentMatch[1]) {
      let potentialContent = commentMatch[1].trim();
      // Remove footer patterns
      const footerPatterns = [
        /Do you have comments.*/is,
        /RedPulse\.io.*/is,
        /Want to advertise.*/is,
        /You are receiving.*/is,
        /IMPROVE YOUR AI SEARCH.*/is,
        /LaunchClub\.ai.*/is,
        /Want to advertise.*/is
      ];
      
      for (const pattern of footerPatterns) {
        potentialContent = potentialContent.replace(pattern, '');
      }
      
      // Clean up and check if it's substantial content
      potentialContent = potentialContent.trim();
      if (potentialContent.length > 50 && !potentialContent.match(/^(https?:\/\/|www\.)/i)) {
        // This looks like actual content, not a URL
        // Also try to get the title
        const titlePatterns = [
          /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/,
          /Reddit Comments[^:]*:\s*([^\n]+)/
        ];
        
        let title = null;
        for (const pattern of titlePatterns) {
          const titleMatch = bodyToSearch.match(pattern);
          if (titleMatch) {
            title = titleMatch[1].trim();
            break;
          }
        }
        
        if (title && !potentialContent.toLowerCase().includes(title.toLowerCase())) {
          return `${title}\n\n${potentialContent}`;
        }
        return potentialContent;
      }
    }

    // Pattern 2: Find the F5Bot URL and extract text after it
    const f5botUrlPatterns = [
      /https:\/\/f5bot\.com\/url\?u=[^\s\)]+/,
      /f5bot\.com\/url\?u=[^\s\)]+/
    ];
    
    let urlMatch = null;
    for (const pattern of f5botUrlPatterns) {
      urlMatch = bodyToSearch.match(pattern);
      if (urlMatch) break;
    }

    if (urlMatch) {
      // Get text after the URL, but before the footer
      const urlEnd = urlMatch.index + urlMatch[0].length;
      // Find where the footer starts
      const footerPatterns = [
        /Do you have comments.*/is,
        /RedPulse\.io.*/is,
        /Want to advertise.*/is,
        /You are receiving.*/is,
        /IMPROVE YOUR AI SEARCH.*/is,
        /LaunchClub\.ai.*/is
      ];

      // Extract text after URL
      let textAfterUrl = bodyToSearch.substring(urlEnd, urlEnd + 2000);

      // Remove footer content
      for (const pattern of footerPatterns) {
        textAfterUrl = textAfterUrl.replace(pattern, '');
      }

      // Clean up whitespace and get the actual comment
      let content = textAfterUrl.trim();
      
      // Remove any remaining URLs or email addresses
      content = content.replace(/https?:\/\/[^\s]+/g, '');
      content = content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
      content = content.trim();

      // Also try to get the post title
      const titlePatterns = [
        /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/,
        /Reddit Comments[^:]*:\s*([^\n]+)/
      ];
      
      let title = null;
      for (const pattern of titlePatterns) {
        const titleMatch = decodedBody.match(pattern) || emailBody.match(pattern);
        if (titleMatch) {
          title = titleMatch[1].trim();
          break;
        }
      }

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
    const titlePatterns = [
      /Reddit Comments[^:]*:\s*['"]([^'"]+)['"]/,
      /Reddit Comments[^:]*:\s*([^\n]+)/
    ];
    
    for (const pattern of titlePatterns) {
      const titleMatch = decodedBody.match(pattern) || emailBody.match(pattern);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }

    // Last resort: use subject and first part of body
    const bodyToUse = decodedBody.length > emailBody.length ? decodedBody : emailBody;
    return `${subject}\n\n${bodyToUse.substring(0, 500)}`;
  }
}

module.exports = F5BotEmailParser;

