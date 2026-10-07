import OpenAI from "openai";

const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-6-luna",
  input: "Réponds uniquement : Mijoté fonctionne !"
});

console.log(response.output_text);