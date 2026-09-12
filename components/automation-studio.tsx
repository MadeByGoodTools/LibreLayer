'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  actionExecutionPlan,
  applyPixelAction,
  createActionSet,
  createDroplet,
  normalizeImageProcessorOptions,
  parseActionSet,
  parseDroplet,
  processorOutputName,
  type ActionCondition,
  type ActionSet,
  type ActionStep,
  type AutomationAction,
  type AutomationContext,
  type ImageProcessorOptions,
} from '@/lib/automation';
import { type SuiteFeature, type SuiteOptions } from '@/lib/pro-suite';
import { resolveRecipeFeature as resolveSuiteFeature } from '@/lib/edit-recipe';

const STORAGE_KEY = 'librelayer-action-sets-v1';
const conditionLabels: Record<ActionCondition, string> = {
  always: 'Always',
  'has-selection': 'If selection exists',
  'no-selection': 'If no selection',
  'pixel-layer': 'If pixel layer',
  'text-layer': 'If text layer',
  landscape: 'If landscape',
  portrait: 'If portrait',
  square: 'If square',
};

const download = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const blobFromCanvas = (
  canvas: HTMLCanvasElement,
  options: ImageProcessorOptions,
) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error('The processed image could not be encoded.')),
      `image/${options.format}`,
      options.quality / 100,
    ),
  );

