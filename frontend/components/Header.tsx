import React from "react";

interface HeaderProps {
  onExport: () => void;
  onSave: () => void;
}

const Header: React.FC<HeaderProps> = ({ onExport, onSave }) => {
  return (
    <header className="app-header">
      <h1>Legal Demand Letter Generator</h1>
      <div className="header-actions">
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
