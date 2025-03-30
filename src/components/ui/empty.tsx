
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EmptyProps {
  title: string;
  description: string;
}

export const Empty = ({ title, description }: EmptyProps) => {
  return (
    <Card className="w-[450px] shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center p-6">
        <div className="rounded-full w-20 h-20 bg-muted flex items-center justify-center">
          <span className="text-3xl text-muted-foreground">?</span>
        </div>
      </CardContent>
    </Card>
  );
};
