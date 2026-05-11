import { lazy, Suspense } from "react";
import { RootShell } from "./components/auth/RootShell";

const InstallAppPrompt = lazy(async () => {
  const m = await import("./components/pwa/InstallAppPrompt");
  return { default: m.InstallAppPrompt };
});

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <InstallAppPrompt />
      </Suspense>
      <RootShell />
    </>
  );
}
