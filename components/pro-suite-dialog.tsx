'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  runSuiteSelfTest,
  suiteFeatures,
  type SuiteFeature,
  type SuiteOptions,
} from '@/lib/pro-suite';

export function ProSuiteDialog({
  open,
  onClose,
  onRun,
}: {
  open: boolean;
  onClose: () => void;
  onRun: (feature: SuiteFeature, options: SuiteOptions) => void;
}) {
  const groups = [...new Set(suiteFeatures.map((x) => x.group))];
  const [amount, setAmount] = useState(50),
    [secondary, setSecondary] = useState(40),
    [color, setColor] = useState('#6d8cff'),
    [text, setText] = useState('Pixel Studio'),
    [report, setReport] = useState('');
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
                    onClick={() => onRun(feature, options)}
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
        <div className="pro-suite-footer">
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
            Run 113 feature checks
          </Button>
          {report && <output aria-live="polite">{report}</output>}
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
