import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Zap,
  Droplets,
  Radio,
  Car,
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

interface RootCauseAnalysis {
  problem: string;
  city: string;
  region: string;
  rootCause: {
    name: string;
    type: string;
    location: string;
    department: string;
  };
  impactChain: any[];
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
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [result, setResult] = useState<RootCauseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 1️⃣ Load Cities on Page Load
   */
  useEffect(() => {
    fetch("http://localhost:4000/api/cities")
      .then((res) => res.json())
      .then((data) => {
        setCities(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load cities");
        setLoading(false);
      });
  }, []);

  /**
   * 2️⃣ Load Regions When City Changes
   */
  useEffect(() => {
    if (!selectedCity) {
      setRegions([]);
      setSelectedRegion(null);
      return;
    }

    fetch(
      `http://localhost:4000/api/regions?city=${encodeURIComponent(
        selectedCity
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((r: string) => ({
          id: r,
          name: r,
          icon: "📍",
        }));
        setRegions(formatted);
      })
      .catch(() => setError("Failed to load regions"));
  }, [selectedCity]);

  /**
   * 3️⃣ Root Cause Analysis
   */
  const analyzeRootCause = async () => {
    if (!selectedCity || !selectedRegion || !selectedProblem) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const url = `http://localhost:4000/api/root-cause?type=${encodeURIComponent(
        selectedProblem
      )}&city=${encodeURIComponent(
        selectedCity
      )}&region=${encodeURIComponent(selectedRegion)}`;

      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({
          error: "Unknown error",
        }));
        throw new Error(
          errorData.details || errorData.error || `API returned ${res.status}`
        );
      }

      const data = await res.json();

      const problem = problemTypes.find((p) => p.id === selectedProblem);

      setResult({
        problem: problem?.name || selectedProblem,
        city: selectedCity,
        region: selectedRegion,
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

  const canAnalyze =
    selectedCity && selectedRegion && selectedProblem && !isAnalyzing;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Root Cause Analysis</h1>
          <p className="text-muted-foreground">
            Identify infrastructure failures by city and region
          </p>
        </div>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Analysis Parameters
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* City */}
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={selectedCity || ""}
                    onValueChange={setSelectedCity}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={selectedRegion || ""}
                    onValueChange={setSelectedRegion}
                    disabled={!selectedCity}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Problem Type */}
                <div className="space-y-2">
                  <Label>Failure Type</Label>
                  <Select
                    value={selectedProblem || ""}
                    onValueChange={setSelectedProblem}
                  >
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

                <Button
                  onClick={analyzeRootCause}
                  disabled={!canAnalyze}
                  className="w-full"
                >
                  {isAnalyzing ? "Analyzing..." : "Find Root Cause"}
                  {!isAnalyzing && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-500 flex gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Analysis Failed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{error}</CardContent>
                  </Card>
                </motion.div>
              ) : result ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {result.problem} in {result.city} – {result.region}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-bold">
                        Root Cause: {result.rootCause.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {result.rootCause.location} •{" "}
                        {result.rootCause.department}
                      </p>
                      <CardContent className="space-y-4">
  <div>
    <p className="font-bold text-lg">
      Root Cause: {result.rootCause.name}
    </p>
    <p className="text-sm text-muted-foreground">
      {result.rootCause.location} • {result.rootCause.department}
    </p>
  </div>

  <div>
    <p className="text-sm font-medium">Affected Services</p>
    <p className="text-xl font-bold">{result.affectedServices}</p>
  </div>

  {/* 🔥 Affected Services List */}
  {result.impactChain.length > 0 && (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">Cascading Impact</p>
      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-muted/20">
        {result.impactChain.map((service: any, index: number) => (
          <div
            key={index}
            className="flex justify-between items-center border-b pb-2 last:border-none"
          >
            <div>
              <p className="font-medium text-sm">{service.name}</p>
              <p className="text-xs text-muted-foreground">
                {service.location}
              </p>
            </div>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
              {service.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}
</CardContent>
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