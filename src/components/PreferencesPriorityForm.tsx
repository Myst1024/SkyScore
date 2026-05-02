import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
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
import { GripVertical, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { getDefaultPreferences } from "@/lib/scoring-algorithm";
import type { PrioritySection, WeatherParameter, WeatherPreferences } from "@/lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

interface PreferencesPriorityFormProps {
  preferences: WeatherPreferences;
  onPreferencesChange: (preferences: WeatherPreferences) => void;
}

interface ParameterConfig {
  id: WeatherParameter;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const PARAMETER_CONFIGS: Record<WeatherParameter, ParameterConfig> = {
  temperature: {
    id: "temperature",
    label: "Temperature",
    description: "Your ideal temperature range",
    min: 0,
    max: 100,
    step: 1,
    unit: "°F",
  },
  humidity: {
    id: "humidity",
    label: "Humidity",
    description: "Your ideal humidity range",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
  },
  wind: {
    id: "wind",
    label: "Wind Speed",
    description: "Your ideal wind speed range",
    min: 0,
    max: 40,
    step: 1,
    unit: " mph",
  },
  rain: {
    id: "rain",
    label: "Rain Chance",
    description: "Your ideal precipitation chance",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
  },
  cloudCover: {
    id: "cloudCover",
    label: "Cloud Cover",
    description: "Your ideal cloud cover range",
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
  },
  uvIndex: {
    id: "uvIndex",
    label: "UV Index",
    description: "Your ideal UV index range",
    min: 0,
    max: 11,
    step: 1,
    unit: "",
  },
};

const SECTION_INFO: Record<PrioritySection, { label: string; color: string }> = {
  0: {
    label: "Highest Priority",
    color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
  },
  1: {
    label: "High Priority",
    color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
  },
  2: {
    label: "Medium Priority",
    color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
  },
  3: {
    label: "Doesn't Matter",
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
  },
};

interface SortableParameterItemProps {
  parameter: WeatherParameter;
  config: ParameterConfig;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

function SortableParameterItem({ parameter, config, value, onChange }: SortableParameterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isBeingDragged,
  } = useSortable({
    id: parameter,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isBeingDragged ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-background border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium">{config.label}</Label>
            <span className="text-xs text-muted-foreground">
              {value[0]}
              {config.unit} - {value[1]}
              {config.unit}
            </span>
          </div>
          <Slider
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onValueChange={(newValue) => onChange(newValue as [number, number])}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function ParameterItem({
  parameter: _parameter,
  config,
  value,
  onChange,
}: Omit<SortableParameterItemProps, "isDragging">) {
  return (
    <div className="bg-background border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-sm font-medium">{config.label}</Label>
            <span className="text-xs text-muted-foreground">
              {value[0]}
              {config.unit} - {value[1]}
              {config.unit}
            </span>
          </div>
          <Slider
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onValueChange={(newValue) => onChange(newValue as [number, number])}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

interface DroppableSectionProps {
  section: PrioritySection;
  children: React.ReactNode;
  isEmpty: boolean;
}

function DroppableSection({ section, children, isEmpty }: DroppableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section}`,
  });

  const sectionInfo = SECTION_INFO[section];

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-lg p-3 transition-colors ${sectionInfo.color} ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{sectionInfo.label}</h3>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {isEmpty ? (
          <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded">
            Drag parameters here
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function PreferencesPriorityForm({
  preferences,
  onPreferencesChange,
}: PreferencesPriorityFormProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [activeParam, setActiveParam] = useState<WeatherParameter | null>(null);

  // Use sectionOrder directly from preferences to maintain visual order
  const [sections, setSections] = useState<Record<PrioritySection, WeatherParameter[]>>(
    () => preferences.sectionOrder,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setLocalPrefs(preferences);
    // Use sectionOrder directly instead of rebuilding from priorityOrder
    setSections(preferences.sectionOrder);
  }, [preferences]);

  const handleRangeChange = (param: WeatherParameter, value: [number, number]) => {
    const updated = {
      ...localPrefs,
      [param]: { min: value[0], max: value[1] },
    };
    setLocalPrefs(updated);
    onPreferencesChange(updated);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveParam(event.active.id as WeatherParameter);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeParam = active.id as WeatherParameter;
    const overId = over.id as string;

    // Skip if dropping over a section placeholder
    if (overId.startsWith("section-")) return;

    // Find which section the active item is in
    let activeSection: PrioritySection | null = null;
    Object.entries(sections).forEach(([section, params]) => {
      if (params.includes(activeParam)) {
        activeSection = Number(section) as PrioritySection;
      }
    });

    if (activeSection === null) return;

    // Dropping over another parameter
    const overParam = overId as WeatherParameter;
    let overSection: PrioritySection | null = null;

    Object.entries(sections).forEach(([section, params]) => {
      if (params.includes(overParam)) {
        overSection = Number(section) as PrioritySection;
      }
    });

    if (overSection === null) return;

    const newSections: Record<PrioritySection, WeatherParameter[]> = {
      0: [...sections[0]],
      1: [...sections[1]],
      2: [...sections[2]],
      3: [...sections[3]],
    };

    if (activeSection === overSection) {
      // Reordering within the same section
      const sectionParams: WeatherParameter[] = [...newSections[activeSection]];
      const oldIndex = sectionParams.indexOf(activeParam);
      const newIndex = sectionParams.indexOf(overParam);

      if (oldIndex !== newIndex) {
        (newSections[activeSection] as WeatherParameter[]) = arrayMove(
          sectionParams,
          oldIndex,
          newIndex,
        );
        setSections(newSections);
      }
    } else {
      // Moving between sections
      (newSections[activeSection] as WeatherParameter[]) = (
        newSections[activeSection] as WeatherParameter[]
      ).filter((p) => p !== activeParam);

      // Insert at the position of the over item
      const overIndex = (newSections[overSection] as WeatherParameter[]).indexOf(overParam);
      (newSections[overSection] as WeatherParameter[]).splice(overIndex, 0, activeParam);

      setSections(newSections);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveParam(null);

    if (!over) return;

    const activeParam = active.id as WeatherParameter;
    const overId = over.id as string;

    // Find which section the active item is currently in
    let activeSection: PrioritySection | null = null;
    Object.entries(sections).forEach(([section, params]) => {
      if (params.includes(activeParam)) {
        activeSection = Number(section) as PrioritySection;
      }
    });

    if (activeSection === null) return;

    // Check if dropping over an empty section
    if (overId.startsWith("section-")) {
      const targetSection = Number(overId.replace("section-", "")) as PrioritySection;

      if (activeSection !== targetSection) {
        // Move to the empty section
        const newSections: Record<PrioritySection, WeatherParameter[]> = {
          0: [...sections[0]],
          1: [...sections[1]],
          2: [...sections[2]],
          3: [...sections[3]],
        };
        (newSections[activeSection] as WeatherParameter[]) = (
          newSections[activeSection] as WeatherParameter[]
        ).filter((p) => p !== activeParam);
        (newSections[targetSection] as WeatherParameter[]) = [
          ...(newSections[targetSection] as WeatherParameter[]),
          activeParam,
        ];
        setSections(newSections);

        // Update priority and section order
        const newPriorityOrder = { ...localPrefs.priorityOrder };
        newPriorityOrder[activeParam] = targetSection;

        const updated = {
          ...localPrefs,
          priorityOrder: newPriorityOrder,
          sectionOrder: newSections,
        };
        setLocalPrefs(updated);
        onPreferencesChange(updated);
      }
      return;
    }

    // Update priority order and section order in preferences
    const newPriorityOrder = { ...localPrefs.priorityOrder };
    newPriorityOrder[activeParam] = activeSection;

    const updated = {
      ...localPrefs,
      priorityOrder: newPriorityOrder,
      sectionOrder: sections, // Save current visual order
    };
    setLocalPrefs(updated);
    onPreferencesChange(updated);
  };

  const handleReset = () => {
    const defaults = getDefaultPreferences();
    setLocalPrefs(defaults);
    onPreferencesChange(defaults);

    // Use sectionOrder from defaults
    setSections(defaults.sectionOrder);
  };

  const allParams = Object.values(sections).flat();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Weather Preferences</CardTitle>
            <CardDescription>Drag parameters to organize by priority</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allParams} strategy={verticalListSortingStrategy}>
            {([0, 1, 2, 3] as PrioritySection[]).map((section) => {
              const sectionParams = sections[section];
              const isEmpty = sectionParams.length === 0;

              return (
                <DroppableSection key={section} section={section} isEmpty={isEmpty}>
                  {!isEmpty && (
                    <div className="space-y-2">
                      {sectionParams.map((param) => {
                        const config = PARAMETER_CONFIGS[param];
                        return (
                          <SortableParameterItem
                            key={param}
                            parameter={param}
                            config={config}
                            value={[localPrefs[param].min, localPrefs[param].max]}
                            onChange={(value) => handleRangeChange(param, value)}
                          />
                        );
                      })}
                    </div>
                  )}
                </DroppableSection>
              );
            })}
          </SortableContext>

          <DragOverlay>
            {activeParam ? (
              <ParameterItem
                parameter={activeParam}
                config={PARAMETER_CONFIGS[activeParam]}
                value={[localPrefs[activeParam].min, localPrefs[activeParam].max]}
                onChange={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>💡 Tip:</strong> Drag weather parameters between sections to change their
            importance. Higher sections have more influence on your Sky Score.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
