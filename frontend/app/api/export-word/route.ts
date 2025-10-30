import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  ImageRun,
} from "docx";

// TypeScript interfaces for better type safety
interface SectionData {
  key: string;
  title: string;
  content: string | string[];
}

interface ExhibitData {
  heading: string;
  summary: string;
  images?: string[]; // Array of Base64 encoded images
}

interface DamagesCategoryItem {
  description: string;
  amount: number;
}

interface DamagesCategory {
  total: number;
  items: DamagesCategoryItem[];
}

interface PersonDamages {
  name: string;
  specialDamages?: DamagesCategory;
  futureMedicalExpenses?: DamagesCategory;
  generalDamages?: {
    total: number;
    items: string[];
  };
}

interface DamagesBreakdown {
  people?: PersonDamages[];
  totalSettlementDemand?: number;
  // Legacy structure support
  specialDamages?: {
    total: number;
    items: Array<{
      description: string;
      amount: number;
    }>;
  };
  futureMedicalExpenses?: {
    total: number;
    items: Array<{
      description: string;
      amount: number;
    }>;
  };
  generalDamages?: {
    total: number;
    items: string[];
  };
}

// Constants for consistent styling
const FONT_SIZES = {
  SMALL: 16,
  REGULAR: 18,
  LARGE: 20,
  TITLE: 24,
} as const;

const SPACING = {
  SMALL: 100,
  REGULAR: 150,
  LARGE: 200,
  XLARGE: 300,
} as const;

const LINE_LENGTH_LIMIT = 58; // Exact width for pleading paper content

// Common border configurations
const BORDERS = {
  NONE: {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  },
  LINE_NUMBER_CELL: {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  },
  CONTENT_CELL_LEFT_MARGIN: {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.SINGLE, size: 4 }, // Left margin line - thicker
    right: { style: BorderStyle.NONE },
  },
  CONTENT_CELL_RIGHT_MARGIN: {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.SINGLE, size: 4 }, // Right margin line - thicker
  },
} as const;

// Helper functions for document creation
const formatSectionTitle = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const wrapTextToLines = (
  text: string,
  maxLength: number = LINE_LENGTH_LIMIT
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + " " + word).length > maxLength) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        lines.push(word); // Very long word
      }
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  });

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines;
};

// Helper function to convert base64 image to buffer
const base64ToBuffer = (base64: string): Buffer => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
};

