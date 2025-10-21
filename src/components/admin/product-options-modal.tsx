import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";

export interface ProductOption {
  id?: string;
  name: string;
  display_name: string;
  sort_order?: number;
  values: Array<{
    id?: string;
    name: string;
    price_adjustment: string;
    is_default: boolean;
    is_sold_out: boolean;
    sort_order?: number;
  }>;
}

interface ProductOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  initialOptions: ProductOption[];
  onSave: (options: ProductOption[]) => void;
}

// Sortable Option Component
function SortableOptionItem({
  option,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onUpdate,
  onAddValue,
  onRemoveValue,
  onUpdateValue,
  onDragEnd,
  onValuesDragEnd,
}: {
  option: ProductOption;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ProductOption, value: string) => void;
  onAddValue: (optionIndex: number) => void;
  onRemoveValue: (optionIndex: number, valueIndex: number) => void;
  onUpdateValue: (
    optionIndex: number,
    valueIndex: number,
    field: string,
    value: string | boolean
  ) => void;
  onDragEnd: (event: any) => void;
  onValuesDragEnd: (optionIndex: number) => (event: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id || `option-${Math.random()}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg bg-white shadow-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Collapsible Header */}
      <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
        {/* Drag Handle - Full Height */}
        <div
          {...attributes}
          {...listeners}
          className="w-8 h-full flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
          onMouseDown={() => {
            // Collapse when starting to drag
            if (isExpanded) {
              onToggle(index);
            }
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>

        {/* Clickable Content Area */}
        <div
          className="flex items-center space-x-3 flex-1 p-4 min-w-0"
          onClick={() => onToggle(index)}
        >
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-600">
              {index + 1}
            </span>
          </div>
          <div className="text-left flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {option.name || `Option ${index + 1}`}
            </h4>
            <p className="text-xs text-gray-500">
              {option.values.length} value
              {option.values.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 pr-4">
          {/* Trash button next to arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
            title="Remove option"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          {/* Arrow on the far right */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
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

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Option Name *
              </label>
              <input
                type="text"
                value={option.name}
                onChange={(e) => onUpdate(index, "name", e.target.value)}
                onBlur={(e) => {
                  // Auto-fill display name if it's empty or matches the old pattern
                  if (
                    !option.display_name.trim() ||
                    option.display_name === `Choose ${option.name}`
                  ) {
                    onUpdate(index, "display_name", `Choose ${e.target.value}`);
                  }
                }}
                placeholder="e.g., Size, Color, Material"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Display Label *
              </label>
              <input
                type="text"
                value={option.display_name}
                onChange={(e) => {
                  onUpdate(index, "display_name", e.target.value);
                }}
                onBlur={(e) => {
                  // Auto-fill if empty
                  if (!e.target.value.trim() && option.name.trim()) {
                    onUpdate(index, "display_name", `Choose ${option.name}`);
                  }
                }}
                placeholder="e.g., Select Size, Choose Color"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">
                  Option Values
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Add different choices for this option
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddValue(index)}
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Value
              </button>
            </div>
            <SortableValuesList
              optionIndex={index}
              values={option.values}
              onRemoveValue={onRemoveValue}
              onUpdateValue={onUpdateValue}
              onDragEnd={onValuesDragEnd(index)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Sortable Values List Component
function SortableValuesList({
  optionIndex,
  values,
  onRemoveValue,
  onUpdateValue,
  onDragEnd,
}: {
  optionIndex: number;
  values: ProductOption["values"];
  onRemoveValue: (optionIndex: number, valueIndex: number) => void;
  onUpdateValue: (
    optionIndex: number,
    valueIndex: number,
    field: string,
    value: string | boolean
  ) => void;
  onDragEnd: (event: any) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={values.map((v) => v.id || `value-${Math.random()}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {values.map((value, valueIndex) => (
            <SortableValueItem
              key={value.id}
              value={value}
              optionIndex={optionIndex}
              valueIndex={valueIndex}
              onRemove={onRemoveValue}
              onUpdate={onUpdateValue}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Sortable Value Item Component
function SortableValueItem({
  value,
  optionIndex,
  valueIndex,
  onRemove,
  onUpdate,
}: {
  value: ProductOption["values"][0];
  optionIndex: number;
  valueIndex: number;
  onRemove: (optionIndex: number, valueIndex: number) => void;
  onUpdate: (
    optionIndex: number,
    valueIndex: number,
    field: string,
    value: string | boolean
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id || `value-${Math.random()}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 p-3 rounded-lg border border-gray-200 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-stretch">
        {/* Drag Handle - Full Height */}
        <div
          {...attributes}
          {...listeners}
          className="w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">
              Value Name
            </label>
            <button
              type="button"
              onClick={() => onRemove(optionIndex, valueIndex)}
              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
              title="Remove value"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={value.name}
            onChange={(e) =>
              onUpdate(optionIndex, valueIndex, "name", e.target.value)
            }
            placeholder="e.g., Small, Red, Gold"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price Adjustment
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={value.price_adjustment}
                  onChange={(e) =>
                    onUpdate(
                      optionIndex,
                      valueIndex,
                      "price_adjustment",
                      e.target.value
                    )
                  }
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {parseFloat(value.price_adjustment || "0") > 0
                  ? `Adds $${value.price_adjustment} to base price`
                  : parseFloat(value.price_adjustment || "0") < 0
                  ? `Subtracts $${Math.abs(
                      parseFloat(value.price_adjustment || "0")
                    )} from base price`
                  : "No price change"}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <label className="flex items-center text-xs font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.is_default}
                  onChange={(e) =>
                    onUpdate(
                      optionIndex,
                      valueIndex,
                      "is_default",
                      e.target.checked
                    )
                  }
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Default Selection
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductOptionsModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  initialOptions,
  onSave,
}: ProductOptionsModalProps) {
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(
    new Set()
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      setProductOptions(initialOptions);
      // All options start collapsed
      setExpandedOptions(new Set());
    }
  }, [isOpen, initialOptions]);

  const addProductOption = () => {
    const newOption: ProductOption = {
      id: `temp-${Date.now()}`,
      name: "",
      display_name: "",
      sort_order: productOptions.length,
      values: [
        {
          id: `temp-value-${Date.now()}`,
          name: "",
          price_adjustment: "0",
          is_default: true,
          is_sold_out: false,
          sort_order: 0,
        },
      ],
    };
    const newIndex = productOptions.length;
    setProductOptions([...productOptions, newOption]);
    // Collapse all others and expand only the new one
    setExpandedOptions(new Set([newIndex]));
  };

  const toggleOption = (index: number) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedOptions(newExpanded);
  };

  const removeProductOption = (index: number) => {
    const newOptions = productOptions.filter((_, i) => i !== index);
    setProductOptions(newOptions);
  };

  const updateProductOption = (
    index: number,
    field: keyof ProductOption,
    value: string
  ) => {
    const newOptions = [...productOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setProductOptions(newOptions);
  };

  const addOptionValue = (optionIndex: number) => {
    const newOptions = [...productOptions];
    const newValue = {
      id: `temp-value-${Date.now()}`,
      name: "",
      price_adjustment: "0",
      is_default: false,
      is_sold_out: false,
      sort_order: newOptions[optionIndex].values.length,
    };
    newOptions[optionIndex].values.push(newValue);
    setProductOptions(newOptions);
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...productOptions];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter(
      (_, i) => i !== valueIndex
    );
    setProductOptions(newOptions);
  };

  const updateOptionValue = (
    optionIndex: number,
    valueIndex: number,
    field: string,
    value: string | boolean
  ) => {
    const newOptions = [...productOptions];
    newOptions[optionIndex].values[valueIndex] = {
      ...newOptions[optionIndex].values[valueIndex],
      [field]: value,
    };
    setProductOptions(newOptions);
  };

  // Handle drag and drop for options
  const handleOptionsDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setProductOptions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, sort_order: index }));
      });
    }
  };

  // Handle drag and drop for option values
  const handleValuesDragEnd = (optionIndex: number) => (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setProductOptions((items) => {
        const option = items[optionIndex];
        const oldIndex = option.values.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = option.values.findIndex((item) => item.id === over.id);

        const newValues = arrayMove(option.values, oldIndex, newIndex);
        const updatedValues = newValues.map((value, index) => ({
          ...value,
          sort_order: index,
        }));

        const newItems = [...items];
        newItems[optionIndex] = {
          ...option,
          values: updatedValues,
        };
        return newItems;
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate required fields
      const validationErrors: string[] = [];

      productOptions.forEach((option, index) => {
        if (!option.name.trim()) {
          validationErrors.push(`Option ${index + 1}: Name is required`);
        }
        if (!option.display_name.trim()) {
          validationErrors.push(
            `Option ${index + 1}: Display name is required`
          );
        }
        if (option.values.length === 0) {
          validationErrors.push(
            `Option ${index + 1}: At least one value is required`
          );
        }

        option.values.forEach((value, valueIndex) => {
          if (!value.name.trim()) {
            validationErrors.push(
              `Option ${index + 1}, Value ${valueIndex + 1}: Name is required`
            );
          }
        });
      });

      if (validationErrors.length > 0) {
        alert(
          `Please fix the following errors:\n\n${validationErrors.join("\n")}`
        );
        setLoading(false);
        return;
      }

      // Auto-fill empty display names
      const optionsWithAutoFill = productOptions.map((option) => ({
        ...option,
        display_name: option.display_name.trim() || `Choose ${option.name}`,
      }));

      // Ensure all sort_order values are set correctly before saving
      const optionsWithSortOrder = optionsWithAutoFill.map((option, index) => ({
        ...option,
        sort_order: index,
        values: option.values.map((value, valueIndex) => ({
          ...value,
          sort_order: valueIndex,
        })),
      }));
      await onSave(optionsWithSortOrder);
      onClose();
    } catch (error) {
      console.error("Error saving options:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Product Options
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure options for:{" "}
              <span className="font-medium">{productTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                Product Options
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Configure size, color, material, and other product variations
              </p>
            </div>
            <button
              type="button"
              onClick={addProductOption}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Option
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionsDragEnd}
          >
            <SortableContext
              items={productOptions.map(
                (option) => option.id || `option-${Math.random()}`
              )}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {productOptions.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      No options configured
                    </h4>
                    <p className="text-xs text-gray-600 mb-4">
                      Add options like size, color, or material to create
                      product variations
                    </p>
                    <button
                      type="button"
                      onClick={addProductOption}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add Your First Option
                    </button>
                  </div>
                ) : (
                  productOptions.map((option, optionIndex) => {
                    const isExpanded = expandedOptions.has(optionIndex);
                    return (
                      <SortableOptionItem
                        key={option.id}
                        option={option}
                        index={optionIndex}
                        isExpanded={isExpanded}
                        onToggle={toggleOption}
                        onRemove={removeProductOption}
                        onUpdate={updateProductOption}
                        onAddValue={addOptionValue}
                        onRemoveValue={removeOptionValue}
                        onUpdateValue={updateOptionValue}
                        onDragEnd={handleOptionsDragEnd}
                        onValuesDragEnd={handleValuesDragEnd}
                      />
                    );
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Options"}
          </button>
        </div>
      </div>
    </div>
  );
}
