"use client";

import React, { useState, useEffect } from "react";
import { LetterData, Document, MedicalBill } from "@/types";
import { getEmptyLetterData, calculateTotalExpenses } from "@/lib/sampleData";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import LetterPreview from "@/components/LetterPreview";
import EditSidebar from "@/components/EditSidebar";

export default function Home() {
  const [letterData, setLetterData] = useState<LetterData>(
    getEmptyLetterData()
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [medicalBills, setMedicalBills] = useState<MedicalBill[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");

  useEffect(() => {
    // Initialize with empty data - everything will come from uploads/user input
    const emptyData = getEmptyLetterData();
    setLetterData(emptyData);
    setMedicalBills([]);
    setDocuments([]);
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

  const addDocument = (doc: Document) => {
    setDocuments((prev) => [...prev, doc]);
    if (doc.type === "medical") {
      setMedicalBills((prev) => [...prev, doc.data]);
      setLetterData((prev) => ({
        ...prev,
        medicalTreatment: [...prev.medicalTreatment, doc.data],
        totalMedicalExpenses: calculateTotalExpenses([
          ...prev.medicalTreatment,
          doc.data,
        ]),
      }));
    }
  };

  const removeDocument = (index: number) => {
    const doc = documents[index];
    setDocuments((prev) => prev.filter((_, i) => i !== index));

    if (doc.type === "medical") {
      const newMedicalBills = medicalBills.filter(
        (bill) => bill.provider !== doc.data.provider
      );
      setMedicalBills(newMedicalBills);
      setLetterData((prev) => ({
        ...prev,
        medicalTreatment: newMedicalBills,
        totalMedicalExpenses: calculateTotalExpenses(newMedicalBills),
      }));
    }
  };

  const handleSectionClick = (sectionName: string) => {
    setSelectedSection(sectionName);
  };

  return (
    <>
      <Header
        onExport={() => window.print()}
        onSave={() => {
          const dataStr = JSON.stringify(
            {
              letterData,
              documents,
              medicalBills,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          );
          const dataBlob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `demand-letter-${letterData.caseInfo.client.replace(
            /\s+/g,
            "-"
          )}-${new Date().toISOString().split("T")[0]}.json`;
          link.click();
          URL.revokeObjectURL(url);
        }}
      />

      <div className="main-content">
        <Sidebar
          documents={documents}
          medicalBills={medicalBills}
          letterData={letterData}
          onAddDocument={addDocument}
          onRemoveDocument={removeDocument}
          onUpdateCaseInfo={updateCaseInfo}
          onUpdateLetterData={updateLetterData}
        />

        <LetterPreview
          letterData={letterData}
          documents={documents}
          onSectionClick={handleSectionClick}
          selectedSection={selectedSection}
        />

        <EditSidebar
          letterData={letterData}
          onUpdateLetterData={setLetterData}
          selectedSection={selectedSection}
          onSelectedSectionChange={setSelectedSection}
        />
      </div>
    </>
  );
}