export async function POST(request: NextRequest) {
  try {
    const {
      letterData,
      exhibits,
      pleadingPaper = false,
    } = await request.json();

    // Helper function to get dynamic sections
    const getDynamicSections = (): SectionData[] => {
      const sections: SectionData[] = [];
      const dataSource =
        letterData.apiData?.globalAnalysis || letterData.suggestedContent || {};

      Object.keys(dataSource).forEach((key) => {
        const content = dataSource[key];
        if (content !== undefined && content !== null && content !== "") {
          sections.push({
            key,
            title: formatSectionTitle(key),
            content,
          });
        }
      });

      return sections;
    };

    // Improved pleading paper formatting with better text handling
    const createPleadingContent = (textLines: string[]): Paragraph[] => {
      const paragraphs: Paragraph[] = [];
      let lineNumber = 1;
      const CONTENT_WIDTH = 58; // Fixed content width

      textLines.forEach((line) => {
        if (line.trim()) {
          const wrappedLines = wrapTextToLines(line.trim(), CONTENT_WIDTH);
          wrappedLines.forEach((wrappedLine) => {
            // Line numbers closer to pipe - reduced spacing
            const lineNumStr = lineNumber.toString();
            // Use exactly 5 characters for line number + minimal spacing before pipe
            const linePrefix = `${lineNumStr.padStart(3, " ")}  `; // 3 for number + 2 spaces = 5 total

            const trimmedLine = wrappedLine.trim();
            const paddedContent = trimmedLine.padEnd(CONTENT_WIDTH, " ");
            const lineText = `${linePrefix}|  ${paddedContent}  |`;

            const paragraph = new Paragraph({
              children: [
                new TextRun({
                  text: lineText,
                  size: FONT_SIZES.REGULAR,
                  font: "Courier New", // Monospace for perfect alignment
                }),
              ],
              spacing: { after: 0, before: 0 },
              alignment: AlignmentType.CENTER, // Center the entire pleading content
            });
            paragraphs.push(paragraph);
            lineNumber++;
          });
        } else {
          // Empty line numbers closer to pipe - reduced spacing
          const lineNumStr = lineNumber.toString();
          // Use exactly 5 characters for line number + minimal spacing before pipe
          const linePrefix = `${lineNumStr.padStart(3, " ")}  `; // 3 for number + 2 spaces = 5 total

          const emptyContent = " ".repeat(CONTENT_WIDTH);
          const emptyLineText = `${linePrefix}|  ${emptyContent}  |`;

          const emptyParagraph = new Paragraph({
            children: [
              new TextRun({
                text: emptyLineText,
                size: FONT_SIZES.REGULAR,
                font: "Courier New",
              }),
            ],
            spacing: { after: 0, before: 0 },
            alignment: AlignmentType.CENTER, // Center the entire pleading content
          });
          paragraphs.push(emptyParagraph);
          lineNumber++;
        }
      });

      return paragraphs;
    };

    // Helper functions for creating common paragraph types
    const createTextParagraph = (
      text: string,
      size: number = FONT_SIZES.LARGE,
      bold: boolean = false,
      spacing?: { before?: number; after?: number }
    ): Paragraph => {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size,
          }),
        ],
        spacing,
      });
    };

    const createTitleParagraph = (
      text: string,
      alignment = AlignmentType.LEFT
    ): Paragraph => {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: FONT_SIZES.TITLE,
          }),
        ],
        alignment,
        spacing: { before: SPACING.SMALL, after: SPACING.XLARGE },
      });
    };

    const createSectionTitleParagraph = (text: string): Paragraph => {
      return new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            size: FONT_SIZES.LARGE + 2,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: SPACING.XLARGE, after: SPACING.LARGE },
      });
    };

    // Helper to add policy/claim numbers conditionally
    const addPolicyClaimNumbers = (
      paragraphs: Paragraph[],
      size: number = FONT_SIZES.LARGE
    ): Paragraph[] => {
      const additionalParagraphs: Paragraph[] = [];

      if (letterData.caseInfo?.policyNumber) {
        additionalParagraphs.push(
          createTextParagraph(
            `Policy Number: ${letterData.caseInfo.policyNumber}`,
            size,
            false,
            { after: SPACING.SMALL }
          )
        );
      }

      if (letterData.caseInfo?.claimNumber) {
        additionalParagraphs.push(
          createTextParagraph(
            `Claim Number: ${letterData.caseInfo.claimNumber}`,
            size,
            false,
            { after: SPACING.SMALL }
          )
        );
      }

      return [...paragraphs, ...additionalParagraphs];
    };

    // Helper to parse string damages into structured format (fallback for legacy data)
    const parseStringDamages = (damagesString: string): DamagesBreakdown => {
      // This is a simple fallback - returns a basic structure
      // In practice, the AI should always provide structured damages
      return {
        specialDamages: {
          total: letterData.totalMedicalExpenses || 0,
          items: [
            { description: "Past medical expenses (see exhibits for details)", amount: letterData.totalMedicalExpenses || 0 }
          ]
        },
        generalDamages: {
          total: 300000,
          items: [
            "Pain and suffering",
            "Loss of enjoyment of life",
            "Emotional distress"
          ]
        }
      };
    };

    // Helper to format damages content - ALWAYS returns structured format
    const formatDamagesContent = (damages: string | DamagesBreakdown): string[] => {
      const lines: string[] = [];

      // Convert to structured format if it's a string
      const structuredDamages = typeof damages === 'string'
        ? parseStringDamages(damages)
        : damages;

      // Handle new multi-person structure
      if (structuredDamages.people && Array.isArray(structuredDamages.people)) {
        // Add opening paragraph with total settlement demand
        const totalDemand = structuredDamages.totalSettlementDemand || 0;
        lines.push(`Based on the foregoing, we demand payment in the amount of $${typeof totalDemand === 'number' ? totalDemand.toLocaleString() : '0'} to settle claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`);
        lines.push("");

        // Process each person's damages
        structuredDamages.people.forEach((person) => {
          // Special Damages for this person
          if (person.specialDamages && typeof person.specialDamages.total === 'number') {
            lines.push(`• Special Damages for ${person.name} (Past Medical Expenses): $ – $${person.specialDamages.total.toLocaleString()}`);
            if (Array.isArray(person.specialDamages.items)) {
              person.specialDamages.items.forEach((item) => {
                const amount = typeof item.amount === 'number' ? item.amount.toLocaleString() : '0';
                lines.push(`  ○ ${item.description} $${amount}`);
              });
            }
            lines.push(`  ○ Total (Actual Past Bills) $${person.specialDamages.total.toLocaleString()}`);
            lines.push("");
          }

          // Future Medical Expenses for this person
          if (person.futureMedicalExpenses && typeof person.futureMedicalExpenses.total === 'number') {
            lines.push(`• Future Medical Expenses for ${person.name}: $${person.futureMedicalExpenses.total.toLocaleString()}`);
            if (Array.isArray(person.futureMedicalExpenses.items)) {
              person.futureMedicalExpenses.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                const amount = typeof item.amount === 'number' ? item.amount.toLocaleString() : '0';
                lines.push(`  ${letter}. ${item.description}: $${amount}`);
              });
            }
            lines.push("");
          }

          // General Damages for this person
          if (person.generalDamages && typeof person.generalDamages.total === 'number') {
            lines.push(`• General Damages for ${person.name} (Pain, Suffering, & Loss of Enjoyment): $${person.generalDamages.total.toLocaleString()}`);
            if (Array.isArray(person.generalDamages.items)) {
              person.generalDamages.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                lines.push(`  ${letter}. ${item}`);
              });
            }
            lines.push("");
          }
        });

        // Add total settlement demand
        if (typeof structuredDamages.totalSettlementDemand === 'number') {
          lines.push(`Total Settlement Demand: $${structuredDamages.totalSettlementDemand.toLocaleString()}`);
        }
      } else {
        // Handle legacy single person structure
        // Special Damages
        if (structuredDamages.specialDamages) {
          lines.push(`1.  Special Damages – $${structuredDamages.specialDamages.total.toLocaleString()}`);
          structuredDamages.specialDamages.items.forEach((item) => {
            lines.push(`     ○  ${item.description}: $${item.amount.toLocaleString()}`);
          });
          lines.push(`     ○  Total Past Medical Expenses: $${structuredDamages.specialDamages.total.toLocaleString()}`);
          lines.push("");
        }

        // Future Medical Expenses
        if (structuredDamages.futureMedicalExpenses) {
          lines.push(`2.  Future Medical Expenses – $${structuredDamages.futureMedicalExpenses.total.toLocaleString()}`);
          structuredDamages.futureMedicalExpenses.items.forEach((item, index) => {
            const letter = String.fromCharCode(97 + index); // a, b, c, ...
            lines.push(`     ${letter}.  ${item.description}: $${item.amount.toLocaleString()}`);
          });
          lines.push("");
        }

        // General Damages
        if (structuredDamages.generalDamages) {
          lines.push(`3.  General Damages – $${structuredDamages.generalDamages.total.toLocaleString()}`);
          structuredDamages.generalDamages.items.forEach((item, index) => {
            const letter = String.fromCharCode(97 + index); // a, b, c, ...
            lines.push(`     ${letter}.  ${item}`);
          });
        }
      }

      return lines;
    };

    // Helper to build pleading paper content lines
    const buildPleadingContentLines = (): string[] => {
      const contentLines: string[] = [];

      // Header information
      const headerLines = [
        letterData.attorney.name || "[Attorney Name]",
        letterData.attorney.title || "[Attorney Title]",
        letterData.attorney.specialization || "[Specialization]",
        letterData.attorney.address || "[Attorney Address]",
        `TEL: ${letterData.attorney.phone || "[Phone]"} | FAX: ${letterData.attorney.fax || "[Fax]"}`,
        "", // Empty line
        "DEMAND FOR SETTLEMENT",
        "", // Empty line
        `Client: ${letterData.caseInfo.client}`,
        `Date of Loss: ${letterData.caseInfo.dateOfLoss}`,
      ];

      contentLines.push(...headerLines);

      // Add policy/claim numbers if they exist
      if (letterData.caseInfo?.policyNumber) {
        contentLines.push(`Policy Number: ${letterData.caseInfo.policyNumber}`);
      }
      if (letterData.caseInfo?.claimNumber) {
        contentLines.push(`Claim Number: ${letterData.caseInfo.claimNumber}`);
      }

      contentLines.push(""); // Empty line

      // Add opening paragraph
      contentLines.push("Dear Claims Representative:");
      contentLines.push("");
      contentLines.push(
        letterData.openingParagraph ||
          `This letter serves as formal notice of our policy limit demand on behalf of our client, ${letterData.caseInfo.client}, arising from the motor vehicle accident that occurred on ${letterData.caseInfo.dateOfLoss}.`
      );
      contentLines.push(""); // Empty line

      // Add dynamic sections
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        contentLines.push("", section.title.toUpperCase(), ""); // Empty line, title, empty line

        // Special handling for damages section
        if (section.key === 'damages') {
          const damagesLines = formatDamagesContent(section.content as string | DamagesBreakdown);
          contentLines.push(...damagesLines);
        } else if (Array.isArray(section.content)) {
          section.content.forEach((item) => contentLines.push(`• ${item}`));
        } else {
          section.content
            .split("\n")
            .filter((p) => p.trim())
            .forEach((para) => contentLines.push(para.trim()));
        }
      });

      // Add exhibits if they exist
      if (exhibits && exhibits.length > 0) {
        contentLines.push("", "EXHIBITS", ""); // Empty line, title, empty line

        exhibits.forEach((exhibit: ExhibitData) => {
          contentLines.push("", exhibit.heading, exhibit.summary); // Empty line, heading, summary
        });
      }

      // Add closing
      const closingLines = [
        "", // Empty line
        "DEMAND",
        "", // Empty line
        `Based on the foregoing, we demand payment in the amount of $${letterData.totalMedicalExpenses.toLocaleString()} to settle all claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
        "", // Empty line
        "Sincerely,",
        "", // Empty line
        letterData.attorney.name,
        letterData.attorney.title,
      ];

      contentLines.push(...closingLines);
      return contentLines;
    };

    // Helper to build regular format document sections
    const buildRegularFormatSections = (): Paragraph[] => {
      const sections: Paragraph[] = [];

      // Header section
      const headerParagraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.name || "[Attorney Name]",
              bold: true,
              size: FONT_SIZES.TITLE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.SMALL },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.title || "[Attorney Title]",
              size: FONT_SIZES.LARGE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.SMALL },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.specialization || "[Specialization]",
              size: FONT_SIZES.LARGE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.SMALL },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.address || "[Attorney Address]",
              size: FONT_SIZES.LARGE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.SMALL },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `TEL: ${letterData.attorney.phone || "[Phone]"} | FAX: ${letterData.attorney.fax || "[Fax]"}`,
              size: FONT_SIZES.LARGE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.LARGE },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              size: FONT_SIZES.LARGE,
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: SPACING.LARGE },
        }),
        createTextParagraph(
          letterData.insuranceCompany.name,
          FONT_SIZES.LARGE,
          true,
          { after: SPACING.SMALL }
        ),
        createTextParagraph(
          letterData.insuranceCompany.address,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.SMALL }
        ),
        createTextParagraph(
          `Attention: ${letterData.insuranceCompany.attention}`,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.LARGE }
        ),
        createTextParagraph(
          `Re: ${letterData.caseInfo.client}`,
          FONT_SIZES.LARGE,
          true,
          { after: SPACING.SMALL }
        ),
        createTextParagraph(
          `Date of Loss: ${letterData.caseInfo.dateOfLoss}`,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.SMALL }
        ),
      ];

      // Add policy/claim numbers
      const headerWithNumbers = addPolicyClaimNumbers(
        headerParagraphs,
        FONT_SIZES.LARGE
      );

      // Add title
      headerWithNumbers.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND FOR SETTLEMENT",
              bold: true,
              size: FONT_SIZES.TITLE,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: SPACING.SMALL, after: SPACING.XLARGE },
        })
      );

      sections.push(...headerWithNumbers);

      // Add opening paragraph
      sections.push(
        createTextParagraph("Dear Claims Representative:", FONT_SIZES.LARGE, false, {
          after: SPACING.LARGE,
        }),
        createTextParagraph(
          letterData.openingParagraph ||
            `This letter serves as formal notice of our policy limit demand on behalf of our client, ${letterData.caseInfo.client}, arising from the motor vehicle accident that occurred on ${letterData.caseInfo.dateOfLoss}.`,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.XLARGE }
        )
      );

      // Add dynamic sections
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        sections.push(createSectionTitleParagraph(section.title));

        // Special handling for damages section - ALWAYS use structured format
        if (section.key === 'damages') {
          const damagesContent = section.content as string | DamagesBreakdown;

          // Convert to structured format if string
          const structuredDamages = typeof damagesContent === 'string'
            ? parseStringDamages(damagesContent)
            : damagesContent;

          // Handle new multi-person structure
          if (structuredDamages.people && Array.isArray(structuredDamages.people)) {
            // Add opening paragraph with total settlement demand
            sections.push(
              createTextParagraph(
                `Based on the foregoing, we demand payment in the amount of $${structuredDamages.totalSettlementDemand?.toLocaleString() || '0'} to settle claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
                FONT_SIZES.LARGE,
                false,
                { after: SPACING.REGULAR }
              )
            );

            // Process each person's damages
            structuredDamages.people.forEach((person) => {
              // Special Damages for this person
              if (person.specialDamages) {
                sections.push(
                  createTextParagraph(
                    `• Special Damages for ${person.name} (Past Medical Expenses): $ – $${person.specialDamages.total.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    true,
                    { after: SPACING.SMALL }
                  )
                );
                person.specialDamages.items.forEach((item) => {
                  sections.push(
                    createTextParagraph(
                      `  ○ ${item.description} $${item.amount.toLocaleString()}`,
                      FONT_SIZES.LARGE,
                      false,
                      { after: SPACING.SMALL }
                    )
                  );
                });
                sections.push(
                  createTextParagraph(
                    `  ○ Total (Actual Past Bills) $${person.specialDamages.total.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    false,
                    { after: SPACING.REGULAR }
                  )
                );
              }

              // Future Medical Expenses for this person
              if (person.futureMedicalExpenses) {
                sections.push(
                  createTextParagraph(
                    `• Future Medical Expenses for ${person.name}: $${person.futureMedicalExpenses.total.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    true,
                    { after: SPACING.SMALL }
                  )
                );
                person.futureMedicalExpenses.items.forEach((item, index) => {
                  const letter = String.fromCharCode(97 + index); // a, b, c, ...
                  sections.push(
                    createTextParagraph(
                      `  ${letter}. ${item.description}: $${item.amount.toLocaleString()}`,
                      FONT_SIZES.LARGE,
                      false,
                      { after: SPACING.SMALL }
                    )
                  );
                });
                sections.push(new Paragraph({ spacing: { after: SPACING.REGULAR } }));
              }

              // General Damages for this person
              if (person.generalDamages) {
                sections.push(
                  createTextParagraph(
                    `• General Damages for ${person.name} (Pain, Suffering, & Loss of Enjoyment): $${person.generalDamages.total.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    true,
                    { after: SPACING.SMALL }
                  )
                );
                person.generalDamages.items.forEach((item, index) => {
                  const letter = String.fromCharCode(97 + index); // a, b, c, ...
                  sections.push(
                    createTextParagraph(
                      `  ${letter}. ${item}`,
                      FONT_SIZES.LARGE,
                      false,
                      { after: SPACING.SMALL }
                    )
                  );
                });
              }
            });

            // Add total settlement demand
            if (structuredDamages.totalSettlementDemand) {
              sections.push(
                createTextParagraph(
                  `Total Settlement Demand: $${structuredDamages.totalSettlementDemand.toLocaleString()}`,
                  FONT_SIZES.LARGE,
                  true,
                  { after: SPACING.REGULAR }
                )
              );
            }
          } else {
            // Handle legacy single person structure
            // Special Damages
            if (structuredDamages.specialDamages) {
              sections.push(
                createTextParagraph(
                  `1.  Special Damages – $${structuredDamages.specialDamages.total.toLocaleString()}`,
                  FONT_SIZES.LARGE,
                  true,
                  { after: SPACING.SMALL }
                )
              );
              structuredDamages.specialDamages.items.forEach((item) => {
                sections.push(
                  createTextParagraph(
                    `     ○  ${item.description}: $${item.amount.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    false,
                    { after: SPACING.SMALL }
                  )
                );
              });
              sections.push(
                createTextParagraph(
                  `     ○  Total Past Medical Expenses: $${structuredDamages.specialDamages.total.toLocaleString()}`,
                  FONT_SIZES.LARGE,
                  false,
                  { after: SPACING.REGULAR }
                )
              );
            }

            // Future Medical Expenses
            if (structuredDamages.futureMedicalExpenses) {
              sections.push(
                createTextParagraph(
                  `2.  Future Medical Expenses – $${structuredDamages.futureMedicalExpenses.total.toLocaleString()}`,
                  FONT_SIZES.LARGE,
                  true,
                  { after: SPACING.SMALL }
                )
              );
              structuredDamages.futureMedicalExpenses.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                sections.push(
                  createTextParagraph(
                    `     ${letter}.  ${item.description}: $${item.amount.toLocaleString()}`,
                    FONT_SIZES.LARGE,
                    false,
                    { after: SPACING.SMALL }
                  )
                );
              });
              sections.push(new Paragraph({ spacing: { after: SPACING.REGULAR } }));
            }

            // General Damages
            if (structuredDamages.generalDamages) {
              sections.push(
                createTextParagraph(
                  `3.  General Damages – $${structuredDamages.generalDamages.total.toLocaleString()}`,
                  FONT_SIZES.LARGE,
                  true,
                  { after: SPACING.SMALL }
                )
              );
              structuredDamages.generalDamages.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                sections.push(
                  createTextParagraph(
                    `     ${letter}.  ${item}`,
                    FONT_SIZES.LARGE,
                    false,
                    { after: SPACING.SMALL }
                  )
                );
              });
            }
          }
        } else if (Array.isArray(section.content)) {
          section.content.forEach((item) => {
            sections.push(
              createTextParagraph(`• ${item}`, FONT_SIZES.LARGE, false, {
                after: SPACING.REGULAR,
              })
            );
          });
        } else {
          const paragraphs = section.content
            .split("\n")
            .filter((p) => p.trim());
          paragraphs.forEach((para) => {
            sections.push(
              createTextParagraph(para.trim(), FONT_SIZES.LARGE, false, {
                after: SPACING.REGULAR,
              })
            );
          });
        }
      });

      // Add exhibits section if there are exhibits
      if (exhibits && exhibits.length > 0) {
        sections.push(createSectionTitleParagraph("EXHIBITS"));

        exhibits.forEach((exhibit: ExhibitData) => {
          sections.push(
            createTextParagraph(exhibit.heading, FONT_SIZES.LARGE, true, {
              before: SPACING.LARGE,
              after: SPACING.SMALL,
            }),
            createTextParagraph(exhibit.summary, FONT_SIZES.LARGE, false, {
              after: SPACING.LARGE,
            })
          );

          // Add images if present
          if (exhibit.images && exhibit.images.length > 0) {
            exhibit.images.forEach((image) => {
              try {
                const imageBuffer = base64ToBuffer(image);
                sections.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: {
                          width: 500,
                          height: 375,
                        },
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: SPACING.LARGE },
                  })
                );
              } catch (error) {
                console.error("Error adding image to exhibit:", error);
              }
            });
          }
        });
      }

      // Add closing section
      sections.push(
        createSectionTitleParagraph("DEMAND"),
        createTextParagraph(
          `Based on the foregoing, we demand payment in the amount of $${letterData.totalMedicalExpenses.toLocaleString()} to settle all claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.XLARGE }
        ),
        createTextParagraph("Sincerely,", FONT_SIZES.LARGE, false, {
          after: SPACING.LARGE,
        }),
        createTextParagraph(letterData.attorney.name, FONT_SIZES.LARGE, true, {
          after: SPACING.SMALL,
        }),
        createTextParagraph(letterData.attorney.title, FONT_SIZES.LARGE, false)
      );

      return sections;
    };

    // Create document sections
    let documentSections: (Paragraph | Table)[] = [];

    if (pleadingPaper) {
      // Use the same sections as regular format, but wrap in pleading paper table
      const regularSections = buildRegularFormatSections();

      // Convert sections to pleading paper format with line numbers
      let lineNumber = 1;
      const pleadingRows: TableRow[] = [];

      regularSections.forEach((paragraph) => {
        const row = new TableRow({
          children: [
            // Line number cell (left margin) - narrower
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: lineNumber.toString(),
                      size: FONT_SIZES.SMALL,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 400, type: WidthType.DXA }, // Fixed width in twips (about 0.28 inches)
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              },
              verticalAlign: VerticalAlign.TOP,
              margins: {
                top: 0,
                bottom: 0,
                left: 20,
                right: 100,
              },
            }),
            // Content cell - much wider
            new TableCell({
              children: [paragraph],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              },
              verticalAlign: VerticalAlign.TOP,
              margins: {
                top: 0,
                bottom: 0,
                left: 200,
                right: 200,
              },
            }),
          ],
          cantSplit: true,
        });

        pleadingRows.push(row);
        lineNumber++;
      });

      const pleadingTable = new Table({
        rows: pleadingRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      documentSections.push(pleadingTable);
    } else {
      // Regular format (existing code)
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.name || "[Attorney Name]",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.title || "[Attorney Title]",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.specialization || "[Specialization]",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.address || "[Attorney Address]",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `TEL: ${letterData.attorney.phone || "[Phone]"} | FAX: ${letterData.attorney.fax || "[Fax]"}`,
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              size: 20,
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.insuranceCompany.name,
              bold: true,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.insuranceCompany.address,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Attention: ${letterData.insuranceCompany.attention}`,
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Re: ${letterData.caseInfo.client}`,
              bold: true,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Date of Loss: ${letterData.caseInfo.dateOfLoss}`,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        ...(letterData.caseInfo?.policyNumber
          ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Policy Number: ${letterData.caseInfo.policyNumber}`,
                    size: 20,
                  }),
                ],
                spacing: { after: 100 },
              }),
            ]
          : []),
        ...(letterData.caseInfo?.claimNumber
          ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Claim Number: ${letterData.caseInfo.claimNumber}`,
                    size: 20,
                  }),
                ],
                spacing: { after: 100 },
              }),
            ]
          : []),
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND FOR SETTLEMENT",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Dear Claims Representative:",
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text:
                letterData.openingParagraph ||
                `This letter serves as formal notice of our policy limit demand on behalf of our client, ${letterData.caseInfo.client}, arising from the motor vehicle accident that occurred on ${letterData.caseInfo.dateOfLoss}.`,
              size: 20,
            }),
          ],
          spacing: { after: 300 },
        })
      );

      // Add dynamic sections
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.title.toUpperCase(),
                bold: true,
                size: 22,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          })
        );

        // Special handling for damages section - ALWAYS use structured format
        if (section.key === 'damages') {
          const damagesContent = section.content as string | DamagesBreakdown;

          // Convert to structured format if string
          const structuredDamages = typeof damagesContent === 'string'
            ? parseStringDamages(damagesContent)
            : damagesContent;

          // Handle new multi-person structure
          if (structuredDamages.people && Array.isArray(structuredDamages.people)) {
            // Add opening paragraph with total settlement demand
            const totalDemand = structuredDamages.totalSettlementDemand || 0;
            const totalDemandStr = typeof totalDemand === 'number' ? totalDemand.toLocaleString() : '0';
            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Based on the foregoing, we demand payment in the amount of $${totalDemandStr} to settle claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
                    size: 20,
                  }),
                ],
                spacing: { after: 200 },
              })
            );

            // Process each person's damages
            structuredDamages.people.forEach((person) => {
              // Special Damages for this person
              if (person.specialDamages && typeof person.specialDamages.total === 'number') {
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `• Special Damages for ${person.name} (Past Medical Expenses): $ – $${person.specialDamages.total.toLocaleString()}`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
                if (Array.isArray(person.specialDamages.items)) {
                  person.specialDamages.items.forEach((item) => {
                    const amount = typeof item.amount === 'number' ? item.amount.toLocaleString() : '0';
                    documentSections.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `  ○ ${item.description} $${amount}`,
                            size: 20,
                          }),
                        ],
                        spacing: { after: 100 },
                      })
                    );
                  });
                }
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `  ○ Total (Actual Past Bills) $${person.specialDamages.total.toLocaleString()}`,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 150 },
                  })
                );
              }

              // Future Medical Expenses for this person
              if (person.futureMedicalExpenses && typeof person.futureMedicalExpenses.total === 'number') {
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `• Future Medical Expenses for ${person.name}: $${person.futureMedicalExpenses.total.toLocaleString()}`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
                if (Array.isArray(person.futureMedicalExpenses.items)) {
                  person.futureMedicalExpenses.items.forEach((item, index) => {
                    const letter = String.fromCharCode(97 + index); // a, b, c, ...
                    const amount = typeof item.amount === 'number' ? item.amount.toLocaleString() : '0';
                    documentSections.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `  ${letter}. ${item.description}: $${amount}`,
                            size: 20,
                          }),
                        ],
                        spacing: { after: 100 },
                      })
                    );
                  });
                }
                documentSections.push(
                  new Paragraph({
                    spacing: { after: 150 },
                  })
                );
              }

              // General Damages for this person
              if (person.generalDamages && typeof person.generalDamages.total === 'number') {
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `• General Damages for ${person.name} (Pain, Suffering, & Loss of Enjoyment): $${person.generalDamages.total.toLocaleString()}`,
                        bold: true,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
                if (Array.isArray(person.generalDamages.items)) {
                  person.generalDamages.items.forEach((item, index) => {
                    const letter = String.fromCharCode(97 + index); // a, b, c, ...
                    documentSections.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `  ${letter}. ${item}`,
                            size: 20,
                          }),
                        ],
                        spacing: { after: 100 },
                      })
                    );
                  });
                }
              }
            });

            // Add total settlement demand
            if (typeof structuredDamages.totalSettlementDemand === 'number') {
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Total Settlement Demand: $${structuredDamages.totalSettlementDemand.toLocaleString()}`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 200 },
                })
              );
            }
          } else {
            // Handle legacy single person structure
            // Special Damages
            if (structuredDamages.specialDamages) {
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `1.  Special Damages – $${structuredDamages.specialDamages.total.toLocaleString()}`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
              structuredDamages.specialDamages.items.forEach((item) => {
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `     ○  ${item.description}: $${item.amount.toLocaleString()}`,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
              });
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `     ○  Total Past Medical Expenses: $${structuredDamages.specialDamages.total.toLocaleString()}`,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 150 },
                })
              );
            }

            // Future Medical Expenses
            if (structuredDamages.futureMedicalExpenses) {
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `2.  Future Medical Expenses – $${structuredDamages.futureMedicalExpenses.total.toLocaleString()}`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
              structuredDamages.futureMedicalExpenses.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `     ${letter}.  ${item.description}: $${item.amount.toLocaleString()}`,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
              });
            }

            // General Damages
            if (structuredDamages.generalDamages) {
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `3.  General Damages – $${structuredDamages.generalDamages.total.toLocaleString()}`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
              structuredDamages.generalDamages.items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // a, b, c, ...
                documentSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `     ${letter}.  ${item}`,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
              });
            }
          }
        } else if (Array.isArray(section.content)) {
          section.content.forEach((item) => {
            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${item}`,
                    size: 20,
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          });
        } else {
          const paragraphs = section.content
            .split("\n")
            .filter((p) => p.trim());
          paragraphs.forEach((para) => {
            documentSections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: para.trim(),
                    size: 20,
                  }),
                ],
                spacing: { after: 150 },
              })
            );
          });
        }
      });

      // Add exhibits section if there are exhibits
      if (exhibits && exhibits.length > 0) {
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "EXHIBITS",
                bold: true,
                size: 22,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          })
        );

        exhibits.forEach((exhibit: any) => {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${exhibit.heading}`,
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: exhibit.summary,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            })
          );

          // Add images if present
          if (exhibit.images && exhibit.images.length > 0) {
            exhibit.images.forEach((image) => {
              try {
                const imageBuffer = base64ToBuffer(image);
                documentSections.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageBuffer,
                        transformation: {
                          width: 500,
                          height: 375,
                        },
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                  })
                );
              } catch (error) {
                console.error("Error adding image to exhibit:", error);
              }
            });
          }
        });
      }

      // Add closing - use the same demand amount from DAMAGES section
      const closingDemands: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND",
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        }),
      ];

      // Extract settlement demand from damages section
      let settlementDemandAmount: string | null = null;
      const damagesSection = dynamicSections.find((s) => s.key === 'damages');
      if (damagesSection) {
        const damagesContent = damagesSection.content as string | DamagesBreakdown;
        const structuredDamages = typeof damagesContent === 'string'
          ? parseStringDamages(damagesContent)
          : damagesContent;

        if (structuredDamages.people && Array.isArray(structuredDamages.people)) {
          // New multi-person structure
          if (typeof structuredDamages.totalSettlementDemand === 'number') {
            settlementDemandAmount = structuredDamages.totalSettlementDemand.toLocaleString();
          }
        } else if (structuredDamages.specialDamages) {
          // Legacy structure - calculate from special damages total
          settlementDemandAmount = structuredDamages.specialDamages.total.toLocaleString();
        }
      }

      // Use settlement demand from damages, or fallback to totalMedicalExpenses
      const demandAmount = settlementDemandAmount || letterData.totalMedicalExpenses.toLocaleString();

      closingDemands.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Based on the foregoing, we demand payment in the amount of $${demandAmount} to settle claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
              size: 20,
            }),
          ],
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Sincerely,",
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.name,
              bold: true,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.title,
              size: 20,
            }),
          ],
        })
      );

      documentSections.push(...closingDemands);
    }

    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: documentSections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Generate filename
    const dateString = new Date().toISOString().split("T")[0];
    const clientName = letterData.caseInfo.client.replace(/\s+/g, "-");
    const prefix = pleadingPaper ? "pleading-demand-letter" : "demand-letter";
    const filename = `${prefix}-${clientName}-${dateString}.docx`;

    // Return as downloadable file
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Word document", details: error.message },
      { status: 500 }
    );
  }
}
