
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { SensitiveDataItem } from "@/hooks/browser-use/types";
import { v4 as uuidv4 } from "uuid";

interface SensitiveDataManagerProps {
  sensitiveData: SensitiveDataItem[];
  onUpdate: (data: SensitiveDataItem[]) => void;
}

export function SensitiveDataManager({ sensitiveData, onUpdate }: SensitiveDataManagerProps) {
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const addItem = () => {
    const newItem: SensitiveDataItem = {
      id: uuidv4(),
      key: '',
      name: '',
      value: '',
      type: 'text'
    };
    
    onUpdate([...sensitiveData, newItem]);
  };

  const updateItem = (id: string, updates: Partial<SensitiveDataItem>) => {
    const updatedData = sensitiveData.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate(updatedData);
  };

  const removeItem = (id: string) => {
    onUpdate(sensitiveData.filter(item => item.id !== id));
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sensitive Data Management
          <Button onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sensitiveData.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-2">
              <Label htmlFor={`key-${item.id}`}>Key</Label>
              <Input
                id={`key-${item.id}`}
                value={item.key}
                onChange={(e) => updateItem(item.id, { key: e.target.value })}
                placeholder="username"
              />
            </div>
            
            <div className="col-span-3">
              <Label htmlFor={`name-${item.id}`}>Name</Label>
              <Input
                id={`name-${item.id}`}
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="Username"
              />
            </div>
            
            <div className="col-span-4">
              <Label htmlFor={`value-${item.id}`}>Value</Label>
              <div className="flex">
                <Input
                  id={`value-${item.id}`}
                  type={showValues[item.id] ? 'text' : 'password'}
                  value={item.value}
                  onChange={(e) => updateItem(item.id, { value: e.target.value })}
                  placeholder="Enter value"
                  className="rounded-r-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleShowValue(item.id)}
                  className="rounded-l-none border-l-0"
                >
                  {showValues[item.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor={`type-${item.id}`}>Type</Label>
              <Select value={item.type} onValueChange={(value: 'text' | 'password' | 'email') => updateItem(item.id, { type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {sensitiveData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No sensitive data configured. Click "Add Item" to start.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
