"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MissionGenerator } from "@/components/mission/MissionGenerator";
import { GameId } from "@/lib/games";

function BackgroundWrapper() {
  const searchParams = useSearchParams();
  const [bgClass, setBgClass] = useState("bg-white");

  useEffect(() => {
    const gameParam = searchParams.get("game");
    const isStarbreaker = gameParam === GameId.STARBREAKER;
    setBgClass(isStarbreaker ? "bg-[#0a1929]" : "bg-white");
  }, [searchParams]);

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      <main className="container mx-auto py-4 md:py-8 px-4 max-w-[1600px]">
        <MissionGenerator />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-lg text-[#5a4a3a]">Loading...</p>
      </div>
    }>
      <BackgroundWrapper />
    </Suspense>
  );
}
