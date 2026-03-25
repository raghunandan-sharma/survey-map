import React, { useState } from "react";
import { useSurveyStore } from "./store/useSurveyStore";
import LogicSidebar from "./components/LogicSidebar";
import LogicMap from "./components/LogicMap";

export default function App() {
  const { currentView, setView, setSurveyData, refinedQuestions } =
    useSurveyStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setSurveyData(JSON.parse(result));
      }
    };
    reader.readAsText(files[0]);
  };

  const btnClass = (active: boolean) =>
    `px-5 py-2 rounded-full font-medium transition cursor-pointer ${
      active
        ? "bg-blue-500 text-white border-none"
        : "bg-transparent text-gray-600 border border-gray-300"
    }`;

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100 font-sans">
      <header className="px-6 h-15 bg-white text-gray-900 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center">
          <label className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer text-sm mr-5">
            Upload JSON
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>

          <span className="font-semibold text-lg">Survey Logic Designer</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("editor")}
            className={btnClass(currentView === "editor")}
          >
            Editor View
          </button>
          <button
            onClick={() => setView("map")}
            className={btnClass(currentView === "map")}
          >
            Logic Map
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {currentView === "editor" ? (
          <div className="flex w-full">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-200 mx-auto">
                <h2 className="mb-5 text-gray-800 text-xl font-semibold">
                  Questionnaire Structure
                </h2>

                {refinedQuestions.map((q) => {
                  const isActive = selectedId === q.id.toString();

                  return (
                    <div
                      key={q.uniqueKey}
                      onClick={() => setSelectedId(q.id.toString())}
                      className={`p-5 mb-3 rounded-xl cursor-pointer transition-all border ${
                        isActive
                          ? "bg-white shadow-lg border-l-4 border-l-blue-500 border-gray-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="text-xs text-blue-500 font-bold mb-1">
                        {q.fullName}
                      </div>

                      <div className="font-medium text-slate-800">
                        {q.text
                          ? q.text.replace(/<[^>]*>/g, "")
                          : "System Variable / Calculation"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <LogicSidebar selectedNodeId={selectedId} />
          </div>
        ) : (
          <div className="flex-1 relative">
            <LogicMap />
          </div>
        )}
      </main>
    </div>
  );
}
