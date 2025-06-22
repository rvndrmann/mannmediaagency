
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SensitiveDataItem } from "@/hooks/browser-use/types";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key } from "lucide-react";

interface TaskInputWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  sensitiveData: SensitiveDataItem[];
  isProcessing: boolean;
}

export function TaskInputWithPreview({
  value,
  onChange,
  sensitiveData,
  isProcessing
}: TaskInputWithPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  
  useEffect(() => {
    // Apply the sensitive data replacements for the preview
    let processed = value;
    
    sensitiveData.forEach(item => {
      const placeholder = `{${item.name}}`;
      const redactedValue = item.value.length > 0 ? "●".repeat(Math.min(8, item.value.length)) : "(empty)";
      const regex = new RegExp(placeholder, 'g');
      processed = processed.replace(regex, redactedValue);
    });
    
    setPreviewText(processed);
  }, [value, sensitiveData]);

  const getTaskWithHighlightedPlaceholders = () => {
    if (sensitiveData.length === 0) return value;
    
    let result = value;
    const placeholders = sensitiveData.map(item => ({ name: item.name, placeholder: `{${item.name}}` }));
    
    // Sort by length descending to avoid partial replacements
    placeholders.sort((a, b) => b.placeholder.length - a.placeholder.length);
    
    for (const { name, placeholder } of placeholders) {
      const highlightedText = `<span class="bg-amber-100 text-amber-800 rounded px-1">${placeholder}</span>`;
      result = result.split(placeholder).join(highlightedText);
    }
    
    return result;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="task">Task Description</Label>
        {sensitiveData.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 text-xs"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Preview
              </>
            )}
          </Button>
        )}
      </div>
      
      <Textarea
        id="task"
        placeholder="E.g., Go to Twitter, search for AI news, and take screenshots of the top 3 posts"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        disabled={isProcessing}
      />
      
      {showPreview && (
        <div className="mt-2 border rounded p-3 bg-slate-50">
          <p className="text-xs text-slate-500 mb-2">This is how the AI will process your task:</p>
          <p className="text-sm">{previewText}</p>
        </div>
      )}

      {(sensitiveData && sensitiveData.length > 0) && (
        <Alert className="bg-blue-50 border-blue-200 mt-4">
          <Key className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Available placeholders:</span>
              <div className="flex flex-wrap gap-1">
                {sensitiveData.map((item, index) => (
                  <code key={index} className="bg-amber-100 border border-amber-200 px-1 rounded text-amber-800 font-medium">
                    {"{" + item.name + "}"}
                  </code>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <p className="text-sm text-gray-500">
        Be specific about what you want the browser to do. The AI will follow your instructions step by step.
        {sensitiveData.length > 0 && " Use placeholders for sensitive information."}
      </p>

      {value && sensitiveData.length > 0 && (
        <div 
          className="border rounded-md p-3 bg-slate-50 text-sm mt-2"
          dangerouslySetInnerHTML={{ __html: getTaskWithHighlightedPlaceholders() }}
        />
      )}
    </div>
  );
}
