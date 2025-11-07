"""Netlify serverless function handler for Reddit bot"""
import sys
import os

# Add project root to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
sys.path.insert(0, project_root)

# Set Netlify environment flag
os.environ['NETLIFY'] = 'true'

from bot import main


def handler(event, context):
    """Netlify function handler"""
    try:
        main()
        return {
            'statusCode': 200,
            'body': 'Bot executed successfully'
        }
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        print(f"Error in bot execution: {error_msg}")
        print(traceback_str)
        return {
            'statusCode': 500,
            'body': f'Error: {error_msg}'
        }

