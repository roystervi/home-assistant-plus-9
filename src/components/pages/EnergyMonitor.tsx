"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useHomeAssistant } from "@/contexts/HomeAssistantContext"
import { 
  ChartSpline, 
  DollarSign, 
  PlugZap, 
  FileChartLine, 
  SunDim,
  RefreshCw,
  Zap,
  Home,
  Thermometer,
  Car,
  ChefHat,
  Waves,
  Router,
  WashingMachine,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Receipt,
  Calculator,
  History,
  TrendingUp,
  Calendar,
  Settings
} from "lucide-react"

interface EnergyReading {
  id: string
  entityId: string
  friendlyName: string
  timestamp: Date
  kwh: number
  cost?: number
  source: 'ha' | 'manual'
}

interface EnergySummary {
  totalKwh: number
  totalCost: number
  avgDaily: number
  projectedMonthly: number
  totalDevices: number
  topConsumer: string
}

interface EnergyBill {
  id: number
  billingMonth: string
  totalKwhUsed: number
  basicMonthlyCharge: number
  energyChargeTier1Kwh: number
  energyChargeTier1Rate: number
  energyChargeTier1Cost: number
  energyChargeTier2Kwh: number
  energyChargeTier2Rate: number
  energyChargeTier2Cost: number
  fuelCost: number
  franchiseFee: number
  grossReceiptsTax: number
  publicServiceTax: number
  totalBillAmount: number
  createdAt: string
  updatedAt: string
}

interface BillCalculation {
  billingMonth: string
  daysBilled: number
  totalKwhUsed: number
  dailyAverages: {
    kwhPerDay: number
    costPerDay: number
  }
  calculation: {
    basicMonthlyCharge: number
    energyCharges: {
      tier1: { kwh: number; rate: number; cost: number }
      tier2: { kwh: number; rate: number; cost: number }
      totalEnergyCost: number
    }
    fuelCost: { rate: number; amount: number }
    franchiseFee: { rate: number; amount: number }
    subtotal: number
    grossReceiptsTax: { rate: number; amount: number }
    publicServiceTax: number
    totalBillAmount: number
  }
  sourceData: {
    readingsCount: number
    dateRange: { 
      start: string
      end: string
      count: number
      daysBilled: number
      isLeapYear: boolean
      monthName: string
    }
    entities: string[]
  }
}

interface BillingPeriodSettings {
  billingDayStart: number  // Day of month billing starts (1-31)
  billingDayEnd: number    // Day of month billing ends (1-31)
  isCustomPeriod: boolean  // Whether to use custom period vs calendar month
}

interface EnergyDevice {
  entity_id: string
  name: string
  state: number
  unit: string
  lastUpdated: string
}

// Device icon mapping for better visualization
const DEVICE_ICONS: Record<string, React.ComponentType<any>> = {
  'sensor.air_handler_energy_this_month': Thermometer,
  'sensor.den_garage_energy_this_month': Home,
  'sensor.driveway_receptacle_energy_this_month': Car,
  'sensor.fridge_energy_this_month': ChefHat,
  'sensor.hallway_manifold_energy_this_month': Home,
  'sensor.heat_pump_energy_this_month': Thermometer,
  'sensor.hot_water_tank_energy_this_month': Waves,
  'sensor.jen_liv_rm_recp_hallw_energy_this_month': Home,
  'sensor.kitchen_receptacles_energy_this_month': ChefHat,
  'sensor.masterbed_floor_heating_energy_this_month': Thermometer,
  'sensor.network_switch_energy_this_month': Router,
  'sensor.pump_energy_this_month': Waves,
  'sensor.stove_energy_this_month': ChefHat,
  'sensor.washer_receptacles_energy_this_month': WashingMachine,
}

