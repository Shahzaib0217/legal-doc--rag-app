import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// Helper function for API retry logic
const retryApiCall = async (
  apiCall: () => Promise<any>,
  maxRetries = 3,
  delay = 2000
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      console.log(
        `API call failed (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (attempt === maxRetries) {
        throw error; // Final attempt failed, throw the error
      }

      // Wait before retrying
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next retry (exponential backoff)
      delay *= 1.5;
    }
  }
};

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

    // Step 1: Analyze each PDF sequentially (one by one)
    const exhibits = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);

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

        console.log(`Sending ${file.name} to Gemini...`);

        // Retry logic for individual file processing
        const res = await retryApiCall(async () => {
          return await model.generateContent([
            {
              inlineData: {
                mimeType: file.type || "application/pdf",
                data: base64,
              },
            },
            prompt,
          ]);
        });

        const cleanText = res.response.text().replace(/```json|```/g, "");
        const data = JSON.parse(cleanText);

        const exhibit = {
          fileName: file.name,
          heading: data.heading || "Unknown Exhibit",
          summary: data.summary || "No summary available",
          expenses: Number(data.expenses) || 0,
        };

        exhibits.push(exhibit);
        console.log(`Successfully processed: ${file.name}`);

        // Add small delay between requests to avoid rate limiting
        if (i < files.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err.message);
        const errorExhibit = {
          fileName: file.name,
          heading: `Error: ${file.name}`,
          summary: `Failed to analyze this file: ${err.message}. Please try uploading a different format or check if the file is corrupted.`,
          expenses: 0,
        };
        exhibits.push(errorExhibit);
      }
    }

    console.log("All exhibits processed:", exhibits);
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

    // Retry logic for global analysis
    console.log("Generating global analysis with retry logic...");
    const globalRes = await retryApiCall(async () => {
      return await model.generateContent(globalPrompt);
    });

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
