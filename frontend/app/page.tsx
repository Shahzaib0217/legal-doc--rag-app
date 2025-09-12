"use client";

import React, { useState, useEffect } from "react";
import { LetterData, Exhibit, ApiResponse } from "@/types";
import { getEmptyLetterData, calculateTotalExpenses } from "@/lib/sampleData";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import LetterPreview from "@/components/LetterPreview";
import EditSidebar from "@/components/EditSidebar";

export default function Home() {
  const [letterData, setLetterData] = useState<LetterData>(
    getEmptyLetterData()
  );
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [pleadingPaper, setPleadingPaper] = useState<boolean>(false);

  useEffect(() => {
    // Initialize with empty data
    const emptyData = getEmptyLetterData();
    setLetterData(emptyData);
    setExhibits([]);
  }, []);

  const updateLetterData = (data: LetterData) => {
    setLetterData(data);
  };

  const updateCaseInfo = (
    field: keyof LetterData["caseInfo"],
    value: string
  ) => {
    setLetterData((prev) => ({
      ...prev,
      caseInfo: {
        ...prev.caseInfo,
        [field]: value,
      },
    }));
  };

  const handleApiResponse = (response: ApiResponse) => {
    setApiData(response);
    setExhibits(response.exhibits);

    // Update letterData with API response
    setLetterData((prev) => ({
      ...prev,
      apiData: response,
      totalMedicalExpenses: response.totalExpenses,
      // Auto-populate case info with extracted client information
      caseInfo: {
        ...prev.caseInfo,
        client: response.clientInfo?.clientName || prev.caseInfo.client,
        policyNumber:
          response.clientInfo?.policyNumber || prev.caseInfo.policyNumber,
        claimNumber:
          response.clientInfo?.claimNumber || prev.caseInfo.claimNumber,
        dateOfLoss: response.clientInfo?.dateOfLoss || prev.caseInfo.dateOfLoss,
      },
      suggestedContent: {
        natureOfClaim: response.globalAnalysis.natureOfClaim,
        facts: response.globalAnalysis.facts,
        liability: response.globalAnalysis.liability,
        injuries: response.globalAnalysis.injuries,
        damages: response.globalAnalysis.damages,
      },
    }));
  };

  const handleSectionClick = (sectionName: string) => {
    setSelectedSection(sectionName);
  };

  return (
    <>
      <Header
        onExport={() => window.print()}
        pleadingPaper={pleadingPaper}
        onPleadingPaperChange={setPleadingPaper}
        onSave={async () => {
          try {
            const response = await fetch("/api/export-word", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                letterData,
                exhibits,
                pleadingPaper,
              }),
            });

            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${
                pleadingPaper ? "pleading-" : ""
              }demand-letter-${letterData.caseInfo.client.replace(
                /\s+/g,
                "-"
              )}-${new Date().toISOString().split("T")[0]}.docx`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } else {
              alert("Error exporting to Word. Please try again.");
            }
          } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export to Word. Please try again.");
          }
        }}
      />

      <div className="main-content">
        <Sidebar
          exhibits={exhibits}
          letterData={letterData}
          onUpdateCaseInfo={updateCaseInfo}
          onUpdateLetterData={updateLetterData}
          onApiResponse={handleApiResponse}
        />

        <LetterPreview
          letterData={letterData}
          exhibits={exhibits}
          onSectionClick={setSelectedSection}
          selectedSection={selectedSection}
        />

        <EditSidebar
          letterData={letterData}
          exhibits={exhibits}
          onUpdateLetterData={setLetterData}
          onUpdateExhibits={setExhibits}
          selectedSection={selectedSection}
          onSelectedSectionChange={setSelectedSection}
        />
      </div>
    </>
  );
}
