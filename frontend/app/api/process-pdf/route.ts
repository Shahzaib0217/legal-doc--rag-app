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
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${maxRetries}...`);
      const result = await apiCall();
      console.log(`API call succeeded on attempt ${attempt}`);
      return result;
    } catch (error: any) {
      lastError = error;
      console.log(
        `API call failed (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (attempt === maxRetries) {
        console.log(`All ${maxRetries} attempts failed. Throwing error.`);
        throw error; // Final attempt failed, throw the error
      }

      // Wait before retrying
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`Starting retry attempt ${attempt + 1}...`);

      // Increase delay for next retry (exponential backoff)
      delay *= 1.5;
    }
  }

  // This should never be reached, but just in case
  throw lastError;
};

// Helper function to generate file hash for caching
const generateFileHash = (file: File): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

// Helper function to collect client info from exhibits
const collectClientInfo = (exhibits: any[]) => {
  const collectedClientInfo = {
    clientName: [] as string[],
    policyNumber: [] as string[],
    claimNumber: [] as string[],
    dateOfLoss: [] as string[],
  };

  exhibits.forEach((exhibit: any) => {
    if (exhibit.clientInfo) {
      if (exhibit.clientInfo.clientName)
        collectedClientInfo.clientName.push(exhibit.clientInfo.clientName);
      if (exhibit.clientInfo.policyNumber)
        collectedClientInfo.policyNumber.push(exhibit.clientInfo.policyNumber);
      if (exhibit.clientInfo.claimNumber)
        collectedClientInfo.claimNumber.push(exhibit.clientInfo.claimNumber);
      if (exhibit.clientInfo.dateOfLoss)
        collectedClientInfo.dateOfLoss.push(exhibit.clientInfo.dateOfLoss);
    }
  });

  return collectedClientInfo;
};

// Helper function to get most frequent value
const getMostFrequent = (arr: string[]): string | null => {
  if (arr.length === 0) return null;
  const frequency = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return Object.keys(frequency).reduce((a, b) =>
    frequency[a] > frequency[b] ? a : b
  );
};

// Helper function to aggregate client info
const aggregateClientInfo = (
  collectedInfo: ReturnType<typeof collectClientInfo>
) => {
  return {
    clientName: getMostFrequent(collectedInfo.clientName),
    policyNumber: getMostFrequent(collectedInfo.policyNumber),
    claimNumber: getMostFrequent(collectedInfo.claimNumber),
    dateOfLoss: getMostFrequent(collectedInfo.dateOfLoss),
  };
};

