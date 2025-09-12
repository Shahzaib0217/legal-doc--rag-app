import React from "react";

interface HeaderProps {
  onExport: () => void;
  onSave: () => void;
  pleadingPaper: boolean;
  onPleadingPaperChange: (checked: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  onExport,
  onSave,
  pleadingPaper,
  onPleadingPaperChange,
}) => {
  return (
    <header className="app-header">
      <h1>Legal Demand Letter Generator</h1>
      <div className="header-actions">
        <label className="pleading-checkbox">
          <input
            type="checkbox"
            checked={pleadingPaper}
            onChange={(e) => onPleadingPaperChange(e.target.checked)}
          />
          <span className="checkmark"></span>
          Pleading Paper
        </label>
        <button className="btn btn--secondary btn--sm" onClick={onSave}>
          <i className="fas fa-save"></i> Save
        </button>
        <button className="btn btn--primary btn--sm" onClick={onExport}>
          <i className="fas fa-print"></i> Export
        </button>
      </div>
    </header>
  );
};

export default Header;
