import React, { useState } from "react";
import { LetterData } from "@/types";

interface EditSidebarProps {
  letterData: LetterData;
  onUpdateLetterData: (data: LetterData) => void;
  selectedSection?: string;
  onSelectedSectionChange?: (section: string) => void;
}

const EditSidebar: React.FC<EditSidebarProps> = ({
  letterData,
  onUpdateLetterData,
  selectedSection: externalSelectedSection,
  onSelectedSectionChange,
}) => {
  const [internalSelectedSection, setInternalSelectedSection] =
    useState<string>("");
  const [editContent, setEditContent] = useState<string>("");

  // Use external selectedSection if provided, otherwise use internal
  const selectedSection = externalSelectedSection || internalSelectedSection;

  const sections = [
    { value: "facts", label: "Nature of Claim" },
    { value: "liability", label: "Liability" },
    { value: "injuries", label: "Bodily Injury Summary" },
    { value: "medical", label: "Medical Treatment" },
    { value: "damages", label: "Damages" },
    { value: "demand", label: "Demand" },
    { value: "addressee", label: "Addressee" },
  ];

  const loadSectionContent = (section: string) => {
    // Load current content based on section, prefer suggested content if available
    let content = "";

    // First check if we have suggested content from AI
    if (letterData.suggestedContent) {
      const suggested = letterData.suggestedContent;
      switch (section) {
        case "facts":
          content =
            suggested.facts ||
            "Enter the facts and circumstances of the incident here...";
          break;
        case "liability":
          content =
            suggested.liability ||
            "Describe the legal basis for liability here...";
          break;
        case "injuries":
          content =
            suggested.injuries ||
            "List the injuries sustained by the client here...";
          break;
        case "medical":
          content =
            suggested.medical ||
            "Describe the medical treatment received here...";
          break;
        case "damages":
          content =
            suggested.damages ||
            "Detail the damages and expenses incurred here...";
          break;
        case "demand":
          content =
            suggested.demand ||
            "State the demand amount and legal basis here...";
          break;
      }
    }

    // Fallback to default content if no suggested content
    if (!content) {
      switch (section) {
        case "facts":
          content = "Enter the facts and circumstances of the incident here...";
          break;
        case "liability":
          content = "Describe the legal basis for liability here...";
          break;
        case "injuries":
          content = "List the injuries sustained by the client here...";
          break;
        case "medical":
          content = "Describe the medical treatment received here...";
          break;
        case "damages":
          content = "Detail the damages and expenses incurred here...";
          break;
        case "demand":
          content = "State the demand amount and legal basis here...";
          break;
        case "addressee":
          content = `${
            letterData.insuranceCompany.name || "[Insurance Company Name]"
          }\n${
            letterData.insuranceCompany.address || "[Address]"
          }\nAttention: ${
            letterData.insuranceCompany.attention || "[Claims Representative]"
          }`;
          break;
        default:
          content = "";
      }
    }

    setEditContent(content);
  };

  const handleSectionChange = (section: string) => {
    // Update both internal and external state
    if (onSelectedSectionChange) {
      onSelectedSectionChange(section);
    } else {
      setInternalSelectedSection(section);
    }
    loadSectionContent(section);
  };

  const updateSection = () => {
    if (!selectedSection || !editContent) return;

    // In a real implementation, this would update the specific section content
    alert(`Section "${selectedSection}" would be updated with: ${editContent}`);
  };

  const revertSection = () => {
    setEditContent("");
    if (onSelectedSectionChange) {
      onSelectedSectionChange("");
    } else {
      setInternalSelectedSection("");
    }
  };

  // Load content when external selectedSection changes
  React.useEffect(() => {
    if (externalSelectedSection) {
      loadSectionContent(externalSelectedSection);
    }
  }, [externalSelectedSection]);

  return (
    <aside className="sidebar sidebar--right">
      <div className="sidebar-section">
        <h3>Edit Letter</h3>

        <div className="section-selector">
          <label className="form-label">Select Section to Edit</label>
          <select
            className="form-control"
            value={selectedSection}
            onChange={(e) => handleSectionChange(e.target.value)}
          >
            <option value="">Choose a section...</option>
            {sections.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        {selectedSection && (
          <div className="editor-area">
            <label className="form-label">Edit Content</label>
            <textarea
              className="form-control"
              rows={10}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={`Enter content for ${
                sections.find((s) => s.value === selectedSection)?.label
              }...`}
            />

            <div className="editor-actions">
              <button
                className="btn btn--primary btn--sm"
                onClick={updateSection}
              >
                Update Section
              </button>
              <button
                className="btn btn--secondary btn--sm"
                onClick={revertSection}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <h3>Suggestions</h3>
        <div className="suggestions">
          <div className="suggestion-item">
            <i className="fas fa-lightbulb"></i>
            <p>
              Upload relevant documents to auto-populate letter sections with
              case-specific details.
            </p>
          </div>
          <div className="suggestion-item">
            <i className="fas fa-exclamation-triangle"></i>
            <p>
              Review each section before finalizing to ensure accuracy and
              completeness.
            </p>
          </div>
          <div className="suggestion-item">
            <i className="fas fa-info-circle"></i>
            <p>
              Click on any section in the letter preview to edit its content
              directly.
            </p>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Letter Statistics</h3>
        <div className="card">
          <div className="card__body">
            <p>
              <strong>Total Medical Expenses:</strong> $
              {letterData.totalMedicalExpenses.toLocaleString()}
            </p>
            <p>
              <strong>Number of Injuries:</strong> {letterData.injuries.length}
            </p>
            <p>
              <strong>Medical Providers:</strong>{" "}
              {letterData.medicalTreatment.length}
            </p>
            <p>
              <strong>Estimated Demand:</strong> $
              {Math.max(
                letterData.totalMedicalExpenses * 3,
                50000
              ).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EditSidebar;
