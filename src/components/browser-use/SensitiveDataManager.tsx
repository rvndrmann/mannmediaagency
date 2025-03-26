
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SensitiveDataItem } from "@/hooks/browser-use/types";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

interface SensitiveDataManagerProps {
  sensitiveData: SensitiveDataItem[];
  onChange: (data: SensitiveDataItem[]) => void;
  disabled?: boolean;
}

export function SensitiveDataManager({
  sensitiveData,
  onChange,
  disabled = false
}: SensitiveDataManagerProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const addSensitiveData = () => {
    if (!newKey.trim()) return;
    
    const updatedData = [
      ...sensitiveData,
      { key: newKey.trim(), value: newValue }
    ];
    
    onChange(updatedData);
    setNewKey("");
    setNewValue("");
  };

  const removeSensitiveData = (index: number) => {
    const updatedData = [...sensitiveData];
    updatedData.splice(index, 1);
    onChange(updatedData);
  };

  const toggleShowValue = (key: string) => {
    setShowValues({
      ...showValues,
      [key]: !showValues[key]
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Sensitive Data</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Define placeholders for sensitive information like passwords. Use these placeholders in your task descriptions.
        </p>
      </div>

      <div className="grid gap-3">
        {sensitiveData.length > 0 ? (
          sensitiveData.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Placeholder</Label>
                    <div className="bg-muted rounded px-2 py-1 text-sm">{item.key}</div>
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <div className="flex">
                      <Input 
                        value={item.value}
                        onChange={(e) => {
                          const updatedData = [...sensitiveData];
                          updatedData[index].value = e.target.value;
                          onChange(updatedData);
                        }}
                        type={showValues[item.key] ? "text" : "password"}
                        disabled={disabled}
                        className="text-sm border-none bg-muted"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowValue(item.key)}
                        className="ml-1 h-8 w-8 p-0"
                      >
                        {showValues[item.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSensitiveData(index)}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">No sensitive data entries yet</p>
          </div>
        )}
      </div>
    
      <Separator />

      <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
        <div>
          <Label htmlFor="placeholderKey" className="text-xs">Placeholder Key</Label>
          <Input
            id="placeholderKey"
            placeholder="e.g., my_password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="placeholderValue" className="text-xs">Actual Value</Label>
          <Input
            id="placeholderValue"
            type="password"
            placeholder="Sensitive value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          onClick={addSensitiveData}
          disabled={disabled || !newKey.trim()}
          className="mt-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
