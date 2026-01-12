import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { MainLayout } from "./components/layout/MainLayout";
import { Dashboard } from "./components/dashboard/Dashboard";
import RegistryPage from "./pages/RegistryPage";
import ASRPage from "./pages/ASRPage";
import ContentBanksPage from "./pages/ContentBanksPage";
import FormsPage from "./pages/FormsPage";
import ItemsPage from "./pages/ItemsPage";
import ScoringPage from "./pages/ScoringPage";
import ComponentPage from "./pages/ComponentPage";
import AssessmentDetailPage from "./pages/AssessmentDetailPage";
import ASRDetailPage from "./pages/ASRDetailPage";
import ASRViewerPage from "./pages/ASRViewerPage";
import ContentBankDetailPage from "./pages/ContentBankDetailPage";
import FormDetailPage from "./pages/FormDetailPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import ScoringDetailPage from "./pages/ScoringDetailPage";
import SessionsPage from "./pages/SessionsPage";
import NewSessionPage from "./pages/NewSessionPage";
import SessionRunPage from "./pages/SessionRunPage";
import SessionStudentPage from "./pages/SessionStudentPage";
import AssessmentPreviewPage from "./pages/AssessmentPreviewPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route - Auth page */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/registry" element={<RegistryPage />} />
                    <Route path="/asr" element={<ASRPage />} />
                    <Route path="/asr/viewer" element={<ASRViewerPage />} />
                    <Route path="/banks" element={<ContentBanksPage />} />
                    <Route path="/forms" element={<FormsPage />} />
                    <Route path="/items" element={<ItemsPage />} />
                    <Route path="/scoring" element={<ScoringPage />} />
                    <Route path="/component/:code" element={<ComponentPage />} />
                    <Route path="/assessment/:id" element={<AssessmentDetailPage />} />
                    <Route path="/asr/:id" element={<ASRDetailPage />} />
                    <Route path="/banks/:id" element={<ContentBankDetailPage />} />
                    <Route path="/forms/:id" element={<FormDetailPage />} />
                    <Route path="/items/:id" element={<ItemDetailPage />} />
                    <Route path="/scoring/:id" element={<ScoringDetailPage />} />
                    <Route path="/sessions" element={<SessionsPage />} />
                    <Route path="/sessions/new" element={<NewSessionPage />} />
                    <Route path="/sessions/:id/run" element={<SessionRunPage />} />
                    <Route path="/sessions/:id/student" element={<SessionStudentPage />} />
                    <Route path="/preview" element={<AssessmentPreviewPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
