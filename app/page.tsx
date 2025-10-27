import { Suspense } from "react";
import { MissionGenerator } from "@/components/mission/MissionGenerator";

function MissionGeneratorWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-[#5a4a3a]">Loading mission...</p>
      </div>
    }>
      <MissionGenerator />
    </Suspense>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#e8dcc4]">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <MissionGeneratorWrapper />
      </main>
    </div>
  );
}
