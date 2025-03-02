
interface HeaderProps {
  creditsRemaining: number;
}

export const Header = ({ creditsRemaining }: HeaderProps) => {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-white">Product Shot Generator</h2>
      <p className="text-sm text-gray-400">
        Credits remaining: {creditsRemaining.toFixed(2)}
      </p>
    </div>
  );
};
