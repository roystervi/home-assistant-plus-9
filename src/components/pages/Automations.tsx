"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Workflow, 
  Component, 
  Redo, 
  HousePlug, 
  House, 
  Lamp, 
  LayoutPanelLeft, 
  ToggleRight,
  Construction,
  Container,
  Loader2,
  Trash
} from 'lucide-react';
import { toast } from 'sonner';
import { EntityAutocomplete } from '@/components/EntityAutocomplete';

interface Entity {
  id: string;
  name: string;
  state: string;
  attributes: Record<string, any>;
  domain: string;
}

interface Trigger {
  id: number;
  type: 'entity_state' | 'time' | 'sunrise_sunset' | 'mqtt' | 'zwave';
  entityId?: string;
  attribute?: string;
  state?: string;
  time?: string;
  offset?: number;
  topic?: string;
  payload?: string;
}

interface Condition {
  id: number;
  type: 'entity_state' | 'numeric' | 'time';
  entityId?: string;
  attribute?: string;
  operator?: 'equals' | 'not_equals' | 'greater' | 'less' | 'greater_equal' | 'less_equal';
  value?: string | number;
  logicalOperator?: 'and' | 'or';
}

interface Action {
  id: number;
  type: 'service_call' | 'mqtt' | 'scene' | 'local_device';
  service?: string;
  entityId?: string;
  data?: Record<string, any>;
  topic?: string;
  payload?: string;
  sceneId?: string;
}

interface Automation {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  triggers?: Trigger[];
  conditions?: Condition[];
  actions?: Action[];
  lastRun?: string;
  source: 'local' | 'ha';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface TestRun {
  id: string;
  timestamp: string;
  result: 'success' | 'error';
  message: string;
}

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [yamlPreview, setYamlPreview] = useState('');
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mock entities data
  useEffect(() => {
    const mockEntities: Entity[] = [
      { id: 'light.living_room', name: 'Living Room Light', state: 'off', attributes: {}, domain: 'light' },
      { id: 'switch.kitchen_outlet', name: 'Kitchen Outlet', state: 'on', attributes: {}, domain: 'switch' },
      { id: 'binary_sensor.motion_sensor', name: 'Motion Sensor', state: 'off', attributes: {}, domain: 'binary_sensor' },
      { id: 'sensor.temperature', name: 'Temperature Sensor', state: '22.5', attributes: { unit: '°C' }, domain: 'sensor' }
    ];
    setEntities(mockEntities);
  }, []);

  // Load automations from API
  const loadAutomations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/automations');
      if (!response.ok) throw new Error('Failed to load automations');
      
      const data = await response.json();
      setAutomations(data);
      
