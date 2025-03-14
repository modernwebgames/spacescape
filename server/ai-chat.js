import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
});

export async function generateAIResponse(message) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            store: true,
            messages: [
                { 
                    "role": "system", 
                    "content": "Game context: You are assisting with a game called 'Spacescape' where players are passengers on a spaceship with a failing reactor. The captain (human player) is trying to identify which passengers are AI and which are real humans. Some passengers are real human players, while others are AI-generated. The captain asks questions to try to determine who is human and who is AI. AI players will be left behind in the spaceship."
                },
                { 
                    "role": "user", 
                    "content": message 
                }
            ],
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('[AI] Error generating response:', error);
        return null;
    }
}