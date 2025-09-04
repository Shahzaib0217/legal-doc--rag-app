import React, { useRef } from "react";
import { Document, MedicalBill, LetterData } from "@/types";

interface SidebarProps {
  documents: Document[];
  medicalBills: MedicalBill[];
  letterData: LetterData;
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (index: number) => void;
  onUpdateCaseInfo: (
    field: keyof LetterData["caseInfo"],
    value: string
  ) => void;
  onUpdateLetterData: (data: LetterData) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  documents,
  medicalBills,
  letterData,
  onAddDocument,
  onRemoveDocument,
  onUpdateCaseInfo,
  onUpdateLetterData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      if (file.type === "application/pdf") {
        formData.append("pdfs", file);
      }
    });

    if (formData.getAll("pdfs").length === 0) {
      alert("Please select PDF files only");
      return;
    }

    try {
      // Show loading state
      console.log("Processing PDFs...");

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Process each extracted document
        result.extractedData.forEach((docData: any, index: number) => {
          const newDoc: Document = {
            name: docData.fileName,
            type: docData.documentType as Document["type"],
            processed: true,
            data: docData.extractedInfo || {},
          };
          onAddDocument(newDoc);
        });

        // Update letter data with combined information
        if (result.combinedLetterData) {
          const combined = result.combinedLetterData;

          // Create updated letter data
          const updatedLetterData = {
            ...letterData,
            caseInfo: {
              ...letterData.caseInfo,
              ...(combined.caseInfo.client && {
                client: combined.caseInfo.client,
              }),
              ...(combined.caseInfo.dateOfLoss && {
                dateOfLoss: combined.caseInfo.dateOfLoss,
              }),
              ...(combined.caseInfo.policyNumber && {
                policyNumber: combined.caseInfo.policyNumber,
              }),
              ...(combined.caseInfo.claimNumber && {
                claimNumber: combined.caseInfo.claimNumber,
              }),
            },
            insuranceCompany: {
              ...letterData.insuranceCompany,
              ...(combined.insuranceCompany.name && {
                name: combined.insuranceCompany.name,
              }),
            },
            injuries: [...letterData.injuries, ...combined.injuries],
            medicalTreatment: [
              ...letterData.medicalTreatment,
              ...combined.medicalTreatment,
            ],
            totalMedicalExpenses:
              letterData.totalMedicalExpenses + combined.totalMedicalExpenses,
            suggestedContent: combined.suggestedContent,
          };

          onUpdateLetterData(updatedLetterData);
        }

        console.log("PDFs processed successfully!");
      } else {
        throw new Error("Processing failed");
      }
    } catch (error) {
      console.error("Error processing PDFs:", error);
      alert("Failed to process PDF files. Please try again.");

      // Fallback to simulation for now
      Array.from(files).forEach((file) => {
        if (file.type === "application/pdf") {
          const docType = detectDocumentType(file.name);
          const extractedData = simulateDataExtraction(docType);

          const newDoc: Document = {
            name: file.name,
            type: docType,
            processed: true,
            data: extractedData,
          };

          onAddDocument(newDoc);
        }
      });
    }
  };

  const detectDocumentType = (filename: string): Document["type"] => {
    const name = filename.toLowerCase();
    if (name.includes("police") || name.includes("report")) return "police";
    if (
      name.includes("medical") ||
      name.includes("bill") ||
      name.includes("invoice")
    )
      return "medical";
    if (name.includes("record") || name.includes("chart"))
      return "medical_record";
    return "document";
  };

  const simulateDataExtraction = (docType: Document["type"]) => {
    const templates = {
      medical: {
        provider: "Sample Medical Provider",
        dateOfService: new Date().toLocaleDateString(),
        amount: Math.floor(Math.random() * 5000) + 100,
        services: ["Medical consultation", "Treatment provided"],
        diagnosis: ["Sample diagnosis"],
      },
      police: {
        dateOfIncident: new Date().toLocaleDateString(),
        location: "Sample Location",
        parties: {
          plaintiff: letterData.caseInfo.client,
          defendant: "Unknown Driver",
        },
        incidentDescription: "Vehicle collision incident",
      },
      medical_record: {
        provider: "Sample Healthcare Provider",
        findings: ["Sample medical findings"],
        recommendations: ["Follow-up treatment recommended"],
      },
      document: { type: docType, content: "Document processed" },
    };

    return templates[docType];
  };

  const getDocIcon = (type: Document["type"]) => {
    const icons = {
      police: "fa-file-alt",
      medical: "fa-file-medical",
      medical_record: "fa-notes-medical",
      document: "fa-file",
    };
    return icons[type] || "fa-file";
  };

  const totalExpenses = medicalBills.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Case Information</h3>
        <div className="form-group">
          <label className="form-label">Client Name</label>
          <input
            type="text"
            className="form-control"
            value={letterData.caseInfo.client}
            onChange={(e) => onUpdateCaseInfo("client", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Date of Loss</label>
          <input
            type="date"
            className="form-control"
            value={letterData.caseInfo.dateOfLoss}
            onChange={(e) => onUpdateCaseInfo("dateOfLoss", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Policy Number</label>
          <input
            type="text"
            className="form-control"
            value={letterData.caseInfo.policyNumber}
            onChange={(e) => onUpdateCaseInfo("policyNumber", e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Upload Documents</h3>
        <div
          className="upload-area"
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="upload-content">
            <i className="fas fa-cloud-upload-alt"></i>
            <p>Drop files here or click to browse</p>
            <span className="upload-subtext">PDF files only</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      <div className="sidebar-section">
        <h3>Documents</h3>
        <div className="document-list">
          {documents.map((doc, index) => (
            <div key={index} className="document-item">
              <div className="doc-icon">
                <i className={`fas ${getDocIcon(doc.type)}`}></i>
              </div>
              <div className="doc-info">
                <div className="doc-name">{doc.name}</div>
                <div className="doc-status">
                  {doc.processed ? "Processed" : "Processing..."}
                </div>
              </div>
              <button
                className="doc-remove"
                onClick={() => onRemoveDocument(index)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Medical Expenses</h3>
        <div className="expense-summary">
          <div className="expense-total">
            Total: $
            {totalExpenses.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="expense-breakdown">
          {medicalBills.map((bill, index) => (
            <div key={index} className="expense-item">
              <div className="expense-provider">{bill.provider}</div>
              <div className="expense-amount">
                $
                {bill.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
