import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { sectionContent, enhancementPrompt, sectionType } =
      await request.json();

    if (!sectionContent || !enhancementPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing section content or enhancement prompt",
        },
        { status: 400 }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Create the prompt for AI enhancement
    const prompt = `You are a legal writing assistant specialized in demand letters. Your task is to enhance legal content based on user instructions while maintaining professional tone and legal accuracy.

Instructions:
- Maintain the format,spacing, and structure of the original content
- Keep the content legally sound and professional
- Maintain factual accuracy from the original content
- Follow the user's specific enhancement request
- Return only the enhanced content without explanations
- Preserve important legal details and monetary amounts
- Use proper legal terminology

Please enhance the following ${sectionType} section of a demand letter based on this instruction: "${enhancementPrompt}"

Original content:
${sectionContent}

Enhanced content:`;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const enhancedContent = result.response.text().trim();

    return NextResponse.json({
      success: true,
      enhancedContent,
      originalContent: sectionContent,
      prompt: enhancementPrompt,
    });
  } catch (error) {
    console.error("Enhancement error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to enhance content",
      },
      { status: 500 }
    );
  }
}
