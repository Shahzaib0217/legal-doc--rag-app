import React from "react";
import { LetterData, Exhibit } from "@/types";

interface LetterPreviewProps {
  letterData: LetterData;
  exhibits: Exhibit[];
  onSectionClick?: (sectionName: string) => void;
  selectedSection?: string;
}

const LetterPreview: React.FC<LetterPreviewProps> = ({
  letterData,
  exhibits,
  onSectionClick,
  selectedSection,
}) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Helper function to format section titles
  const formatSectionTitle = (key: string): string => {
    // Convert camelCase to UPPER CASE
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
      .toUpperCase();
  };

  // Get dynamic sections from analysis data
  const getDynamicSections = (): Array<{ key: string; value: any }> => {
    const sections: Array<{ key: string; value: any }> = [];

    // Primary source: globalAnalysis
    if (letterData.apiData?.globalAnalysis) {
      const globalAnalysis = letterData.apiData.globalAnalysis;
      Object.entries(globalAnalysis).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          sections.push({ key, value });
        }
      });
    }

    // Fallback: suggestedContent
    else if (letterData.suggestedContent) {
      const suggestedContent = letterData.suggestedContent;
      Object.entries(suggestedContent).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          sections.push({ key, value });
        }
      });
    }

    return sections;
  };

  // Render content based on data type
  const renderSectionContent = (value: any) => {
    if (Array.isArray(value)) {
      return (
        <ul>
          {value.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    } else {
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: String(value).replace(/\n/g, "<br/>"),
          }}
        />
      );
    }
  };

  return (
    <main className="letter-preview">
      <div className="letter-container">
        <div className="letter-content">
          {/* Letter Header */}
          <div className="letter-header">
            <div className="attorney-name">
              {letterData.attorney.name || "[Attorney Name]"}
            </div>
            <div className="attorney-title">
              {letterData.attorney.title || "[Attorney Title]"}
            </div>
            <div className="attorney-title">
              {letterData.attorney.specialization || "[Specialization]"}
            </div>
            <div className="attorney-contact">
              {letterData.attorney.address
                ? letterData.attorney.address
                    .split("\n")
                    .map((line, i) => <div key={i}>{line}</div>)
                : "[Attorney Address]"}
            </div>
            <div className="attorney-contact">
              TEL: {letterData.attorney.phone || "[Phone]"} | FAX:{" "}
              {letterData.attorney.fax || "[Fax]"}
            </div>
          </div>
          <div className="letter-date">{currentDate}</div>
          {/* Addressee */}
          <div
            className={`addressee editable-section ${
              selectedSection === "addressee" ? "active" : ""
            }`}
            data-section="addressee"
            onClick={() => onSectionClick?.("addressee")}
          >
            <div className="addressee-line">
              {letterData.insuranceCompany.name || "[Insurance Company Name]"}
            </div>
            <div className="addressee-line">
              {letterData.insuranceCompany.address
                ? letterData.insuranceCompany.address
                    .split("\n")
                    .map((line, i) => <div key={i}>{line}</div>)
                : "[Insurance Company Address]"}
            </div>
            <div className="addressee-line">
              Attention:{" "}
              {letterData.insuranceCompany.attention ||
                "[Claims Representative]"}
            </div>
          </div>
          <div className="re-line">
            Re: <strong>POLICY LIMIT DEMAND</strong>
            <br />
            Client/Insured: {letterData.caseInfo.client || "[Client Name]"}
            <br />
            Policy No.: {letterData.caseInfo.policyNumber || "[Policy Number]"}
            <br />
            Claim No.: {letterData.caseInfo.claimNumber || "[Claim Number]"}
            <br />
            Date of Loss: {letterData.caseInfo.dateOfLoss || "[Date of Loss]"}
          </div>
          {/* Letter Opening */}
          <div className="letter-section">
            <div className="section-content">
              <p>Dear Claims Representative:</p>
              <p>
                This letter serves as formal notice of our policy limit demand
                on behalf of our client,{" "}
                {letterData.caseInfo.client || "[Client Name]"}, arising from
                the motor vehicle accident that occurred on{" "}
                {letterData.caseInfo.dateOfLoss || "[Date of Loss]"}.
              </p>
            </div>
          </div>
          {/* Dynamic Sections - Automatically generated from analysis data */}
          {getDynamicSections().map(({ key, value }) => (
            <div key={key} className="letter-section" id={`section-${key}`}>
              <div
                className={`section-title editable-section ${
                  selectedSection === key ? "active" : ""
                }`}
                data-section={key}
                onClick={() => onSectionClick?.(key)}
              >
                {formatSectionTitle(key)}
              </div>
              <div
                className={`section-content editable-section ${
                  selectedSection === key ? "active" : ""
                }`}
                data-section={key}
                onClick={() => onSectionClick?.(key)}
              >
                {renderSectionContent(value)}
              </div>
            </div>
          ))}

          {/* Individual Exhibits - Dynamic sections */}
          {exhibits.map((exhibit, index) => (
            <div
              key={index}
              className="letter-section"
              id={index === 0 ? "exhibits-section" : `exhibit-${index}`}
            >
              <div
                className={`section-title editable-section ${
                  selectedSection === `exhibit-${index}` ? "active" : ""
                }`}
                data-section={`exhibit-${index}`}
                onClick={() => onSectionClick?.(`exhibit-${index}`)}
              >
                {exhibit.heading?.toUpperCase() ||
                  `EXHIBIT ${index + 1}: ${exhibit.fileName.toUpperCase()}`}
              </div>
              <div
                className={`section-content editable-section ${
                  selectedSection === `exhibit-${index}` ? "active" : ""
                }`}
                data-section={`exhibit-${index}`}
                onClick={() => onSectionClick?.(`exhibit-${index}`)}
              >
                {exhibit.summary && <p>{exhibit.summary}</p>}
                {exhibit.expenses && exhibit.expenses > 0 && (
                  <p>
                    <strong>
                      Medical Expenses: $
                      {exhibit.expenses.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          ))}
          {/* Closing */}
          <div className="letter-section">
            <div className="section-content">
              <p>
                We look forward to your prompt response and resolution of this
                matter.
              </p>
              <p>Very truly yours,</p>
              <br />
              <br />
              <p>
                <strong>{letterData.attorney.name || "[Attorney Name]"}</strong>
                <br />
                Attorney for {letterData.caseInfo.client || "[Client Name]"}
              </p>
              <p>Enclosures: Medical records and bills</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LetterPreview;
