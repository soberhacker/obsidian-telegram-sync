import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	dangerouslyAllowBrowser: true, // Используйте с осторожностью
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
