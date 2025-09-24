import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
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

    // Helper to build pleading paper content lines
    const buildPleadingContentLines = (): string[] => {
      const contentLines: string[] = [];

      // Header information
      const headerLines = [
        letterData.attorney.name,
        letterData.attorney.title,
        letterData.attorney.address,
        `Phone: ${letterData.attorney.phone} | Fax: ${letterData.attorney.fax}`,
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

      // Add dynamic sections
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        contentLines.push("", section.title.toUpperCase(), ""); // Empty line, title, empty line

        if (Array.isArray(section.content)) {
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
        createTextParagraph(letterData.attorney.name, FONT_SIZES.TITLE, true, {
          after: SPACING.SMALL,
        }),
        createTextParagraph(
          letterData.attorney.title,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.SMALL }
        ),
        createTextParagraph(
          letterData.attorney.address,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.SMALL }
        ),
        createTextParagraph(
          `Phone: ${letterData.attorney.phone} | Fax: ${letterData.attorney.fax}`,
          FONT_SIZES.LARGE,
          false,
          { after: SPACING.LARGE }
        ),
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

      // Add dynamic sections
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        sections.push(createSectionTitleParagraph(section.title));

        if (Array.isArray(section.content)) {
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
    const documentSections: Paragraph[] = [];

    if (pleadingPaper) {
      // Use optimized content builder and converter (paragraph-based)
      const contentLines = buildPleadingContentLines();
      const pleadingParagraphs = createPleadingContent(contentLines);
      documentSections.push(...pleadingParagraphs);
    } else {
      // Regular format (existing code)
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.name,
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.title,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.address,
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Phone: ${letterData.attorney.phone} | Fax: ${letterData.attorney.fax}`,
              size: 20,
            }),
          ],
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

        if (Array.isArray(section.content)) {
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
        });
      }

      // Add closing
      documentSections.push(
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
        new Paragraph({
          children: [
            new TextRun({
              text: `Based on the foregoing, we demand payment in the amount of $${letterData.totalMedicalExpenses.toLocaleString()} to settle all claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
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
