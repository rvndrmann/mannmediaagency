export const BarChart = ({ data }: { data: any }) => {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <div className="w-full h-full">
      {data && (
        <div className="h-full">
          {/* This is a simplified implementation of a BarChart */}
          <div className="flex h-full items-end justify-around gap-2 pt-4">
            {data.labels.map((label: string, index: number) => {
              const value = data.datasets[0].data[index];
              const maxValue = Math.max(...data.datasets[0].data);
              const height = maxValue > 0 ? `${(value / maxValue) * 100}%` : '10%';
              const bgColor = data.datasets[0].backgroundColor[index % data.datasets[0].backgroundColor.length];
              
              return (
                <div key={label} className="flex flex-col items-center w-full">
                  <div 
                    className="w-full rounded-t-md transition-all duration-500 ease-in-out" 
                    style={{ 
                      height, 
                      backgroundColor: bgColor,
                      minHeight: '20px'
                    }}
                  />
                  <div className="mt-2 text-xs text-center truncate w-full px-1">{label}</div>
                  <div className="text-xs font-semibold">{value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
