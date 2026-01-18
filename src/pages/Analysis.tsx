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
import { fetchInfrastructure } from "@/lib/api";
import { buildGraph } from "@/lib/graphMapper";

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
  locations: string[];
}

const problemTypes = [
  { 
    id: "power",
    name: "Power Outage", 
    icon: Zap,
  },
  { 
    id: "water",
    name: "Water Shortage", 
    icon: Droplets,
  },
  { 
    id: "telecom",
    name: "Network Failure", 
    icon: Radio,
  },
  { 
    id: "transport",
    name: "Transport Disruption", 
    icon: Car,
  },
];

export default function Analysis() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RootCauseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-generate regions from infrastructure data
  useEffect(() => {
    fetchInfrastructure().then((data) => {
      const graph = buildGraph(data);
      const allLocations = [...new Set(graph.nodes.map((n: any) => n.location))];
      const locationGroups = groupLocationsByRegion(allLocations);
      setRegions(locationGroups);
      setLoading(false);
    });
  }, []);

  const groupLocationsByRegion = (locations: string[]): Region[] => {
    const northKeywords = ['ennore', 'basin bridge', 'red hills', 'minjur', 'north'];
    const centralKeywords = ['anna nagar', 'kilpauk', 'mount road', 't nagar', 'central'];
    const southKeywords = ['adyar', 'taramani', 'velachery', 'neelankarai', 'beach'];
    const itKeywords = ['omr', 'old mahabalipuram', 'guindy', 'tambaram', 'koyambedu'];
    
    const north: string[] = [];
    const central: string[] = [];
    const south: string[] = [];
    const itCorridor: string[] = [];
    const other: string[] = [];

    locations.forEach(loc => {
      const lowerLoc = loc.toLowerCase();
      if (northKeywords.some(kw => lowerLoc.includes(kw))) {
        north.push(loc);
      } else if (centralKeywords.some(kw => lowerLoc.includes(kw))) {
        central.push(loc);
      } else if (southKeywords.some(kw => lowerLoc.includes(kw))) {
        south.push(loc);
      } else if (itKeywords.some(kw => lowerLoc.includes(kw))) {
        itCorridor.push(loc);
      } else {
        other.push(loc);
      }
    });

    const generatedRegions: Region[] = [];
    if (north.length > 0) generatedRegions.push({ id: 'north', name: 'North Chennai', icon: '🏭', locations: north });
    if (central.length > 0) generatedRegions.push({ id: 'central', name: 'Central Chennai', icon: '🏛️', locations: central });
    if (south.length > 0) generatedRegions.push({ id: 'south', name: 'South Chennai', icon: '🏖️', locations: south });
    if (itCorridor.length > 0) generatedRegions.push({ id: 'it-corridor', name: 'IT Corridor', icon: '💻', locations: itCorridor });
    if (other.length > 0) generatedRegions.push({ id: 'other', name: 'Other Areas', icon: '📍', locations: other });

    return generatedRegions;
  };

  const analyzeRootCause = async () => {
    if (!selectedProblem || !selectedRegion) return;

    const region = regions.find(r => r.id === selectedRegion);
    if (!region) return;

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const locations = region.locations.join(',');
      const url = `http://localhost:4000/api/root-cause?type=${encodeURIComponent(selectedProblem)}&locations=${encodeURIComponent(locations)}`;
      
      console.log('Analyzing root cause:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.details || errorData.error || `API returned ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Root cause analysis:', data);
      
      const problem = problemTypes.find(p => p.id === selectedProblem);
      
      setResult({
        problem: problem?.name || selectedProblem,
        region: region.name,
        rootCause: data.rootCause,
        impactChain: data.impactChain || [],
        affectedServices: data.affectedServices || 0,
        criticalPath: data.criticalPath || []
      });
    } catch (err) {
      console.error("Root cause analysis failed:", err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
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
            Identify the root cause of infrastructure problems using dependency graphs
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

                {result && (
                  <Button variant="outline" onClick={clearAnalysis} className="w-full">
                    Clear Analysis
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-critical">
                        <AlertTriangle className="h-5 w-5" />
                        No Infrastructure Found
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border-2 border-critical/20 bg-critical/5 p-4">
                        <p className="text-sm text-foreground">{error}</p>
                      </div>
                      <div className="rounded-lg bg-secondary p-4">
                        <p className="mb-2 text-sm font-medium">Suggestions:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Try a different region</li>
                          <li>• Select another failure type</li>
                          <li>• Check if infrastructure data is loaded</li>
                        </ul>
                      </div>
                      <Button variant="outline" onClick={clearAnalysis} className="w-full">
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            Root Cause Found
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {result.problem} in {result.region}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearAnalysis}>
                          Clear
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Root Cause */}
                      <div className="rounded-lg border-2 border-critical bg-critical/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-critical" />
                          <p className="text-sm font-medium text-critical">Primary Root Cause</p>
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{result.rootCause.name}</h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{result.rootCause.location}</span>
                          <span>•</span>
                          <span>{result.rootCause.department}</span>
                        </div>
                        <div className="mt-2">
                          <span 
                            className="inline-block rounded-full px-2 py-1 text-xs font-medium"
                            style={{ 
                              backgroundColor: `${getNodeColor(result.rootCause.type as InfrastructureType)}20`,
                              color: getNodeColor(result.rootCause.type as InfrastructureType)
                            }}
                          >
                            {getTypeLabel(result.rootCause.type as InfrastructureType)}
                          </span>
                        </div>
                      </div>

                      {/* Impact Summary */}
                      <div className="rounded-lg bg-secondary p-4">
                        <p className="mb-3 text-sm font-medium">Impact Analysis</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-2xl font-bold text-foreground">{result.affectedServices}</p>
                            <p className="text-xs text-muted-foreground">Services Affected</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{result.impactChain.length}</p>
                            <p className="text-xs text-muted-foreground">Chain Length</p>
                          </div>
                        </div>
                      </div>

                      {/* Impact Chain */}
                      {result.impactChain.length > 0 && (
                        <div>
                          <p className="mb-3 text-sm font-medium text-foreground">Cascading Impact</p>
                          <div className="space-y-2 max-h-[250px] overflow-y-auto">
                            {result.impactChain.map((unit, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2"
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                  {idx + 1}
                                </div>
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: getNodeColor(unit.type as InfrastructureType) }}
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{unit.name}</p>
                                  <p className="text-xs text-muted-foreground">{unit.location}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex h-full min-h-[600px] items-center justify-center">
                    <CardContent className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">Ready to Analyze</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Select a problem type and region to identify the root cause using graph analysis
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}