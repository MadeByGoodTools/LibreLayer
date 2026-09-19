'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  COLOR_PROFILES,
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
    [blackPointCompensation, setBlackPointCompensation] = useState(true);

  useEffect(() => {
    if (open) setTarget(currentProfile);
  }, [open, currentProfile, operation]);

  const current = COLOR_PROFILES[currentProfile],
    destination = COLOR_PROFILES[target];

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
            {Object.values(COLOR_PROFILES).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · ICC v{profile.version}
              </option>
            ))}
          </select>
        </label>
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
