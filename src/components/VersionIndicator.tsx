export const VersionIndicator = () => {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

  return (
    <div className="text-xs text-gray-400">
      v{version}
    </div>
  );
};
