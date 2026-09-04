import GameBoard from "@/components/GameBoard";
import { GameProvider } from "@/lib/useGame";

export default function Home() {
  return (
    <GameProvider>
      <GameBoard />
    </GameProvider>
  );
}
