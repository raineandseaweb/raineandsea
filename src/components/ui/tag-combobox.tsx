"use client";

import { useEffect, useRef, useState } from "react";

interface Tag {
  id: string;
  name: string;
}

interface TagComboboxProps {
  availableTags: Tag[];
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagCombobox({
  availableTags,
  selectedTags,
  onTagsChange,
  placeholder = "Select tags...",
  className = "",
}: TagComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tags based on search term
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedTags.includes(tag.id)
  );

  // Get selected tag objects
  const selectedTagObjects = availableTags.filter((tag) =>
    selectedTags.includes(tag.id)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setShowNewTagInput(false);
        setNewTagName("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleTagSelect = (tagId: string) => {
    onTagsChange([...selectedTags, tagId]);
    setSearchTerm("");
  };

  const handleTagRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter((id) => id !== tagId));
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onTagsChange([...selectedTags, data.tag.id]);
        setNewTagName("");
        setShowNewTagInput(false);
        setSearchTerm("");
      } else {
        console.error("Failed to create tag");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && showNewTagInput) {
      e.preventDefault();
      handleCreateNewTag();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setShowNewTagInput(false);
      setNewTagName("");
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected tags display */}
      <div
        className="min-h-[40px] w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer bg-card"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selectedTagObjects.length > 0 ? (
            selectedTagObjects.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-md"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagRemove(tag.id);
                  }}
                  className="ml-1 text-primary hover:text-accent-foreground"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowNewTagInput(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search tags..."
              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="max-h-40 overflow-y-auto">
            {filteredTags.length > 0
              ? filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagSelect(tag.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                  >
                    {tag.name}
                  </button>
                ))
              : !showNewTagInput && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No tags found
                  </div>
                )}

            {/* Create new tag option */}
            {searchTerm &&
              !filteredTags.some(
                (tag) => tag.name.toLowerCase() === searchTerm.toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTagInput(true);
                    setNewTagName(searchTerm);
                    setSearchTerm("");
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent focus:bg-accent focus:outline-none"
                >
                  Create "{searchTerm}"
                </button>
              )}

            {/* New tag input */}
            {showNewTagInput && (
              <div className="p-2 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tag name"
                    className="flex-1 px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTagInput(false);
                      setNewTagName("");
                    }}
                    className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
