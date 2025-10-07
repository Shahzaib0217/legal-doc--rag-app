import React, { useEffect, useState } from "react";
import { LetterData, Exhibit } from "@/types";

interface EditSidebarProps {
  letterData: LetterData;
  exhibits: Exhibit[];
  onUpdateLetterData: (data: LetterData) => void;
  onUpdateExhibits?: (exhibits: Exhibit[]) => void;
  selectedSection?: string;
  onSelectedSectionChange?: (section: string) => void;
}

const EditSidebar: React.FC<EditSidebarProps> = ({
  letterData,
  exhibits,
  onUpdateLetterData,
  onUpdateExhibits,
  selectedSection: externalSelectedSection,
  onSelectedSectionChange,
}) => {
  const [internalSelectedSection, setInternalSelectedSection] =
    useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [enhancementPrompt, setEnhancementPrompt] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  useEffect(() => {
    console.log("Letter Data or Exhibits changed:", { letterData, exhibits });
  }, [letterData, exhibits]);
  // Use external selectedSection if provided, otherwise use internal
  const selectedSection = externalSelectedSection || internalSelectedSection;

  // Helper function to convert camelCase keys to proper labels
  const formatLabel = (key: string): string => {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Build sections dynamically from globalAnalysis data
  const buildDynamicSections = (): Array<{ value: string; label: string }> => {
    const dynamicSections: Array<{ value: string; label: string }> = [];

    // Get all keys from globalAnalysis if it exists
    if (letterData.apiData?.globalAnalysis) {
      const globalAnalysis = letterData.apiData.globalAnalysis;
      Object.keys(globalAnalysis).forEach((key) => {
        if (globalAnalysis[key as keyof typeof globalAnalysis] !== undefined) {
          dynamicSections.push({
            value: key,
            label: formatLabel(key),
          });
        }
      });
    }

    // If still no sections, use default fallback
    if (dynamicSections.length === 0) {
      return [];
    }

    return dynamicSections;
  };

  const sections = [
    // Attorney sections
    { value: "attorney-name", label: "Attorney Name" },
    { value: "attorney-title", label: "Attorney Title" },
    { value: "attorney-specialization", label: "Attorney Specialization" },
    { value: "attorney-address", label: "Attorney Address" },
    { value: "attorney-contact", label: "Attorney Contact (Phone & Fax)" },

    // Opening paragraph
    { value: "opening-paragraph", label: "Opening Paragraph" },

    // Dynamic sections from analysis data
    ...buildDynamicSections(),

    // Exhibit sections (dynamic based on exhibits)
    ...exhibits.map((exhibit, index) => ({
      value: `exhibit-${index}`,
      label: exhibit.heading || `Exhibit ${index + 1}: ${exhibit.fileName}`,
    })),
  ];

  const loadSectionContent = (section: string) => {
    // Load current content based on section, prefer suggested content if available
    let content = "";

    // Handle attorney sections
    if (section === "attorney-name") {
      return letterData.attorney.name || "";
    }
    if (section === "attorney-title") {
      return letterData.attorney.title || "";
    }
    if (section === "attorney-specialization") {
      return letterData.attorney.specialization || "";
    }
    if (section === "attorney-address") {
      return letterData.attorney.address || "";
    }
    if (section === "attorney-contact") {
      return `Phone: ${letterData.attorney.phone || ""}\nFax: ${letterData.attorney.fax || ""}`;
    }

    // Handle opening paragraph
    if (section === "opening-paragraph") {
      return (
        letterData.openingParagraph ||
        `This letter serves as formal notice of our policy limit demand on behalf of our client, ${
          letterData.caseInfo.client || "[Client Name]"
        }, arising from the motor vehicle accident that occurred on ${
          letterData.caseInfo.dateOfLoss || "[Date of Loss]"
        }.`
      );
    }

    // Handle exhibit sections
    if (section.startsWith("exhibit-")) {
      const exhibitIndex = parseInt(section.split("-")[1]);
      const exhibit = exhibits[exhibitIndex];
      if (exhibit) {
        content = `${exhibit.heading}\n\n${exhibit.summary}`;
      }
      return content;
    }

    // Handle global analysis sections dynamically
    // First try globalAnalysis data
    if (letterData.apiData?.globalAnalysis) {
      const globalAnalysis = letterData.apiData.globalAnalysis;
      const value = globalAnalysis[section as keyof typeof globalAnalysis];

      if (value !== undefined) {
        if (Array.isArray(value)) {
          content = value.join("\n");
        } else {
          content = String(value);
        }
      }
    }

    // Fallback to suggestedContent if globalAnalysis doesn't have the section
    if (!content && letterData.suggestedContent) {
      const suggested = letterData.suggestedContent;
      const value = suggested[section as keyof typeof suggested];

      if (value !== undefined) {
        if (Array.isArray(value)) {
          content = value.join("\n");
        } else {
          content = String(value);
        }
      }
    }

    return content;
  };

  const handleSectionChange = (section: string) => {
    // Update both internal and external state
    if (onSelectedSectionChange) {
      onSelectedSectionChange(section);
    } else {
      setInternalSelectedSection(section);
    }
    const content = loadSectionContent(section);
    setEditContent(content);

    // Auto-scroll to the section in preview
    setTimeout(() => {
      let elementId = "";

      if (section.startsWith("exhibit-")) {
        // For exhibits, scroll to exhibit section
        elementId = "exhibits-section";
      } else {
        // For main sections, create ID from section name
        elementId = `section-${section}`;
      }

      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }
    }, 100); // Small delay to ensure DOM is updated
  };

  const updateSection = () => {
    if (!selectedSection) return;

    // Handle attorney sections
    if (selectedSection === "attorney-name") {
      const updatedLetterData = {
        ...letterData,
        attorney: { ...letterData.attorney, name: editContent },
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }
    if (selectedSection === "attorney-title") {
      const updatedLetterData = {
        ...letterData,
        attorney: { ...letterData.attorney, title: editContent },
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }
    if (selectedSection === "attorney-specialization") {
      const updatedLetterData = {
        ...letterData,
        attorney: { ...letterData.attorney, specialization: editContent },
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }
    if (selectedSection === "attorney-address") {
      const updatedLetterData = {
        ...letterData,
        attorney: { ...letterData.attorney, address: editContent },
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }
    if (selectedSection === "attorney-contact") {
      // Parse phone and fax from content
      const lines = editContent.split("\n");
      const phoneLine = lines.find((line) =>
        line.toLowerCase().includes("phone")
      );
      const faxLine = lines.find((line) => line.toLowerCase().includes("fax"));
      const phone = phoneLine
        ? phoneLine.replace(/phone:/i, "").trim()
        : letterData.attorney.phone;
      const fax = faxLine
        ? faxLine.replace(/fax:/i, "").trim()
        : letterData.attorney.fax;

      const updatedLetterData = {
        ...letterData,
        attorney: { ...letterData.attorney, phone, fax },
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }

    // Handle opening paragraph
    if (selectedSection === "opening-paragraph") {
      const updatedLetterData = {
        ...letterData,
        openingParagraph: editContent,
      };
      onUpdateLetterData(updatedLetterData);
      return;
    }

    // Handle exhibit sections
    if (selectedSection.startsWith("exhibit-")) {
      const exhibitIndex = parseInt(selectedSection.split("-")[1]);
      const updatedExhibits = [...exhibits];
      if (updatedExhibits[exhibitIndex]) {
        // Split content into heading and summary (first line = heading, rest = summary)
        const lines = editContent.split("\n");
        const heading = lines[0]?.trim() || "";
        const summary = lines.slice(1).join("\n").trim() || "";

        updatedExhibits[exhibitIndex] = {
          ...updatedExhibits[exhibitIndex],
          heading: heading,
          summary: summary,
        };

        // Update the parent component with new exhibits
        if (onUpdateExhibits) {
          onUpdateExhibits(updatedExhibits);
        }

        // Also update letterData to trigger re-render
        const updatedLetterData = { ...letterData };
        onUpdateLetterData(updatedLetterData);
      }
      return;
    }

    // Handle main sections dynamically
    const updatedLetterData = { ...letterData };

    // Only ensure basic structure exists, preserve existing data
    if (!updatedLetterData.suggestedContent) {
      updatedLetterData.suggestedContent = {};
    }

    // Only create apiData structure if it doesn't exist, preserve existing globalAnalysis
    if (!updatedLetterData.apiData) {
      updatedLetterData.apiData = {
        success: true,
        exhibits: [],
        totalExpenses: 0,
        globalAnalysis: {} as any,
      };
    }

    // Only create globalAnalysis if it doesn't exist, don't overwrite
    if (!updatedLetterData.apiData?.globalAnalysis) {
      updatedLetterData.apiData!.globalAnalysis = {} as any;
    }

    // Determine if content should be array (for injuries or similar list fields)
    const shouldBeArray =
      selectedSection === "injuries" ||
      (editContent.includes("\n") && editContent.split("\n").length > 3);

    const finalContent = shouldBeArray
      ? editContent
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : editContent;

    // Update both suggestedContent and globalAnalysis
    (updatedLetterData.suggestedContent as any)[selectedSection] = finalContent;
    (updatedLetterData.apiData!.globalAnalysis as any)[selectedSection] =
      finalContent;

    onUpdateLetterData(updatedLetterData);
  };

  const revertSection = () => {
    setEditContent("");
    setEnhancementPrompt("");
    if (onSelectedSectionChange) {
      onSelectedSectionChange("");
    } else {
      setInternalSelectedSection("");
    }
  };

  const enhanceSection = async () => {
    if (!selectedSection || !editContent || !enhancementPrompt.trim()) {
      alert(
        "Please select a section, have content, and provide an enhancement prompt"
      );
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/enhance-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionContent: editContent,
          enhancementPrompt: enhancementPrompt.trim(),
          sectionType:
            sections.find((s) => s.value === selectedSection)?.label ||
            selectedSection,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEditContent(result.enhancedContent);
        setEnhancementPrompt(""); // Clear the prompt after successful enhancement
      } else {
        alert("Error enhancing content: " + result.error);
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      alert("Failed to enhance content. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Load content when external selectedSection changes
  React.useEffect(() => {
    if (externalSelectedSection) {
      const content = loadSectionContent(externalSelectedSection);
      setEditContent(content);
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

            {/* AI Enhancement Section */}
            <div className="enhancement-section">
              <label className="form-label">
                <i className="fas fa-magic"></i>
                AI Enhancement
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={enhancementPrompt}
                onChange={(e) => setEnhancementPrompt(e.target.value)}
                placeholder="Tell AI how to improve this section (e.g., 'make it more summarized', 'add more legal details', 'make it more professional')..."
              />
              <button
                className={`btn btn--secondary btn--sm ${
                  isEnhancing || !editContent || !enhancementPrompt.trim()
                    ? "btn--disabled"
                    : ""
                }`}
                onClick={enhanceSection}
                disabled={
                  isEnhancing || !editContent || !enhancementPrompt.trim()
                }
              >
                {isEnhancing ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Enhancing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i>
                    Enhance with AI
                  </>
                )}
              </button>
            </div>

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
            <i className="fas fa-magic"></i>
            <p>
              Use AI Enhancement to improve any section - just describe how you
              want it enhanced (summarize, expand, make more professional,
              etc.).
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
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EditSidebar;
