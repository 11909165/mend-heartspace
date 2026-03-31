import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Home from "./pages/Home";
import HowMendHelps from "./pages/HowMendHelps";
import AICompanion from "./pages/AICompanion";
import PatternsInsights from "./pages/PatternsInsights";
import MicroSessions from "./pages/MicroSessions";
import Pricing from "./pages/Pricing";
import Circles from "./pages/Circles";
import CircleDetail from "./pages/CircleDetail";
import PostDetail from "./pages/PostDetail";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Journal from "./pages/Journal";
import Insights from "./pages/Insights";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/how-mend-helps" element={<HowMendHelps />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/community" element={<Circles />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected routes */}
            <Route path="/ai-companion" element={<Navigate to="/companion" replace />} />
            <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/companion" element={<ProtectedRoute><AICompanion /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/patterns" element={<ProtectedRoute><PatternsInsights /></ProtectedRoute>} />
            <Route path="/sessions" element={<ProtectedRoute><MicroSessions /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/circles" element={<ProtectedRoute><Circles /></ProtectedRoute>} />
            <Route path="/circles/:circleId" element={<ProtectedRoute><CircleDetail /></ProtectedRoute>} />
            <Route path="/circles/:circleId/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
