import React from "react";
import { LetterData, Document } from "@/types";

interface LetterPreviewProps {
  letterData: LetterData;
  documents: Document[];
  onSectionClick?: (sectionName: string) => void;
  selectedSection?: string;
}

const LetterPreview: React.FC<LetterPreviewProps> = ({
  letterData,
  documents,
  onSectionClick,
  selectedSection,
}) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const policeData = documents.find((doc) => doc.type === "police")?.data;
  const totalDemand = Math.max(letterData.totalMedicalExpenses * 3, 50000);

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

          {/* Letter Content */}
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

          {/* Nature of Claim */}
          <div className="letter-section">
            <div className="section-title">
              {letterData.suggestedContent?.facts ||
              letterData.suggestedHeadings?.natureOfClaim
                ? letterData.suggestedHeadings?.natureOfClaim ||
                  "NATURE OF CLAIM"
                : "NATURE OF CLAIM"}
            </div>
            <div
              className={`section-content editable-section ${
                selectedSection === "facts" ? "active" : ""
              }`}
              data-section="facts"
              onClick={() => onSectionClick?.("facts")}
            >
              {letterData.suggestedContent?.facts ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: letterData.suggestedContent.facts.replace(
                      /\n/g,
                      "<br/>"
                    ),
                  }}
                />
              ) : (
                <>
                  <p>
                    On{" "}
                    {policeData?.dateOfIncident ||
                      letterData.caseInfo.dateOfLoss ||
                      "[Date of Incident]"}
                    , our client was operating his vehicle in a lawful manner
                    when he was struck by your insured's vehicle. The collision
                    occurred at{" "}
                    {policeData?.location || "[Location of Incident]"} and
                    resulted in significant property damage and personal
                    injuries to our client.
                  </p>
                  {policeData || letterData.caseInfo.dateOfLoss ? (
                    <ol>
                      <li>
                        Your insured failed to yield the right of way at a
                        controlled intersection.
                      </li>
                      <li>
                        Your insured violated California Vehicle Code Section
                        21457(a) by failing to stop at a flashing red signal.
                      </li>
                      <li>
                        Our client sustained significant injuries as a direct
                        and proximate result of this collision.
                      </li>
                      <li>
                        Our client has incurred substantial medical expenses and
                        economic losses.
                      </li>
                    </ol>
                  ) : (
                    <p>
                      [Facts and details will appear here when documents are
                      uploaded or case information is entered]
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Liability */}
          <div className="letter-section">
            <div className="section-title">LIABILITY</div>
            <div
              className={`section-content editable-section ${
                selectedSection === "liability" ? "active" : ""
              }`}
              data-section="liability"
              onClick={() => onSectionClick?.("liability")}
            >
              <p>
                [Liability analysis will appear here when case details are
                entered. This section will include legal standards, breach of
                duty analysis, and causation arguments.]
              </p>
            </div>
          </div>

          {/* Bodily Injury Summary */}
          <div className="letter-section">
            <div className="section-title">BODILY INJURY SUMMARY</div>
            <div
              className={`section-content editable-section ${
                selectedSection === "injuries" ? "active" : ""
              }`}
              data-section="injuries"
              onClick={() => onSectionClick?.("injuries")}
            >
              <p>
                As a direct and proximate result of this collision, our client
                sustained the following significant injuries:
              </p>
              {letterData.injuries.length > 0 ? (
                <>
                  <ul className="injury-list">
                    {letterData.injuries.map((injury, index) => (
                      <li key={index}>{injury}</li>
                    ))}
                  </ul>
                  <p>
                    These injuries have caused our client significant pain,
                    suffering, and limitation of daily activities.
                  </p>
                </>
              ) : (
                <p>
                  [Injury details will appear here when medical documents are
                  uploaded]
                </p>
              )}
            </div>
          </div>

          {/* Medical Treatment */}
          <div className="letter-section">
            <div className="section-title">MEDICAL TREATMENT</div>
            <div
              className={`section-content editable-section ${
                selectedSection === "medical" ? "active" : ""
              }`}
              data-section="medical"
              onClick={() => onSectionClick?.("medical")}
            >
              <p>
                Our client has received extensive medical treatment for the
                injuries sustained in this collision:
              </p>

              {letterData.medicalTreatment.length > 0 ? (
                letterData.medicalTreatment.map((treatment, index) => (
                  <div key={index} className="medical-provider">
                    <div className="provider-header">
                      <div className="provider-name">{treatment.provider}</div>
                      <div className="provider-amount">
                        $
                        {treatment.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div className="provider-details">
                      <strong>Date of Service:</strong>{" "}
                      {treatment.dateOfService}
                      <br />
                      <strong>Services:</strong> {treatment.services.join(", ")}
                      <br />
                      <strong>Diagnosis:</strong>{" "}
                      {treatment.diagnosis
                        ? treatment.diagnosis.join(", ")
                        : treatment.findings
                        ? treatment.findings.join(", ")
                        : "Medical evaluation and treatment"}
                    </div>
                  </div>
                ))
              ) : (
                <p>
                  [Medical treatment details will appear here when medical bills
                  are uploaded]
                </p>
              )}
            </div>
          </div>

          {/* Damages */}
          <div className="letter-section">
            <div className="section-title">DAMAGES</div>
            <div
              className={`section-content editable-section ${
                selectedSection === "damages" ? "active" : ""
              }`}
              data-section="damages"
              onClick={() => onSectionClick?.("damages")}
            >
              <p>
                <strong>A. Medical Expenses</strong>
              </p>
              <p>
                Our client has incurred medical expenses totaling $
                {letterData.totalMedicalExpenses > 0
                  ? letterData.totalMedicalExpenses.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "[Amount will be calculated when medical bills are uploaded]"}{" "}
                as a direct result of this collision. These expenses are
                reasonable, necessary, and causally related to the incident.
              </p>

              <p>
                <strong>B. Pain and Suffering</strong>
              </p>
              <p>
                Our client has endured significant physical pain, mental
                anguish, and emotional distress as a result of the injuries
                sustained. The pain and suffering damages are substantial and
                ongoing, affecting our client's quality of life and daily
                activities.
              </p>

              <p>
                <strong>C. Loss of Earnings</strong>
              </p>
              <p>
                Our client has suffered economic losses due to time missed from
                work and diminished earning capacity.
              </p>
            </div>
          </div>

          {/* Demand */}
          <div className="letter-section">
            <div className="section-title">DEMAND</div>
            <div
              className={`section-content editable-section ${
                selectedSection === "demand" ? "active" : ""
              }`}
              data-section="demand"
              onClick={() => onSectionClick?.("demand")}
            >
              <p>
                Based on the liability of your insured and the extent of our
                client's damages, we hereby demand payment of your policy limits
                in the amount of{" "}
                <strong>
                  {letterData.totalMedicalExpenses > 0
                    ? `$${totalDemand.toLocaleString("en-US")}`
                    : "[Demand amount will be calculated when medical bills are uploaded]"}
                </strong>{" "}
                in settlement of all claims arising from this incident.
              </p>

              <p>
                This demand is made pursuant to Crisci v. Security Insurance
                Company (1967) 66 Cal. 2d 425, which establishes the duty of an
                insurance company to accept reasonable settlement demands within
                policy limits to protect the insured from excess liability.
              </p>

              <p>
                <strong>
                  This demand expires thirty (30) days from the date of this
                  letter.
                </strong>{" "}
                Failure to respond to this demand within the time specified may
                result in bad faith liability against your company.
              </p>
            </div>
          </div>

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
