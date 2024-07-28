import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config";

const openai = new OpenAI({
	apiKey: OPENAI_API_KEY,
});

export async function generateText(prompt: string): Promise<string> {
	try {
		const response = await openai.completions.create({
			model: "text-davinci-003",
			prompt: prompt,
			max_tokens: 150,
			temperature: 0.7,
		});
		return response.choices[0].text.trim();
	} catch (error) {
		console.error("Error generating text with OpenAI API:", error);
		return "An error occurred while processing your request.";
	}
}
