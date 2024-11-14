import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/HomePage";
import MoviePage from "./pages/MoviePage";
import AuthPage from "./pages/AuthPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={{ fetcher }}>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/browse" component={HomePage} />
        <Route path="/movie/:id" component={MoviePage} />
        <Route>404 Page Not Found</Route>
      </Switch>
      <Toaster />
    </SWRConfig>
  </StrictMode>
);
