"""Netlify serverless function handler for Reddit bot - Root level handler"""
import os
import sys

# Add the handler directory to path to import from there
handler_dir = os.path.join(os.path.dirname(__file__), 'reddit-bot-handler')
if os.path.exists(handler_dir):
    sys.path.insert(0, handler_dir)

# Set Netlify environment flag
os.environ['NETLIFY'] = 'true'

try:
    # Import from handler directory
    from handler import handler as bot_handler
except ImportError:
    # Fallback: try importing directly if handler is in same directory
    import importlib.util
    handler_path = os.path.join(handler_dir, 'handler.py')
    if os.path.exists(handler_path):
        spec = importlib.util.spec_from_file_location("handler", handler_path)
        handler_module = importlib.util.module_from_spec(spec)
        sys.path.insert(0, handler_dir)
        spec.loader.exec_module(handler_module)
        bot_handler = handler_module.handler
    else:
        raise

def handler(event, context):
    """Netlify function handler wrapper"""
    return bot_handler(event, context)

