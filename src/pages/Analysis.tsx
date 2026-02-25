import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Zap,
  Droplets,
  Radio,
  Car,
  MapPin,
  ArrowRight,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { getTypeLabel, getNodeColor, InfrastructureType } from "@/data/infrastructure";

interface RootCauseAnalysis {
  problem: string;
  region: string;
  rootCause: {
    name: string;
    type: string;
    location: string;
    department: string;
  };
  impactChain: Array<{
    name: string;
    type: string;
    location: string;
  }>;
  affectedServices: number;
  criticalPath: string[];
}

interface Region {
  id: string;
  name: string;
  icon: string;
}

const problemTypes = [
  { id: "power", name: "Power Outage", icon: Zap },
  { id: "water", name: "Water Shortage", icon: Droplets },
  { id: "telecom", name: "Network Failure", icon: Radio },
  { id: "transport", name: "Transport Disruption", icon: Car },
];

export default function Analysis() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RootCauseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load regions from backend
   */
  useEffect(() => {
    fetch("http://localhost:4000/api/regions")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((r: string) => ({
          id: r,
          name: r,
          icon: "📍",
        }));
        setRegions(formatted);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load regions");
        setLoading(false);
      });
  }, []);

  /**
   * Root Cause Analysis
   */
  const analyzeRootCause = async () => {
    if (!selectedProblem || !selectedRegion) return;

    const region = regions.find((r) => r.id === selectedRegion);
    if (!region) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const url = `http://localhost:4000/api/root-cause?type=${encodeURIComponent(
        selectedProblem
      )}&region=${encodeURIComponent(selectedRegion)}`;

      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.details || errorData.error || `API returned ${res.status}`
        );
      }

      const data = await res.json();
      const problem = problemTypes.find((p) => p.id === selectedProblem);

      setResult({
        problem: problem?.name || selectedProblem,
        region: region.name,
        rootCause: data.rootCause,
        impactChain: data.impactChain || [],
        affectedServices: data.affectedServices || 0,
        criticalPath: data.criticalPath || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setResult(null);
    setError(null);
    setSelectedProblem(null);
    setSelectedRegion(null);
  };

  const canAnalyze = selectedProblem && selectedRegion && !isAnalyzing;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Root Cause Analysis</h1>
          <p className="text-muted-foreground">
            Identify infrastructure root causes using dependency graph analysis
          </p>
        </div>

        {loading ? (
          <div className="flex h-[500px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Analysis Parameters
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Problem Type */}
                <div className="space-y-2">
                  <Label>Failure Type</Label>
                  <Select value={selectedProblem || ""} onValueChange={setSelectedProblem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select failure type" />
                    </SelectTrigger>
                    <SelectContent>
                      {problemTypes.map((problem) => {
                        const Icon = problem.icon;
                        return (
                          <SelectItem key={problem.id} value={problem.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {problem.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={selectedRegion || ""} onValueChange={setSelectedRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          <div className="flex items-center gap-2">
                            <span>{region.icon}</span>
                            {region.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={analyzeRootCause}
                  disabled={!canAnalyze}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Find Root Cause
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Section */}
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-critical flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Analysis Failed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{error}</p>
                      <Button variant="outline" onClick={clearAnalysis} className="mt-4">
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Root Cause: {result.problem} in {result.region}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="font-bold">{result.rootCause.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.rootCause.location} • {result.rootCause.department}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Affected Services</p>
                        <p className="text-xl font-bold">{result.affectedServices}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}