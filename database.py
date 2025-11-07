"""Database for tracking processed emails"""
import sqlite3
import os
from datetime import datetime


class EmailTracker:
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize the database and create tables if needed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processed_emails (
                email_id TEXT PRIMARY KEY,
                reddit_url TEXT,
                reddit_post_id TEXT,
                reddit_comment_id TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                relevant BOOLEAN,
                response_posted BOOLEAN,
                response_url TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def is_processed(self, email_id):
        """Check if an email has already been processed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT email_id FROM processed_emails WHERE email_id = ?', (email_id,))
        result = cursor.fetchone()
        
        conn.close()
        return result is not None
    
    def mark_processed(self, email_id, reddit_url, reddit_post_id, reddit_comment_id=None, 
                      relevant=False, response_posted=False, response_url=None):
        """Mark an email as processed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO processed_emails 
            (email_id, reddit_url, reddit_post_id, reddit_comment_id, relevant, response_posted, response_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (email_id, reddit_url, reddit_post_id, reddit_comment_id, relevant, response_posted, response_url))
        
        conn.commit()
        conn.close()
    
    def get_stats(self):
        """Get statistics about processed emails"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM processed_emails')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM processed_emails WHERE relevant = 1')
        relevant = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM processed_emails WHERE response_posted = 1')
        posted = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_processed': total,
            'relevant': relevant,
            'responses_posted': posted
        }

