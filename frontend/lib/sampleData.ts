import { LetterData, MedicalBill } from "@/types";

export const getEmptyLetterData = (): LetterData => {
  return {
    attorney: {
      name: "",
      title: "",
      specialization: "",
      address: "",
      phone: "",
      fax: "",
    },
    insuranceCompany: {
      name: "",
      address: "",
      attention: "",
    },
    caseInfo: {
      client: "",
      policyNumber: "",
      claimNumber: "",
      dateOfLoss: "",
    },
    facts: [],
    injuries: [],
    medicalTreatment: [],
    totalMedicalExpenses: 0,
    suggestedContent: {
      facts: "",
      liability: "",
      injuries: "",
      medical: "",
      damages: "",
      demand: "",
    },
    suggestedHeadings: {
      natureOfClaim: "",
      liability: "",
      injuries: "",
      medicalTreatment: "",
      damages: "",
    },
  };
};

export const calculateTotalExpenses = (medicalBills: MedicalBill[]): number => {
  return medicalBills.reduce((total, bill) => total + (bill.amount || 0), 0);
};