      if (data.length > 0 && !selectedAutomation) {
        loadAutomationDetails(data[0].id);
      }
    } catch (error) {
      console.error('Error loading automations:', error);
      toast.error('Failed to load automations');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAutomation]);

  // Load detailed automation data with triggers, conditions, actions
  const loadAutomationDetails = useCallback(async (automationId: number) => {
    try {
      const response = await fetch(`/api/automations/${automationId}`);
      if (!response.ok) throw new Error('Failed to load automation details');
      
      const data = await response.json();
      setSelectedAutomation(data);
      
      // Update the automation in the list as well
      setAutomations(prev => prev.map(a => a.id === automationId ? data : a));
    } catch (error) {
      console.error('Error loading automation details:', error);
      toast.error('Failed to load automation details');
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const createAutomation = useCallback(async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Automation',
          enabled: true,
          source: 'local'
        })
      });
      
      if (!response.ok) throw new Error('Failed to create automation');
      
      const newAutomation = await response.json();
      setAutomations(prev => [...prev, newAutomation]);
      setSelectedAutomation({ ...newAutomation, triggers: [], conditions: [], actions: [] });
      toast.success('Automation created successfully');
    } catch (error) {
      console.error('Error creating automation:', error);
      toast.error('Failed to create automation');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const addTrigger = useCallback(async () => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'entity_state'
        })
      });
      
      if (!response.ok) throw new Error('Failed to add trigger');
      
      const newTrigger = await response.json();
      const updated = {
        ...selectedAutomation,
        triggers: [...(selectedAutomation.triggers || []), newTrigger]
      };
      
      setSelectedAutomation(updated);
      setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success('Trigger added successfully');
    } catch (error) {
      console.error('Error adding trigger:', error);
      toast.error('Failed to add trigger');
    }
  }, [selectedAutomation]);

  const addCondition = useCallback(async () => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'entity_state',
          operator: 'equals',
          value: 'on'
        })
      });
      
      if (!response.ok) throw new Error('Failed to add condition');
      
      const newCondition = await response.json();
      const updated = {
        ...selectedAutomation,
        conditions: [...(selectedAutomation.conditions || []), newCondition]
      };
      
      setSelectedAutomation(updated);
      setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success('Condition added successfully');
    } catch (error) {
      console.error('Error adding condition:', error);
      toast.error('Failed to add condition');
    }
  }, [selectedAutomation]);

  const addAction = useCallback(async () => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'service_call',
          service: 'light.turn_on',
          entityId: 'light.living_room'
        })
      });
      
      if (!response.ok) throw new Error('Failed to add action');
      
      const newAction = await response.json();
      const updated = {
        ...selectedAutomation,
        actions: [...(selectedAutomation.actions || []), newAction]
      };
      
      setSelectedAutomation(updated);
      setAutomations(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success('Action added successfully');
    } catch (error) {
      console.error('Error adding action:', error);
      toast.error('Failed to add action');
    }
  }, [selectedAutomation]);

  const toggleAutomation = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Failed to toggle automation');
      
      const { automation } = await response.json();
      
      setAutomations(prev => prev.map(a => 
        a.id === id ? { ...a, enabled: automation.enabled } : a
      ));
      
      if (selectedAutomation?.id === id) {
        setSelectedAutomation(prev => prev ? { ...prev, enabled: automation.enabled } : null);
      }
      
      toast.success(`Automation ${automation.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast.error('Failed to toggle automation');
    }
  }, [selectedAutomation]);

  const duplicateAutomation = useCallback(async (automation: Automation) => {
    try {
      const response = await fetch(`/api/automations/${automation.id}/duplicate`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to duplicate automation');
      
      const duplicate = await response.json();
      setAutomations(prev => [...prev, duplicate]);
      toast.success('Automation duplicated successfully');
    } catch (error) {
      console.error('Error duplicating automation:', error);
      toast.error('Failed to duplicate automation');
    }
  }, []);

  const deleteAutomation = useCallback(async (id: number) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete automation');
      
      setAutomations(prev => prev.filter(a => a.id !== id));
      
      if (selectedAutomation?.id === id) {
        setSelectedAutomation(null);
      }
      
      toast.success('Automation deleted successfully');
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedAutomation]);

  const testRun = useCallback(async () => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/test`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to test automation');
      
      const result = await response.json();
      
      const newTestRun: TestRun = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        result: result.status === 'success' ? 'success' : 'error',
        message: `${result.summary.successfulActions}/${result.summary.totalActions} actions executed successfully`
      };
      
      setTestRuns(prev => [newTestRun, ...prev.slice(0, 9)]);
      toast(newTestRun.result === 'success' ? 'Test successful' : 'Test completed with issues', {
        description: newTestRun.message
      });
    } catch (error) {
      console.error('Error testing automation:', error);
      toast.error('Failed to test automation');
    }
  }, [selectedAutomation]);

  const saveAutomation = useCallback(async (destination: 'local' | 'ha') => {
    if (!selectedAutomation) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(`/api/automations/${selectedAutomation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: destination
        })
      });
      
      if (!response.ok) throw new Error('Failed to save automation');
      
      const updated = await response.json();
      setSelectedAutomation(prev => prev ? { ...prev, source: updated.source } : null);
      setAutomations(prev => prev.map(a => a.id === updated.id ? { ...a, source: updated.source } : a));
      
      toast.success(`Automation saved ${destination === 'ha' ? 'to Home Assistant' : 'locally'}`);
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error('Failed to save automation');
    } finally {
      setIsSaving(false);
    }
  }, [selectedAutomation]);

  // Update trigger
  const updateTrigger = useCallback(async (triggerId: number, updates: Partial<Trigger>) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/triggers/${triggerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update trigger');
      
      const updatedTrigger = await response.json();
      const updatedAutomation = {
        ...selectedAutomation,
        triggers: selectedAutomation.triggers?.map(t => t.id === triggerId ? updatedTrigger : t) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
    } catch (error) {
      console.error('Error updating trigger:', error);
      toast.error('Failed to update trigger');
    }
  }, [selectedAutomation]);

  // Delete trigger
  const deleteTrigger = useCallback(async (triggerId: number) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/triggers/${triggerId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete trigger');
      
      const updatedAutomation = {
        ...selectedAutomation,
        triggers: selectedAutomation.triggers?.filter(t => t.id !== triggerId) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
      toast.success('Trigger deleted successfully');
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Failed to delete trigger');
    }
  }, [selectedAutomation]);

  // Update condition
  const updateCondition = useCallback(async (conditionId: number, updates: Partial<Condition>) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/conditions/${conditionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update condition');
      
      const updatedCondition = await response.json();
      const updatedAutomation = {
        ...selectedAutomation,
        conditions: selectedAutomation.conditions?.map(c => c.id === conditionId ? updatedCondition : c) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
    } catch (error) {
      console.error('Error updating condition:', error);
      toast.error('Failed to update condition');
    }
  }, [selectedAutomation]);

  // Delete condition
  const deleteCondition = useCallback(async (conditionId: number) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/conditions/${conditionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete condition');
      
      const updatedAutomation = {
        ...selectedAutomation,
        conditions: selectedAutomation.conditions?.filter(c => c.id !== conditionId) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
      toast.success('Condition deleted successfully');
    } catch (error) {
      console.error('Error deleting condition:', error);
      toast.error('Failed to delete condition');
    }
  }, [selectedAutomation]);

  // Update action
  const updateAction = useCallback(async (actionId: number, updates: Partial<Action>) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update action');
      
      const updatedAction = await response.json();
      const updatedAutomation = {
        ...selectedAutomation,
        actions: selectedAutomation.actions?.map(a => a.id === actionId ? updatedAction : a) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Failed to update action');
    }
  }, [selectedAutomation]);

  // Delete action
  const deleteAction = useCallback(async (actionId: number) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}/actions/${actionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete action');
      
      const updatedAutomation = {
        ...selectedAutomation,
        actions: selectedAutomation.actions?.filter(a => a.id !== actionId) || []
      };
      
      setSelectedAutomation(updatedAutomation);
      setAutomations(prev => prev.map(a => a.id === updatedAutomation.id ? updatedAutomation : a));
      toast.success('Action deleted successfully');
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Failed to delete action');
    }
  }, [selectedAutomation]);

  // Generate YAML preview
  useEffect(() => {
    if (!selectedAutomation) {
      setYamlPreview('');
      return;
    }

    const yaml = `alias: ${selectedAutomation.name}
description: ${selectedAutomation.description || ''}
trigger:${(selectedAutomation.triggers || []).map(t => `
  - platform: ${t.type === 'entity_state' ? 'state' : t.type}${t.entityId ? `
    entity_id: ${t.entityId}` : ''}${t.state ? `
    to: "${t.state}"` : ''}${t.time ? `
    at: "${t.time}"` : ''}`).join('')}
condition:${(selectedAutomation.conditions || []).map(c => `
  - condition: ${c.type}${c.entityId ? `
    entity_id: ${c.entityId}` : ''}${c.operator && c.value ? `
    ${c.operator}: ${c.value}` : ''}`).join('')}
action:${(selectedAutomation.actions || []).map(a => `
  - service: ${a.service || 'unknown'}${a.entityId ? `
    target:
      entity_id: ${a.entityId}` : ''}${a.data ? `
    data: ${JSON.stringify(a.data)}` : ''}`).join('')}
mode: single`;

    setYamlPreview(yaml);
  }, [selectedAutomation]);

  const updateAutomationName = useCallback(async (name: string) => {
    if (!selectedAutomation) return;
    
    try {
      const response = await fetch(`/api/automations/${selectedAutomation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) throw new Error('Failed to update automation name');
      
      const updated = await response.json();
      setSelectedAutomation(prev => prev ? { ...prev, name: updated.name } : null);
      setAutomations(prev => prev.map(a => a.id === updated.id ? { ...a, name: updated.name } : a));
    } catch (error) {
      console.error('Error updating automation name:', error);
      toast.error('Failed to update automation name');
    }
  }, [selectedAutomation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading automations...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Automation List */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Automations
            </h2>
            <Button onClick={createAutomation} size="sm" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'New'}
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {automations.map((automation) => (
              <Card 
                key={automation.id}
                className={`mb-2 cursor-pointer transition-colors ${
                  selectedAutomation?.id === automation.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => loadAutomationDetails(automation.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm truncate">{automation.name}</h3>
                    <Switch
                      checked={automation.enabled}
                      onCheckedChange={() => toggleAutomation(automation.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={automation.source === 'ha' ? 'default' : 'secondary'} className="text-xs">
                      {automation.source === 'ha' ? 'HA' : 'Local'}
                    </Badge>
                    {automation.lastRun && (
                      <span className="text-xs text-muted-foreground">
                        Last: {new Date(automation.lastRun).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Component className="h-3 w-3" />
                      {automation.triggers?.length || 0}T
                      <span className="mx-1">•</span>
                      {automation.conditions?.length || 0}C
                      <span className="mx-1">•</span>
                      {automation.actions?.length || 0}A
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateAutomation(automation);
                        }}
                      >
                        <Redo className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAutomation(automation.id);
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Center Panel - Automation Builder */}
      <div className="flex-1 flex flex-col">
        {selectedAutomation ? (
          <>
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between mb-3">
                <Input
                  value={selectedAutomation.name}
                  onChange={(e) => updateAutomationName(e.target.value)}
                  className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
                />
                <div className="flex gap-2">
                  <Dialog open={isAdvancedModalOpen} onOpenChange={setIsAdvancedModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Construction className="h-4 w-4 mr-2" />
                        Advanced
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Advanced Options</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={selectedAutomation.description || ''}
                            onChange={(e) => {
                              const updated = { ...selectedAutomation, description: e.target.value };
                              setSelectedAutomation(updated);
                            }}
                            placeholder="Describe what this automation does..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="tags">Tags (comma-separated)</Label>
                          <Input
                            id="tags"
                            value={selectedAutomation.tags?.join(', ') || ''}
                            onChange={(e) => {
                              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                              const updated = { ...selectedAutomation, tags };
                              setSelectedAutomation(updated);
                            }}
                            placeholder="security, lighting, morning"
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={() => saveAutomation('local')} variant="outline" size="sm" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Local
                  </Button>
                  <Button onClick={() => saveAutomation('ha')} size="sm" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Push to HA
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={selectedAutomation.source === 'ha' ? 'default' : 'secondary'}>
                  {selectedAutomation.source === 'ha' ? 'Home Assistant' : 'Local'}
                </Badge>
                {selectedAutomation.enabled ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 max-w-4xl">
                {/* Triggers Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <HousePlug className="h-4 w-4" />
                      Triggers
                    </h3>
                    <Button onClick={addTrigger} variant="outline" size="sm">
                      Add Trigger
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {(selectedAutomation.triggers || []).map((trigger, index) => (
                      <Card key={trigger.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium">Trigger #{index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTrigger(trigger.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Trigger Type</Label>
                              <Select value={trigger.type} onValueChange={(value) => {
                                updateTrigger(trigger.id, { type: value as Trigger['type'] });
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entity_state">Entity State</SelectItem>
                                  <SelectItem value="time">Time</SelectItem>
                                  <SelectItem value="sunrise_sunset">Sunrise/Sunset</SelectItem>
                                  <SelectItem value="mqtt">MQTT Message</SelectItem>
                                  <SelectItem value="zwave">Z-Wave Event</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {trigger.type === 'entity_state' && (
                              <>
                                <div>
                                  <Label>Entity</Label>
                                  <EntityAutocomplete
                                    value={trigger.entityId || ''}
                                    onEntitySelect={(entityId) => {
                                      updateTrigger(trigger.id, { entityId });
                                    }}
                                    placeholder="Type to search entities..."
                                    className="w-full"
                                  />
                                </div>
                                <div>
                                  <Label>Target State</Label>
                                  <Input
                                    value={trigger.state || ''}
                                    onChange={(e) => {
                                      updateTrigger(trigger.id, { state: e.target.value });
                                    }}
                                    placeholder="on, off, etc."
                                  />
                                </div>
                              </>
                            )}
                            
                            {trigger.type === 'time' && (
                              <div>
                                <Label>Time</Label>
                                <Input
                                  type="time"
                                  value={trigger.time || ''}
                                  onChange={(e) => {
                                    updateTrigger(trigger.id, { time: e.target.value });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(selectedAutomation.triggers || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <HousePlug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No triggers configured</p>
                        <p className="text-sm">Add a trigger to get started</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Conditions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <LayoutPanelLeft className="h-4 w-4" />
                      Conditions
                    </h3>
                    <Button onClick={addCondition} variant="outline" size="sm">
                      Add Condition
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {(selectedAutomation.conditions || []).map((condition, index) => (
                      <Card key={condition.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium">Condition #{index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCondition(condition.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Condition Type</Label>
                              <Select value={condition.type} onValueChange={(value) => {
                                updateCondition(condition.id, { type: value as Condition['type'] });
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entity_state">Entity State</SelectItem>
                                  <SelectItem value="numeric">Numeric</SelectItem>
                                  <SelectItem value="time">Time Range</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Entity</Label>
                              <EntityAutocomplete
                                value={condition.entityId || ''}
                                onEntitySelect={(entityId) => {
                                  updateCondition(condition.id, { entityId });
                                }}
                                placeholder="Type to search entities..."
                                className="w-full"
                              />
                            </div>
                            
                            <div>
                              <Label>Operator</Label>
                              <Select value={condition.operator} onValueChange={(value) => {
                                updateCondition(condition.id, { operator: value as Condition['operator'] });
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="not_equals">Not Equals</SelectItem>
                                  <SelectItem value="greater">Greater Than</SelectItem>
                                  <SelectItem value="less">Less Than</SelectItem>
                                  <SelectItem value="greater_equal">Greater or Equal</SelectItem>
                                  <SelectItem value="less_equal">Less or Equal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Value</Label>
                              <Input
                                value={condition.value?.toString() || ''}
                                onChange={(e) => {
                                  updateCondition(condition.id, { value: e.target.value });
                                }}
                                placeholder="Value to compare"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(selectedAutomation.conditions || []).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <LayoutPanelLeft className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conditions (automation will always run when triggered)</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Lamp className="h-4 w-4" />
                      Actions
                    </h3>
                    <Button onClick={addAction} variant="outline" size="sm">
                      Add Action
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {(selectedAutomation.actions || []).map((action, index) => (
                      <Card key={action.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium">Action #{index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAction(action.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Action Type</Label>
                              <Select value={action.type} onValueChange={(value) => {
                                updateAction(action.id, { type: value as Action['type'] });
                              }}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="service_call">Service Call</SelectItem>
                                  <SelectItem value="mqtt">MQTT Message</SelectItem>
                                  <SelectItem value="scene">Run Scene</SelectItem>
                                  <SelectItem value="local_device">Local Device</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {action.type === 'service_call' && (
                              <>
                                <div>
                                  <Label>Service</Label>
                                  <Select value={action.service} onValueChange={(value) => {
                                    updateAction(action.id, { service: value });
                                  }}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select service" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="light.turn_on">light.turn_on</SelectItem>
                                      <SelectItem value="light.turn_off">light.turn_off</SelectItem>
                                      <SelectItem value="switch.toggle">switch.toggle</SelectItem>
                                      <SelectItem value="notify.mobile_app">notify.mobile_app</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label>Target Entity</Label>
                                  <EntityAutocomplete
                                    value={action.entityId || ''}
                                    onEntitySelect={(entityId) => {
                                      updateAction(action.id, { entityId });
                                    }}
                                    placeholder="Type to search entities..."
                                    domain={action.service?.split('.')[0]} // Filter by service domain (e.g., 'light' for 'light.turn_on')
                                    className="w-full"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(selectedAutomation.actions || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lamp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No actions configured</p>
                        <p className="text-sm">Add an action to complete the automation</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Automation Selected</h3>
              <p className="text-sm">Select an automation from the list or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Preview & Test */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold mb-3">Preview & Test</h3>
          <Button 
            onClick={testRun} 
            disabled={!selectedAutomation}
            className="w-full mb-3"
          >
            <ToggleRight className="h-4 w-4 mr-2" />
            Test Run
          </Button>
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 border-b">
            <div className="p-3 border-b">
              <h4 className="text-xs font-medium text-muted-foreground">YAML Preview</h4>
            </div>
            <ScrollArea className="h-64">
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                {yamlPreview || 'No automation selected'}
              </pre>
            </ScrollArea>
          </div>
          
          <div className="flex-1">
            <div className="p-3 border-b">
              <h4 className="text-xs font-medium text-muted-foreground">Test Results</h4>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {testRuns.map((run) => (
                  <div key={run.id} className="mb-2 p-2 rounded border">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={run.result === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {run.result}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{run.timestamp}</span>
                    </div>
                    <p className="text-xs">{run.message}</p>
                  </div>
                ))}
                
                {testRuns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Container className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No test runs yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}