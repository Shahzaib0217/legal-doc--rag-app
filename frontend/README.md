# Demand Letter Generator - Next.js Frontend

This is a modern React/Next.js frontend for the Legal Demand Letter Generator application, converted from the original vanilla JavaScript version.

## Features

- **Modern React Components**: Properly separated, reusable components following best practices
- **TypeScript**: Full type safety and IntelliSense support
- **Responsive Design**: Mobile-friendly layout with CSS Grid and Flexbox
- **Document Upload Simulation**: Simulated PDF processing with drag-and-drop interface
- **Real-time Letter Preview**: Live preview of the generated demand letter
- **Editable Sections**: Ability to edit specific sections of the letter
- **Export Functionality**: Print and save letter as JSON
- **Medical Expense Tracking**: Automatic calculation of total medical expenses

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles (copied from original)
├── components/            # React components
│   ├── Header.tsx         # Header with export/save actions
│   ├── Sidebar.tsx        # Left sidebar with case info and uploads
│   ├── LetterPreview.tsx  # Main letter preview area
│   └── EditSidebar.tsx    # Right sidebar for editing
├── lib/                   # Utility functions
│   └── sampleData.ts      # Sample data and calculations
├── types/                 # TypeScript type definitions
│   └── index.ts           # All interface definitions
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Components

### Header Component

- Export/print functionality
- Save letter as JSON file
- Clean, professional header design

### Sidebar Component

- Case information form (client name, date of loss, policy number)
- Document upload area with drag-and-drop
- Document list with processing status
- Medical expense summary and breakdown

### LetterPreview Component

- Full formatted demand letter
- Dynamic content based on uploaded documents
- Professional legal document styling
- Clickable sections for editing

### EditSidebar Component

- Section selector for editing specific parts
- Text editor for content modification
- Suggestions and recommendations
- Letter statistics and metrics

## Technical Details

### State Management

- Uses React hooks (`useState`, `useEffect`) for local state
- Props drilling for component communication
- Ready for future Redux/Zustand integration

### Styling

- Preserves all original CSS styling
- CSS custom properties for theming
- Responsive design with mobile breakpoints
- Print-optimized styles

### Type Safety

- Full TypeScript implementation
- Interfaces for all data structures
- Type-safe props and state

### Future Enhancements

- Backend API integration
- Real PDF processing
- User authentication
- Document storage
- Template management
- Advanced editing features

## Migrating from Vanilla JS

The original vanilla JavaScript application has been converted to:

1. **Class → Functional Components**: The `DemandLetterGenerator` class is now split into multiple React functional components
2. **DOM Manipulation → React State**: Direct DOM updates replaced with React state management
3. **Event Listeners → React Events**: Native event listeners converted to React event handlers
4. **Global State → Component Props**: Global variables replaced with React props and state

## Next Steps

1. **Backend Integration**: Connect to API endpoints for document processing
2. **Database Storage**: Implement data persistence
3. **Authentication**: Add user accounts and case management
4. **Advanced Features**: Real PDF parsing, OCR, AI enhancements
5. **Testing**: Add unit and integration tests
6. **Deployment**: Set up CI/CD pipeline

## Development Notes

- The application uses static sample data for demonstration
- Document "processing" is simulated with timeouts
- All original functionality has been preserved
- Code follows React and TypeScript best practices
- Components are designed for reusability and maintainability
