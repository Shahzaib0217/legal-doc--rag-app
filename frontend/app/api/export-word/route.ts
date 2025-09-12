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
} from "docx";

export async function POST(request: NextRequest) {
  try {
    const {
      letterData,
      exhibits,
      pleadingPaper = false,
    } = await request.json();

    // Helper function to format section title
    const formatSectionTitle = (key: string): string => {
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    };

    // Helper function to get dynamic sections
    const getDynamicSections = () => {
      const sections: Array<{
        key: string;
        title: string;
        content: string | string[];
      }> = [];

      // Get sections from globalAnalysis or suggestedContent
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

    // Helper function to create pleading paper format with line numbers
    const createPleadingContent = (content: Paragraph[]): Table[] => {
      const tables: Table[] = [];
      let lineNumber = 1;

      content.forEach((paragraph) => {
        const table = new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: lineNumber.toString(),
                          size: 16,
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                  width: {
                    size: 8,
                    type: WidthType.PERCENTAGE,
                  },
                  verticalAlign: VerticalAlign.TOP,
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.SINGLE, size: 1 },
                  },
                }),
                new TableCell({
                  children: [paragraph],
                  width: {
                    size: 92,
                    type: WidthType.PERCENTAGE,
                  },
                  verticalAlign: VerticalAlign.TOP,
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
          ],
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        });
        tables.push(table);
        lineNumber += Math.ceil(paragraph.toString().length / 80); // Estimate lines
      });

      return tables;
    };

    // Create document sections
    const documentSections: (Paragraph | Table)[] = [];

    if (pleadingPaper) {
      // Pleading Paper Header
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "SUPERIOR COURT OF CALIFORNIA",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "COUNTY OF [COUNTY NAME]",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // Create content paragraphs first
      const contentParagraphs: Paragraph[] = [
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
              size: 18,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.address,
              size: 18,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Phone: ${letterData.attorney.phone} | Fax: ${letterData.attorney.fax}`,
              size: 18,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND FOR SETTLEMENT",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
      ];

      // Add dynamic sections to content
      const dynamicSections = getDynamicSections();
      dynamicSections.forEach((section) => {
        contentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.title.toUpperCase(),
                bold: true,
                size: 20,
              }),
            ],
            spacing: { before: 300, after: 200 },
          })
        );

        if (Array.isArray(section.content)) {
          section.content.forEach((item) => {
            contentParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${item}`,
                    size: 18,
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
            contentParagraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: para.trim(),
                    size: 18,
                  }),
                ],
                spacing: { after: 150 },
              })
            );
          });
        }
      });

      // Add closing to content
      contentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND",
              bold: true,
              size: 20,
            }),
          ],
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Based on the foregoing, we demand payment in the amount of $${letterData.totalMedicalExpenses.toLocaleString()} to settle all claims arising from this incident. Please contact the undersigned to discuss settlement within thirty (30) days of receipt of this letter.`,
              size: 18,
            }),
          ],
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Sincerely,",
              size: 18,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.name,
              bold: true,
              size: 18,
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: letterData.attorney.title,
              size: 18,
            }),
          ],
        })
      );

      // Convert to pleading format
      const pleadingTables = createPleadingContent(contentParagraphs);
      documentSections.push(...pleadingTables);
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
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "DEMAND FOR SETTLEMENT",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
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

    const filename = pleadingPaper
      ? `pleading-demand-letter-${letterData.caseInfo.client.replace(
          /\s+/g,
          "-"
        )}-${new Date().toISOString().split("T")[0]}.docx`
      : `demand-letter-${letterData.caseInfo.client.replace(/\s+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.docx`;

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
