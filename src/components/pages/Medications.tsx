// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/pages/Medications.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pill, PillBottle, Calendar, Clock, History, CalendarDays, Download, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Medication {
  id: string;
  name: string;
  totalCount: number;
  currentCount: number;
  dosageFrequency: number; // times per day
  startDate: string;
  lastTaken?: string;
  estimatedDepletionDate: string;
  notes?: string;
}

interface DoseHistory {
  id: string;
  medicationId: string;
  timestamp: string;
  count: number;
}

export default function Medications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    totalCount: "",
    dosageFrequency: "1",
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [detailEditForm, setDetailEditForm] = useState({
    name: "",
    totalCount: "",
    dosageFrequency: "1",
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [whatIfDoses, setWhatIfDoses] = useState("");
  const [whatIfCount, setWhatIfCount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined medications from old system
  const PERMANENT_MEDICATIONS = [
    {
      name: 'Sildenafil',
      receivedDate: '2024-07-20',
      dosagePerDay: 1,
      supplyTotal: 18,
      refillsLeft: 1,
    },
    {
      name: 'Prednisone',
      receivedDate: '2024-07-20',
      dosagePerDay: 5,
      supplyTotal: 21,
      refillsLeft: 1,
    },
    {
      name: 'Pantoprazole',
      receivedDate: '2024-07-20',
      dosagePerDay: 1,
      supplyTotal: 90,
      refillsLeft: 1,
    },
    {
      name: 'Diclofenac',
      receivedDate: '2024-07-20',
      dosagePerDay: 2,
      supplyTotal: 90,
      refillsLeft: 1,
    },
    {
      name: 'Tamsuloson',
      receivedDate: '2024-07-20',
      dosagePerDay: 1,
      supplyTotal: 180,
      refillsLeft: 1,
    },
    {
      name: 'Cpap',
      receivedDate: '2024-07-20',
      dosagePerDay: 1,
      supplyTotal: 180,
      refillsLeft: null,
    },
    {
      name: 'ALBUTEROL 3MG/IPRATROPIUM 0.5MG 3ML NEB',
      receivedDate: '2025-03-10',
      dosagePerDay: 2,
      supplyTotal: 120,
      refillsLeft: 5,
    },
    {
      name: 'ALBUTEROL 90MCG (CFC-F) 200D ORAL INHL',
      receivedDate: '2025-03-28',
      dosagePerDay: 3,
      supplyTotal: 600,
      refillsLeft: 2,
    },
    {
      name: 'ARTIFICIAL TEARS PVA 1.4%/POVIDONE (PF)',
      receivedDate: '2025-03-17',
      dosagePerDay: 2,
      supplyTotal: 60,
      refillsLeft: 10,
    },
    {
      name: 'FLUTICAS 500/SALMETEROL 50 INHL DISK 60',
      receivedDate: '2025-03-28',
      dosagePerDay: 2,
      supplyTotal: 180,
      refillsLeft: 2,
    },
    {
      name: 'FLUTICASONE PROP 50MCG 120D NASAL INHL',
      receivedDate: '2025-03-31',
      dosagePerDay: 1,
      supplyTotal: 120,
      refillsLeft: 4,
    },
    {
      name: 'HCTZ 12.5MG/LOSARTAN 100MG TAB',
      receivedDate: '2025-05-28',
      dosagePerDay: 1,
      supplyTotal: 90,
      refillsLeft: 2,
    },
    {
      name: 'HYDROXYZINE HCL 50MG TAB',
      receivedDate: '2025-08-01',
      dosagePerDay: 2,
      supplyTotal: 120,
      refillsLeft: 2,
    },
    {
      name: 'MONTELUKAST NA 5MG CHEW TAB',
      receivedDate: '2025-06-27',
      dosagePerDay: 2,
      supplyTotal: 180,
      refillsLeft: 1,
    },
    {
      name: 'ROSUVASTATIN CA 20MG TAB',
      receivedDate: '2025-05-28',
      dosagePerDay: 1,
      supplyTotal: 90,
      refillsLeft: 2,
    },
    {
      name: 'TIOTROPIUM 2.5MCG/ACTUAT 60D ORAL INHL',
      receivedDate: '2025-03-28',
      dosagePerDay: 2,
      supplyTotal: 270,
      refillsLeft: 2,
    },
    {
      name: 'Air purifier filter',
      receivedDate: '2025-08-13',
      dosagePerDay: 180, // Days per filter
      supplyTotal: 2,
      refillsLeft: null,
    },
  ];

  // Migration function to convert old medication data format to new format
  const migrateOldData = () => {
    try {
      let migratedMeds: Medication[] = [];
      let dataSource = '';

      // Check for old localStorage data first
      const oldMeds = localStorage.getItem('medication_tracking_meds');
      if (oldMeds) {
        const parsedOldMeds = JSON.parse(oldMeds);
        console.log('Found old localStorage medication data, migrating...', parsedOldMeds);
        
        migratedMeds = parsedOldMeds.map((oldMed: any, index: number) => {
          const currentCount = calculateCurrentCount(oldMed);
          return {
            id: (Date.now() + index).toString(),
            name: oldMed.name,
            totalCount: oldMed.supplyTotal || 0,
            currentCount: currentCount,
            dosageFrequency: oldMed.dosagePerDay || oldMed.pillsPerDay || 1,
            startDate: oldMed.receivedDate || new Date().toISOString().split('T')[0],
            estimatedDepletionDate: calculateDepletionDate(currentCount, oldMed.dosagePerDay || oldMed.pillsPerDay || 1),
            notes: oldMed.notes || ''
          };
        });
        dataSource = 'localStorage';
        
        // Backup old data before removing
        localStorage.setItem('medication_tracking_meds_backup', oldMeds);
        localStorage.removeItem('medication_tracking_meds');
      } else {
        // No old localStorage data found, load predefined medications
        console.log('No old data found, loading predefined medications...');
        
        migratedMeds = PERMANENT_MEDICATIONS.map((med, index) => {
          const currentCount = calculateCurrentCount(med);
          return {
            id: (Date.now() + index).toString(),
            name: med.name,
            totalCount: med.supplyTotal,
            currentCount: currentCount,
            dosageFrequency: med.dosagePerDay,
            startDate: med.receivedDate,
            estimatedDepletionDate: calculateDepletionDate(currentCount, med.dosagePerDay),
            notes: ''
          };
        });
        dataSource = 'predefined';
      }

      setMedications(migratedMeds);
      
      // Save migrated data in new format
      localStorage.setItem('dashboard_medications', JSON.stringify(migratedMeds));
      
      if (dataSource === 'localStorage') {
        toast.success(`Migrated ${migratedMeds.length} medications from old system`);
      } else {
        toast.success(`Loaded ${migratedMeds.length} predefined medications`);
      }
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to migrate medication data');
    }
    return false;
  };

  // Calculate current count based on time elapsed since received date
  const calculateCurrentCount = (medication: any) => {
    const { receivedDate, dosagePerDay, supplyTotal } = medication;
    const daysPassed = getDaysBetweenDates(receivedDate, new Date().toISOString().split('T')[0]);
    
    // Special handling for air purifier filter
    if (medication.name.toLowerCase().includes('filter') || medication.name.toLowerCase().includes('air purifier')) {
      const totalDaysPerItem = dosagePerDay;
      const itemsUsed = Math.floor(daysPassed / totalDaysPerItem);
      return Math.max(0, supplyTotal - itemsUsed);
    }
    
    // Regular medication calculation
    const itemsConsumed = daysPassed * dosagePerDay;
    return Math.max(0, supplyTotal - itemsConsumed);
  };

  // Helper function to calculate days between dates
  const getDaysBetweenDates = (date1: string, date2: string): number => {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));
  };

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedMedications = localStorage.getItem('dashboard_medications');
    const savedHistory = localStorage.getItem('dashboard_dose_history');
    
    let dataLoaded = false;
    
    // First try to load existing new format data
    if (savedMedications) {
      try {
        setMedications(JSON.parse(savedMedications));
        dataLoaded = true;
      } catch (error) {
        console.error('Failed to load medications:', error);
      }
    }
    
    // If no new data found, try to migrate old data
    if (!dataLoaded) {
      dataLoaded = migrateOldData();
    }
    
    if (savedHistory) {
      try {
        setDoseHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load dose history:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (medications.length > 0) {
      localStorage.setItem('dashboard_medications', JSON.stringify(medications));
    }
  }, [medications]);

  useEffect(() => {
    if (doseHistory.length > 0) {
      localStorage.setItem('dashboard_dose_history', JSON.stringify(doseHistory));
    }
  }, [doseHistory]);

  // Calculate estimated depletion date
  const calculateDepletionDate = (currentCount: number, dosesPerDay: number): string => {
    if (dosesPerDay === 0) return "Never";
    const daysRemaining = Math.floor(currentCount / dosesPerDay);
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysRemaining);
    return depletionDate.toISOString().split('T')[0];
  };

  // Check if medication is low (within 15 days)
  const isLowStock = (depletionDate: string): boolean => {
    if (depletionDate === "Never") return false;
    const depletion = new Date(depletionDate);
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
    return depletion <= fifteenDaysFromNow;
  };

  // Get days remaining
  const getDaysRemaining = (depletionDate: string): number => {
    if (depletionDate === "Never") return Infinity;
    const depletion = new Date(depletionDate);
    const today = new Date();
    const diffTime = depletion.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Add new medication
  const handleAddMedication = () => {
    if (!newMed.name || !newMed.totalCount) {
      toast.error("Please fill in medication name and count");
      return;
    }

    const totalCount = parseInt(newMed.totalCount);
    const dosageFreq = parseInt(newMed.dosageFrequency);
    const depletionDate = calculateDepletionDate(totalCount, dosageFreq);

    const medication: Medication = {
      id: Date.now().toString(),
      name: newMed.name,
      totalCount,
      currentCount: totalCount,
      dosageFrequency: dosageFreq,
      startDate: newMed.startDate,
      estimatedDepletionDate: depletionDate,
      notes: newMed.notes
    };

    setMedications(prev => [...prev, medication]);
    setNewMed({
      name: "",
      totalCount: "",
      dosageFrequency: "1",
      startDate: new Date().toISOString().split('T')[0],
      notes: ""
    });
    setIsAddDialogOpen(false);
    toast.success(`Added ${medication.name} to inventory`);
  };

  // Update medication
  const handleUpdateMedication = () => {
    if (!editingMed) return;

    const updatedMed: Medication = {
      ...editingMed,
      name: detailEditForm.name,
      totalCount: parseInt(detailEditForm.totalCount),
      dosageFrequency: parseInt(detailEditForm.dosageFrequency),
      startDate: detailEditForm.startDate,
      notes: detailEditForm.notes,
    };

    // Recalculate depletion date
    updatedMed.estimatedDepletionDate = calculateDepletionDate(
      updatedMed.currentCount,
      updatedMed.dosageFrequency
    );

    setMedications(prev => prev.map(med => 
      med.id === editingMed.id ? updatedMed : med
    ));

    setEditingMed(null);
    toast.success(`Updated ${updatedMed.name}`);
  };

  // Delete medication
  const handleDeleteMedication = (medication: Medication) => {
    setMedications(prev => prev.filter(med => med.id !== medication.id));
    setDoseHistory(prev => prev.filter(h => h.medicationId !== medication.id));
    toast.success(`Deleted ${medication.name}`);
  };

  // Take dose
  const handleTakeDose = (medication: Medication) => {
    if (medication.currentCount <= 0) {
      toast.error("No doses remaining");
      return;
    }

    const updatedMed = {
      ...medication,
      currentCount: medication.currentCount - 1,
      lastTaken: new Date().toISOString()
    };
    updatedMed.estimatedDepletionDate = calculateDepletionDate(
      updatedMed.currentCount,
      updatedMed.dosageFrequency
    );

    setMedications(prev => prev.map(med => 
      med.id === medication.id ? updatedMed : med
    ));

    // Add to history
    const historyEntry: DoseHistory = {
      id: Date.now().toString(),
      medicationId: medication.id,
      timestamp: new Date().toISOString(),
      count: updatedMed.currentCount
    };
    setDoseHistory(prev => [...prev, historyEntry]);

    toast.success(`Took dose of ${medication.name}`);

    // Check for low stock warning
    if (isLowStock(updatedMed.estimatedDepletionDate)) {
      const daysLeft = getDaysRemaining(updatedMed.estimatedDepletionDate);
      toast.warning(`${medication.name} will run out in ${daysLeft} days`);
    }
  };

  // Add stock
  const handleAddStock = (medication: Medication, additionalCount: number) => {
    const updatedMed = {
      ...medication,
      currentCount: medication.currentCount + additionalCount,
      totalCount: medication.totalCount + additionalCount
    };
    updatedMed.estimatedDepletionDate = calculateDepletionDate(
      updatedMed.currentCount,
      updatedMed.dosageFrequency
    );

    setMedications(prev => prev.map(med => 
      med.id === medication.id ? updatedMed : med
    ));

    toast.success(`Added ${additionalCount} doses to ${medication.name}`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = [
      "Name,Total Count,Current Count,Doses Per Day,Start Date,Last Taken,Estimated Depletion,Notes",
      ...medications.map(med => 
        `"${med.name}",${med.totalCount},${med.currentCount},${med.dosageFrequency},"${med.startDate}","${med.lastTaken || ''}","${med.estimatedDepletionDate}","${med.notes || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Medication list exported");
  };

  // Import from CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const importedMeds: Medication[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(col => col.replace(/^"|"$/g, ''));
        if (cols.length >= 7) {
          const depletionDate = calculateDepletionDate(
            parseInt(cols[2]) || 0,
            parseInt(cols[3]) || 1
          );

          importedMeds.push({
            id: Date.now().toString() + i,
            name: cols[0],
            totalCount: parseInt(cols[1]) || 0,
            currentCount: parseInt(cols[2]) || 0,
            dosageFrequency: parseInt(cols[3]) || 1,
            startDate: cols[4],
            lastTaken: cols[5] || undefined,
            estimatedDepletionDate: depletionDate,
            notes: cols[7] || undefined
          });
        }
      }

      setMedications(prev => [...prev, ...importedMeds]);
      toast.success(`Imported ${importedMeds.length} medications`);
    };
    reader.readAsText(file);
  };

  // Get summary stats
  const totalMeds = medications.length;
  const lowStockMeds = medications.filter(med => isLowStock(med.estimatedDepletionDate)).length;

  // Get next dose time for a medication
  const getNextDoseTime = (medication: Medication): string => {
    if (!medication.lastTaken) return "Take now";
    
    const lastTaken = new Date(medication.lastTaken);
    const hoursPerDose = 24 / medication.dosageFrequency;
    const nextDose = new Date(lastTaken.getTime() + (hoursPerDose * 60 * 60 * 1000));
    
    if (nextDose <= new Date()) return "Take now";
    
    return nextDose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate what-if scenario
  const calculateWhatIf = (): string => {
    if (!selectedMed || !whatIfDoses || !whatIfCount) return "";
    const doses = parseInt(whatIfDoses);
    const count = parseInt(whatIfCount);
    return calculateDepletionDate(count, doses);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medication Tracker</h1>
          <p className="text-muted-foreground">
            Track your medications, schedules, and stock levels
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medications</CardTitle>
            <PillBottle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMeds}</div>
            <p className="text-xs text-muted-foreground">
              Medications tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">URGENT - Depleted</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {medications.filter(med => getDaysRemaining(med.estimatedDepletionDate) <= 0).length}
            </div>
            <p className="text-xs text-red-600 font-medium">
              Need immediate refill
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockMeds}</div>
            <p className="text-xs text-muted-foreground">
              Running low (≤15 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doses Today</CardTitle>
            <Pill className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doseHistory.filter(h => {
                const today = new Date().toDateString();
                return new Date(h.timestamp).toDateString() === today;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Doses taken today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Depletion Countdown Summary */}
      {medications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Medication Depletion Countdown</CardTitle>
            <CardDescription>
              Days remaining for each medication based on current usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medications
                .sort((a, b) => getDaysRemaining(a.estimatedDepletionDate) - getDaysRemaining(b.estimatedDepletionDate))
                .map((med) => {
                  const daysLeft = getDaysRemaining(med.estimatedDepletionDate);
                  const isUrgent = daysLeft <= 0;
                  const isLow = daysLeft > 0 && daysLeft <= 15;
                  const isMonitor = daysLeft > 15 && daysLeft <= 30;
                  
                  return (
                    <div 
                      key={med.id} 
                      className={`p-4 rounded-lg border-2 ${
                        isUrgent ? 'border-red-500 bg-red-50' :
                        isLow ? 'border-orange-500 bg-orange-50' :
                        isMonitor ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm leading-tight">
                          {med.name.length > 25 ? med.name.substring(0, 25) + '...' : med.name}
                        </h4>
                        <div className={`w-3 h-3 rounded-full ${
                          isUrgent ? 'bg-red-500' :
                          isLow ? 'bg-orange-500' :
                          isMonitor ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Days left:</span>
                          <span className={`font-bold ${
                            isUrgent ? 'text-red-600' :
                            isLow ? 'text-orange-600' :
                            isMonitor ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {daysLeft <= 0 ? 'DEPLETED' : `${daysLeft} days`}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current:</span>
                          <span>{med.currentCount} pills</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Daily:</span>
                          <span>{med.dosageFrequency}x</span>
                        </div>
                        
                        {med.estimatedDepletionDate !== "Never" && daysLeft > 0 && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Runs out: {new Date(med.estimatedDepletionDate).toLocaleDateString()}
                          </div>
                        )}
                        
                        {med.notes && med.notes.includes('Rx:') && (
                          <div className="text-xs text-muted-foreground">
                            {med.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Depleted/Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Low Stock (≤15 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Monitor (≤30 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Good Supply (>30 days)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Pill className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
              <DialogDescription>
                Enter the medication details and inventory information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Medication Name</Label>
                <Input
                  id="name"
                  value={newMed.name}
                  onChange={(e) => setNewMed(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Vitamin D"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="count">Total Count</Label>
                  <Input
                    id="count"
                    type="number"
                    value={newMed.totalCount}
                    onChange={(e) => setNewMed(prev => ({ ...prev, totalCount: e.target.value }))}
                    placeholder="90"
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Doses per Day</Label>
                  <Select
                    value={newMed.dosageFrequency}
                    onValueChange={(value) => setNewMed(prev => ({ ...prev, dosageFrequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x daily</SelectItem>
                      <SelectItem value="2">2x daily</SelectItem>
                      <SelectItem value="3">3x daily</SelectItem>
                      <SelectItem value="4">4x daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newMed.startDate}
                  onChange={(e) => setNewMed(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={newMed.notes}
                  onChange={(e) => setNewMed(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Take with food"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMedication}>Add Medication</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>

        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
        />
      </div>

      {/* Medications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medication Inventory</CardTitle>
          <CardDescription>
            Track your medications, schedules, and stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <div className="text-center py-12">
              <PillBottle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No medications added yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first medication above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Next Dose</TableHead>
                  <TableHead>Depletion</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{med.name}</div>
                        {med.notes && (
                          <div className="text-sm text-muted-foreground">{med.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{med.dosageFrequency}x daily</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{med.currentCount} pills</span>
                        {isLowStock(med.estimatedDepletionDate) && (
                          <Badge variant="destructive" className="text-xs">Low</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getNextDoseTime(med)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {med.estimatedDepletionDate === "Never" 
                            ? "Never" 
                            : `${getDaysRemaining(med.estimatedDepletionDate)}d`
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleTakeDose(med)}
                          disabled={med.currentCount <= 0}
                        >
                          Take Dose
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMed(med);
                            setWhatIfDoses(med.dosageFrequency.toString());
                            setWhatIfCount(med.currentCount.toString());
                            // Initialize detail edit form with current medication data
                            setDetailEditForm({
                              name: med.name,
                              totalCount: med.totalCount.toString(),
                              dosageFrequency: med.dosageFrequency.toString(),
                              startDate: med.startDate,
                              notes: med.notes || ""
                            });
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Medication Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMed?.name} Details</DialogTitle>
            <DialogDescription>
              View medication information, history, and what-if scenarios
            </DialogDescription>
          </DialogHeader>
          
          {selectedMed && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="whatif">What If</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Stock</Label>
                    <div className="text-2xl font-bold">{selectedMed.currentCount} pills</div>
                  </div>
                  <div>
                    <Label>Dosage Frequency</Label>
                    <div className="text-2xl font-bold">{selectedMed.dosageFrequency}x daily</div>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <div>{new Date(selectedMed.startDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label>Estimated Depletion</Label>
                    <div className={isLowStock(selectedMed.estimatedDepletionDate) ? "text-destructive font-medium" : ""}>
                      {selectedMed.estimatedDepletionDate === "Never" 
                        ? "Never" 
                        : new Date(selectedMed.estimatedDepletionDate).toLocaleDateString()
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddStock(selectedMed, 30)}
                    variant="outline"
                  >
                    Add 30 Pills
                  </Button>
                  <Button
                    onClick={() => handleAddStock(selectedMed, 90)}
                    variant="outline"
                  >
                    Add 90 Pills
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="detail-edit-name">Medication Name</Label>
                    <Input
                      id="detail-edit-name"
                      value={detailEditForm.name}
                      onChange={(e) => setDetailEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Medication name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="detail-edit-count">Total Count</Label>
                      <Input
                        id="detail-edit-count"
                        type="number"
                        value={detailEditForm.totalCount}
                        onChange={(e) => setDetailEditForm(prev => ({ ...prev, totalCount: e.target.value }))}
                        placeholder="90"
                      />
                    </div>
                    <div>
                      <Label htmlFor="detail-edit-frequency">Doses per Day</Label>
                      <Select
                        value={detailEditForm.dosageFrequency}
                        onValueChange={(value) => setDetailEditForm(prev => ({ ...prev, dosageFrequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1x daily</SelectItem>
                          <SelectItem value="2">2x daily</SelectItem>
                          <SelectItem value="3">3x daily</SelectItem>
                          <SelectItem value="4">4x daily</SelectItem>
                          <SelectItem value="5">5x daily</SelectItem>
                          <SelectItem value="180">180 days (filters)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="detail-edit-startDate">Start/Fill Date</Label>
                    <Input
                      id="detail-edit-startDate"
                      type="date"
                      value={detailEditForm.startDate}
                      onChange={(e) => setDetailEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="detail-edit-notes">Notes</Label>
                    <Input
                      id="detail-edit-notes"
                      value={detailEditForm.notes}
                      onChange={(e) => setDetailEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Rx: 1234567A or Take with food"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        // Set up editing state
                        setEditingMed(selectedMed);
                        handleUpdateMedication();
                        setIsDetailDialogOpen(false);
                      }}
                    >
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Reset form
                        setDetailEditForm({
                          name: selectedMed.name,
                          totalCount: selectedMed.totalCount.toString(),
                          dosageFrequency: selectedMed.dosageFrequency.toString(),
                          startDate: selectedMed.startDate,
                          notes: selectedMed.notes || ""
                        });
                      }}
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ${selectedMed.name}?`)) {
                          handleDeleteMedication(selectedMed);
                          setIsDetailDialogOpen(false);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {doseHistory
                      .filter(h => h.medicationId === selectedMed.id)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((entry) => (
                        <div key={entry.id} className="flex items-center gap-2 p-2 rounded bg-muted">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm">
                              Dose taken - {entry.count} pills remaining
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    {doseHistory.filter(h => h.medicationId === selectedMed.id).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No dose history yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="whatif" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whatif-doses">Doses per Day</Label>
                    <Input
                      id="whatif-doses"
                      type="number"
                      value={whatIfDoses}
                      onChange={(e) => setWhatIfDoses(e.target.value)}
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatif-count">Pill Count</Label>
                    <Input
                      id="whatif-count"
                      type="number"
                      value={whatIfCount}
                      onChange={(e) => setWhatIfCount(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                
                {whatIfDoses && whatIfCount && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Projected Depletion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xl font-bold">
                          {calculateWhatIf() === "Never" 
                            ? "Never"
                            : new Date(calculateWhatIf()).toLocaleDateString()
                          }
                        </span>
                      </div>
                      {calculateWhatIf() !== "Never" && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {getDaysRemaining(calculateWhatIf())} days from now
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}