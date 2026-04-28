import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, VisualStyle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeLyrics(lyrics: string, style: VisualStyle): Promise<{
  scenes: Partial<Scene>[];
  bpm: number;
  emotion: string;
}> {
  const prompt = `Analyze these song lyrics and split them into scenes for a music video. 
  For each scene, provide:
  - The text (lyrics)
  - Estimated start time and duration (assuming a typical song structure)
  - A visual prompt for image generation that matches the theme and emotion.
  - The dominant emotion.
  - A list of keywords.

  Current Style: ${style}

  Lyrics:
  ${lyrics}

  Return the data as a JSON object with:
  - scenes: Array of { text, startTime, endTime, visualPrompt, emotion, keywords }
  - bpm: Recommended BPM (number)
  - generalEmotion: String
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                startTime: { type: Type.NUMBER },
                endTime: { type: Type.NUMBER },
                visualPrompt: { type: Type.STRING },
                emotion: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["text", "startTime", "endTime", "visualPrompt", "emotion", "keywords"],
            },
          },
          bpm: { type: Type.NUMBER },
          generalEmotion: { type: Type.STRING },
        },
        required: ["scenes", "bpm", "generalEmotion"],
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    scenes: data.scenes || [],
    bpm: data.bpm || 100,
    emotion: data.generalEmotion || "neutral",
  };
}

export async function generateVoice(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", 
      contents: [{ parts: [{ text: `Read these lyrics with emotion matching the content: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData;
    
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || 'audio/wav';
      return `data:${mimeType};base64,${inlineData.data}`;
    }
    throw new Error("No audio data returned from model");
  } catch (error: any) {
    console.error("Voice Generation Error:", error);
    throw error;
  }
}

export async function generateSceneImage(prompt: string, style: VisualStyle): Promise<string> {
  const stylePrefix = {
    trap: "dark aesthetic, neon lighting, gritty texture, hip hop vibes",
    romantic: "soft lighting, warm colors, dreamy atmosphere, romantic scenery",
    motivational: "cinematic lighting, epic landscape, inspiring, bright colors",
    anime: "vibrant colors, anime art style, detailed cel shading, expressive",
    minimalist: "clean lines, monochromatic or limited palette, simple shapes, elegant",
  };

  const finalPrompt = `${stylePrefix[style]}, ${prompt}, high resolution, detailed, music video cinematic frame`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: finalPrompt }],
    },
  });

  let imageUrl = "";
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return imageUrl;
}
