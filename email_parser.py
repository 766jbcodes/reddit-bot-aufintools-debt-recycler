"""Parser for F5Bot emails to extract Reddit post information"""
import re
from urllib.parse import urlparse, parse_qs, unquote


class F5BotEmailParser:
    """Parse F5Bot emails to extract Reddit post/comment details"""
    
    @staticmethod
    def parse_email(email_body, email_subject):
        """Parse F5Bot email to extract Reddit information"""
        # F5Bot uses redirect URLs: https://f5bot.com/url?u=https%3A%2F%2Fwww.reddit.com%2F...
        # First, try to extract and decode F5Bot redirect URLs
        f5bot_url_pattern = r'https://f5bot\.com/url\?u=([^&\s]+)'
        f5bot_match = re.search(f5bot_url_pattern, email_body)
        
        reddit_url = None
        if f5bot_match:
            # Decode the URL parameter
            encoded_url = f5bot_match.group(1)
            decoded_url = unquote(encoded_url)
            reddit_url = decoded_url
        
        # Also try direct Reddit URLs as fallback
        if not reddit_url:
            reddit_url_pattern = r'https?://(?:www\.)?reddit\.com/r/\w+/comments/[^\s\)]+'
            reddit_match = re.search(reddit_url_pattern, email_body)
            if reddit_match:
                reddit_url = reddit_match.group(0)
        
        if not reddit_url:
            return None
        
        # Parse Reddit URL to extract post/comment IDs
        # Pattern: /r/subreddit/comments/POST_ID/post_title/c/COMMENT_ID
        # Or: /r/subreddit/comments/POST_ID/post_title/COMMENT_ID
        # Check for /c/ pattern first (comment permalink)
        comment_pattern = r'/r/\w+/comments/(\w+)(?:/[^/]+)?/c/(\w+)'
        comment_match = re.search(comment_pattern, reddit_url)
        
        if comment_match:
            post_id = comment_match.group(1)
            comment_id = comment_match.group(2)
        else:
            # Try standard pattern (might be a post or comment)
            reddit_id_pattern = r'/r/\w+/comments/(\w+)(?:/[^/]+)?(?:/(\w+))?'
            id_match = re.search(reddit_id_pattern, reddit_url)
            if not id_match:
                return None
            post_id = id_match.group(1)
            # Check if second group looks like a comment ID (alphanumeric, not a post title)
            potential_comment = id_match.group(2) if len(id_match.groups()) > 1 else None
            # Comment IDs are typically shorter alphanumeric strings
            # Post titles in URLs are longer and may contain hyphens
            if potential_comment and len(potential_comment) < 20 and not '-' in potential_comment:
                comment_id = potential_comment
            else:
                comment_id = None
        
        # Extract post/comment content from email body
        # F5Bot typically includes the post title and content
        content = F5BotEmailParser._extract_content(email_body, email_subject, reddit_url)
        
        return {
            'url': reddit_url,
            'post_id': post_id,
            'comment_id': comment_id,
            'is_comment': comment_id is not None,
            'content': content,
            'subject': email_subject
        }
    
    @staticmethod
    def _extract_content(email_body, subject, reddit_url=None):
        """Extract the actual post/comment content from email body"""
        # F5Bot emails have a specific format
        # They include the post title and comment text
        
        # Try to extract the comment text that comes after the title
        # Pattern: Title line, then URL, then the actual comment text
        # The comment text appears after the F5Bot URL and before "Do you have comments"
        
        # Find the F5Bot URL
        f5bot_url_pattern = r'https://f5bot\.com/url\?u=[^\s]+'
        url_match = re.search(f5bot_url_pattern, email_body)
        
        if url_match:
            # Get text after the URL, but before the footer
            url_end = url_match.end()
            # Find where the footer starts
            footer_patterns = [
                r'Do you have comments.*',
                r'RedPulse\.io.*',
                r'Want to advertise.*',
                r'You are receiving.*'
            ]
            
            # Extract text after URL
            text_after_url = email_body[url_end:url_end+2000]
            
            # Remove footer content
            for pattern in footer_patterns:
                text_after_url = re.sub(pattern, '', text_after_url, flags=re.DOTALL | re.IGNORECASE)
            
            # Clean up whitespace and get the actual comment
            content = text_after_url.strip()
            
            # Also try to get the post title
            title_pattern = r"Reddit Comments[^:]*:\s*['\"]([^'\"]+)['\"]"
            title_match = re.search(title_pattern, email_body)
            title = title_match.group(1) if title_match else None
            
            # Combine title and content
            if title and content:
                # Remove title if it appears in content
                if title.lower() in content.lower():
                    return content.strip()
                return f"{title}\n\n{content}".strip()
            elif content and len(content) > 50:
                return content.strip()
            elif title:
                return title
        
        # Fallback: extract post title from F5Bot format
        title_pattern = r"Reddit Comments[^:]*:\s*['\"]([^'\"]+)['\"]"
        title_match = re.search(title_pattern, email_body)
        if title_match:
            return title_match.group(1)
        
        # Last resort: use subject and first part of body
        return f"{subject}\n\n{email_body[:500]}"

