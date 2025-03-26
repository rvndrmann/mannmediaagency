
import React from 'react';

export interface TraceDashboardProps {
  userId?: string;
}

export const TraceDashboard: React.FC<TraceDashboardProps> = ({ userId }) => {
  return (
    <div className="p-4 border rounded-md bg-card">
      <h2 className="text-xl font-semibold mb-4">Trace Analytics Dashboard</h2>
      {userId ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Viewing analytics for user: {userId}
          </p>
          <div className="grid gap-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-2">Agent Interactions</h3>
              <p className="text-sm text-muted-foreground">Loading trace data...</p>
            </div>
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-2">Handoff Analysis</h3>
              <p className="text-sm text-muted-foreground">Loading handoff data...</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">User ID is required to view analytics.</p>
      )}
    </div>
  );
};
