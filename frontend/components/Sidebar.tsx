import React, { useRef, useState } from "react";
import { Exhibit, LetterData, ApiResponse } from "@/types";

interface SidebarProps {
  exhibits: Exhibit[];
  letterData: LetterData;
  onUpdateCaseInfo: (
    field: keyof LetterData["caseInfo"],
    value: string
  ) => void;
  onUpdateLetterData: (data: LetterData) => void;
  onApiResponse: (response: ApiResponse) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  exhibits,
  letterData,
  onUpdateCaseInfo,
  onUpdateLetterData,
  onApiResponse,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(
        (file) => file.type === "application/pdf"
      );

      if (pdfFiles.length === 0) {
        alert("Please select PDF files only");
        return;
      }

      setSelectedFiles((prev) => [...prev, ...pdfFiles]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const pdfFiles = Array.from(files).filter(
        (file) => file.type === "application/pdf"
      );

      if (pdfFiles.length === 0) {
        alert("Please drop PDF files only");
        return;
      }

      setSelectedFiles((prev) => [...prev, ...pdfFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("pdfs", file);
      });

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onApiResponse(result);
        setSelectedFiles([]); // Clear selected files after successful processing
      } else {
        alert("Error processing PDFs: " + result.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload and process files");
    } finally {
      setIsUploading(false);
    }
  };

  const removeExhibit = (index: number) => {
    const updatedExhibits = exhibits.filter((_, i) => i !== index);
    // Update total expenses
    const newTotal = updatedExhibits.reduce(
      (sum, exhibit) => sum + exhibit.expenses,
      0
    );

    const updatedLetterData = {
      ...letterData,
      totalMedicalExpenses: newTotal,
    };

    onUpdateLetterData(updatedLetterData);

    // Create new API response with updated exhibits
    const updatedApiResponse: ApiResponse = {
      success: true,
      exhibits: updatedExhibits,
      totalExpenses: newTotal,
      globalAnalysis: letterData.apiData?.globalAnalysis || {
        natureOfClaim: "",
        liability: "",
        injuries: [],
        damages: "",
        facts: "",
      },
    };

    onApiResponse(updatedApiResponse);
  };

  const totalExpenses = exhibits.reduce(
    (sum, exhibit) => sum + exhibit.expenses,
    0
  );

  return (
    <aside className="sidebar sidebar--left">
      {/* Case Information */}
      <div className="sidebar-section">
        <h3>Case Information</h3>
        <div className="form-group">
          <label className="form-label">Client Name</label>
          <input
            type="text"
            className="form-control"
            value={letterData.caseInfo.client}
            onChange={(e) => onUpdateCaseInfo("client", e.target.value)}
            placeholder="Enter client name"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Policy Number</label>
          <input
            type="text"
            className="form-control"
            value={letterData.caseInfo.policyNumber}
            onChange={(e) => onUpdateCaseInfo("policyNumber", e.target.value)}
            placeholder="Enter policy number"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Claim Number</label>
          <input
            type="text"
            className="form-control"
            value={letterData.caseInfo.claimNumber}
            onChange={(e) => onUpdateCaseInfo("claimNumber", e.target.value)}
            placeholder="Enter claim number"
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
      </div>

      {/* PDF Upload */}
      <div className="sidebar-section">
        <h3>Upload Documents</h3>
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <i className="fas fa-cloud-upload-alt"></i>
          <p>Drop PDF files here or click to select</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h4>Selected Files ({selectedFiles.length})</h4>
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <i className="fas fa-file-pdf"></i>
                    <span className="file-name">{file.name}</span>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeSelectedFile(index)}
                    title="Remove file"
                    style={{
                      background: "#ff4757",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "12px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ff3742";
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ff4757";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleProcessFiles}
              disabled={isUploading || selectedFiles.length === 0}
              style={{ marginTop: "10px", width: "100%" }}
            >
              {isUploading
                ? "Processing..."
                : `Process ${selectedFiles.length} PDF${
                    selectedFiles.length > 1 ? "s" : ""
                  }`}
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="sidebar-section">
        <h3>Summary</h3>
        <div className="card">
          <div className="card__body">
            <p>
              <strong>Total Medical Expenses:</strong> $
              {totalExpenses.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p>
              <strong>Number of Exhibits:</strong> {exhibits.length}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
