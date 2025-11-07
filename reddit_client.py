"""Reddit API client for posting responses"""
import praw
from config import (
    REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME,
    REDDIT_PASSWORD, REDDIT_USER_AGENT
)


class RedditClient:
    def __init__(self):
        if not all([REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD]):
            raise ValueError("Reddit API credentials are required")
        
        self.reddit = praw.Reddit(
            client_id=REDDIT_CLIENT_ID,
            client_secret=REDDIT_CLIENT_SECRET,
            username=REDDIT_USERNAME,
            password=REDDIT_PASSWORD,
            user_agent=REDDIT_USER_AGENT
        )
        
        # Verify authentication
        try:
            self.reddit.user.me()
        except Exception as e:
            raise ValueError(f"Failed to authenticate with Reddit: {e}")
    
    def post_comment(self, post_id, comment_text):
        """Post a comment on a Reddit post"""
        try:
            submission = self.reddit.submission(id=post_id)
            comment = submission.reply(comment_text)
            return {
                'success': True,
                'comment_id': comment.id,
                'comment_url': f"https://reddit.com{comment.permalink}"
            }
        except Exception as e:
            print(f"Error posting comment: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def reply_to_comment(self, comment_id, reply_text):
        """Reply to a Reddit comment"""
        try:
            comment = self.reddit.comment(id=comment_id)
            reply = comment.reply(reply_text)
            return {
                'success': True,
                'comment_id': reply.id,
                'comment_url': f"https://reddit.com{reply.permalink}"
            }
        except Exception as e:
            print(f"Error replying to comment: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_post_content(self, post_id):
        """Get the full content of a Reddit post"""
        try:
            submission = self.reddit.submission(id=post_id)
            return {
                'title': submission.title,
                'selftext': submission.selftext,
                'url': submission.url,
                'permalink': f"https://reddit.com{submission.permalink}"
            }
        except Exception as e:
            print(f"Error fetching post: {e}")
            return None

