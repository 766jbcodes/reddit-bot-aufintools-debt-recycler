/** Gemini API service for relevance checking and response generation */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  GEMINI_API_KEY,
  RELEVANCE_PROMPT,
  RESPONSE_PROMPT_TEMPLATE,
  CALCULATOR_URL,
  LEARN_URL
} = require('./config');

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async checkRelevance(postContent) {
    /** Check if a Reddit post is relevant to debt recycling */
    const prompt = `${RELEVANCE_PROMPT}\n\nPost/Comment content:\n${postContent}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Parse response
      const isRelevant = text.toUpperCase().startsWith('RELEVANT');
      const explanation = text.includes('\n') ? text.split('\n', 2)[1] : '';

      return {
        relevant: isRelevant,
        explanation: explanation.trim()
      };
    } catch (error) {
      console.error(`Error checking relevance: ${error}`);
      // Default to not relevant on error
      return { relevant: false, explanation: `Error: ${error.message}` };
    }
  }

  async generateResponse(postContent, postUrl) {
    /** Generate a helpful response for a relevant Reddit post */
    // Determine if calculator or learn page is more appropriate
    // Simple heuristic: if they mention "calculate", "how much", "numbers", use calculator
    const calculatorKeywords = [
      'calculate', 'how much', 'numbers', 'figure out', 'work out',
      'what would', 'estimate', 'compute'
    ];
    const useCalculator = calculatorKeywords.some(word => 
      postContent.toLowerCase().includes(word)
    );

    const targetUrl = useCalculator ? CALCULATOR_URL : LEARN_URL;

    let prompt = RESPONSE_PROMPT_TEMPLATE
      .replace('{post_content}', postContent)
      .replace('{calculator_url}', CALCULATOR_URL)
      .replace('{learn_url}', LEARN_URL);

    // Add instruction to use the appropriate URL
    if (useCalculator) {
      prompt += `\n\nUse this URL: ${CALCULATOR_URL}`;
    } else {
      prompt += `\n\nUse this URL: ${LEARN_URL}`;
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error(`Error generating response: ${error}`);
      // Fallback response
      return `Thanks for your question about debt recycling! You might find this resource helpful: ${targetUrl}`;
    }
  }
}

module.exports = GeminiService;

