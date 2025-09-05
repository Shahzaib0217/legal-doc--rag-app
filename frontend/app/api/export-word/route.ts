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

export async function POST(request: NextRequest) {
  try {
    const { letterData, exhibits } = await request.json();

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

    // Create document sections
    const documentSections: Paragraph[] = [];

    // Header with attorney and insurance company info
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
            text: `RE: Your Insured: ${letterData.caseInfo.client}`,
            bold: true,
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Policy Number: ${letterData.caseInfo.policyNumber}`,
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Claim Number: ${letterData.caseInfo.claimNumber}`,
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
      // Add section heading
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

      // Add section content
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
        // Split content by paragraphs for better formatting
        const paragraphs = section.content.split("\n").filter((p) => p.trim());
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

      exhibits.forEach((exhibit: any, index: number) => {
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

    // Return as downloadable file
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="demand-letter-${letterData.caseInfo.client.replace(
          /\s+/g,
          "-"
        )}-${new Date().toISOString().split("T")[0]}.docx"`,
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
