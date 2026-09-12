'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { AutomationStudio } from '@/components/automation-studio';
import { DataDrivenStudio } from '@/components/data-driven-studio';
import { PluginStudio } from '@/components/plugin-studio';
import type { FilterPluginManifest } from '@/lib/filter-plugin';
import type { PluginExporter } from '@/lib/plugin-platform';
import {
  runSuiteSelfTest,
  suiteFeatures,
  type SuiteFeature,
  type SuiteOptions,
} from '@/lib/pro-suite';
import {
  createEditRecipe,
  parseEditRecipe,
  planLocalEdit,
  resolveRecipeFeature,
  type EditRecipeStep,
} from '@/lib/edit-recipe';
import type { ActionStep, AutomationContext } from '@/lib/automation';

export function ProSuiteDialog({
  open,
  onClose,
  onRun,
  automationContext,
  onApplyPluginFilter,
  onPluginExport,
}: {
  open: boolean;
  onClose: () => void;
  onRun: (feature: SuiteFeature, options: SuiteOptions) => Promise<void> | void;
  automationContext: AutomationContext;
  onApplyPluginFilter: (
    manifest: FilterPluginManifest,
    amount: number,
  ) => Promise<boolean> | boolean;
  onPluginExport: (exporter: PluginExporter) => Promise<void> | void;
}) {
  const groups = [...new Set(suiteFeatures.map((x) => x.group))];
  const [amount, setAmount] = useState(50),
    [secondary, setSecondary] = useState(40),
    [color, setColor] = useState('#6d8cff'),
    [text, setText] = useState('LibreLayer'),
    [report, setReport] = useState(''),
    [plannedSteps, setPlannedSteps] = useState<EditRecipeStep[]>([]),
    [recordedSteps, setRecordedSteps] = useState<ActionStep[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const options = { amount, secondary, color, text };
  const sliderNumber = (value: number | readonly number[]) =>
    Number(Array.isArray(value) ? value[0] : value);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="pro-suite-dialog"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogTitle>Professional Studio</DialogTitle>
        <DialogDescription>
          Photoshop-familiar browser tools with clear capability levels.
          Functional is dependable for its stated task, Basic is intentionally
          bounded, and Experimental may use a simplified or fallback workflow.
        </DialogDescription>
        <div className="pro-suite-controls">
          <label>
            Amount{' '}
            <Slider
              aria-label="Professional tool amount"
              min={0}
              max={100}
              value={[amount]}
              onValueChange={(v) => setAmount(sliderNumber(v))}
            />
            <strong>{amount}%</strong>
          </label>
          <label>
            Secondary{' '}
            <Slider
              aria-label="Professional tool secondary amount"
              min={0}
              max={100}
              value={[secondary]}
              onValueChange={(v) => setSecondary(sliderNumber(v))}
            />
            <strong>{secondary}%</strong>
          </label>
          <label>
            Working color{' '}
            <input
              aria-label="Professional tool working color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label>
            Prompt / name{' '}
            <input
              aria-label="Professional tool prompt or name"
              value={text}
              maxLength={160}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
        </div>
        <div className="local-edit-plan">
          <div>
            <strong>Local edit planner</strong>
            <span>Your prompt stays on this device.</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const plan = planLocalEdit(text, options);
              setPlannedSteps(plan);
              setReport(
                `Planned ${plan.length} reversible ${plan.length === 1 ? 'step' : 'steps'} locally`,
              );
            }}
          >
            Plan prompt
          </Button>
          <Button
            disabled={!plannedSteps.length}
            onClick={() => {
              plannedSteps.forEach(
                (step) =>
                  void onRun(resolveRecipeFeature(step.command), step.options),
              );
              setRecordedSteps((steps) =>
                [
                  ...steps,
                  ...plannedSteps.map((step) => ({
                    ...step,
                    id: crypto.randomUUID(),
                    enabled: true,
                    condition: 'always' as const,
                    stopOnFailure: true,
                  })),
                ].slice(-100),
              );
              setReport(`${plannedSteps.length} planned steps applied`);
              setPlannedSteps([]);
            }}
          >
            Apply plan
          </Button>
          {plannedSteps.length ? (
            <ol>
              {plannedSteps.map((step) => (
                <li key={step.command}>
                  {resolveRecipeFeature(step.command).label}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <Tabs defaultValue={groups[0]}>
          <TabsList className="pro-suite-tabs">
            {groups.map((g, i) => (
              <TabsTrigger key={g} value={g}>
                {i + 1}. {g}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => (
            <TabsContent key={group} value={group} className="pro-feature-grid">
              {suiteFeatures
                .filter((x) => x.group === group)
                .map((feature) => (
                  <Button
                    key={feature.id}
                    variant="outline"
                    onClick={() => {
                      if (
                        [
                          'actions',
                          'batch',
                          'image-processor',
                          'variables',
                          'scripts-plugins',
                        ].includes(feature.command)
                      ) {
                        document
                          .querySelector(
                            feature.command === 'variables'
                              ? '.data-driven-studio'
                              : feature.command === 'scripts-plugins'
                                ? '.plugin-studio'
                                : '.automation-studio',
                          )
                          ?.scrollIntoView({ block: 'nearest' });
                        setReport(
                          feature.command === 'variables'
                            ? 'Use Variables and datasets below to import records and generate editable document variants.'
                            : feature.command === 'scripts-plugins'
                              ? 'Use Local plug-in studio below to install versioned, permission-gated panels, filters, and exporters.'
                              : feature.command === 'actions'
                                ? 'Use Actions below to edit, save, import, export, and play action sets.'
                                : 'Use Image Processor below to run an action across selected local files.',
                        );
                        return;
                      }
                      void onRun(feature, options);
                      setRecordedSteps((steps) => [
                        ...steps.slice(-99),
                        {
                          id: crypto.randomUUID(),
                          command: feature.command,
                          options: { ...options },
                          enabled: true,
                          condition: 'always',
                          stopOnFailure: true,
                        },
                      ]);
                    }}
                  >
                    <span>{feature.id}</span>
                    {feature.label}
                    <small
                      className="capability-level"
                      data-level={feature.level.toLowerCase()}
                    >
                      {feature.level}
                    </small>
                  </Button>
                ))}
            </TabsContent>
          ))}
        </Tabs>
        <AutomationStudio
          recordedSteps={recordedSteps}
          setRecordedSteps={setRecordedSteps}
          actionName={text}
          setActionName={setText}
          onRun={onRun}
          context={automationContext}
        />
        <DataDrivenStudio options={options} onRun={onRun} />
        <PluginStudio
          onApplyFilter={onApplyPluginFilter}
          onExport={onPluginExport}
        />
        <div className="pro-suite-footer">
          <input
            ref={importRef}
            hidden
            type="file"
            accept=".libreflow,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                if (file.size > 1_000_000)
                  throw Error('Workflow files must be smaller than 1 MB.');
                const recipe = parseEditRecipe(await file.text());
                recipe.steps.forEach(
                  (step) =>
                    void onRun(
                      resolveRecipeFeature(step.command),
                      step.options,
                    ),
                );
                setRecordedSteps(
                  recipe.steps.map((step) => ({
                    ...step,
                    id: crypto.randomUUID(),
                    enabled: true,
                    condition: 'always',
                    stopOnFailure: true,
                  })),
                );
                setReport(
                  `${recipe.steps.length} local workflow steps applied from ${recipe.name}`,
                );
              } catch (error) {
                setReport(
                  error instanceof Error
                    ? error.message
                    : 'The workflow could not be opened.',
                );
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => importRef.current?.click()}
          >
            Open workflow
          </Button>
          <Button
            variant="secondary"
            disabled={!recordedSteps.length}
            onClick={() => {
              try {
                const recipe = createEditRecipe(text, recordedSteps),
                  blob = new Blob([JSON.stringify(recipe, null, 2)], {
                    type: 'application/json',
                  }),
                  url = URL.createObjectURL(blob),
                  link = document.createElement('a');
                link.href = url;
                link.download = `${recipe.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'workflow'}.libreflow`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setReport(
                  `${recordedSteps.length} steps exported as an open local workflow`,
                );
              } catch (error) {
                setReport(
                  error instanceof Error
                    ? error.message
                    : 'The workflow could not be exported.',
                );
              }
            }}
          >
            Export workflow ({recordedSteps.length})
          </Button>
          <Button
            variant="ghost"
            disabled={!recordedSteps.length}
            onClick={() => {
              setRecordedSteps([]);
              setReport('Recorded workflow cleared');
            }}
          >
            Clear
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const result = runSuiteSelfTest();
              setReport(
                result.failures.length
                  ? `${result.passed}/${result.total} checks passed · ${result.failures.join('; ')}`
                  : `${result.passed}/${result.total} feature checks passed`,
              );
            }}
          >
            Run {suiteFeatures.length} feature checks
          </Button>
          {report && <output aria-live="polite">{report}</output>}
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