export default function EnergyMonitor() {
  const [selectedView, setSelectedView] = useState<"overview" | "devices" | "billing" | "comparison">("overview")
  const [dateRange, setDateRange] = useState<"day" | "week" | "month">("month")
  const [viewMode, setViewMode] = useState<"kwh" | "cost">("kwh")
  const [costPerKwh] = useState<number>(0.12)
  const [timezone, setTimezone] = useState<string>("America/New_York")
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualKwh, setManualKwh] = useState("")
  const [manualReadings, setManualReadings] = useState<EnergyReading[]>([])
  const [summary, setSummary] = useState<EnergySummary | null>(null)
  
  // Billing state
  const [billingHistory, setBillingHistory] = useState<EnergyBill[]>([])
  const [currentMonthBill, setCurrentMonthBill] = useState<BillCalculation | null>(null)
  const [loadingBills, setLoadingBills] = useState(false)
  const [selectedBillMonth, setSelectedBillMonth] = useState<string>("")

  // Billing period settings
  const [billingSettings, setBillingSettings] = useState<BillingPeriodSettings>({
    billingDayStart: 1,    // Default: 1st of month
    billingDayEnd: 31,     // Default: end of month (calendar month)
    isCustomPeriod: false  // Default: use calendar months
  })
  const [showBillingSettings, setShowBillingSettings] = useState(false)

  // Use the Home Assistant hook
  const { entities, isConnected, error: haError } = useHomeAssistant()

  // Energy entities data from HA
  const [mainEnergyData, setMainEnergyData] = useState<EnergyDevice[]>([])
  const [deviceEnergyData, setDeviceEnergyData] = useState<EnergyDevice[]>([])
  const [totalConsumption, setTotalConsumption] = useState<number>(0)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncingData, setSyncingData] = useState(false)

  // Load billing settings from localStorage
  const loadBillingSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('billingPeriodSettings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setBillingSettings(settings)
      }
    } catch (error) {
      console.error('Error loading billing settings:', error)
    }
  }, [])

  // Reorder: define getCurrentBillingPeriod first
  const getCurrentBillingPeriod = useCallback(() => {
    const now = new Date()
    
    if (!billingSettings.isCustomPeriod) {
      // Use calendar month
      return now.toISOString().substring(0, 7) // YYYY-MM
    }
    
    // Use custom billing period
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const currentDay = now.getDate()
    
    let billingYear = year
    let billingMonth = month
    
    // If current day is before billing start day, we're in previous billing period
    if (currentDay < billingSettings.billingDayStart) {
      billingMonth -= 1
      if (billingMonth < 1) {
        billingMonth = 12
        billingYear -= 1
      }
    }
    
    return `${billingYear}-${billingMonth.toString().padStart(2, '0')}`
  }, [billingSettings])

  // Get billing period date range
  const getBillingPeriodDates = useCallback((billingPeriod: string) => {
    if (!billingSettings.isCustomPeriod) {
      // Calendar month
      const [year, month] = billingPeriod.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0) // Last day of month
      return {
        startDate,
        endDate,
        startDay: 1,
        endDay: endDate.getDate(),
        displayRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      }
    }
    
    // Custom billing period
    const [year, month] = billingPeriod.split('-').map(Number)
    const startDate = new Date(year, month - 1, billingSettings.billingDayStart)
    
    // Calculate end date
    let endYear = year
    let endMonth = month
    let endDay = billingSettings.billingDayEnd
    
    // If end day is less than start day, it's in the next month
    if (billingSettings.billingDayEnd < billingSettings.billingDayStart) {
      endMonth += 1
      if (endMonth > 12) {
        endMonth = 1
        endYear += 1
      }
    }
    
    // Adjust end day for months with fewer days
    const daysInEndMonth = new Date(endYear, endMonth, 0).getDate()
    if (endDay > daysInEndMonth) {
      endDay = daysInEndMonth
    }
    
    const endDate = new Date(endYear, endMonth - 1, endDay)
    
    return {
      startDate,
      endDate,
      startDay: billingSettings.billingDayStart,
      endDay: billingSettings.billingDayEnd,
      displayRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
    }
  }, [billingSettings])

  // Calculate current month bill from readings with custom period support
  const calculateCurrentMonthBill = useCallback(async (billingPeriod: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : null;
      const periodDates = getBillingPeriodDates(billingPeriod)
      
      const response = await fetch(`/api/energy/calculate-bill/${billingPeriod}?` + new URLSearchParams({
        customPeriod: billingSettings.isCustomPeriod.toString(),
        startDate: periodDates.startDate.toISOString().split('T')[0],
        endDate: periodDates.endDate.toISOString().split('T')[0],
        startDay: periodDates.startDay.toString(),
        endDay: periodDates.endDay.toString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      
      if (response.ok) {
        const calculation = await response.json()
        setCurrentMonthBill(calculation)
      } else if (response.status === 404) {
        // No readings for this period yet
        setCurrentMonthBill(null)
      }
    } catch (error) {
      console.error('Error calculating current billing period:', error)
    }
  }, [billingSettings, getBillingPeriodDates])

  // Load billing history from API
  const loadBillingHistory = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : null;
    setLoadingBills(true)
    try {
      const response = await fetch('/api/energy/bills', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      if (response.ok) {
        const bills = await response.json()
        setBillingHistory(bills)
        
        // Load current month calculation
        const currentMonth = getCurrentBillingPeriod()
        await calculateCurrentMonthBill(currentMonth)
      } else {
        console.error('Failed to load billing history')
        toast.error('Failed to load billing history')
      }
    } catch (error) {
      console.error('Error loading billing history:', error)
      toast.error('Error loading billing history')
    } finally {
      setLoadingBills(false)
    }
  }, [getCurrentBillingPeriod, calculateCurrentMonthBill])

  // Save current month bill
  const saveCurrentMonthBill = useCallback(async () => {
    if (!currentMonthBill) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : null;
      const response = await fetch(`/api/energy/calculate-bill/${currentMonthBill.billingMonth}?save=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      if (response.ok) {
        toast.success('Monthly bill saved successfully')
        await loadBillingHistory()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save bill')
      }
    } catch (error) {
      console.error('Error saving bill:', error)
      toast.error('Error saving bill')
    }
  }, [currentMonthBill, loadBillingHistory])

  // Save billing settings to localStorage - now after dependencies
  const saveBillingSettings = useCallback((settings: BillingPeriodSettings) => {
    try {
      localStorage.setItem('billingPeriodSettings', JSON.stringify(settings))
      setBillingSettings(settings)
      toast.success('Billing period settings saved')
      
      // Recalculate current month bill with new settings
      const currentMonth = getCurrentBillingPeriod()
      calculateCurrentMonthBill(currentMonth)
    } catch (error) {
      console.error('Error saving billing settings:', error)
      toast.error('Failed to save billing settings')
    }
  }, [getCurrentBillingPeriod, calculateCurrentMonthBill])

  // Process energy data from Home Assistant entities
  const processEnergyData = useCallback(() => {
    if (!entities || Object.keys(entities).length === 0) return;

    // Main energy entities (primary meters)
    const mainEntities = [
      'sensor.bobby_s_energy_this_month',
      'sensor.bobby_s_energy_today', 
      'sensor.bobby_s_power_minute_average'
    ];

    // Device energy entities (individual devices)
    const deviceEntities = Object.keys(DEVICE_ICONS);

    const processedMainData: EnergyDevice[] = [];
    const processedDeviceData: EnergyDevice[] = [];

    // Process main energy entities
    mainEntities.forEach(entityId => {
      const entity = entities[entityId];
      if (entity && entity.state !== 'unavailable') {
        processedMainData.push({
          entity_id: entityId,
          name: entity.attributes?.friendly_name || entityId,
          state: parseFloat(entity.state) || 0,
          unit: entity.attributes?.unit_of_measurement || 'kWh',
          lastUpdated: entity.last_changed || new Date().toISOString()
        });
      }
    });

    // Process device energy entities
    deviceEntities.forEach(entityId => {
      const entity = entities[entityId];
      if (entity && entity.state !== 'unavailable') {
        processedDeviceData.push({
          entity_id: entityId,
          name: entity.attributes?.friendly_name || entityId,
          state: parseFloat(entity.state) || 0,
          unit: entity.attributes?.unit_of_measurement || 'kWh',
          lastUpdated: entity.last_changed || new Date().toISOString()
        });
      }
    });

    // Calculate total consumption from monthly data
    const monthlyEntity = processedMainData.find(d => d.entity_id === 'sensor.bobby_s_energy_this_month');
    const totalKwh = monthlyEntity ? monthlyEntity.state : 0;

    setMainEnergyData(processedMainData);
    setDeviceEnergyData(processedDeviceData);
    setTotalConsumption(totalKwh);
  }, [entities])

  // Calculate summary from real Home Assistant data
  const calculateSummary = useCallback(() => {
    try {
      if (deviceEnergyData.length === 0 && mainEnergyData.length === 0) return

      const totalKwh = totalConsumption
      const totalCost = totalKwh * costPerKwh
      const avgDaily = totalKwh / 30 // Assuming monthly data
      const projectedMonthly = totalCost
      const totalDevices = deviceEnergyData.length
      
      // Find top consumer
      const topConsumerData = deviceEnergyData.reduce((max, device) => 
        device.state > max.state ? device : max, 
        deviceEnergyData[0] || { state: 0, name: 'None' }
      )
      
      setSummary({
        totalKwh,
        totalCost,
        avgDaily,
        projectedMonthly,
        totalDevices,
        topConsumer: topConsumerData.name
      })
    } catch (error) {
      console.error('Error calculating summary:', error)
    }
  }, [deviceEnergyData, mainEnergyData, totalConsumption, costPerKwh])

  // Calculate summary when data changes
  useEffect(() => {
    if (mainEnergyData.length > 0 || deviceEnergyData.length > 0) {
      calculateSummary()
    }
  }, [mainEnergyData, deviceEnergyData, calculateSummary])

  // Add manual reading
  const addManualReading = useCallback(() => {
    if (!manualKwh) return
    
    const newReading: EnergyReading = {
      id: `manual_${Date.now()}`,
      entityId: 'manual_entry',
      friendlyName: 'Manual Entry',
      timestamp: new Date(),
      kwh: parseFloat(manualKwh),
      cost: parseFloat(manualKwh) * costPerKwh,
      source: 'manual'
    }
    
    setManualReadings(prev => [...prev, newReading])
    setManualKwh("")
    setShowManualEntry(false)
    toast.success("Manual reading added")
  }, [manualKwh, costPerKwh])

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const allData = [...mainEnergyData, ...deviceEnergyData, ...manualReadings]
    
    if (allData.length === 0) {
      toast.error("No data to export")
      return
    }
    
    const csv = [
      'Entity ID,Friendly Name,kWh,Cost,Unit,Last Updated,Source',
      ...mainEnergyData.map(d => `${d.entity_id},${d.name},${d.state},${(d.state * costPerKwh).toFixed(2)},${d.unit},${d.lastUpdated},HA`),
      ...deviceEnergyData.map(d => `${d.entity_id},${d.name},${d.state},${(d.state * costPerKwh).toFixed(2)},${d.unit},${d.lastUpdated},HA`),
      ...manualReadings.map(r => `${r.entityId},${r.friendlyName},${r.kwh},${r.cost || 0},kWh,${r.timestamp.toISOString()},Manual`)
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `energy-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success("Energy data exported")
  }, [mainEnergyData, deviceEnergyData, manualReadings, costPerKwh])

  // Get device icon component
  const getDeviceIcon = useCallback((entityId: string) => {
    const IconComponent = DEVICE_ICONS[entityId] || Zap
    return <IconComponent className="h-4 w-4" />
  }, [])

  // Get connection status icon and color
  const getConnectionStatusDisplay = () => {
    if (isConnected) {
      return { icon: CheckCircle2, color: 'text-green-500', text: 'Connected' }
    } else {
      return { icon: XCircle, color: 'text-red-500', text: 'Disconnected' }
    }
  }

  // Get main energy values by type
  const getMainEnergyValue = useCallback((type: 'month' | 'today' | 'power') => {
    const entityMap = {
      month: 'sensor.bobby_s_energy_this_month',
      today: 'sensor.bobby_s_energy_today',
      power: 'sensor.bobby_s_power_minute_average'
    }
    
    const targetEntity = mainEnergyData.find(d => d.entity_id === entityMap[type])
    return targetEntity ? targetEntity.state : 0
  }, [mainEnergyData])

  // Sort devices by energy consumption
  const getSortedDevices = useCallback(() => {
    return deviceEnergyData.sort((a, b) => b.state - a.state)
  }, [deviceEnergyData])

  // Sync data function
  const syncData = useCallback(() => {
    setSyncingData(true)
    processEnergyData()
    setTimeout(() => {
      setSyncingData(false)
      toast.success("Energy data synced")
    }, 1000)
  }, [processEnergyData])

  // Format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  // Format month display
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01')
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  // Process HA data when entities change
  useEffect(() => {
    if (entities && Object.keys(entities).length > 0) {
      processEnergyData();
      setLastSync(new Date());
    }
  }, [entities, processEnergyData])

  const statusDisplay = getConnectionStatusDisplay()
  const StatusIcon = statusDisplay.icon

  // Initialize connection on component mount (after all useCallbacks defined)
  useEffect(() => {
    loadBillingHistory()
    loadBillingSettings()
  }, [loadBillingHistory, loadBillingSettings])

  return (
    <div className="space-y-6">
      {/* Connection Status & Control Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusDisplay.color}`} />
          <span className="text-sm font-medium">
            Home Assistant: {statusDisplay.text}
          </span>
          {haError && (
            <Badge variant="destructive" className="ml-2">
              {haError}
            </Badge>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="comparison">Data Table</TabsTrigger>
          </TabsList>
        </Tabs>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={syncData}
            disabled={syncingData}
          >
            {syncingData ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlugZap className="h-4 w-4 mr-2" />
            )}
            {syncingData ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>

        {lastSync && (
          <div className="text-sm text-muted-foreground">
            Last sync: {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={selectedView} className="space-y-6">
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Main Energy Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Energy This Month</CardTitle>
                <SunDim className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getMainEnergyValue('month').toFixed(1)} kWh</div>
                <p className="text-xs text-muted-foreground">
                  {currentMonthBill ? formatCurrency(currentMonthBill.calculation.totalBillAmount) : formatCurrency(getMainEnergyValue('month') * costPerKwh)} estimated cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Energy Today</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getMainEnergyValue('today').toFixed(1)} kWh</div>
                <p className="text-xs text-muted-foreground">
                  ${(getMainEnergyValue('today') * costPerKwh).toFixed(2)} daily cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Power</CardTitle>
                <PlugZap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getMainEnergyValue('power').toFixed(2)} kW</div>
                <p className="text-xs text-muted-foreground">
                  Minute average
                </p>
              </CardContent>
            </Card>

            {summary && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Consumer</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{summary.topConsumer}</div>
                  <p className="text-xs text-muted-foreground">
                    {summary.totalDevices} devices monitored
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chart Area - Real Energy Usage Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChartSpline className="h-5 w-5" />
                    Energy Usage Overview
                  </CardTitle>
                  <CardDescription>
                    Real-time data from Home Assistant
                  </CardDescription>
                </div>
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <TabsList>
                    <TabsTrigger value="kwh">kWh</TabsTrigger>
                    <TabsTrigger value="cost">Cost</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {/* Real Home Assistant Energy Data Visualization */}
              {isConnected && (mainEnergyData.length > 0 || deviceEnergyData.length > 0) ? (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Total Energy Consumption</h3>
                      <Badge variant="outline" className="bg-white dark:bg-gray-800">
                        {lastSync ? `Updated ${lastSync.toLocaleTimeString()}` : 'Live Data'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {totalConsumption.toFixed(1)} kWh
                        </p>
                        <p className="text-sm text-muted-foreground">This Month</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totalConsumption * costPerKwh)}
                        </p>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {deviceEnergyData.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Active Devices</p>
                      </div>
                    </div>
                  </div>

                  {/* Device Energy Breakdown */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Device Energy Breakdown ({viewMode === 'kwh' ? 'kWh' : 'Cost'})
                    </h3>
                    
                    {/* Calculate max value for progress bars */}
                    {(() => {
                      const sortedDevices = getSortedDevices();
                      const maxValue = sortedDevices.length > 0 ? Math.max(...sortedDevices.map(d => viewMode === 'kwh' ? d.state : d.state * costPerKwh)) : 1;
                      
                      return (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {sortedDevices.map((device, index) => {
                            const value = viewMode === 'kwh' ? device.state : device.state * costPerKwh;
                            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            const displayValue = viewMode === 'kwh' ? `${device.state.toFixed(1)} kWh` : formatCurrency(device.state * costPerKwh);
                            
                            return (
                              <div key={device.entity_id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {getDeviceIcon(device.entity_id)}
                                    <span className="font-medium truncate text-sm">
                                      {device.name}
                                    </span>
                                    <Badge 
                                      variant={index === 0 ? "destructive" : index < 3 ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      #{index + 1}
                                    </Badge>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <div className="font-bold text-sm">{displayValue}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {percentage.toFixed(1)}% of max
                                    </div>
                                  </div>
                                </div>
                                <div className="relative">
                                  <Progress 
                                    value={percentage} 
                                    className="h-3"
                                  />
                                  <div 
                                    className="absolute top-0 left-0 h-full rounded-full transition-all"
                                    style={{
                                      width: `${percentage}%`,
                                      background: index === 0 
                                        ? 'linear-gradient(90deg, rgb(239, 68, 68), rgb(248, 113, 113))'
                                        : index < 3
                                        ? 'linear-gradient(90deg, rgb(59, 130, 246), rgb(99, 102, 241))'
                                        : 'linear-gradient(90deg, rgb(107, 114, 128), rgb(156, 163, 175))'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Main Energy Metrics */}
                  {mainEnergyData.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        Main Energy Metrics
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {mainEnergyData.map((data) => (
                          <Card key={data.entity_id} className="border-2 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Zap className="h-5 w-5 text-blue-500" />
                                <Badge variant="outline">Live</Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium truncate">{data.name}</p>
                                <p className="text-2xl font-bold">
                                  {data.state.toFixed(data.entity_id.includes('power') ? 2 : 1)} {data.unit}
                                </p>
                                {!data.entity_id.includes('power') && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(data.state * costPerKwh)} cost
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-bold">{deviceEnergyData.length}</p>
                      <p className="text-xs text-muted-foreground">Devices Monitored</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {deviceEnergyData.length > 0 ? (totalConsumption / deviceEnergyData.length).toFixed(1) : '0'} kWh
                      </p>
                      <p className="text-xs text-muted-foreground">Avg per Device</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {totalConsumption > 0 ? ((totalConsumption / 30).toFixed(1)) : '0'} kWh
                      </p>
                      <p className="text-xs text-muted-foreground">Daily Average</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">
                        {getMainEnergyValue('power').toFixed(2)} kW
                      </p>
                      <p className="text-xs text-muted-foreground">Current Load</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {!isConnected ? (
                      <>
                        <XCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                        <p className="text-muted-foreground mb-2">No connection to Home Assistant</p>
                        <p className="text-xs text-muted-foreground">
                          Check your Home Assistant connection and try syncing data
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={syncData}
                          disabled={syncingData}
                        >
                          {syncingData ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <PlugZap className="h-4 w-4 mr-2" />
                          )}
                          {syncingData ? 'Syncing...' : 'Retry Connection'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
                        <p className="text-muted-foreground mb-2">Loading energy data...</p>
                        <p className="text-xs text-muted-foreground">
                          Fetching real-time data from Home Assistant entities
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={syncData}
                          disabled={syncingData}
                        >
                          <PlugZap className="h-4 w-4 mr-2" />
                          Sync Data
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Energy Consumption</CardTitle>
              <CardDescription>
                Monthly energy usage by device from Home Assistant sensors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {getSortedDevices().map((device) => (
                  <div key={device.entity_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(device.entity_id)}
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {device.entity_id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{device.state.toFixed(1)} {device.unit}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(device.state * costPerKwh).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {getSortedDevices().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="h-12 w-12 mx-auto mb-2" />
                    <p>No device data available</p>
                    <p className="text-sm">
                      {isConnected 
                        ? 'Click "Sync Data" to load device information' 
                        : 'Connect to Home Assistant to see device data'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Billing Period Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Billing Period Settings
                  </CardTitle>
                  <CardDescription>
                    Configure when your billing cycles start and end
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBillingSettings(!showBillingSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showBillingSettings ? 'Hide Settings' : 'Configure Period'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Current Billing Period Display */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Current Billing Period: {billingSettings.isCustomPeriod ? 'Custom' : 'Calendar Month'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getBillingPeriodDates(getCurrentBillingPeriod()).displayRange}
                    </div>
                  </div>
                  <Badge variant={billingSettings.isCustomPeriod ? "default" : "secondary"}>
                    {billingSettings.isCustomPeriod 
                      ? `${billingSettings.billingDayStart}th - ${billingSettings.billingDayEnd}th` 
                      : 'Monthly'
                    }
                  </Badge>
                </div>
              </div>

              {/* Billing Settings Form */}
              {showBillingSettings && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="custom-period"
                      checked={billingSettings.isCustomPeriod}
                      onChange={(e) => setBillingSettings(prev => ({
                        ...prev,
                        isCustomPeriod: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="custom-period">Use custom billing period</Label>
                  </div>

                  {billingSettings.isCustomPeriod && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <Label htmlFor="start-day">Billing Cycle Start Day</Label>
                        <Select 
                          value={billingSettings.billingDayStart.toString()} 
                          onValueChange={(value) => setBillingSettings(prev => ({
                            ...prev,
                            billingDayStart: parseInt(value)
                          }))}
                        >
                          <SelectTrigger id="start-day">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="end-day">Billing Cycle End Day</Label>
                        <Select 
                          value={billingSettings.billingDayEnd.toString()} 
                          onValueChange={(value) => setBillingSettings(prev => ({
                            ...prev,
                            billingDayEnd: parseInt(value)
                          }))}
                        >
                          <SelectTrigger id="end-day">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => saveBillingSettings(billingSettings)}
                      size="sm"
                    >
                      Save Billing Settings
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setBillingSettings({
                          billingDayStart: 1,
                          billingDayEnd: 31,
                          isCustomPeriod: false
                        })
                      }}
                      size="sm"
                    >
                      Reset to Calendar Month
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Example:</strong> If your electric bill runs from the 15th to the 14th, 
                      set start day to 15 and end day to 14. The system will automatically handle 
                      month boundaries and varying month lengths.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Month Bill Calculation */}
          {currentMonthBill && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      {formatMonth(currentMonthBill.billingMonth)} - Current Bill Calculation
                    </CardTitle>
                    <CardDescription>
                      Based on {currentMonthBill.sourceData.readingsCount} readings from {currentMonthBill.sourceData.entities.join(', ')}
                      {billingSettings.isCustomPeriod && (
                        <span className="block mt-1">
                          Custom billing period: {getBillingPeriodDates(currentMonthBill.billingMonth).displayRange}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button onClick={saveCurrentMonthBill} size="sm">
                    <Receipt className="h-4 w-4 mr-2" />
                    Save Bill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Bill Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Bill Breakdown
                    </h4>
                    
                    {/* Billing Period Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between font-medium">
                          <span>Billing Period:</span>
                          <span>{currentMonthBill.sourceData.dateRange.monthName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Period Type:</span>
                          <span className="font-medium">
                            {billingSettings.isCustomPeriod ? 'Custom Period' : 'Calendar Month'}
                          </span>
                        </div>
                        {billingSettings.isCustomPeriod && (
                          <div className="flex justify-between">
                            <span>Date Range:</span>
                            <span className="font-medium text-xs">
                              {getBillingPeriodDates(currentMonthBill.billingMonth).displayRange}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Days Billed:</span>
                          <span className="font-medium">{currentMonthBill.daysBilled} days{currentMonthBill.sourceData.dateRange.isLeapYear && currentMonthBill.billingMonth.endsWith('02') ? ' (Leap Year)' : ''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily Average kWh:</span>
                          <span className="font-medium">{currentMonthBill.dailyAverages.kwhPerDay} kWh/day</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily Average Cost:</span>
                          <span className="font-medium">{formatCurrency(currentMonthBill.dailyAverages.costPerDay)}/day</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total kWh Used:</span>
                        <span className="font-medium">{currentMonthBill.totalKwhUsed.toFixed(1)} kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Basic Monthly Charge:</span>
                        <span>{formatCurrency(currentMonthBill.calculation.basicMonthlyCharge)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energy Charge Tier 1 ({currentMonthBill.calculation.energyCharges.tier1.kwh.toFixed(1)} kWh @ ${currentMonthBill.calculation.energyCharges.tier1.rate.toFixed(5)}/kWh):</span>
                        <span>{formatCurrency(currentMonthBill.calculation.energyCharges.tier1.cost)}</span>
                      </div>
                      {currentMonthBill.calculation.energyCharges.tier2.kwh > 0 && (
                        <div className="flex justify-between">
                          <span>Energy Charge Tier 2 ({currentMonthBill.calculation.energyCharges.tier2.kwh.toFixed(1)} kWh @ ${currentMonthBill.calculation.energyCharges.tier2.rate.toFixed(5)}/kWh):</span>
                          <span>{formatCurrency(currentMonthBill.calculation.energyCharges.tier2.cost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Fuel Cost ({(currentMonthBill.calculation.fuelCost.rate * 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(currentMonthBill.calculation.fuelCost.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>City Franchise Fee ({(currentMonthBill.calculation.franchiseFee.rate * 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(currentMonthBill.calculation.franchiseFee.amount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(currentMonthBill.calculation.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gross Receipts Tax ({(currentMonthBill.calculation.grossReceiptsTax.rate * 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(currentMonthBill.calculation.grossReceiptsTax.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Public Service Tax:</span>
                        <span>{formatCurrency(currentMonthBill.calculation.publicServiceTax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Bill Amount:</span>
                        <span>{formatCurrency(currentMonthBill.calculation.totalBillAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rate Structure Info */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Rate Structure & Monthly Summary
                    </h4>
                      
                    {/* Month Details */}
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="font-medium mb-2">Monthly Period Details</div>
                      <div className="text-sm space-y-1">
                        <div>📅 {currentMonthBill.sourceData.dateRange.monthName}</div>
                        <div>⏱️ {currentMonthBill.daysBilled} days billed{currentMonthBill.sourceData.dateRange.isLeapYear && currentMonthBill.billingMonth.endsWith('02') ? ' (Leap Year February)' : ''}</div>
                        <div>📊 {currentMonthBill.sourceData.readingsCount} energy readings processed</div>
                        <div>🏠 {currentMonthBill.sourceData.entities.length} energy entities monitored</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium">Basic Monthly Charge</div>
                        <div className="text-muted-foreground">Fixed monthly fee: ${currentMonthBill.calculation.basicMonthlyCharge.toFixed(2)}</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium">Tier 1 Energy Rate</div>
                        <div className="text-muted-foreground">First 1,000 kWh: ${currentMonthBill.calculation.energyCharges.tier1.rate.toFixed(5)}/kWh</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium">Tier 2 Energy Rate</div>
                        <div className="text-muted-foreground">Above 1,000 kWh: ${currentMonthBill.calculation.energyCharges.tier2.rate.toFixed(5)}/kWh</div>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium">Additional Fees</div>
                        <div className="text-muted-foreground">
                          Fuel Cost: {(currentMonthBill.calculation.fuelCost.rate * 100).toFixed(1)}%<br/>
                          Franchise Fee: {(currentMonthBill.calculation.franchiseFee.rate * 100).toFixed(1)}%<br/>
                          Gross Receipts Tax: {(currentMonthBill.calculation.grossReceiptsTax.rate * 100).toFixed(1)}%<br/>
                          Public Service Tax: ${currentMonthBill.calculation.publicServiceTax.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6-Month Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                6-Month Billing History
              </CardTitle>
              <CardDescription>
                Persistent billing records with detailed electric company rate calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBills ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                  Loading billing history...
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {/* Monthly Bills Grid */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {billingHistory.slice(0, 6).map((bill) => (
                      <Card key={bill.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{formatMonth(bill.billingMonth)}</CardTitle>
                            <Badge variant={bill.totalKwhUsed > 1000 ? "destructive" : "default"}>
                              {bill.totalKwhUsed.toFixed(0)} kWh
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Basic Charge:</span>
                              <span>{formatCurrency(bill.basicMonthlyCharge)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Energy Charges:</span>
                              <span>{formatCurrency(bill.energyChargeTier1Cost + bill.energyChargeTier2Cost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fees & Taxes:</span>
                              <span>{formatCurrency(bill.fuelCost + bill.franchiseFee + bill.grossReceiptsTax + bill.publicServiceTax)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold">
                              <span>Total:</span>
                              <span>{formatCurrency(bill.totalBillAmount)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Bill Date: {new Date(bill.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Billing Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Billing Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatCurrency(billingHistory.reduce((sum, bill) => sum + bill.totalBillAmount, 0) / billingHistory.length)}
                          </div>
                          <div className="text-sm text-muted-foreground">Average Monthly Bill</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {(billingHistory.reduce((sum, bill) => sum + bill.totalKwhUsed, 0) / billingHistory.length).toFixed(0)} kWh
                          </div>
                          <div className="text-sm text-muted-foreground">Average Monthly Usage</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatCurrency(Math.max(...billingHistory.map(bill => bill.totalBillAmount)))}
                          </div>
                          <div className="text-sm text-muted-foreground">Highest Monthly Bill</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2" />
                  <p>No billing history available</p>
                  <p className="text-sm">Billing records will appear here as they are saved</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Energy Data Table</CardTitle>
              <CardDescription>
                All energy readings from Home Assistant entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>kWh</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Main Energy Entities */}
                  {mainEnergyData.map((data) => (
                    <TableRow key={data.entity_id}>
                      <TableCell className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {data.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{data.entity_id}</TableCell>
                      <TableCell>{data.state.toFixed(1)} {data.unit}</TableCell>
                      <TableCell>${(data.state * costPerKwh).toFixed(2)}</TableCell>
                      <TableCell>{new Date(data.lastUpdated).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="default">Main</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Device Entities */}
                  {getSortedDevices().map((data) => (
                    <TableRow key={data.entity_id}>
                      <TableCell className="flex items-center gap-2">
                        {getDeviceIcon(data.entity_id)}
                        {data.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{data.entity_id}</TableCell>
                      <TableCell>{data.state.toFixed(1)} {data.unit}</TableCell>
                      <TableCell>${(data.state * costPerKwh).toFixed(2)}</TableCell>
                      <TableCell>{new Date(data.lastUpdated).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Device</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Manual Readings */}
                  {manualReadings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell className="flex items-center gap-2">
                        <PlugZap className="h-4 w-4" />
                        {reading.friendlyName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{reading.entityId}</TableCell>
                      <TableCell>{reading.kwh.toFixed(1)} kWh</TableCell>
                      <TableCell>${(reading.cost || 0).toFixed(2)}</TableCell>
                      <TableCell>{reading.timestamp.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Manual</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {mainEnergyData.length === 0 && getSortedDevices().length === 0 && manualReadings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileChartLine className="h-12 w-12 mx-auto mb-2" />
                  <p>No energy data available</p>
                  <p className="text-sm">
                    {isConnected 
                      ? 'Click "Sync Data" to load energy information' 
                      : 'Connect to Home Assistant to see energy data'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}