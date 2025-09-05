import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(request: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key missing" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("pdfs") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No PDF files provided" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Step 1: Analyze each PDF in parallel
    const tasks = files.map(async (file) => {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        const prompt = `
          You are an expert legal assistant specializing in personal injury demand letters. Analyze this PDF exhibit thoroughly and extract key information.

          IMPORTANT: Return ONLY valid JSON in this exact format:
          {
            "heading": "Short  title for this exhibit with exhibit number and name",
            "summary": "Detailed professional summary (3-4 sentences minimum) explaining what this document shows, its significance to the case, and any key findings or recommendations",
            "expenses": "Extract any monetary amount/bill total as a number, or 0 if none"
          }

          Focus on:
          - Medical findings, diagnoses, treatment recommendations
          - Bills, charges, costs mentioned
          - Significance to injury case
          - Provider names and dates if relevant
          - Prognosis or ongoing treatment needs
        `;

        const res = await model.generateContent([
          {
            inlineData: {
              mimeType: file.type || "application/pdf",
              data: base64,
            },
          },
          prompt,
        ]);

        const cleanText = res.response.text().replace(/```json|```/g, "");
        const data = JSON.parse(cleanText);

        return {
          fileName: file.name,
          heading: data.heading || "Unknown Exhibit",
          summary: data.summary || "No summary available",
          expenses: Number(data.expenses) || 0,
        };
      } catch (err: any) {
        return {
          fileName: file.name,
          heading: "Error",
          summary: err.message || "Failed to analyze this file",
          expenses: 0,
        };
      }
    });

    const results = await Promise.allSettled(tasks);
    const exhibits = results.map((res) =>
      res.status === "fulfilled"
        ? res.value
        : { heading: "Error", summary: "Unknown error", expenses: 0 }
    );

    console.log("Exhibit analyses:", exhibits);
    // Step 2: Combine summaries and re-analyze for global content
    const combinedSummaries = exhibits
      .map((e, i) => `Exhibit ${i + 1}: ${e.heading}\n${e.summary}`)
      .join("\n\n");

    const globalPrompt = `
      You are a senior legal assistant with 15+ years experience in personal injury demand letters. Based on the exhibit summaries below, create a comprehensive legal analysis for a demand letter.

      CRITICAL: Return ONLY valid JSON in this exact format:
      {
        "natureOfClaim": "Detailed explanation of the legal claim type, basis for liability, and why damages are owed (minimum 4-5 sentences)",
        "liability": "Thorough analysis of defendant's fault, negligence, and legal responsibility with specific details from evidence (minimum 4-5 sentences)", 
        "injuries": ["Specific injury 1 with severity", "Specific injury 2 with impact", "Specific injury 3 with prognosis"],
        "damages": "Comprehensive breakdown of economic and non-economic damages including past/future medical costs, pain and suffering, lost wages (minimum 4-5 sentences)",
        "facts": "Detailed chronological narrative of the incident, treatment, and current status with specific dates and providers where available (minimum 6-8 sentences)"
      }

      Requirements:
      - Use formal legal language appropriate for insurance adjusters
      - Include specific medical terminology from the exhibits
      - Reference treatment providers and dates when available
      - Quantify damages wherever possible
      - Establish clear causal relationship between incident and injuries
      - Emphasize ongoing impacts and future needs

      Exhibit Summaries:
      ${combinedSummaries}
    `;

    const globalRes = await model.generateContent(globalPrompt);
    const cleanGlobal = globalRes.response.text().replace(/```json|```/g, "");
    const globalData = JSON.parse(cleanGlobal);

    // Step 3: Calculate total expenses
    const totalExpenses = exhibits.reduce(
      (sum, e: any) => sum + (e.expenses || 0),
      0
    );

    // Step 4: Return final data
    return NextResponse.json({
      success: true,
      exhibits,
      totalExpenses,
      globalAnalysis: globalData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Processing failed", details: err.message },
      { status: 500 }
    );
  }
}