// Helper function to generate global prompt
const generateGlobalPrompt = (
  combinedSummaries: string,
  aggregatedClientInfo: any
) => {
  return `
    You are a senior legal assistant with 15+ years experience in personal injury demand letters. Based on the exhibit summaries below, create a comprehensive legal analysis for a demand letter.

    CRITICAL: Return ONLY valid JSON in this exact format:
    {
      "natureOfClaim": "Detailed explanation of the legal claim type, basis for liability, and why damages are owed (minimum 4-5 sentences)",
      "liability": "Thorough analysis of defendant's fault, negligence, and legal responsibility with specific details from evidence (minimum 4-5 sentences)",
      "injuries": ["Specific injury 1 with severity", "Specific injury 2 with impact", "Specific injury 3 with prognosis"],
      "damages": {
        "people": [
          {
            "name": "Person Name 1",
            "specialDamages": {
              "total": 78018.00,
              "items": [
                { "description": "Provider/Service name with brief description", "amount": 2346.00 },
                { "description": "Another provider/service", "amount": 3241.60 }
              ]
            },
            "futureMedicalExpenses": {
              "total": 40500.00,
              "items": [
                { "description": "Recommended future treatment/procedure", "amount": 12000.00 },
                { "description": "Another recommended treatment", "amount": 28500.00 }
              ]
            },
            "generalDamages": {
              "total": 300000.00,
              "items": [
                "Severe and persistent pain and suffering",
                "Loss of enjoyment of life due to activity restrictions",
                "Emotional distress from the chronic nature of injuries and uncertain prognosis"
              ]
            }
          },
          {
            "name": "Person Name 2",
            "specialDamages": {
              "total": 34018.00,
              "items": [
                { "description": "Provider/Service name with brief description", "amount": 2346.00 },
                { "description": "Another provider/service", "amount": 3241.60 }
              ]
            },
            "futureMedicalExpenses": {
              "total": 37500.00,
              "items": [
                { "description": "Recommended future treatment/procedure", "amount": 37500.00 }
              ]
            },
            "generalDamages": {
              "total": 300000.00,
              "items": [
                "Severe and persistent pain and suffering",
                "Loss of enjoyment of life due to activity restrictions"
              ]
            }
          }
        ],
        "totalSettlementDemand": 618518.00
      },
      "facts": "Detailed chronological narrative of the incident, treatment, and current status with specific dates and providers where available (minimum 6-8 sentences)",
      "clientInfo": {
        "clientName": "Full client/patient name if found in exhibits, or null",
        "policyNumber": "Insurance policy number if found in exhibits, or null",
        "claimNumber": "Insurance claim number if found in exhibits, or null",
        "dateOfLoss": "Date of incident/loss/accident if found in exhibits (MM/DD/YYYY format), or null"
      }
    }

    Requirements:
    - Use formal legal language appropriate for insurance adjusters
    - Include specific medical terminology from the exhibits
    - Reference treatment providers and dates when available
    - Quantify damages wherever possible
    - Establish clear causal relationship between incident and injuries
    - Emphasize ongoing impacts and future needs
    - Extract client identifying information if available (name, policy/claim numbers, incident date)

    CRITICAL INSTRUCTIONS FOR DAMAGES - MUST USE EXACT AMOUNTS FROM EXHIBITS:

    Multiple Person Damages Structure:
    - If medical records mention multiple injured parties/claimants, create a "people" array with one object per person
    - Each person object should include their name (full name if available in medical records)
    - Organize all damages by person - do NOT mix damages between people
    - The "totalSettlementDemand" is the sum of all damages across all people

    For Special Damages (per person):
    - You MUST extract the EXACT dollar amounts from each exhibit summary below
    - Each exhibit has an "expenses" field with the actual medical bill amount
    - Attribute medical expenses to the correct person based on patient names in exhibits
    - Create one item for each medical provider/service found in the exhibits for that person
    - Use the EXACT provider name from the exhibit
    - Use the EXACT amount from the exhibit's "expenses" field
    - Calculate the total by summing ALL expenses for that specific person
    - DO NOT estimate or make up amounts - use only what's in the exhibits

    For Future Medical Expenses (per person):
    - Only include if medical records explicitly mention recommended future treatments with estimated costs for that person
    - If no future treatments are mentioned for a person, you may omit this section for them
    - DO NOT make up future treatment recommendations

    For General Damages (per person):
    - List 3-5 specific non-economic damage items based on the actual injuries described for that person
    - Estimate a reasonable total per person (typically 3-5x the special damages for moderate to severe injuries)
    - Base items on actual injury descriptions from the medical records specific to that person

    IMPORTANT: All amounts must be numbers (not strings). Use the exact format shown in the example above.

    Current Client Info Status:
    - Client Name: ${aggregatedClientInfo.clientName || "Not found"}
    - Policy Number: ${aggregatedClientInfo.policyNumber || "Not found"}
    - Claim Number: ${aggregatedClientInfo.claimNumber || "Not found"}
    - Date of Loss: ${aggregatedClientInfo.dateOfLoss || "Not found"}

    If any client info is missing above, try to extract it from the exhibit summaries.

    Exhibit Summaries:
    ${combinedSummaries}
  `;
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

    // Get existing processed exhibits (for incremental processing)
    const existingExhibitsJson = formData.get("existingExhibits") as string;
    const existingExhibits = existingExhibitsJson
      ? JSON.parse(existingExhibitsJson)
      : [];

    // Get list of files to keep (files that shouldn't be removed)
    const keepFilesJson = formData.get("keepFiles") as string;
    const keepFiles = keepFilesJson ? JSON.parse(keepFilesJson) : [];

    // Check if this is a reprocessing request
    const reprocessAll = formData.get("reprocessAll") === "true";

    console.log(`Received ${files.length} new files`);
    console.log(`Existing exhibits: ${existingExhibits.length}`);
    console.log(`Keep files: ${keepFiles.length}`);
    console.log(`Reprocess all: ${reprocessAll}`);

    if (!files || files.length === 0) {
      if (existingExhibits.length === 0 && !reprocessAll) {
        return NextResponse.json(
          { error: "No PDF files provided" },
          { status: 400 }
        );
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Step 1: Handle reprocessing vs incremental processing
    let filteredExistingExhibits = existingExhibits;
    if (reprocessAll) {
      // For reprocessing, we'll regenerate global analysis with fresh Gemini call
      console.log(
        "Reprocessing all existing exhibits with fresh global analysis"
      );
      const reprocessedExhibits = filteredExistingExhibits.map(
        (exhibit: any) => ({
          ...exhibit,
          processedAt: new Date().toISOString(),
          processingInfo: "Reprocessed",
        })
      );

      // Calculate total expenses
      const totalExpenses = reprocessedExhibits.reduce(
        (sum: number, exhibit: any) => sum + (exhibit.expenses || 0),
        0
      );

      // Use helper functions for client info processing
      const collectedClientInfo = collectClientInfo(reprocessedExhibits);
      const aggregatedClientInfo = aggregateClientInfo(collectedClientInfo);

      // Generate fresh global analysis using Gemini
      const combinedSummaries = reprocessedExhibits
        .filter((e: any) => !e.isError) // Exclude error exhibits from analysis
        .map(
          (e: any, i: number) => `Exhibit ${i + 1}: ${e.heading}\n${e.summary}`
        )
        .join("\n\n");

      const globalPrompt = generateGlobalPrompt(
        combinedSummaries,
        aggregatedClientInfo
      );

      // Make fresh Gemini API call for reprocessing
      console.log(
        "Making fresh Gemini API call for reprocessing global analysis..."
      );
      const globalRes = await retryApiCall(async () => {
        return await model.generateContent(globalPrompt);
      });

      console.log(
        "Successfully completed fresh global analysis for reprocessing"
      );
      const cleanGlobal = globalRes.response.text().replace(/```json|```/g, "");
      const globalData = JSON.parse(cleanGlobal);

      // Consolidate client information (prioritize global analysis over exhibit data)
      const finalClientInfo = {
        clientName:
          globalData.clientInfo?.clientName || aggregatedClientInfo.clientName,
        policyNumber:
          globalData.clientInfo?.policyNumber ||
          aggregatedClientInfo.policyNumber,
        claimNumber:
          globalData.clientInfo?.claimNumber ||
          aggregatedClientInfo.claimNumber,
        dateOfLoss:
          globalData.clientInfo?.dateOfLoss || aggregatedClientInfo.dateOfLoss,
      };
      delete globalData.clientInfo;
      return NextResponse.json({
        success: true,
        exhibits: reprocessedExhibits,
        totalExpenses,
        globalAnalysis: globalData,
        clientInfo: finalClientInfo,
        processingInfo: {
          totalExhibits: reprocessedExhibits.length,
          existingExhibits: reprocessedExhibits.length,
          newExhibits: 0,
          errorExhibits: reprocessedExhibits.filter((e: any) => e.isError)
            .length,
          reprocessed: true,
          processedAt: new Date().toISOString(),
        },
      });
    } else if (keepFiles.length > 0) {
      // Filter existing exhibits based on keepFiles for incremental processing
      filteredExistingExhibits = existingExhibits.filter((exhibit: any) =>
        keepFiles.includes(exhibit.fileName)
      );
      console.log(
        `Filtered to ${filteredExistingExhibits.length} existing exhibits`
      );
    }

    // Step 2: Process only NEW files (skip already processed ones)
    const exhibits = [...filteredExistingExhibits]; // Start with existing
    const collectedClientInfo = collectClientInfo(filteredExistingExhibits);

    // Check which files are already processed and get only new files
    const existingFileNames = new Set(
      filteredExistingExhibits.map((e: any) => e.fileName)
    );
    const newFiles = files.filter((file) => !existingFileNames.has(file.name));

    console.log(
      `Processing ${newFiles.length} new files (skipping ${
        files.length - newFiles.length
      } already processed)`
    );

    // Process only new files with optimized error handling
    const processedNewExhibits = await Promise.allSettled(
      newFiles.map(async (file, index) => {
        console.log(
          `Processing NEW file ${index + 1}/${newFiles.length}: ${file.name}`
        );

        try {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");

          const prompt = `
            You are an expert legal assistant specializing in personal injury demand letters. Analyze this PDF exhibit thoroughly and extract key information.

            IMPORTANT: Return ONLY valid JSON in this exact format:
            {
              "heading": "Short title for this exhibit with exhibit number and name",
              "summary": "Detailed professional summary (3-4 sentences minimum) explaining what this document shows, its significance to the case, and any key findings or recommendations",
              "expenses": "Extract any monetary amount/bill total as a number, or 0 if none",
              "clientInfo": {
                "clientName": "Full client/patient name if found, or null",
                "policyNumber": "Insurance policy number if found, or null", 
                "claimNumber": "Insurance claim number if found, or null",
                "dateOfLoss": "Date of incident/loss/accident if found (MM/DD/YYYY format), or null"
              }
            }

            Focus on:
            - Medical findings, diagnoses, treatment recommendations
            - Bills, charges, costs mentioned
            - Significance to injury case
            - Provider names and dates if relevant
            - Prognosis or ongoing treatment needs
            - Client/patient identifying information (name, DOB, etc.)
            - Insurance policy and claim numbers
            - Date of incident/accident/loss
          `;

          console.log(`Sending ${file.name} to Gemini with retry logic...`);

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

          console.log(`Successfully got response from Gemini for ${file.name}`);
          const cleanText = res.response.text().replace(/```json|```/g, "");
          const data = JSON.parse(cleanText);

          // Collect client info if present
          if (data.clientInfo) {
            Object.entries(data.clientInfo).forEach(([key, value]) => {
              if (
                value &&
                collectedClientInfo[key as keyof typeof collectedClientInfo]
              ) {
                collectedClientInfo[
                  key as keyof typeof collectedClientInfo
                ].push(value as string);
              }
            });
          }
          return {
            fileName: file.name,
            heading: data.heading || "Unknown Exhibit",
            summary: data.summary || "No summary available",
            expenses: Number(data.expenses) || 0,
            clientInfo: data.clientInfo || null,
            processedAt: new Date().toISOString(),
            fileHash: generateFileHash(file),
          };
        } catch (err: any) {
          console.error(`Error processing ${file.name}:`, err.message);
          return {
            fileName: file.name,
            heading: `Error: ${file.name}`,
            summary: `Failed to analyze this file: ${err.message}. Please try uploading a different format or check if the file is corrupted.`,
            expenses: 0,
            processedAt: new Date().toISOString(),
            fileHash: generateFileHash(file),
            isError: true,
          };
        }
      })
    );

    // Add processed results to exhibits array
    processedNewExhibits.forEach((result, index) => {
      if (result.status === "fulfilled") {
        exhibits.push(result.value);
        console.log(`Successfully processed: ${newFiles[index].name}`);
      } else {
        console.error(
          `Failed to process: ${newFiles[index].name}`,
          result.reason
        );
        // Add error exhibit
        exhibits.push({
          fileName: newFiles[index].name,
          heading: `Error: ${newFiles[index].name}`,
          summary: `Failed to process file: ${
            result.reason?.message || "Unknown error"
          }`,
          expenses: 0,
          processedAt: new Date().toISOString(),
          fileHash: generateFileHash(newFiles[index]),
          isError: true,
        });
      }
    });

    console.log(
      `Total exhibits after processing: ${exhibits.length} (${filteredExistingExhibits.length} existing + ${newFiles.length} new)`
    );

    // Step 3: Generate comprehensive analysis
    const aggregatedClientInfo = aggregateClientInfo(collectedClientInfo);
    console.log(
      "Aggregated client info from all exhibits:",
      aggregatedClientInfo
    );

    // Step 4: Generate global analysis from ALL exhibits (existing + new)
    const validExhibits = exhibits.filter((e: any) => !e.isError);
    const combinedSummaries = validExhibits
      .map(
        (e: any, i: number) => `Exhibit ${i + 1}: ${e.heading}\n${e.summary}`
      )
      .join("\n\n");

    const globalPrompt = generateGlobalPrompt(
      combinedSummaries,
      aggregatedClientInfo
    );

    // Generate global analysis
    console.log("Starting global analysis with retry logic...");
    const globalRes = await retryApiCall(async () => {
      return await model.generateContent(globalPrompt);
    });

    console.log("Successfully completed global analysis");
    const cleanGlobal = globalRes.response.text().replace(/```json|```/g, "");
    const globalData = JSON.parse(cleanGlobal);

    // Step 5: Consolidate final client information
    const finalClientInfo = {
      clientName:
        globalData.clientInfo?.clientName || aggregatedClientInfo.clientName,
      policyNumber:
        globalData.clientInfo?.policyNumber ||
        aggregatedClientInfo.policyNumber,
      claimNumber:
        globalData.clientInfo?.claimNumber || aggregatedClientInfo.claimNumber,
      dateOfLoss:
        globalData.clientInfo?.dateOfLoss || aggregatedClientInfo.dateOfLoss,
    };

    console.log("Final consolidated client info:", finalClientInfo);

    // Calculate total expenses efficiently
    const totalExpenses = exhibits.reduce(
      (sum, e: any) => sum + (e.expenses || 0),
      0
    );

    // Clean up global data
    delete globalData.clientInfo; // Remove to avoid redundancy

    // Return final optimized response
    return NextResponse.json({
      success: true,
      exhibits,
      totalExpenses,
      globalAnalysis: globalData,
      clientInfo: finalClientInfo,
      processingInfo: {
        totalExhibits: exhibits.length,
        existingExhibits: filteredExistingExhibits.length,
        newExhibits: newFiles.length,
        errorExhibits: exhibits.filter((e: any) => e.isError).length,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Processing failed", details: err.message },
      { status: 500 }
    );
  }
}
