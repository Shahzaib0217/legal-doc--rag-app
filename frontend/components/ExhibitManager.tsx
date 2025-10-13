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
  const [selectedExhibitForImage, setSelectedExhibitForImage] = useState<number>(0);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    // Validate all selected files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        alert(`"${file.name}" is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 5MB size limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Read all valid files
    const readPromises = validFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((base64Images) => {
      const newExhibits = [...exhibits];
      const currentImages = newExhibits[selectedExhibitForImage].images || [];
      newExhibits[selectedExhibitForImage] = {
        ...newExhibits[selectedExhibitForImage],
        images: [...currentImages, ...base64Images],
      };
      onUpdateExhibits(newExhibits);
    });

    // Reset input
    e.target.value = "";
  };

  const handleRemoveImage = (exhibitIndex: number, imageIndex: number) => {
    if (confirm("Are you sure you want to remove this image?")) {
      const newExhibits = [...exhibits];
      const currentImages = newExhibits[exhibitIndex].images || [];
      newExhibits[exhibitIndex] = {
        ...newExhibits[exhibitIndex],
        images: currentImages.filter((_, idx) => idx !== imageIndex),
      };
      onUpdateExhibits(newExhibits);
    }
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

      {/* Image Upload Section */}
      <div className="image-upload-section" style={{ marginBottom: "1rem", padding: "0.75rem", border: "1px solid #e0e0e0", borderRadius: "4px", backgroundColor: "#f9f9f9" }}>
        <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "#333" }}>
          <i className="fas fa-image"></i> Add Image to Exhibit
        </h4>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            className="form-control form-control--sm"
            value={selectedExhibitForImage}
            onChange={(e) => setSelectedExhibitForImage(Number(e.target.value))}
            style={{ flex: "1" }}
          >
            {exhibits.map((exhibit, index) => (
              <option key={index} value={index}>
                {exhibit.heading || `Exhibit ${index + 1}`}
              </option>
            ))}
          </select>
          <label
            htmlFor="exhibit-image-upload"
            className="btn btn--xs btn--primary"
            style={{ margin: 0, cursor: "pointer" }}
          >
            <i className="fas fa-upload"></i> Upload
          </label>
          <input
            id="exhibit-image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

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
                      {exhibit.images && exhibit.images.length > 0 && (
                        <span className="exhibit-item__image-badge" style={{ color: "#28a745" }}>
                          <i className="fas fa-image"></i>
                          {exhibit.images.length} {exhibit.images.length === 1 ? "image" : "images"}
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

                  {exhibit.images && exhibit.images.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {exhibit.images.map((image, imgIdx) => (
                          <div
                            key={imgIdx}
                            style={{
                              position: "relative",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              overflow: "hidden",
                              width: "80px",
                              height: "80px",
                            }}
                          >
                            <img
                              src={image}
                              alt={`Exhibit ${index + 1} - Image ${imgIdx + 1}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                            <button
                              className="btn btn--xs btn--icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index, imgIdx);
                              }}
                              title="Remove image"
                              style={{
                                position: "absolute",
                                top: "2px",
                                right: "2px",
                                backgroundColor: "rgba(220, 53, 69, 0.9)",
                                color: "white",
                                border: "none",
                                padding: "2px 4px",
                                fontSize: "10px",
                                cursor: "pointer",
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
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
