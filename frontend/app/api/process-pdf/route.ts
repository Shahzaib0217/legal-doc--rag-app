import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ExtractedInfo {
  clientName?: string;
  dateOfIncident?: string;
  location?: string;
  injuries?: string[];
  medicalProvider?: string;
  treatmentDates?: string[];
  medicalExpenses?: number;
  diagnosis?: string[];
  services?: string[];
  insuranceCompany?: string;
  policyNumber?: string;
  claimNumber?: string;
  facts?: string;
  liability?: string;
  vehicleInfo?: string;
  otherPartyInfo?: string;
  rawText?: string;
  incidentDescription?: string;
  defendantInfo?: string;
  damages?: string;
  violations?: string[];
  witnesses?: string[];
  officerInfo?: string;
  timeOfIncident?: string;
}

interface SuggestedHeadings {
  facts?: string;
  liability?: string;
  injuries?: string;
  medical?: string;
  damages?: string;
  demand?: string;
  natureOfClaim?: string;
  medicalTreatment?: string;
}

interface SuggestedContent {
  facts?: string;
  liability?: string;
  injuries?: string;
  medicalTreatment?: string;
  damages?: string;
  demand?: string;
}

interface ProcessedData {
  fileName: string;
  fileSize?: number;
  documentType: string;
  extractedInfo?: ExtractedInfo;
  suggestedHeadings?: SuggestedHeadings;
  suggestedContent?: SuggestedContent;
  confidence: number;
  error?: string;
}

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not found in environment variables");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please add GEMINI_API_KEY to .env.local file.",
        },
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

    const extractedData: ProcessedData[] = [];

    // Process each PDF file
    for (const file of files) {
      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from PDF - simplified approach for serverless
        let pdfText = "";
        let extractionSuccessful = false;

        try {
          // Try pdf-parse with minimal options
          const pdf = (await import("pdf-parse")).default;
          const pdfData = await pdf(buffer, {
            max: 0, // Parse all pages
          });
          pdfText = pdfData.text;
          extractionSuccessful = true;
        } catch (pdfError) {
          console.error("PDF parsing failed:", pdfError);

          // Create intelligent fallback based on filename
          const fileName = file.name.toLowerCase();
          if (fileName.includes("police") || fileName.includes("report")) {
            pdfText = `POLICE REPORT - ${file.name}
            
This appears to be a police report document. Key information that would typically be found:
- Date and time of incident
- Location of incident  
- Parties involved
- Vehicle information
- Officer observations
- Violations or citations issued
- Witness statements
            
Please manually review this document and enter the specific details into the letter.`;
          } else if (
            fileName.includes("medical") ||
            fileName.includes("bill") ||
            fileName.includes("treatment")
          ) {
            pdfText = `MEDICAL DOCUMENT - ${file.name}
            
This appears to be a medical document. Key information that would typically be found:
- Patient name and date of birth
- Date of service
- Medical provider information
- Diagnosis and treatment codes
- Services provided
- Medical expenses and charges
- Insurance information
            
Please manually review this document and enter the specific medical details into the letter.`;
          } else if (
            fileName.includes("insurance") ||
            fileName.includes("coverage")
          ) {
            pdfText = `INSURANCE DOCUMENT - ${file.name}
            
This appears to be an insurance document. Key information that would typically be found:
- Policy holder information
- Policy number and coverage limits
- Insurance company details
- Claim number
- Coverage details
- Contact information
            
Please manually review this document and enter the specific insurance details into the letter.`;
          } else {
            pdfText = `LEGAL DOCUMENT - ${file.name}
            
This document could not be automatically processed. Key information to look for:
- Names and contact information
- Dates and locations
- Financial amounts
- Legal descriptions
- Relevant facts and circumstances
            
Please manually review this document and enter the relevant details into the letter sections.`;
          }
        }

        // Send to Gemini for analysis
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert legal document analyzer specializing in personal injury cases. 

        ${
          extractionSuccessful
            ? "Analyze this document text and intelligently extract ALL relevant information."
            : "The PDF text extraction failed, but based on the filename and document type, provide intelligent suggestions for what information should be gathered from this document type."
        }

        **IMPORTANT INSTRUCTIONS:**
        1. ${
          extractionSuccessful
            ? "Carefully read and understand the ENTIRE document"
            : "Based on the document type, suggest what information should be collected"
        }
        2. Determine what type of document this is (police report, medical bill, insurance document, etc.)
        3. ${
          extractionSuccessful
            ? "Extract ALL factual information that would be relevant for a demand letter"
            : "Suggest what factual information would typically be found in this type of document"
        }
        4. Create intelligent, case-specific headings and content based on what you find
        5. Generate compelling, professional legal language for each section

        Return your analysis in this EXACT JSON format:

        {
          "documentType": "string (police_report, medical_bill, medical_record, insurance_document, correspondence, etc.)",
          "confidence": "number (0.0-1.0 indicating how confident you are in the analysis)",
          "extractedInfo": {
            "clientName": "string or null",
            "dateOfIncident": "string (YYYY-MM-DD format) or null", 
            "timeOfIncident": "string or null",
            "location": "detailed location string or null",
            "incidentDescription": "detailed description of what happened",
            "injuries": ["array of specific injury descriptions"],
            "medicalProvider": "provider name or null",
            "treatmentDates": ["array of treatment dates"],
            "medicalExpenses": "number (total cost) or 0",
            "diagnosis": ["array of medical diagnoses/conditions"],
            "services": ["array of medical services provided"],
            "insuranceCompany": "insurance company name or null",
            "policyNumber": "policy number or null", 
            "claimNumber": "claim number or null",
            "defendantInfo": "information about other party",
            "vehicleInfo": "vehicle information",
            "violations": ["traffic violations or fault indicators"],
            "damages": "property or other damages described",
            "witnesses": ["witness information if any"],
            "officerInfo": "police officer details if applicable"
          },
          "suggestedContent": {
            "facts": "Professionally written paragraph describing the incident facts based on this document. Use legal language and be specific about dates, locations, and circumstances.",
            "liability": "Legal analysis paragraph explaining why the other party is liable based on this document. Reference specific violations or negligent acts found.",
            "injuries": "Professional description of injuries sustained, using medical terminology from the document.",
            "medicalTreatment": "Detailed description of medical treatment received, including provider names, dates, and services.",
            "damages": "Professional summary of all damages and expenses identified in this document.",
            "demand": "Suggested demand language based on the severity and costs identified in this document."
          },
          "suggestedHeadings": {
            "natureOfClaim": "Custom heading based on the type of incident (e.g., 'Motor Vehicle Collision', 'Slip and Fall Incident', etc.)",
            "liability": "Custom liability heading (e.g., 'Defendant's Negligent Operation of Motor Vehicle', 'Premises Liability', etc.)",
            "injuries": "Custom injury heading (e.g., 'Significant Orthopedic Injuries', 'Traumatic Brain Injury', etc.)",
            "medicalTreatment": "Custom treatment heading (e.g., 'Emergency and Ongoing Medical Care', 'Surgical Intervention Required', etc.)",
            "damages": "Custom damages heading (e.g., 'Substantial Economic Losses', 'Ongoing Medical Expenses', etc.)"
          }
        }

        **Document Content to Analyze:**
        ${pdfText}

        **Remember:** ${
          extractionSuccessful
            ? "Analyze this document thoroughly and provide intelligent, case-specific content. Don't use generic templates - make everything specific to what you actually find in the document."
            : "Since text extraction failed, provide helpful guidance on what information should be manually collected from this type of document and create appropriate template content for this document type."
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("here", response);
        const text = response.text();

        // Try to parse JSON response
        let parsedData: any;
        try {
          // Remove any markdown formatting
          const cleanText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "");
          parsedData = JSON.parse(cleanText);
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", parseError);
          console.log("Raw response:", text);
          // Fallback response
          parsedData = {
            documentType: "unknown",
            extractedInfo: {
              rawText: pdfText.substring(0, 1000), // First 1000 characters
            },
            suggestedContent: {
              facts: `Document analysis failed. Raw content: ${pdfText.substring(
                0,
                500
              )}...`,
              liability: "Unable to analyze liability from this document.",
              injuries: "Unable to extract injury information.",
              medicalTreatment: "Unable to extract medical treatment details.",
              damages: "Unable to calculate damages from this document.",
              demand: "Unable to generate demand based on this document.",
            },
            suggestedHeadings: {
              natureOfClaim: "Document Analysis",
              liability: "Liability Analysis",
              injuries: "Injury Assessment",
              medicalTreatment: "Medical Treatment",
              damages: "Damages Assessment",
            },
            confidence: 0.1,
          };
        }

        extractedData.push({
          fileName: file.name,
          fileSize: file.size,
          ...parsedData,
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        const errorMessage =
          fileError instanceof Error ? fileError.message : "Unknown error";
        extractedData.push({
          fileName: file.name,
          error: `Failed to process: ${errorMessage}`,
          documentType: "error",
          confidence: 0,
        });
      }
    }

    // Combine all extracted data into a unified structure
    const combinedData = combineExtractedData(extractedData);

    return NextResponse.json({
      success: true,
      processedFiles: files.length,
      extractedData,
      combinedLetterData: combinedData,
    });
  } catch (error) {
    console.error("PDF processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process PDF files", details: errorMessage },
      { status: 500 }
    );
  }
}