export function AutomationStudio({
  recordedSteps,
  setRecordedSteps,
  actionName,
  setActionName,
  onRun,
  context,
}: {
  recordedSteps: ActionStep[];
  setRecordedSteps: React.Dispatch<React.SetStateAction<ActionStep[]>>;
  actionName: string;
  setActionName: (name: string) => void;
  onRun: (feature: SuiteFeature, options: SuiteOptions) => Promise<void> | void;
  context: AutomationContext;
}) {
  const [sets, setSets] = useState<ActionSet[]>([]),
    [hydrated, setHydrated] = useState(false),
    [selectedSetId, setSelectedSetId] = useState(''),
    [selectedActionId, setSelectedActionId] = useState(''),
    [report, setReport] = useState(''),
    [processor, setProcessor] = useState<ImageProcessorOptions>({
      format: 'png',
      quality: 90,
      maxEdge: 0,
      suffix: '-edited',
    }),
    [processing, setProcessing] = useState(false);
  const importRef = useRef<HTMLInputElement>(null),
    batchRef = useRef<HTMLInputElement>(null),
    cancelled = useRef(false);

  useEffect(() => {
    try {
      const values = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown[];
      const restored = Array.isArray(values)
        ? values.flatMap((value) => {
            try {
              return [parseActionSet(JSON.stringify(value))];
            } catch {
              return [];
            }
          })
        : [];
      setSets(restored);
      setSelectedSetId(restored[0]?.id ?? '');
      setSelectedActionId(restored[0]?.actions[0]?.id ?? '');
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  }, [sets, hydrated]);

  const selectedSet = sets.find((set) => set.id === selectedSetId),
    selectedAction = selectedSet?.actions.find((action) => action.id === selectedActionId),
    draftAction = (): AutomationAction => ({
      id: crypto.randomUUID(),
      name: actionName.trim().slice(0, 120) || 'Untitled action',
      steps: recordedSteps,
    }),
    play = async (action: AutomationAction, executionContext = context) => {
      const plan = actionExecutionPlan(action, executionContext);
      let completed = 0,
        skipped = 0;
      for (const entry of plan) {
        if (!entry.run) {
          skipped++;
          continue;
        }
        try {
          await onRun(resolveSuiteFeature(entry.step.command), entry.step.options);
          completed++;
        } catch (error) {
          if (entry.step.stopOnFailure) throw error;
        }
      }
      setReport(`${action.name}: ${completed} steps applied${skipped ? `, ${skipped} skipped` : ''}`);
    },
    saveDraft = () => {
      if (!recordedSteps.length) return;
      const action = draftAction(),
        set = createActionSet(`${action.name} set`, [action]);
      setSets((current) => [...current, set].slice(-50));
      setSelectedSetId(set.id);
      setSelectedActionId(action.id);
      setReport(`${action.name} saved locally as an editable action set`);
    },
    addDraftToSet = () => {
      if (!selectedSet || !recordedSteps.length || selectedSet.actions.length >= 50) return;
      const action = draftAction();
      setSets((current) =>
        current.map((set) =>
          set.id === selectedSet.id
            ? { ...set, updatedAt: new Date().toISOString(), actions: [...set.actions, action] }
            : set,
        ),
      );
      setSelectedActionId(action.id);
      setReport(`${action.name} added to ${selectedSet.name}`);
    },
    editSaved = () => {
      if (!selectedAction) return;
      setRecordedSteps(structuredClone(selectedAction.steps));
      setActionName(selectedAction.name);
      setReport(`${selectedAction.name} loaded for editing`);
    },
    updateSaved = () => {
      if (!selectedSet || !selectedAction || !recordedSteps.length) return;
      const replacement = { ...draftAction(), id: selectedAction.id };
      setSets((current) =>
        current.map((set) =>
          set.id === selectedSet.id
            ? {
                ...set,
                updatedAt: new Date().toISOString(),
                actions: set.actions.map((action) =>
                  action.id === selectedAction.id ? replacement : action,
                ),
              }
            : set,
        ),
      );
      setReport(`${replacement.name} updated in ${selectedSet.name}`);
    },
    renameSet = () => {
      if (!selectedSet) return;
      const name = window.prompt('Action set name', selectedSet.name)?.trim();
      if (!name || name.length > 120) return;
      setSets((current) =>
        current.map((set) =>
          set.id === selectedSet.id
            ? { ...set, name, updatedAt: new Date().toISOString() }
            : set,
        ),
      );
      setReport(`Action set renamed to ${name}`);
    },
    removeSavedAction = () => {
      if (!selectedSet || !selectedAction) return;
      if (selectedSet.actions.length === 1) {
        setSets((current) => current.filter((set) => set.id !== selectedSet.id));
        setSelectedSetId('');
        setSelectedActionId('');
        setReport(`${selectedSet.name} removed`);
        return;
      }
      const actions = selectedSet.actions.filter((action) => action.id !== selectedAction.id);
      setSets((current) =>
        current.map((set) =>
          set.id === selectedSet.id
            ? { ...set, actions, updatedAt: new Date().toISOString() }
            : set,
        ),
      );
      setSelectedActionId(actions[0].id);
      setReport(`${selectedAction.name} removed from ${selectedSet.name}`);
    },
    updateStep = (id: string, patch: Partial<ActionStep>) =>
      setRecordedSteps((steps) =>
        steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
      ),
    moveStep = (index: number, offset: -1 | 1) =>
      setRecordedSteps((steps) => {
        const target = index + offset;
        if (target < 0 || target >= steps.length) return steps;
        const next = [...steps],
          [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        return next;
      }),
    exportJson = (name: string, value: unknown) =>
      download(
        name,
        new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
      ),
    processImages = async (files?: FileList | null) => {
      const action = selectedAction ?? (recordedSteps.length ? draftAction() : null);
      if (!files?.length || !action || processing) return;
      let output: ImageProcessorOptions;
      try {
        output = normalizeImageProcessorOptions(processor);
      } catch (error) {
        setReport(error instanceof Error ? error.message : 'Image Processor settings are invalid.');
        return;
      }
      cancelled.current = false;
      setProcessing(true);
      let complete = 0,
        failed = 0;
      const sourceFiles = Array.from(files);
      try {
        for (const [fileIndex, file] of sourceFiles.entries()) {
          if (cancelled.current) break;
          setReport(`Image Processor ${fileIndex + 1}/${sourceFiles.length}: opening ${file.name}`);
          try {
            if (file.size > 250 * 1024 * 1024) throw Error('Source file exceeds 250 MB.');
            const bitmap = await createImageBitmap(file),
              scale = output.maxEdge
                ? Math.min(1, output.maxEdge / Math.max(bitmap.width, bitmap.height))
                : 1,
              width = Math.max(1, Math.round(bitmap.width * scale)),
              height = Math.max(1, Math.round(bitmap.height * scale)),
              canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
            if (!canvasContext) throw Error('Canvas processing is unavailable.');
            canvasContext.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();
            const image = canvasContext.getImageData(0, 0, width, height),
              result = applyPixelAction(image.data, width, height, action);
            if (cancelled.current) {
              canvas.width = canvas.height = 1;
              break;
            }
            canvasContext.putImageData(new ImageData(result.pixels, width, height), 0, 0);
            download(processorOutputName(file.name, output), await blobFromCanvas(canvas, output));
            canvas.width = canvas.height = 1;
            complete++;
          } catch {
            failed++;
          }
        }
        setReport(
          cancelled.current
            ? `Image Processor stopped after ${complete} file${complete === 1 ? '' : 's'}`
            : `Image Processor finished: ${complete} complete${failed ? `, ${failed} failed` : ''}`,
        );
      } finally {
        setProcessing(false);
        cancelled.current = false;
        if (batchRef.current) batchRef.current.value = '';
      }
    };

  return (
    <section className="automation-studio" aria-label="Actions and Image Processor">
      <div className="automation-heading">
        <div>
          <strong>Actions</strong>
          <span>Editable, conditional, and saved on this browser profile.</span>
        </div>
        <Button variant="secondary" disabled={!recordedSteps.length} onClick={saveDraft}>
          New set
        </Button>
      </div>
      {recordedSteps.length ? (
        <ol className="automation-steps">
          {recordedSteps.map((step, index) => (
            <li key={step.id}>
              <input
                aria-label={`Enable ${resolveSuiteFeature(step.command).label}`}
                type="checkbox"
                checked={step.enabled}
                onChange={(event) => updateStep(step.id, { enabled: event.target.checked })}
              />
              <span>{resolveSuiteFeature(step.command).label}</span>
              <select
                aria-label={`Condition for ${resolveSuiteFeature(step.command).label}`}
                value={step.condition}
                onChange={(event) => updateStep(step.id, { condition: event.target.value as ActionCondition })}
              >
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <label title="Stop the action when this step fails">
                Stop
                <input
                  type="checkbox"
                  checked={step.stopOnFailure}
                  onChange={(event) => updateStep(step.id, { stopOnFailure: event.target.checked })}
                />
              </label>
              <Button variant="ghost" aria-label="Move step up" disabled={!index} onClick={() => moveStep(index, -1)}>↑</Button>
              <Button variant="ghost" aria-label="Move step down" disabled={index === recordedSteps.length - 1} onClick={() => moveStep(index, 1)}>↓</Button>
              <Button variant="ghost" aria-label="Delete step" onClick={() => setRecordedSteps((steps) => steps.filter((item) => item.id !== step.id))}>×</Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="automation-empty">Run tools below to record action steps.</p>
      )}
      <div className="automation-actions">
        <Button disabled={!recordedSteps.length} onClick={() => void play(draftAction())}>Play draft</Button>
        <select aria-label="Saved action set" value={selectedSetId} onChange={(event) => {
          const id = event.target.value,
            set = sets.find((item) => item.id === id);
          setSelectedSetId(id);
          setSelectedActionId(set?.actions[0]?.id ?? '');
        }}>
          <option value="">Saved action sets…</option>
          {sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
        </select>
        <select
          aria-label="Saved action"
          disabled={!selectedSet}
          value={selectedActionId}
          onChange={(event) => setSelectedActionId(event.target.value)}
        >
          <option value="">Choose action…</option>
          {selectedSet?.actions.map((action) => (
            <option key={action.id} value={action.id}>{action.name}</option>
          ))}
        </select>
        <Button variant="secondary" disabled={!selectedAction} onClick={() => selectedAction && void play(selectedAction)}>Play saved</Button>
        <Button variant="secondary" disabled={!selectedAction} onClick={editSaved}>Edit saved</Button>
        <Button variant="secondary" disabled={!selectedAction || !recordedSteps.length} onClick={updateSaved}>Update saved</Button>
        <Button variant="secondary" disabled={!selectedSet || !recordedSteps.length || selectedSet.actions.length >= 50} onClick={addDraftToSet}>Add to set</Button>
        <Button variant="secondary" disabled={!selectedSet} onClick={renameSet}>Rename set</Button>
        <Button variant="ghost" disabled={!selectedAction} onClick={removeSavedAction}>Remove</Button>
        <Button variant="secondary" disabled={!selectedSet} onClick={() => selectedSet && exportJson(`${selectedSet.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.libreactions`, selectedSet)}>Export set</Button>
        <Button variant="secondary" disabled={!selectedAction} onClick={() => selectedAction && exportJson(`${selectedAction.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.libredroplet`, createDroplet(selectedAction.name, selectedAction, processor))}>Save droplet</Button>
        <Button variant="secondary" onClick={() => importRef.current?.click()}>Import</Button>
      </div>
      <input ref={importRef} hidden type="file" accept=".libreactions,.libredroplet,application/json" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          if (file.size > 1_000_000) throw Error('Automation files must be smaller than 1 MB.');
          const text = await file.text();
          if (file.name.toLowerCase().endsWith('.libredroplet')) {
            const droplet = parseDroplet(text),
              set = createActionSet(`${droplet.name} set`, [droplet.action]);
            setSets((current) => [...current, set].slice(-50));
            setSelectedSetId(set.id);
            setSelectedActionId(set.actions[0].id);
            setProcessor(droplet.output);
            setReport(`${droplet.name} droplet loaded; choose images to run it`);
          } else {
            const set = parseActionSet(text);
            setSets((current) => [...current.filter((item) => item.id !== set.id), set]);
            setSelectedSetId(set.id);
            setSelectedActionId(set.actions[0].id);
            setReport(`${set.name} imported and saved locally`);
          }
        } catch (error) {
          setReport(error instanceof Error ? error.message : 'The automation file could not be imported.');
        }
      }} />
      <div className="automation-heading">
        <div>
          <strong>Image Processor</strong>
          <span>Applies pixel steps sequentially to local files and downloads copies.</span>
        </div>
      </div>
      <div className="processor-controls">
        <label>Format<select value={processor.format} onChange={(event) => setProcessor((current) => ({ ...current, format: event.target.value as ImageProcessorOptions['format'] }))}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>
        <label>Quality<input type="number" min="1" max="100" value={processor.quality} onChange={(event) => setProcessor((current) => ({ ...current, quality: Number(event.target.value) }))} /></label>
        <label>Max edge<input type="number" min="0" max="32768" value={processor.maxEdge} onChange={(event) => setProcessor((current) => ({ ...current, maxEdge: Number(event.target.value) }))} /></label>
        <label>Suffix<input value={processor.suffix} maxLength={40} onChange={(event) => setProcessor((current) => ({ ...current, suffix: event.target.value }))} /></label>
      </div>
      <div className="automation-actions">
        {processing ? (
          <Button variant="outline" onClick={() => { cancelled.current = true; setReport('Image Processor will stop after the current stage'); }}>Stop</Button>
        ) : (
          <Button disabled={!selectedAction && !recordedSteps.length} onClick={() => batchRef.current?.click()}>Choose images and run</Button>
        )}
        <input ref={batchRef} hidden multiple type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/heic" onChange={(event) => void processImages(event.target.files)} />
        {report ? <output aria-live="polite">{report}</output> : null}
      </div>
    </section>
  );
}
