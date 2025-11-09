/** Database for tracking processed emails */
const Database = require('better-sqlite3');
const path = require('path');

class EmailTracker {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this._initDatabase();
  }

  _initDatabase() {
    /** Initialize the database and create tables if needed */
    this.db.exec(`
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
    `);
  }

  isProcessed(emailId) {
    /** Check if an email has already been processed */
    const stmt = this.db.prepare('SELECT email_id FROM processed_emails WHERE email_id = ?');
    const result = stmt.get(emailId);
    return result !== undefined;
  }

  markProcessed(emailId, redditUrl, redditPostId, redditCommentId = null, 
                relevant = false, responsePosted = false, responseUrl = null) {
    /** Mark an email as processed */
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO processed_emails 
      (email_id, reddit_url, reddit_post_id, reddit_comment_id, relevant, response_posted, response_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(emailId, redditUrl, redditPostId, redditCommentId, relevant ? 1 : 0, responsePosted ? 1 : 0, responseUrl);
  }

  getStats() {
    /** Get statistics about processed emails */
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_emails');
    const relevantStmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_emails WHERE relevant = 1');
    const postedStmt = this.db.prepare('SELECT COUNT(*) as count FROM processed_emails WHERE response_posted = 1');

    const total = totalStmt.get().count;
    const relevant = relevantStmt.get().count;
    const posted = postedStmt.get().count;

    return {
      total_processed: total,
      relevant: relevant,
      responses_posted: posted
    };
  }

  clearAll() {
    /** Clear all processed email records */
    const stmt = this.db.prepare('DELETE FROM processed_emails');
    const result = stmt.run();
    return result.changes;
  }

  close() {
    /** Close the database connection */
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = EmailTracker;

