"use client";

import { useState, useActionState } from "react";
import {
  Truck,
  HardDrive,
  Receipt,
  Percent,
  Settings,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  updateCollectionPolicy,
  updateTransportPolicy,
  updateDataServicesPolicy,
  updateRebateSettings,
  updateTaxSettings,
  updateFreeCollectionEligibility,
  type CommercialActionState,
} from "../commercial-actions";
import type { OrganizationCommercialSettings, FreeCollectionRule } from "@/lib/commercial-types";

interface CommercialFormProps {
  settings: OrganizationCommercialSettings;
}

export function CommercialForm({ settings }: CommercialFormProps) {
  const [activeSection, setActiveSection] = useState<string | null>("collection");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          backgroundColor: "#f0fdfa",
          border: "1px solid #99f6e4",
          borderRadius: "0.5rem",
          padding: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0d9488" }}>
          <CheckCircle className="w-5 h-5" />
          <span style={{ fontWeight: "600" }}>Free-First ITAD Model</span>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#0f766e", marginTop: "0.5rem" }}>
          RecyTrack is configured for a free-first ITAD model. Collections on scheduled routes are
          free by default. Configure policies below to define when charges apply.
        </p>
      </div>

      {/* Collection Policy */}
      <CollapsibleSection
        title="Collection Policy"
        icon={<Receipt className="w-5 h-5" />}
        isOpen={activeSection === "collection"}
        onToggle={() => setActiveSection(activeSection === "collection" ? null : "collection")}
      >
        <CollectionPolicyForm settings={settings} />
      </CollapsibleSection>

      {/* Transport Policy */}
      <CollapsibleSection
        title="Transport Policy"
        icon={<Truck className="w-5 h-5" />}
        isOpen={activeSection === "transport"}
        onToggle={() => setActiveSection(activeSection === "transport" ? null : "transport")}
      >
        <TransportPolicyForm settings={settings} />
      </CollapsibleSection>

      {/* Data Services Policy */}
      <CollapsibleSection
        title="Data Services Policy"
        icon={<HardDrive className="w-5 h-5" />}
        isOpen={activeSection === "dataServices"}
        onToggle={() => setActiveSection(activeSection === "dataServices" ? null : "dataServices")}
      >
        <DataServicesPolicyForm settings={settings} />
      </CollapsibleSection>

      {/* Free Collection Rules */}
      <CollapsibleSection
        title="Free Collection Eligibility"
        icon={<CheckCircle className="w-5 h-5" />}
        isOpen={activeSection === "freeEligibility"}
        onToggle={() => setActiveSection(activeSection === "freeEligibility" ? null : "freeEligibility")}
      >
        <FreeEligibilityForm settings={settings} />
      </CollapsibleSection>

      {/* Rebate Settings */}
      <CollapsibleSection
        title="Rebate Settings"
        icon={<Percent className="w-5 h-5" />}
        isOpen={activeSection === "rebates"}
        onToggle={() => setActiveSection(activeSection === "rebates" ? null : "rebates")}
      >
        <RebateSettingsForm settings={settings} />
      </CollapsibleSection>

      {/* Tax Settings */}
      <CollapsibleSection
        title="Tax Settings"
        icon={<Settings className="w-5 h-5" />}
        isOpen={activeSection === "tax"}
        onToggle={() => setActiveSection(activeSection === "tax" ? null : "tax")}
      >
        <TaxSettingsForm settings={settings} />
      </CollapsibleSection>
    </div>
  );
}

// ============================================
// COLLAPSIBLE SECTION
// ============================================

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "0.5rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          backgroundColor: isOpen ? "#f8fafc" : "white",
          border: "none",
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#0d9488" }}>{icon}</span>
          <span style={{ fontWeight: "600", color: "#0f172a" }}>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {isOpen && <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0" }}>{children}</div>}
    </div>
  );
}

// ============================================
// COLLECTION POLICY FORM
// ============================================

function CollectionPolicyForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateCollectionPolicy,
    {}
  );

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Collection policy updated successfully
        </div>
      )}

      <div className="field wide">
        <label htmlFor="defaultChargeType">Default Collection Charge</label>
        <select
          id="defaultChargeType"
          name="defaultChargeType"
          defaultValue={settings.defaultCollectionPolicy?.defaultChargeType || "CONDITIONAL"}
        >
          <option value="FREE">Always Free</option>
          <option value="CONDITIONAL">Conditionally Free (based on eligibility rules)</option>
          <option value="FIXED">Fixed Charge</option>
          <option value="QUOTED">Quote Required</option>
        </select>
        <small>How collections are charged by default</small>
      </div>

      <div className="field">
        <label htmlFor="fixedCharge">Fixed Charge (pence)</label>
        <input
          type="number"
          id="fixedCharge"
          name="fixedCharge"
          defaultValue={settings.defaultCollectionPolicy?.fixedCharge || 0}
          min={0}
          step={1}
        />
        <small>Applied when charge type is Fixed</small>
      </div>

      <div className="field">
        <label htmlFor="minimumCharge">Minimum Charge (pence)</label>
        <input
          type="number"
          id="minimumCharge"
          name="minimumCharge"
          defaultValue={settings.defaultCollectionPolicy?.minimumCharge || 0}
          min={0}
          step={1}
        />
        <small>Minimum charge for any collection</small>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Collection Policy"}
        </button>
      </div>
    </form>
  );
}

