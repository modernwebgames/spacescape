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
                    "content": "You are a rephrasing system. Take the input and re-write it with a more standard language. Make the input sound like it is written by AI. Return the response in the input JSON format."
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