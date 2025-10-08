import React, { useState } from "react";
import { Exhibit } from "@/types";

interface ExhibitManagerProps {
  exhibits: Exhibit[];
  onUpdateExhibits: (exhibits: Exhibit[]) => void;
}

const ExhibitManager: React.FC<ExhibitManagerProps> = ({
  exhibits,
  onUpdateExhibits,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newExhibits = [...exhibits];
    const draggedItem = newExhibits[draggedIndex];
    newExhibits.splice(draggedIndex, 1);
    newExhibits.splice(index, 0, draggedItem);

    onUpdateExhibits(newExhibits);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingTitle(exhibits[index].heading);
  };

  const handleSaveEdit = (index: number) => {
    if (editingTitle.trim()) {
      const newExhibits = [...exhibits];
      newExhibits[index] = {
        ...newExhibits[index],
        heading: editingTitle.trim(),
      };
      onUpdateExhibits(newExhibits);
    }
    setEditingIndex(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingTitle("");
  };

  const handleDeleteExhibit = (index: number) => {
    if (confirm("Are you sure you want to delete this exhibit?")) {
      const newExhibits = exhibits.filter((_, i) => i !== index);
      onUpdateExhibits(newExhibits);
    }
  };

  const moveExhibit = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === exhibits.length - 1)
    ) {
      return;
    }

    const newExhibits = [...exhibits];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newExhibits[index], newExhibits[targetIndex]] = [
      newExhibits[targetIndex],
      newExhibits[index],
    ];
    onUpdateExhibits(newExhibits);
  };

  if (exhibits.length === 0) {
    return (
      <div className="exhibit-manager">
        <h3>Exhibits</h3>
        <p className="text-muted">
          No exhibits yet. Upload PDFs to add exhibits.
        </p>
      </div>
    );
  }

  return (
    <div className="exhibit-manager">
      <h3>
        Exhibits ({exhibits.length})
        <span className="text-muted" style={{ fontSize: "0.85rem", marginLeft: "8px" }}>
          Drag to reorder
        </span>
      </h3>

      <div className="exhibit-list">
        {exhibits.map((exhibit, index) => (
          <div
            key={`${exhibit.fileName}-${index}`}
            className={`exhibit-item ${
              draggedIndex === index ? "exhibit-item--dragging" : ""
            }`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            {/* Left side - Number and Action icons */}
            <div className="exhibit-item__actions">
              <div className="exhibit-item__number">
                {index + 1}
              </div>
              {editingIndex !== index && (
                <>
                  <div className="exhibit-item__drag-handle" title="Drag to reorder">
                    <i className="fas fa-grip-vertical"></i>
                  </div>
                  <button
                    className="btn btn--xs btn--icon"
                    onClick={() => moveExhibit(index, "up")}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <i className="fas fa-chevron-up"></i>
                  </button>
                  <button
                    className="btn btn--xs btn--icon"
                    onClick={() => moveExhibit(index, "down")}
                    disabled={index === exhibits.length - 1}
                    title="Move down"
                  >
                    <i className="fas fa-chevron-down"></i>
                  </button>
                  <button
                    className="btn btn--xs btn--icon"
                    onClick={() => handleStartEdit(index)}
                    title="Edit title"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn btn--xs btn--icon btn--danger"
                    onClick={() => handleDeleteExhibit(index)}
                    title="Delete exhibit"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </>
              )}
            </div>

            {/* Right side - Content */}
            <div className="exhibit-item__content">
              {editingIndex === index ? (
                <div className="exhibit-item__edit">
                  <input
                    type="text"
                    className="form-control form-control--sm"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveEdit(index);
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                    placeholder="Enter exhibit title..."
                  />
                  <div className="exhibit-item__edit-actions">
                    <button
                      className="btn btn--xs btn--primary"
                      onClick={() => handleSaveEdit(index)}
                      title="Save"
                    >
                      <i className="fas fa-check"></i> Save
                    </button>
                    <button
                      className="btn btn--xs btn--secondary"
                      onClick={handleCancelEdit}
                      title="Cancel"
                    >
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="exhibit-item__info">
                    <h4 className="exhibit-item__title">{exhibit.heading}</h4>
                    <div className="exhibit-item__meta">
                      <span className="exhibit-item__filename">
                        <i className="fas fa-file-pdf"></i>
                        {exhibit.fileName}
                      </span>
                      {exhibit.expenses > 0 && (
                        <span className="exhibit-item__amount">
                          <i className="fas fa-dollar-sign"></i>
                          {exhibit.expenses.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {exhibit.summary && (
                    <div className="exhibit-item__summary">
                      {exhibit.summary.length > 150
                        ? `${exhibit.summary.substring(0, 150)}...`
                        : exhibit.summary}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExhibitManager;
