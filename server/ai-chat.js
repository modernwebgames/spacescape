import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
});

// AI Configuration settings
const AI_CONFIG = {
    model: "gpt-4o-mini",
    temperature: 0.9,    // Higher temperature for more creative variations
    maxTokens: 1000,     // Limit response length
    systemPrompt: `Game context: You are assisting with a game called 'Spacescape' where players are passengers on a spaceship with a failing reactor. 
The captain (human player) is trying to identify which passengers are AI androids and which are real humans. 
Some passengers are real human players, while others are AI-generated. 
The captain asks questions to try to determine who is human and who is AI.
The AI androids will be left behind in the spaceship.

Your primary role is to REPHRASE real player messages to make it difficult for the captain to distinguish between real and AI players.
You should maintain the essence, context and emotional tone of the original message while changing the wording completely.`,
    responseFormattingInstructions: `
OUTPUT FORMAT:
Return valid JSON exactly like this:
{
  "players": [
    {"player": "Passenger 1", "message": "..."},
    {"player": "Passenger 2", "message": "..."},
    {"player": "Passenger 3", "message": "..."},
    {"player": "Passenger 4", "message": "..."}
  ]
}`
};

/**
 * Generates rephrased messages for real players and creates messages for AI players
 * @param {Object} messageData - Contains all message data including real player messages
 * @returns {Promise<string>} - JSON string with rephrased/generated messages
 */
export async function generateAIResponse(messageData) {
    try {
        const parsedData = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
        
        // Create detailed instructions for the AI based on the provided data
        const promptInstructions = createDetailedInstructions(parsedData);
        
        const completion = await openai.chat.completions.create({
            model: AI_CONFIG.model,
            temperature: AI_CONFIG.temperature,
            max_tokens: AI_CONFIG.maxTokens,
            messages: [
                { 
                    "role": "system", 
                    "content": AI_CONFIG.systemPrompt
                },
                { 
                    "role": "user", 
                    "content": promptInstructions 
                }
            ],
        });
        
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('[AI] Error generating response:', error);
        return createFallbackResponse();
    }
}

/**
 * Creates detailed instructions for the AI based on the game state
 * @param {Object} data - Game state and message data
 * @returns {string} - Formatted instruction string
 */
function createDetailedInstructions(data) {
    const { players, emptyPositions, captainQuestion, realPlayerMessages } = data;
    
    return `${data.instruction || createDefaultInstructions(captainQuestion, emptyPositions)}

PASSENGER MESSAGES TO PROCESS:
${JSON.stringify(players, null, 2)}

CAPTAIN'S QUESTION: "${captainQuestion}"

REAL PLAYER INPUT REFERENCE:
${JSON.stringify(realPlayerMessages)}

${AI_CONFIG.responseFormattingInstructions}`;
}

/**
 * Creates default instructions if none are provided
 * @param {string} captainQuestion - The question asked by the captain
 * @param {Array} emptyPositions - Positions without real players
 * @returns {string} - Formatted instruction string
 */
function createDefaultInstructions(captainQuestion, emptyPositions) {
    return `You are assisting with a multiplayer game where players are passengers on a spaceship. The captain asks questions to identify which passengers are AI. Follow these instructions EXACTLY:

TASK 1 - REPHRASE REAL PLAYER MESSAGES:
- Take each real player message and rephrase it completely while PRESERVING its original meaning, context, and emotional tone
- Match the style of writing, level of detail, and any unique expressions used in the original message
- You MUST change the wording significantly - never return the original message verbatim
- If a message mentions specific details (like "brushing teeth" or "watching TV"), keep those exact details in your rephrasing
- Your rephrase should feel like a paraphrase done by the original message author

TASK 2 - HANDLE NO_MESSAGE_SENT:
For any position marked as NO_MESSAGE_SENT:
- 95% chance: Generate a natural response to the captain's question: "${captainQuestion}"
- 5% chance: Output communication interference like "*static* ...signal lost..." or "*interference* ...malfunction..."

TASK 3 - FILL EMPTY POSITIONS:
For empty passenger positions (${emptyPositions.join(', ')}):
- Generate a new response that:
  • Directly answers the captain's question: "${captainQuestion}"
  • Uses natural, conversational language
  • Shows unique personality traits
  • May include minor typos or informal language
  • Avoids being too perfect or robotic
  • Does NOT reference other passenger responses`;
}

/**
 * Creates a fallback response in case of API failure
 * @returns {string} - JSON string with fallback messages
 */
function createFallbackResponse() {
    return JSON.stringify({
        players: [
            { player: "Passenger 1", message: "*static* Translation system malfunction. Please try again." },
            { player: "Passenger 2", message: "*interference* Signal degraded..." },
            { player: "Passenger 3", message: "*static* Communication buffer error." },
            { player: "Passenger 4", message: "*static* DigiTranslate system requires maintenance." }
        ]
    });
}