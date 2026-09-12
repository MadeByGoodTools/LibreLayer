'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { dataRecordName, parseDataSet, type DataSet } from '@/lib/data-driven';
import { resolveRecipeFeature } from '@/lib/edit-recipe';
import type { SuiteOptions } from '@/lib/pro-suite';

const STORAGE_KEY = 'librelayer-dataset-v1';

const download = (name: string, value: unknown) => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    ),
    link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'dataset'}.libredata`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function DataDrivenStudio({
  options,
  onRun,
}: {
  options: SuiteOptions;
  onRun: (
    feature: ReturnType<typeof resolveRecipeFeature>,
    options: SuiteOptions,
  ) => Promise<void> | void;
}) {
  const [dataset, setDataset] = useState<DataSet | null>(null),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDataset(parseDataSet(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (dataset) localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    else localStorage.removeItem(STORAGE_KEY);
  }, [dataset]);

  const generate = async (all: boolean) => {
    if (!dataset || busy) return;
    const rows = all
        ? dataset.records.slice(0, 25)
        : [dataset.records[selected]],
      feature = resolveRecipeFeature('variables');
    setBusy(true);
    try {
      setReport(
        `Generating ${rows.length} editable data variant${rows.length === 1 ? '' : 's'}…`,
      );
      await onRun(feature, {
        ...options,
        text: JSON.stringify({
          __librelayerDataRecords: true,
          records: rows.map((record, index) => ({
            name: dataRecordName(record, all ? index : selected),
            values: record,
          })),
        }),
      });
      setReport(
        `${rows.length} editable data variant${rows.length === 1 ? '' : 's'} generated${all && dataset.records.length > 25 ? ' · browser limit: first 25 rows' : ''}`,
      );
    } catch (error) {
      setReport(
        error instanceof Error
          ? error.message
          : 'The editable data variants could not be generated.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="data-driven-studio" aria-label="Variables and datasets">
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".csv,.json,.libredata,text/csv,application/json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            if (file.size > 1_000_000)
              throw Error('Dataset files must be 1 MB or smaller.');
            const next = parseDataSet(
              await file.text(),
              file.name.replace(/\.[^.]+$/, ''),
            );
            setDataset(next);
            setSelected(0);
            setReport(
              `${next.name}: ${next.records.length} rows and ${next.columns.length} columns saved locally`,
            );
          } catch (error) {
            setReport(
              error instanceof Error
                ? error.message
                : 'The dataset could not be opened.',
            );
          }
        }}
      />
      <div className="automation-heading">
        <div>
          <strong>Variables and datasets</strong>
          <span>Use {'{{column}}'} placeholders in editable text layers.</span>
        </div>
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Open CSV / JSON
        </Button>
      </div>
      {dataset ? (
        <div className="dataset-controls">
          <label>
            Record
            <select
              aria-label="Dataset record"
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
            >
              {dataset.records.map((record, index) => (
                <option key={index} value={index}>
                  {index + 1}. {dataRecordName(record, index)}
                </option>
              ))}
            </select>
          </label>
          <span>{dataset.columns.join(' · ')}</span>
          <Button disabled={busy} onClick={() => void generate(false)}>
            Generate selected
          </Button>
          <Button disabled={busy} onClick={() => void generate(true)}>
            Generate all
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => download(dataset.name, dataset)}
          >
            Export dataset
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setDataset(null)}
          >
            Clear
          </Button>
        </div>
      ) : (
        <span className="automation-empty">
          Open a local CSV or portable .libredata file. Dataset contents never
          leave this browser.
        </span>
      )}
      <output aria-live="polite">{report}</output>
    </section>
  );
}
