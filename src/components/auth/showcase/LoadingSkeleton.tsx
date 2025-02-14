
export const LoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="space-y-4"
        >
          <div className="aspect-[9/16] bg-gray-800 rounded-xl" />
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
};
