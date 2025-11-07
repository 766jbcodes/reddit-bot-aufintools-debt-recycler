"""Gemini API service for relevance checking and response generation"""
import google.generativeai as genai
from config import GEMINI_API_KEY, RELEVANCE_PROMPT, RESPONSE_PROMPT_TEMPLATE, CALCULATOR_URL, LEARN_URL


class GeminiService:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def check_relevance(self, post_content):
        """Check if a Reddit post is relevant to debt recycling"""
        prompt = f"{RELEVANCE_PROMPT}\n\nPost/Comment content:\n{post_content}"
        
        try:
            response = self.model.generate_content(prompt)
            result = response.text.strip()
            
            # Parse response
            is_relevant = result.upper().startswith("RELEVANT")
            explanation = result.split('\n', 1)[1] if '\n' in result else ""
            
            return {
                'relevant': is_relevant,
                'explanation': explanation.strip()
            }
        except Exception as e:
            print(f"Error checking relevance: {e}")
            # Default to not relevant on error
            return {'relevant': False, 'explanation': f"Error: {str(e)}"}
    
    def generate_response(self, post_content, post_url):
        """Generate a helpful response for a relevant Reddit post"""
        # Determine if calculator or learn page is more appropriate
        # Simple heuristic: if they mention "calculate", "how much", "numbers", use calculator
        use_calculator = any(word in post_content.lower() for word in [
            'calculate', 'how much', 'numbers', 'figure out', 'work out',
            'what would', 'estimate', 'compute'
        ])
        
        target_url = CALCULATOR_URL if use_calculator else LEARN_URL
        
        prompt = RESPONSE_PROMPT_TEMPLATE.format(
            post_content=post_content,
            calculator_url=CALCULATOR_URL,
            learn_url=LEARN_URL
        )
        
        # Add instruction to use the appropriate URL
        if use_calculator:
            prompt += f"\n\nUse this URL: {CALCULATOR_URL}"
        else:
            prompt += f"\n\nUse this URL: {LEARN_URL}"
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            # Fallback response
            return f"Thanks for your question about debt recycling! You might find this resource helpful: {target_url}"