// ============================================
// TRANSPORT POLICY FORM
// ============================================

function TransportPolicyForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateTransportPolicy,
    {}
  );

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Transport policy updated successfully
        </div>
      )}

      <div className="field">
        <label htmlFor="scheduledRouteCharge">Scheduled Route Transport</label>
        <select
          id="scheduledRouteCharge"
          name="scheduledRouteCharge"
          defaultValue={settings.defaultTransportPolicy?.scheduledRouteCharge || "FREE"}
        >
          <option value="FREE">Free</option>
          <option value="FIXED">Fixed Charge</option>
          <option value="DISTANCE">Distance-Based</option>
        </select>
        <small>Pricing for collections on scheduled routes</small>
      </div>

      <div className="field">
        <label htmlFor="dedicatedCollectionCharge">Dedicated Collection Transport</label>
        <select
          id="dedicatedCollectionCharge"
          name="dedicatedCollectionCharge"
          defaultValue={settings.defaultTransportPolicy?.dedicatedCollectionCharge || "QUOTED"}
        >
          <option value="FIXED">Fixed Charge</option>
          <option value="DISTANCE">Distance-Based</option>
          <option value="QUOTED">Quote Required</option>
        </select>
        <small>Pricing for ad-hoc/dedicated collections</small>
      </div>

      <div className="field">
        <label htmlFor="fixedRouteCharge">Fixed Route Charge (pence)</label>
        <input
          type="number"
          id="fixedRouteCharge"
          name="fixedRouteCharge"
          defaultValue={settings.defaultTransportPolicy?.fixedRouteCharge || 0}
          min={0}
          step={1}
        />
      </div>

      <div className="field">
        <label htmlFor="dedicatedBaseCharge">Dedicated Base Charge (pence)</label>
        <input
          type="number"
          id="dedicatedBaseCharge"
          name="dedicatedBaseCharge"
          defaultValue={settings.defaultTransportPolicy?.dedicatedBaseCharge || 0}
          min={0}
          step={1}
        />
      </div>

      <div className="field">
        <label htmlFor="perMileRate">Per-Mile Rate (pence)</label>
        <input
          type="number"
          id="perMileRate"
          name="perMileRate"
          defaultValue={settings.defaultTransportPolicy?.perMileRate || 0}
          min={0}
          step={1}
        />
      </div>

      <div className="field">
        <label htmlFor="freeRadiusMiles">Free Radius (miles)</label>
        <input
          type="number"
          id="freeRadiusMiles"
          name="freeRadiusMiles"
          defaultValue={settings.defaultTransportPolicy?.freeRadiusMiles || 0}
          min={0}
          step={1}
        />
        <small>Distance within which transport is free</small>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Transport Policy"}
        </button>
      </div>
    </form>
  );
}

// ============================================
// DATA SERVICES POLICY FORM
// ============================================

function DataServicesPolicyForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateDataServicesPolicy,
    {}
  );

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Data services policy updated successfully
        </div>
      )}

      <div className="field">
        <label htmlFor="standardErasure">Standard Data Erasure</label>
        <select
          id="standardErasure"
          name="standardErasure"
          defaultValue={settings.defaultDataServicesPolicy?.standardErasure || "FREE"}
        >
          <option value="FREE">Free</option>
          <option value="INCLUDED">Included in Collection</option>
          <option value="PER_ITEM">Per Item Charge</option>
          <option value="QUOTED">Quote Required</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="standardErasureRate">Standard Erasure Rate (pence/item)</label>
        <input
          type="number"
          id="standardErasureRate"
          name="standardErasureRate"
          defaultValue={settings.defaultDataServicesPolicy?.standardErasureRate || 0}
          min={0}
          step={1}
        />
      </div>

      <div className="field">
        <label htmlFor="certifiedErasure">Certified Data Erasure</label>
        <select
          id="certifiedErasure"
          name="certifiedErasure"
          defaultValue={settings.defaultDataServicesPolicy?.certifiedErasure || "PER_ITEM"}
        >
          <option value="FREE">Free</option>
          <option value="INCLUDED">Included in Collection</option>
          <option value="PER_ITEM">Per Item Charge</option>
          <option value="QUOTED">Quote Required</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="certifiedErasureRate">Certified Erasure Rate (pence/item)</label>
        <input
          type="number"
          id="certifiedErasureRate"
          name="certifiedErasureRate"
          defaultValue={settings.defaultDataServicesPolicy?.certifiedErasureRate || 500}
          min={0}
          step={1}
        />
      </div>

      <div className="field">
        <label htmlFor="physicalDestruction">Physical Destruction</label>
        <select
          id="physicalDestruction"
          name="physicalDestruction"
          defaultValue={settings.defaultDataServicesPolicy?.physicalDestruction || "PER_ITEM"}
        >
          <option value="FREE">Free</option>
          <option value="INCLUDED">Included in Collection</option>
          <option value="PER_ITEM">Per Item Charge</option>
          <option value="QUOTED">Quote Required</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="physicalDestructionRate">Destruction Rate (pence/item)</label>
        <input
          type="number"
          id="physicalDestructionRate"
          name="physicalDestructionRate"
          defaultValue={settings.defaultDataServicesPolicy?.physicalDestructionRate || 300}
          min={0}
          step={1}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Data Services Policy"}
        </button>
      </div>
    </form>
  );
}

// ============================================
// FREE ELIGIBILITY FORM
// ============================================

function FreeEligibilityForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateFreeCollectionEligibility,
    {}
  );

  const eligibility = settings.freeCollectionEligibility;
  const [rules, setRules] = useState<FreeCollectionRule[]>(eligibility?.rules || []);
  const [enabled, setEnabled] = useState(eligibility?.enabled ?? true);

  const addRule = () => {
    const newRule: FreeCollectionRule = {
      id: `rule-${Date.now()}`,
      name: "New Rule",
      enabled: true,
      priority: rules.length + 1,
      conditions: {},
      outcome: {
        collectionFree: true,
        transportFree: true,
        standardErasureFree: true,
      },
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index: number, updates: Partial<FreeCollectionRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      <input type="hidden" name="enabled" value={enabled.toString()} />
      <input type="hidden" name="evaluationMode" value={eligibility?.evaluationMode || "ANY"} />
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />

      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Free collection eligibility updated successfully
        </div>
      )}

      <div className="field wide">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: "auto" }}
          />
          Enable free collection eligibility rules
        </label>
        <small>When enabled, collections matching any rule below will be free</small>
      </div>

      {enabled && (
        <>
          <div className="field wide">
            <label>Eligibility Rules</label>
            {rules.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.5rem",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                No rules configured. Add a rule to define free collection criteria.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {rules.map((rule, index) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates) => updateRule(index, updates)}
                    onRemove={() => removeRule(index)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="field wide">
            <button
              type="button"
              onClick={addRule}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "0.375rem",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Eligibility Settings"}
        </button>
      </div>
    </form>
  );
}

function RuleCard({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: FreeCollectionRule;
  onUpdate: (updates: Partial<FreeCollectionRule>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "0.5rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem",
          backgroundColor: rule.enabled ? "#f0fdf4" : "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            style={{ width: "auto" }}
          />
          <input
            type="text"
            value={rule.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            style={{
              border: "none",
              backgroundColor: "transparent",
              fontWeight: "500",
              padding: "0.25rem",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "0.25rem",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            style={{
              padding: "0.25rem",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", color: "#64748b" }}>
                Min Items
              </label>
              <input
                type="number"
                value={rule.conditions.minItemCount || ""}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...rule.conditions,
                      minItemCount: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                min={0}
                style={{ width: "100%", padding: "0.375rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", color: "#64748b" }}>
                Max Distance (miles)
              </label>
              <input
                type="number"
                value={rule.conditions.maxDistanceMiles || ""}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...rule.conditions,
                      maxDistanceMiles: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                min={0}
                style={{ width: "100%", padding: "0.375rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", color: "#64748b" }}>
                Min Estimated Value (pence)
              </label>
              <input
                type="number"
                value={rule.conditions.minEstimatedValue || ""}
                onChange={(e) =>
                  onUpdate({
                    conditions: {
                      ...rule.conditions,
                      minEstimatedValue: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                min={0}
                style={{ width: "100%", padding: "0.375rem" }}
              />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", color: "#64748b" }}>
                <input
                  type="checkbox"
                  checked={rule.conditions.withinScheduledRoute || false}
                  onChange={(e) =>
                    onUpdate({
                      conditions: {
                        ...rule.conditions,
                        withinScheduledRoute: e.target.checked,
                      },
                    })
                  }
                  style={{ width: "auto" }}
                />
                Scheduled Route Only
              </label>
            </div>
          </div>

          <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "#64748b", fontSize: "0.875rem" }}>
              Services Free When Rule Matches
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.875rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={rule.outcome.collectionFree}
                  onChange={(e) =>
                    onUpdate({ outcome: { ...rule.outcome, collectionFree: e.target.checked } })
                  }
                  style={{ width: "auto" }}
                />
                Collection
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={rule.outcome.transportFree}
                  onChange={(e) =>
                    onUpdate({ outcome: { ...rule.outcome, transportFree: e.target.checked } })
                  }
                  style={{ width: "auto" }}
                />
                Transport
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={rule.outcome.standardErasureFree}
                  onChange={(e) =>
                    onUpdate({ outcome: { ...rule.outcome, standardErasureFree: e.target.checked } })
                  }
                  style={{ width: "auto" }}
                />
                Standard Erasure
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// REBATE SETTINGS FORM
// ============================================

function RebateSettingsForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateRebateSettings,
    {}
  );

  const rebateSettings = settings.rebateSettings;

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Rebate settings updated successfully
        </div>
      )}

      <div className="field wide">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={rebateSettings?.enabled || false}
            style={{ width: "auto" }}
          />
          Enable customer rebates
        </label>
        <small>Pay customers a percentage of asset resale value</small>
      </div>

      <div className="field">
        <label htmlFor="defaultRebatePercentage">Default Rebate Percentage</label>
        <input
          type="number"
          id="defaultRebatePercentage"
          name="defaultRebatePercentage"
          defaultValue={rebateSettings?.defaultRebatePercentage || 0}
          min={0}
          max={100}
          step={0.1}
        />
      </div>

      <div className="field">
        <label htmlFor="minimumRebateThreshold">Minimum Threshold (pence)</label>
        <input
          type="number"
          id="minimumRebateThreshold"
          name="minimumRebateThreshold"
          defaultValue={rebateSettings?.minimumRebateThreshold || 0}
          min={0}
          step={1}
        />
        <small>Minimum asset value before rebate applies</small>
      </div>

      <div className="field">
        <label htmlFor="minimumPayoutAmount">Minimum Payout (pence)</label>
        <input
          type="number"
          id="minimumPayoutAmount"
          name="minimumPayoutAmount"
          defaultValue={rebateSettings?.minimumPayoutAmount || 0}
          min={0}
          step={1}
        />
        <small>Minimum rebate amount to pay out</small>
      </div>

      <div className="field">
        <label htmlFor="calculationFrequency">Calculation Frequency</label>
        <select
          id="calculationFrequency"
          name="calculationFrequency"
          defaultValue={rebateSettings?.calculationFrequency || "MONTHLY"}
        >
          <option value="PER_COLLECTION">Per Collection</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Rebate Settings"}
        </button>
      </div>
    </form>
  );
}

// ============================================
// TAX SETTINGS FORM
// ============================================

function TaxSettingsForm({ settings }: { settings: OrganizationCommercialSettings }) {
  const [state, formAction, isPending] = useActionState<CommercialActionState, FormData>(
    updateTaxSettings,
    {}
  );

  const taxSettings = settings.taxSettings;

  return (
    <form action={formAction} className="form" style={{ maxWidth: "100%" }}>
      {state.error && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c", fontSize: "0.875rem" }}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="wide" style={{ padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.375rem", color: "#166534", fontSize: "0.875rem" }}>
          Tax settings updated successfully
        </div>
      )}

      <div className="field wide">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name="taxRegistered"
            defaultChecked={taxSettings?.taxRegistered ?? true}
            style={{ width: "auto" }}
          />
          VAT Registered
        </label>
      </div>

      <div className="field">
        <label htmlFor="defaultTaxRate">Default VAT Rate (%)</label>
        <input
          type="number"
          id="defaultTaxRate"
          name="defaultTaxRate"
          defaultValue={taxSettings?.defaultTaxRate || 20}
          min={0}
          max={100}
          step={0.1}
        />
      </div>

      <div className="field">
        <label htmlFor="taxRegistrationNumber">VAT Number</label>
        <input
          type="text"
          id="taxRegistrationNumber"
          name="taxRegistrationNumber"
          defaultValue={taxSettings?.taxRegistrationNumber || ""}
          placeholder="GB123456789"
        />
      </div>

      <div className="field wide">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            name="showTaxInclusivePrices"
            defaultChecked={taxSettings?.showTaxInclusivePrices || false}
            style={{ width: "auto" }}
          />
          Show tax-inclusive prices to customers
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn" disabled={isPending}>
          {isPending ? "Saving..." : "Save Tax Settings"}
        </button>
      </div>
    </form>
  );
}
