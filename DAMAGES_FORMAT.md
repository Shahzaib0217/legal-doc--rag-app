# Damages Section Format

**The damages section ALWAYS displays with structured bullet points in the exported Word document.**

The AI will automatically generate damages in a structured format when processing PDFs. Even if legacy string data is provided, it will be automatically converted to the structured format.

## Structure

The damages field uses a structured object with three main sections:

### 1. Special Damages
Past medical expenses and treatments already incurred.

### 2. Future Medical Expenses
Anticipated medical costs for future treatments.

### 3. General Damages
Non-economic damages such as pain and suffering.

## Example Usage

```javascript
damages: {
  specialDamages: {
    total: 78018.00,
    items: [
      { description: "CARE Ambulance services", amount: 2346.00 },
      { description: "Rio Chiropractic Inc. treatments", amount: 3241.60 },
      { description: "Reveal MRI by Riverside Elite Imaging", amount: 2100.00 },
      { description: "Initial evaluations and PRP injection, Dr. Raj Ahluwala & Dr. Fady Elias", amount: 6050.00 },
      { description: "Evaluations and Cervical Spine Facet Joint Injections, Haven Orthopedics & Spine Institute", amount: 23650.00 },
      { description: "Pomona Valley Hospital Medical Center Emergency Visit and Diagnostic Care", amount: 38630.94 }
    ]
  },
  futureMedicalExpenses: {
    total: 40500.00,
    items: [
      { description: "Two additional PRP injections", amount: 12000.00 },
      { description: "Three Cervical Epidural Steroid Injections (CESI)", amount: 28500.00 }
    ]
  },
  generalDamages: {
    total: 300000.00,
    items: [
      "Severe and persistent pain and suffering",
      "Loss of enjoyment of life due to activity restrictions",
      "Emotional distress from the chronic nature of injuries and uncertain prognosis"
    ]
  }
}
```

## Output Format

The Word document will display the damages section as:

**DAMAGES**

**1.  Special Damages – $78,018.00**
     ○  CARE Ambulance services: $2,346.00
     ○  Rio Chiropractic Inc. treatments: $3,241.60
     ○  Reveal MRI by Riverside Elite Imaging: $2,100.00
     ○  Initial evaluations and PRP injection, Dr. Raj Ahluwala & Dr. Fady Elias: $6,050.00
     ○  Evaluations and Cervical Spine Facet Joint Injections, Haven Orthopedics & Spine Institute: $23,650.00
     ○  Pomona Valley Hospital Medical Center Emergency Visit and Diagnostic Care: $38,630.94
     ○  Total Past Medical Expenses: $78,018.00

**2.  Future Medical Expenses – $40,500.00**
     a.  Two additional PRP injections: $12,000.00
     b.  Three Cervical Epidural Steroid Injections (CESI): $28,500.00

**3.  General Damages – $300,000.00**
     a.  Severe and persistent pain and suffering
     b.  Loss of enjoyment of life due to activity restrictions
     c.  Emotional distress from the chronic nature of injuries and uncertain prognosis

## Automatic Conversion

If damages data comes in as a plain string (legacy format), the system automatically converts it to the structured format using:
- Past medical expenses from exhibit totals for Special Damages
- Standard general damages items (pain/suffering, loss of enjoyment, emotional distress)
- Estimated totals based on case severity

**Result:** All exported documents will have properly formatted, hierarchical damages sections with bullet points, regardless of input format.

## TypeScript Type Definition

```typescript
interface DamagesBreakdown {
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
```

## Notes

- All monetary amounts are automatically formatted with commas (e.g., 78018.00 becomes $78,018.00)
- Special Damages items use circle bullets (○)
- Future Medical Expenses use lowercase letters (a, b, c, ...)
- General Damages use lowercase letters (a, b, c, ...)
- The format works for both regular and pleading paper document formats
