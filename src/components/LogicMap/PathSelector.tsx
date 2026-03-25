// src/components/PathSelector.tsx
import { useSurveyStore } from "../../store/useSurveyStore";

const PathSelector = () => {
  const { paths, activePathIndex, setActivePath } = useSurveyStore();

  // If there are no branching paths, don't show the buttons
  if (!paths || paths.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={() => setActivePath(null)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          activePathIndex === null
            ? "bg-blue-600 text-white shadow-inner"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
        }`}
      >
        All Paths
      </button>

      {paths.map((_, index) => (
        <button
          key={index}
          onClick={() => setActivePath(index)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activePathIndex === index
              ? "bg-blue-600 text-white shadow-inner"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Path {index + 1}
        </button>
      ))}
    </div>
  );
};

export default PathSelector;
