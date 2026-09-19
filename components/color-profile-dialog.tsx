'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  COLOR_PROFILES,
  installedIccProfiles,
  loadInstalledIccProfiles,
  parseIccProfile,
  registerIccProfile,
  resolveColorProfile,
  saveInstalledIccProfiles,
  type ColorProfileId,
  type RenderingIntent,
} from '@/lib/color-management';

export type ColorProfileOperation = 'assign' | 'convert';

export function ColorProfileDialog({
  open,
  operation,
  currentProfile,
  onClose,
  onApply,
}: {
  open: boolean;
  operation: ColorProfileOperation;
  currentProfile: ColorProfileId;
  onClose: () => void;
  onApply: (options: {
    operation: ColorProfileOperation;
    target: ColorProfileId;
    intent: RenderingIntent;
    blackPointCompensation: boolean;
  }) => void;
}) {
  const [target, setTarget] = useState<ColorProfileId>(currentProfile),
    [intent, setIntent] = useState<RenderingIntent>('relative-colorimetric'),
    [blackPointCompensation, setBlackPointCompensation] = useState(true),
    [customProfiles, setCustomProfiles] = useState(installedIccProfiles),
    [importError, setImportError] = useState(''),
    profileFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadInstalledIccProfiles(localStorage);
      setCustomProfiles(installedIccProfiles());
      setImportError('');
      setTarget(currentProfile);
    }
  }, [open, currentProfile, operation]);

  const current = resolveColorProfile(currentProfile),
    destination = resolveColorProfile(target),
    choices = [...Object.values(COLOR_PROFILES), ...customProfiles];

  const importProfile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024)
        throw Error('ICC profiles must be 4 MB or smaller.');
      const profile = registerIccProfile(
        await parseIccProfile(await file.arrayBuffer()),
      );
      saveInstalledIccProfiles(localStorage);
      setCustomProfiles(installedIccProfiles());
      setTarget(profile.id);
      setImportError('');
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'The ICC profile is invalid.',
      );
    } finally {
      if (profileFileRef.current) profileFileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="color-profile-dialog sm:max-w-lg"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogTitle>
          {operation === 'assign' ? 'Assign Profile' : 'Convert to Profile'}
        </DialogTitle>
        <DialogDescription>
          {operation === 'assign'
            ? 'Change how the existing color numbers are interpreted without changing pixels.'
            : 'Translate every layer into a new working color space while preserving appearance.'}
        </DialogDescription>
        <dl className="profile-summary">
          <div>
            <dt>Current</dt>
            <dd>{current.name}</dd>
          </div>
          <div>
            <dt>Engine</dt>
            <dd>Matrix ICC v{current.version}</dd>
          </div>
        </dl>
        <label>
          Destination profile
          <select
            aria-label="Destination color profile"
            value={target}
            onChange={(event) =>
              setTarget(event.target.value as ColorProfileId)
            }
          >
            {choices.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · ICC v{profile.version}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={profileFileRef}
          hidden
          type="file"
          accept=".icc,.icm,application/vnd.iccprofile"
          onChange={(event) => void importProfile(event.target.files?.[0])}
        />
        <div className="profile-import-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => profileFileRef.current?.click()}
          >
            Load ICC profile…
          </Button>
          <span>RGB matrix profiles up to 4 MB · stored on this device</span>
        </div>
        {importError && (
          <p className="profile-import-error" role="alert">
            {importError}
          </p>
        )}
        {operation === 'convert' && (
          <>
            <label>
              Rendering intent
              <select
                aria-label="Rendering intent"
                value={intent}
                onChange={(event) =>
                  setIntent(event.target.value as RenderingIntent)
                }
              >
                <option value="relative-colorimetric">
                  Relative Colorimetric
                </option>
                <option value="perceptual">Perceptual</option>
                <option value="saturation">Saturation</option>
                <option value="absolute-colorimetric">
                  Absolute Colorimetric
                </option>
              </select>
            </label>
            <label className="profile-check">
              <input
                type="checkbox"
                checked={blackPointCompensation}
                onChange={(event) =>
                  setBlackPointCompensation(event.target.checked)
                }
              />
              Use black-point compensation
            </label>
          </>
        )}
        <div className="profile-impact" role="status">
          <strong>{destination.name}</strong>
          <span>
            {target === currentProfile
              ? 'The document already uses this profile.'
              : operation === 'assign'
                ? 'Pixel values stay unchanged. The document appearance may change.'
                : 'All editable layer pixels are converted. Masks and alpha remain unchanged.'}
          </span>
        </div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={target === currentProfile}
            onClick={() =>
              onApply({
                operation,
                target,
                intent,
                blackPointCompensation,
              })
            }
          >
            {operation === 'assign' ? 'Assign' : 'Convert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
