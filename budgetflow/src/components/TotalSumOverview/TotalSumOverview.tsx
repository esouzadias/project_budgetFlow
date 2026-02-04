import { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import FunctionsIcon from '@mui/icons-material/Functions';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import type { TotalStep } from '../RegistryTable/RegistryTable.types';

type Props = {
  title: string;
  steps: TotalStep[];
  total: number;
  formatValue: (value: number) => string;
};

export default function TotalSumOverview({ title, steps, total, formatValue }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const totalLabel = useMemo(() => formatValue(total), [formatValue, total]);

  return (
    <>
      <Tooltip title="Ver cálculo">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <FunctionsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            p: 1.25,
            width: 420,
            borderRadius: 4,
          },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={800}>
              {title}
            </Typography>

            <Typography variant="subtitle2" fontWeight={900}>
              {totalLabel}
            </Typography>
          </Stack>

          <Box sx={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />

          <TotalPager steps={steps} totalLabel={totalLabel} formatValue={formatValue} />
        </Stack>
      </Popover>
    </>
  );
}

function TotalPager({
  steps,
  totalLabel,
  formatValue,
}: {
  steps: TotalStep[];
  totalLabel: string;
  formatValue: (value: number) => string;
}) {
  const stepsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(steps.length / stepsPerPage));
  const [page, setPage] = useState(0);

  const safePage = Math.max(0, Math.min(totalPages - 1, page));
  const start = safePage * stepsPerPage;
  const end = Math.min(steps.length, start + stepsPerPage);
  const slice = steps.slice(start, end);

  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {steps.length ? `Etapas ${start + 1}-${end} de ${steps.length}` : '—'}
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton size="small" disabled={!canPrev} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Typography variant="caption" sx={{ opacity: 0.8, minWidth: 56, textAlign: 'center' }}>
            {safePage + 1}/{totalPages}
          </Typography>

          <IconButton
            size="small"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Stack spacing={0.75}>
        {slice.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ) : (
          slice.map((s, idx) => {
            const globalIndex = start + idx;
            const left = globalIndex === 0 ? s.label : `+ ${s.label}`;

            return (
              <Box
                key={s.id}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 3,
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>
                    {left}
                  </Typography>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ opacity: 0.65, whiteSpace: 'nowrap' }}>
                      {formatValue(s.value)}
                    </Typography>
                    <Typography variant="body2" fontWeight={900} sx={{ whiteSpace: 'nowrap' }}>
                      {formatValue(s.running)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>

      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{
          px: 1,
          py: 0.75,
          borderRadius: 3,
          backgroundColor: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Resultado
        </Typography>
        <Typography variant="body2" fontWeight={900}>
          {totalLabel}
        </Typography>
      </Stack>
    </Stack>
  );
}