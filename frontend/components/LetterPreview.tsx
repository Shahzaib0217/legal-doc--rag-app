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
  const renderSectionContent = (value: any, key?: string) => {
    // Special handling for structured damages
    if (key === 'damages' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle new multi-person structure
      if (value.people && Array.isArray(value.people)) {
        return (
          <div className="damages-breakdown">
            {/* Render each person's damages */}
            {value.people.map((person: any, personIdx: number) => (
              <div key={personIdx} className="person-damages">
                {/* Opening paragraph for settlement demand */}
                {personIdx === 0 && (
                  <p>
                    Based on the foregoing, we demand payment in the amount of <strong>${value.totalSettlementDemand?.toLocaleString() || '0'}</strong> to settle claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.
                  </p>
                )}

                {/* Special Damages for this person */}
                {person.specialDamages && (
                  <div className="damage-section">
                    <p className="damages-heading">
                      <strong>• Special Damages for {person.name} (Past Medical Expenses): $ – ${person.specialDamages.total.toLocaleString()}</strong>
                    </p>
                    <ul>
                      {person.specialDamages.items.map((item: any, idx: number) => (
                        <li key={idx}>
                          ○ {item.description} ${item.amount.toLocaleString()}
                        </li>
                      ))}
                      <li>
                        ○ Total (Actual Past Bills) ${person.specialDamages.total.toLocaleString()}
                      </li>
                    </ul>
                  </div>
                )}

                {/* Future Medical Expenses for this person */}
                {person.futureMedicalExpenses && (
                  <div className="damage-section">
                    <p className="damages-heading">
                      <strong>• Future Medical Expenses for {person.name}: ${person.futureMedicalExpenses.total.toLocaleString()}</strong>
                    </p>
                    <ul>
                      {person.futureMedicalExpenses.items.map((item: any, idx: number) => (
                        <li key={idx}>
                          {String.fromCharCode(97 + idx)}. {item.description}: ${item.amount.toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* General Damages for this person */}
                {person.generalDamages && (
                  <div className="damage-section">
                    <p className="damages-heading">
                      <strong>• General Damages for {person.name} (Pain, Suffering, & Loss of Enjoyment): ${person.generalDamages.total.toLocaleString()}</strong>
                    </p>
                    <ul>
                      {person.generalDamages.items.map((item: string, idx: number) => (
                        <li key={idx}>
                          {String.fromCharCode(97 + idx)}. {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Total Settlement Demand */}
            {value.totalSettlementDemand && (
              <p className="settlement-total">
                <strong>Total Settlement Demand: ${value.totalSettlementDemand.toLocaleString()}</strong>
              </p>
            )}
          </div>
        );
      } else {
        // Handle legacy single person structure for backward compatibility
        return (
          <div className="damages-breakdown">
            {/* Special Damages */}
            {value.specialDamages && (
              <div className="damage-section">
                <h4>
                  <strong>1. Special Damages – ${value.specialDamages.total.toLocaleString()}</strong>
                </h4>
                <ul>
                  {value.specialDamages.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      ○ {item.description}: ${item.amount.toLocaleString()}
                    </li>
                  ))}
                  <li>
                    ○ Total Past Medical Expenses: ${value.specialDamages.total.toLocaleString()}
                  </li>
                </ul>
              </div>
            )}

            {/* Future Medical Expenses */}
            {value.futureMedicalExpenses && (
              <div className="damage-section">
                <h4>
                  <strong>2. Future Medical Expenses – ${value.futureMedicalExpenses.total.toLocaleString()}</strong>
                </h4>
                <ul>
                  {value.futureMedicalExpenses.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      {String.fromCharCode(97 + idx)}. {item.description}: ${item.amount.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* General Damages */}
            {value.generalDamages && (
              <div className="damage-section">
                <h4>
                  <strong>3. General Damages – ${value.generalDamages.total.toLocaleString()}</strong>
                </h4>
                <ul>
                  {value.generalDamages.items.map((item: string, idx: number) => (
                    <li key={idx}>
                      {String.fromCharCode(97 + idx)}. {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
    }

    // Array rendering
    if (Array.isArray(value)) {
      return (
        <ul>
          {value.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }

    // String rendering
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: String(value).replace(/\n/g, "<br/>"),
        }}
      />
    );
  };

  return (
    <main className="letter-preview">
      <div className="letter-container">
        <div className="letter-content">
          {/* Letter Header */}
          <div className="letter-header">
            <div
              className={`attorney-name editable-section ${
                selectedSection === "attorney-name" ? "active" : ""
              }`}
              data-section="attorney-name"
              onClick={() => onSectionClick?.("attorney-name")}
            >
              {letterData.attorney.name || "[Attorney Name]"}
            </div>
            <div
              className={`attorney-title editable-section ${
                selectedSection === "attorney-title" ? "active" : ""
              }`}
              data-section="attorney-title"
              onClick={() => onSectionClick?.("attorney-title")}
            >
              {letterData.attorney.title || "[Attorney Title]"}
            </div>
            <div
              className={`attorney-title editable-section ${
                selectedSection === "attorney-specialization" ? "active" : ""
              }`}
              data-section="attorney-specialization"
              onClick={() => onSectionClick?.("attorney-specialization")}
            >
              {letterData.attorney.specialization || "[Specialization]"}
            </div>
            <div
              className={`attorney-contact editable-section ${
                selectedSection === "attorney-address" ? "active" : ""
              }`}
              data-section="attorney-address"
              onClick={() => onSectionClick?.("attorney-address")}
            >
              {letterData.attorney.address
                ? letterData.attorney.address
                    .split("\n")
                    .map((line, i) => <div key={i}>{line}</div>)
                : "[Attorney Address]"}
            </div>
            <div
              className={`attorney-contact editable-section ${
                selectedSection === "attorney-contact" ? "active" : ""
              }`}
              data-section="attorney-contact"
              onClick={() => onSectionClick?.("attorney-contact")}
            >
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
          ></div>
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
            <div
              className={`section-content editable-section ${
                selectedSection === "opening-paragraph" ? "active" : ""
              }`}
              data-section="opening-paragraph"
              onClick={() => onSectionClick?.("opening-paragraph")}
            >
              <p>Dear Claims Representative:</p>
              <p>
                {letterData.openingParagraph ||
                  `This letter serves as formal notice of our policy limit demand on behalf of our client, ${
                    letterData.caseInfo.client || "[Client Name]"
                  }, arising from the motor vehicle accident that occurred on ${
                    letterData.caseInfo.dateOfLoss || "[Date of Loss]"
                  }.`}
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
                {renderSectionContent(value, key)}
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
                {exhibit.images && exhibit.images.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    {exhibit.images.map((image, imgIdx) => (
                      <div key={imgIdx} style={{ marginBottom: "1rem", textAlign: "center" }}>
                        <img
                          src={image}
                          alt={`Exhibit ${index + 1} - Image ${imgIdx + 1}`}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "500px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            padding: "4px",
                          }}
                        />
                      </div>
                    ))}
                  </div>
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
