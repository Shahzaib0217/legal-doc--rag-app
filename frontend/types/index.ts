export interface AttorneyInfo {
  name: string;
  title: string;
  specialization: string;
  address: string;
  phone: string;
  fax: string;
}

export interface InsuranceCompany {
  name: string;
  address: string;
  attention: string;
}

export interface CaseInfo {
  client: string;
  policyNumber: string;
  claimNumber: string;
  dateOfLoss: string;
}

export interface ClientInfo {
  clientName: string | null;
  policyNumber: string | null;
  claimNumber: string | null;
  dateOfLoss: string | null;
}

export interface MedicalBill {
  provider: string;
  dateOfService: string;
  amount: number;
  services: string[];
  diagnosis?: string[];
  findings?: string[];
}

export interface PoliceReportData {
  dateOfIncident: string;
  timeOfIncident: string;
  location: string;
  parties: {
    plaintiff: string;
    defendant: string;
  };
  vehicleInfo: {
    plaintiffVehicle: string;
    defendantVehicle: string;
  };
  incidentDescription: string;
  violations: string[];
}

// Simple structure matching your API response exactly
export interface Exhibit {
  fileName: string;
  heading: string;
  summary: string;
  expenses: number;
  clientInfo?: ClientInfo | null;
  processedAt?: string;
  fileHash?: string;
  isError?: boolean;
  images?: string[]; // Array of Base64 encoded image data
}

export interface DamagesCategoryItem {
  description: string;
  amount: number;
}

export interface DamagesCategory {
  total: number;
  items: DamagesCategoryItem[];
}

export interface PersonDamages {
  name: string;
  specialDamages?: DamagesCategory;
  futureMedicalExpenses?: DamagesCategory;
  generalDamages?: {
    total: number;
    items: string[];
  };
}

export interface DamagesBreakdown {
  people: PersonDamages[];
  totalSettlementDemand: number;
}

export interface GlobalAnalysis {
  natureOfClaim: string;
  liability: string;
  injuries: string[];
  damages: string | DamagesBreakdown;
  facts: string;
  clientInfo?: ClientInfo;
}

export interface ApiResponse {
  success: boolean;
  exhibits: Exhibit[];
  totalExpenses: number;
  globalAnalysis: GlobalAnalysis;
  clientInfo?: ClientInfo;
  processingInfo?: {
    totalExhibits: number;
    existingExhibits: number;
    newExhibits: number;
    errorExhibits: number;
    processedAt: string;
  };
}

export interface Document {
  name: string;
  type: "police" | "medical" | "medical_record" | "document";
  processed: boolean;
  data: any;
}

export interface LetterData {
  attorney: AttorneyInfo;
  insuranceCompany: InsuranceCompany;
  caseInfo: CaseInfo;
  facts: string[];
  injuries: string[];
  medicalTreatment: MedicalBill[];
  totalMedicalExpenses: number;
  openingParagraph?: string;
  // Use the simple API response structure directly
  apiData?: ApiResponse;
  suggestedContent?: {
    natureOfClaim?: string;
    facts?: string;
    liability?: string;
    injuries?: string[] | string;
    medical?: string;
    damages?: string | DamagesBreakdown;
    demand?: string;
  };
  suggestedHeadings?: {
    natureOfClaim?: string;
    liability?: string;
    injuries?: string;
    medicalTreatment?: string;
    damages?: string;
  };
}
