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

  // Helper function to check for duplicates
  const checkForDuplicates = (newFiles: File[]) => {
    const existingFileNames = new Set([
      ...selectedFiles.map((f) => f.name),
      ...exhibits.map((e) => e.fileName),
    ]);

    const duplicateFiles: string[] = [];
    const uniqueFiles: File[] = [];

    newFiles.forEach((file) => {
      if (existingFileNames.has(file.name)) {
        duplicateFiles.push(file.name);
      } else {
        uniqueFiles.push(file);
      }
    });

    return { duplicateFiles, uniqueFiles };
  };

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

      const { duplicateFiles, uniqueFiles } = checkForDuplicates(pdfFiles);

      if (duplicateFiles.length > 0) {
        const duplicateNames = duplicateFiles.join(", ");
        alert(`Duplicate files not added: ${duplicateNames}`);
      }

      if (uniqueFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...uniqueFiles]);
      }
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

      const { duplicateFiles, uniqueFiles } = checkForDuplicates(pdfFiles);

      if (duplicateFiles.length > 0) {
        const duplicateNames = duplicateFiles.join(", ");
        alert(`Duplicate files not added: ${duplicateNames}`);
      }

      if (uniqueFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...uniqueFiles]);
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessFiles = async () => {
    // Check if we have new files to process or need to reprocess existing
    const hasNewFiles = selectedFiles.length > 0;
    const hasExistingFiles = exhibits.length > 0;

    if (!hasNewFiles && !hasExistingFiles) return;

    setIsUploading(true);
    try {
      const formData = new FormData();

      // Add new files if any
      if (hasNewFiles) {
        selectedFiles.forEach((file) => {
          formData.append("pdfs", file);
        });
      }

      // Include existing exhibits for incremental processing or reprocessing
      if (hasExistingFiles) {
        formData.append("existingExhibits", JSON.stringify(exhibits));
      }

      // Include list of files to keep (all current exhibits)
      if (hasExistingFiles) {
        const keepFiles = exhibits.map((exhibit) => exhibit.fileName);
        formData.append("keepFiles", JSON.stringify(keepFiles));
      }

      // If no new files, this is a reprocessing request
      if (!hasNewFiles && hasExistingFiles) {
        formData.append("reprocessAll", "true");
      }

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onApiResponse(result);
        if (hasNewFiles) {
          setSelectedFiles([]); // Clear selected files after successful processing
        }

        // Show processing info to user
        if (result.processingInfo) {
          const {
            totalExhibits,
            existingExhibits,
            newExhibits,
            errorExhibits,
          } = result.processingInfo;
          console.log(
            `Processing complete: ${totalExhibits} total (${existingExhibits} existing + ${newExhibits} new, ${errorExhibits} errors)`
          );
        }
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

    // Create updated API response without reprocessing
    if (updatedExhibits.length > 0) {
      const updatedApiResponse = {
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
        clientInfo: letterData.apiData?.clientInfo || {
          clientName: null,
          policyNumber: null,
          claimNumber: null,
          dateOfLoss: null,
        },
      };
      onApiResponse(updatedApiResponse);
    } else {
      // No exhibits left, create empty response
      const emptyResponse = {
        success: true,
        exhibits: [],
        totalExpenses: 0,
        globalAnalysis: {
          natureOfClaim: "",
          liability: "",
          injuries: [],
          damages: "",
          facts: "",
        },
        clientInfo: {
          clientName: null,
          policyNumber: null,
          claimNumber: null,
          dateOfLoss: null,
        },
      };
      onApiResponse(emptyResponse);
    }
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
          <div className="upload-subtext">Supported formats: PDF only</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>

        {/* All Files - Selected + Processed */}
        {(selectedFiles.length > 0 || exhibits.length > 0) && (
          <div className="files-section">
            <h4>Files ({selectedFiles.length + exhibits.length})</h4>

            {/* Selected Files (New) */}
            {selectedFiles.length > 0 && (
              <div className="file-group">
                <h5 className="file-group-title">
                  <i className="fas fa-clock" style={{ color: "#f39c12" }}></i>
                  Ready to Process ({selectedFiles.length})
                </h5>
                <div className="file-list">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`new-${index}`}
                      className="file-item file-item--new"
                    >
                      <div className="file-info">
                        <i
                          className="fas fa-file-pdf"
                          style={{ color: "#e74c3c" }}
                        ></i>
                        <span className="file-name" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => removeSelectedFile(index)}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Files */}
            {exhibits.length > 0 && (
              <div className="file-group">
                <h5 className="file-group-title">
                  <i
                    className="fas fa-check-circle"
                    style={{ color: "#27ae60" }}
                  ></i>
                  Processed ({exhibits.length})
                </h5>
                <div className="file-list">
                  {exhibits.map((exhibit, index) => (
                    <div
                      key={`processed-${index}`}
                      className="file-item file-item--processed"
                    >
                      <div className="file-info">
                        <i
                          className="fas fa-file-pdf"
                          style={{ color: "#27ae60" }}
                        ></i>
                        <span className="file-name" title={exhibit.fileName}>
                          {exhibit.fileName}
                        </span>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => removeExhibit(index)}
                        disabled={isUploading}
                        title="Remove file"
                      >
                        {isUploading ? "..." : "×"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Process/Reprocess Button */}
            {(selectedFiles.length > 0 ||
              (exhibits.length > 0 && selectedFiles.length === 0)) && (
              <button
                className="btn btn--primary"
                onClick={handleProcessFiles}
                disabled={isUploading}
                style={{ marginTop: "15px", width: "100%" }}
              >
                {isUploading
                  ? "Processing..."
                  : selectedFiles.length > 0
                  ? `Process ${selectedFiles.length} New File${
                      selectedFiles.length > 1 ? "s" : ""
                    }`
                  : `Reprocess All Files (${exhibits.length})`}
              </button>
            )}
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