function combineExtractedData(extractedData: ProcessedData[]) {
  const combined = {
    attorney: {
      name: "",
      title: "",
      specialization: "",
      address: "",
      phone: "",
      fax: "",
    },
    caseInfo: {
      client: "",
      policyNumber: "",
      claimNumber: "",
      dateOfLoss: "",
    },
    insuranceCompany: {
      name: "",
      address: "",
      attention: "",
    },
    facts: [] as string[],
    injuries: [] as string[],
    medicalTreatment: [] as any[],
    totalMedicalExpenses: 0,
    suggestedContent: {
      facts: "",
      liability: "",
      injuries: "",
      medical: "",
      damages: "",
      demand: "",
    },
    suggestedHeadings: {
      natureOfClaim: "",
      liability: "",
      injuries: "",
      medicalTreatment: "",
      damages: "",
    },
  };

  let totalExpenses = 0;

  extractedData.forEach((data) => {
    if (data.extractedInfo) {
      const info = data.extractedInfo;

      // Extract client info
      if (info.clientName) combined.caseInfo.client = info.clientName;
      if (info.dateOfIncident)
        combined.caseInfo.dateOfLoss = info.dateOfIncident;
      if (info.policyNumber) combined.caseInfo.policyNumber = info.policyNumber;
      if (info.claimNumber) combined.caseInfo.claimNumber = info.claimNumber;

      // Extract insurance info
      if (info.insuranceCompany)
        combined.insuranceCompany.name = info.insuranceCompany;

      // Extract injuries
      if (info.injuries && Array.isArray(info.injuries)) {
        combined.injuries.push(...info.injuries);
      }

      // Extract medical treatment
      if (info.medicalProvider || info.medicalExpenses) {
        combined.medicalTreatment.push({
          provider: info.medicalProvider || "Medical Provider",
          amount: info.medicalExpenses || 0,
          dateOfService: info.treatmentDates?.[0] || "",
          services: info.services || [],
          diagnosis: info.diagnosis || [],
        });

        if (info.medicalExpenses) {
          totalExpenses += parseFloat(info.medicalExpenses.toString()) || 0;
        }
      }
    }

    // Extract suggested content from analysis
    if (data.suggestedContent) {
      const content = data.suggestedContent;
      if (content.facts)
        combined.suggestedContent.facts += content.facts + "\n\n";
      if (content.liability)
        combined.suggestedContent.liability += content.liability + "\n\n";
      if (content.injuries)
        combined.suggestedContent.injuries += content.injuries + "\n\n";
      if (content.medicalTreatment)
        combined.suggestedContent.medical += content.medicalTreatment + "\n\n";
      if (content.damages)
        combined.suggestedContent.damages += content.damages + "\n\n";
      if (content.demand)
        combined.suggestedContent.demand += content.demand + "\n\n";
    }

    // Extract suggested headings
    if (data.suggestedHeadings) {
      const headings = data.suggestedHeadings;
      if (headings.natureOfClaim)
        combined.suggestedHeadings.natureOfClaim = headings.natureOfClaim;
      if (headings.liability)
        combined.suggestedHeadings.liability = headings.liability;
      if (headings.injuries)
        combined.suggestedHeadings.injuries = headings.injuries;
      if (headings.medicalTreatment)
        combined.suggestedHeadings.medicalTreatment = headings.medicalTreatment;
      if (headings.damages)
        combined.suggestedHeadings.damages = headings.damages;
    }
  });

  combined.totalMedicalExpenses = totalExpenses;

  // Remove duplicates from injuries
  combined.injuries = Array.from(new Set(combined.injuries));

  return combined;
}
