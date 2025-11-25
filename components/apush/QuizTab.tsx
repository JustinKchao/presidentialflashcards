'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { PRESIDENTS, type PartyKey, type President } from '../../data/presidents';

type Mode = 'practice' | 'test' | null;
type CellStatus = 'unchecked' | 'correct' | 'incorrect' | 'partial';

interface AnswerRow {
  name: string;
  startYear: string;
  endYear: string;
  party: string;
}

interface StatusRow {
  name: CellStatus;
  startYear: CellStatus;
  endYear: CellStatus;
  party: CellStatus;
}

interface Attempt {
  id: number;
  timestamp: string;
  score: number;
  rightcount: number;
  elapsedMs: number;
}

// ---------- Helpers (normalization, levenshtein, checks) ----------
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LAST_NAME_PERSON_UNIQUE: Set<string> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const p of PRESIDENTS) {
    const last = p.lastName.toLowerCase();
    if (!map[last]) map[last] = new Set<string>();
    map[last]!.add(normalizeName(p.fullName));
  }
  return new Set(
    Object.entries(map)
      .filter(([, fullNames]) => fullNames.size === 1)
      .map(([last]) => last)
  );
})();

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function checkName(answer: string, pres: President): { status: CellStatus; penalty: number } {
  const raw = answer.trim();
  if (!raw) return { status: 'incorrect', penalty: 1 };

  const normalizedAnswer = normalizeName(raw);
  const normalizedExpectedFull = normalizeName(pres.fullName);

  if (normalizedAnswer === normalizedExpectedFull) return { status: 'correct', penalty: 0 };

  const aliasList = pres.aliases ?? [];
  const normalizedAliases = aliasList.map((a) => normalizeName(a));
  if (normalizedAliases.includes(normalizedAnswer)) return { status: 'correct', penalty: 0 };

  const parts = normalizedAnswer.split(' ').filter(Boolean);
  const lastWord = parts[parts.length - 1];
  if (lastWord) {
    const lastLower = lastWord.toLowerCase();
    const expectedLastLower = pres.lastName.toLowerCase();
    if (lastLower === expectedLastLower && LAST_NAME_PERSON_UNIQUE.has(expectedLastLower)) {
      return { status: 'correct', penalty: 0 };
    }
  }

  const distances: number[] = [
    levenshtein(normalizedAnswer, normalizedExpectedFull),
    levenshtein(normalizedAnswer, pres.lastName.toLowerCase()),
    ...normalizedAliases.map((alias) => levenshtein(normalizedAnswer, alias)),
  ];
  const minDist = Math.min(...distances);
  if (minDist > 0 && minDist <= 2) return { status: 'partial', penalty: 0.5 };

  return { status: 'incorrect', penalty: 1 };
}

const PARTY_CANONICAL: Record<PartyKey, string> = {
  None: 'none',
  Federalist: 'federalist',
  'Democratic-Republican': 'democratic-republican',
  Democrat: 'democrat',
  Whig: 'whig',
  Republican: 'republican',
  'National Union': 'national union',
};

function normalizePartyInput(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s) return '';
  s = s
    .replace(/party/g, '')
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  if (s === 'none' || s === 'independent') return 'none';
  if (s.startsWith('federal')) return 'federalist';
  if (s.startsWith('democratic republican') || s === 'democraticrepublican')
    return 'democratic-republican';
  if (s.includes('national') && s.includes('union')) return 'national union';
  if (s.startsWith('whig')) return 'whig';
  if (s.startsWith('democrat') || s.startsWith('democratic')) return 'democrat';
  if (s.endsWith('republican') || s === 'republican') return 'republican';
  return s;
}

function checkParty(answer: string, expected: PartyKey): { status: CellStatus; penalty: number } {
  const normExpected = PARTY_CANONICAL[expected];
  const normAnswer = normalizePartyInput(answer);
  if (!normAnswer) return { status: 'incorrect', penalty: 1 };
  if (normAnswer === normExpected) return { status: 'correct', penalty: 0 };
  const dist = levenshtein(normAnswer, normExpected);
  if (dist > 0 && dist <= 2) return { status: 'partial', penalty: 0.5 };
  return { status: 'incorrect', penalty: 1 };
}

function checkYear(
  answer: string,
  expectedYear: number,
  options?: { label?: string }
): { status: CellStatus; penalty: number } {
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return { status: 'incorrect', penalty: 0.5 };
  if (options?.label === 'present') {
    if (trimmed === 'present' || trimmed === 'current' || trimmed === 'incumbent') {
      return { status: 'correct', penalty: 0 };
    }
  }
  const value = Number.parseInt(trimmed, 10);
  if (Number.isNaN(value)) return { status: 'incorrect', penalty: 0.5 };
  if (value === expectedYear) return { status: 'correct', penalty: 0 };
  return { status: 'incorrect', penalty: 0.5 };
}

function statusColor(status: CellStatus): string | undefined {
  if (status === 'correct') return 'var(--mantine-color-green-6)';
  if (status === 'incorrect' || status === 'partial') return 'var(--mantine-color-red-6)';
  return undefined;
}

// ---------- RevealedField component (Mantine-perfect overlay) ----------
interface RevealedFieldProps {
  userValue: string;
  correctValue: string;
  status: CellStatus;
  placeholder?: string;
  disabled?: boolean;
  // Called when editing begins in practice mode; parent handles updating answers
  onBeginEdit?: () => void;
}

function RevealedField({
  userValue,
  correctValue,
  status,
  placeholder,
  disabled,
  onBeginEdit,
}: RevealedFieldProps) {
  const theme = useMantineTheme();

  // Compute styles that mimic TextInput
  const borderColor = 'var(--mantine-color-default-border)';
  const textColor = 'var(--mantine-color-text)';
  const backgroundColor = 'var(--mantine-color-body)';

  const paddingY = 8;
  const paddingX = 12;
  const radius = theme.radius.sm;
  const fontSize = theme.fontSizes.sm;
  const height = 34;

  const containerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '100%',
    boxSizing: 'border-box',

    // This border follows Mantine theme automatically
    border: '1px solid var(--mantine-color-default-border)',

    borderRadius: theme.radius.sm,
    padding: '8px 12px',
    minHeight: 36,
    lineHeight: '20px',
    fontSize,
    fontFamily: theme.fontFamily,

    // Dynamic background + text using Mantine CSS variables
    background: 'var(--mantine-color-body)',
    color: 'var(--mantine-color-text)',

    cursor: disabled ? 'default' : 'text',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const userStyle: React.CSSProperties = {
    color: 'var(--mantine-color-red-6)',
    textDecoration: 'line-through',
    marginRight: 6,
  };

  const arrowStyle: React.CSSProperties = {
    color: theme.colors.gray[6],
    marginRight: 6,
  };

  const correctStyle: React.CSSProperties = {
    color: 'var(--mantine-color-green-6)',
  };

  const blankStyle: React.CSSProperties = {
    color: 'var(--mantine-color-yellow-6)',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    // Signal parent to begin editing (practice mode will switch back to input)
    onBeginEdit?.();
  };

  // Render logic:
  // - If userValue is empty => show correctValue in yellow
  // - If status === 'correct' => show userValue in green (no arrow)
  // - If status === 'incorrect' => show [~~user~~] arrow correct (only user part struck)
  // - If status === 'partial' => treat as incorrect for reveal (strike user, append correct)
  return (
    <div style={containerStyle} onClick={handleClick} role="button" tabIndex={-1}>
      {userValue === '' ? (
        <span style={blankStyle}>{correctValue}</span>
      ) : status === 'correct' ? (
        <span style={correctStyle}>{userValue}</span>
      ) : (
        // incorrect or partial
        <>
          <span style={userStyle}>{userValue}</span>
          <span style={arrowStyle}>→</span>
          <span style={correctStyle}>{correctValue}</span>
        </>
      )}
    </div>
  );
}

// ---------- Main QuizTab component ----------
export function QuizTab() {
  const [mode, setMode] = useState<Mode>(null);
  const [revealed, setRevealed] = useState(false);

  const [answers, setAnswers] = useState<AnswerRow[]>(() =>
    PRESIDENTS.map(() => ({ name: '', startYear: '', endYear: '', party: '' }))
  );

  const [statuses, setStatuses] = useState<StatusRow[]>(() =>
    PRESIDENTS.map(() => ({
      name: 'unchecked',
      startYear: 'unchecked',
      endYear: 'unchecked',
      party: 'unchecked',
    }))
  );

  const [score, setScore] = useState<number | null>(null);
  const [rightcount, setCorrect] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [testFinished, setTestFinished] = useState(false);

  const resetQuiz = (newMode: Exclude<Mode, null>) => {
    setMode(newMode);
    setAnswers(PRESIDENTS.map(() => ({ name: '', startYear: '', endYear: '', party: '' })));
    setStatuses(
      PRESIDENTS.map(() => ({
        name: 'unchecked',
        startYear: 'unchecked',
        endYear: 'unchecked',
        party: 'unchecked',
      }))
    );
    setScore(null);
    setElapsedMs(null);
    setQuizStartedAt(Date.now());
    setTestFinished(false);
    setRevealed(false);
  };

  const handleStartPractice = () => resetQuiz('practice');
  const handleStartTest = () => resetQuiz('test');

  const handleChange = (rowIndex: number, field: keyof AnswerRow, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });

    // In practice mode, editing resets that field's status and clears reveal
    if (mode === 'practice') {
      setStatuses((prev) => {
        const next = [...prev];
        next[rowIndex] = { ...next[rowIndex], [field]: 'unchecked' };
        return next;
      });
      setRevealed(false);
    }
  };

  const handleCheck = () => {
    if (!mode) return;

    const startedAt = quizStartedAt ?? Date.now();
    const now = Date.now();
    const duration = now - startedAt;

    let total = 94;
    let correctCount = 0;
    const nextStatuses: StatusRow[] = PRESIDENTS.map(() => ({
      name: 'unchecked',
      startYear: 'unchecked',
      endYear: 'unchecked',
      party: 'unchecked',
    }));

    PRESIDENTS.forEach((pres, idx) => {
      const ans: AnswerRow = answers[idx] ?? {
        name: '',
        startYear: '',
        endYear: '',
        party: '',
      };

      const nameRes = checkName(ans.name, pres);
      total -= nameRes.penalty;
      nextStatuses[idx].name = nameRes.status;
      if (nameRes.status === 'correct') correctCount += 1;

      const startRes = checkYear(ans.startYear, pres.startYear);
      total -= startRes.penalty;
      nextStatuses[idx].startYear = startRes.status;
      if (startRes.status === 'correct') correctCount += 1;

      const endRes = checkYear(ans.endYear, pres.endYear, { label: pres.endLabel });
      total -= endRes.penalty;
      nextStatuses[idx].endYear = endRes.status;
      if (endRes.status === 'correct') correctCount += 1;

      const partyRes = checkParty(ans.party, pres.party);
      total -= partyRes.penalty;
      nextStatuses[idx].party = partyRes.status;
      if (partyRes.status === 'correct') correctCount += 1;
    });

    if (total < 0) total = 0;
    setStatuses(nextStatuses);
    const rounded = Number(total.toFixed(2));
    setScore(rounded);
    setCorrect(correctCount);

    if (mode === 'test' && !testFinished) {
      setElapsedMs(duration);
      setTestFinished(true);
      const attempt: Attempt = {
        id: attempts.length + 1,
        timestamp: new Date().toLocaleString(),
        score: rounded,
        rightcount: correctCount,
        elapsedMs: duration,
      };
      setAttempts((prev) => [attempt, ...prev]);
    } else if (mode === 'practice') {
      setElapsedMs(null);
    }
  };

  // Reveal: auto-check if necessary, then set revealed flag.
  // Notice: we do NOT mutate answers — the overlay will render appended correct values.
  const handleReveal = () => {
    if (score === null) {
      handleCheck();
    }
    setRevealed(true);
  };

  const inputsDisabled = mode === null || (mode === 'test' && testFinished);
  const canCheck = mode === 'practice' || (mode === 'test' && !testFinished);

  const formattedElapsed = useMemo(() => {
    if (elapsedMs == null) return null;
    const seconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedMs]);

  // ---------- UI ----------
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Presidents Quiz</Title>
        <Text c="dimmed" size="sm">
          Fill in each president&apos;s name, start year, end year, and party. Use practice mode to
          check repeatedly, or test mode for a timed, single-check attempt. Scoring starts from 94
          points, mistakes are -1 each (-0.5 if close).
        </Text>
      </div>

      <Group gap="sm">
        <Button onClick={handleStartPractice} variant={mode === 'practice' ? 'filled' : 'light'}>
          Start Practice
        </Button>
        <Button onClick={handleStartTest} variant={mode === 'test' ? 'filled' : 'light'}>
          Start Test
        </Button>
        <Button component={Link} href="/print" size="sm" variant="filled">
          Print quiz
        </Button>
        <Text size="sm" c="dimmed">
          {mode
            ? `Current mode: ${mode === 'practice' ? 'Practice' : 'Test'}`
            : 'Choose a mode to begin. Alternatively, print it out to replicate actual conditions.'}
        </Text>
      </Group>

      <Table striped withTableBorder withColumnBorders highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>President name</Table.Th>
            <Table.Th>Start year</Table.Th>
            <Table.Th>End year</Table.Th>
            <Table.Th>Party</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {PRESIDENTS.map((pres, idx) => {
            const answer = answers[idx];
            const status = statuses[idx];

            // helper to determine correct display values for reveal overlay
            const correctName = pres.fullName;
            const correctStart = String(pres.startYear);
            const correctEnd = pres.endLabel === 'present' ? 'Present' : String(pres.endYear);
            const correctParty = PARTY_CANONICAL[pres.party];

            // A small helper to signal "begin editing" that parent will handle:
            const onBeginEdit = () => {
              // Only allow immediate revert in practice mode
              if (mode === 'practice') {
                setRevealed(false);
                // leave answers as they are, user can now edit the TextInput
              }
            };

            // Decide whether to render overlay or real input:
            // - If revealed is true -> show overlay that renders selective-strikethrough
            // - But if mode === 'practice' and user clicks overlay, onBeginEdit will flip revealed false
            // - Inputs are disabled by inputsDisabled
            return (
              <Table.Tr key={pres.number}>
                <Table.Td>{idx + 1}</Table.Td>

                {/* NAME */}
                <Table.Td>
                  {revealed ? (
                    <RevealedField
                      userValue={answer.name}
                      correctValue={correctName}
                      status={status.name}
                      placeholder="Name"
                      disabled={inputsDisabled}
                      onBeginEdit={onBeginEdit}
                    />
                  ) : (
                    <TextInput
                      value={answer.name}
                      onChange={(e) => handleChange(idx, 'name', e.currentTarget.value)}
                      disabled={inputsDisabled}
                      placeholder="Name"
                      styles={{
                        input: { color: statusColor(status.name) },
                      }}
                    />
                  )}
                </Table.Td>

                {/* START YEAR */}
                <Table.Td>
                  {revealed ? (
                    <RevealedField
                      userValue={answer.startYear}
                      correctValue={correctStart}
                      status={status.startYear}
                      placeholder="Start year"
                      disabled={inputsDisabled}
                      onBeginEdit={onBeginEdit}
                    />
                  ) : (
                    <TextInput
                      value={answer.startYear}
                      onChange={(e) => handleChange(idx, 'startYear', e.currentTarget.value)}
                      disabled={inputsDisabled}
                      placeholder="Start year"
                      styles={{
                        input: { color: statusColor(status.startYear) },
                      }}
                    />
                  )}
                </Table.Td>

                {/* END YEAR */}
                <Table.Td>
                  {revealed ? (
                    <RevealedField
                      userValue={answer.endYear}
                      correctValue={correctEnd}
                      status={status.endYear}
                      placeholder="End year"
                      disabled={inputsDisabled}
                      onBeginEdit={onBeginEdit}
                    />
                  ) : (
                    <TextInput
                      value={answer.endYear}
                      onChange={(e) => handleChange(idx, 'endYear', e.currentTarget.value)}
                      disabled={inputsDisabled}
                      placeholder="End year"
                      styles={{
                        input: { color: statusColor(status.endYear) },
                      }}
                    />
                  )}
                </Table.Td>

                {/* PARTY */}
                <Table.Td>
                  {revealed ? (
                    <RevealedField
                      userValue={answer.party}
                      correctValue={correctParty}
                      status={status.party}
                      placeholder="Party"
                      disabled={inputsDisabled}
                      onBeginEdit={onBeginEdit}
                    />
                  ) : (
                    <TextInput
                      value={answer.party}
                      onChange={(e) => handleChange(idx, 'party', e.currentTarget.value)}
                      disabled={inputsDisabled}
                      placeholder="Party"
                      styles={{
                        input: { color: statusColor(status.party) },
                      }}
                    />
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Group justify="space-between" mt="sm">
        <Group gap="sm">
          <Button onClick={handleCheck} disabled={!canCheck}>
            Check
          </Button>

          <Button onClick={handleReveal} color="yellow" disabled={mode === null}>
            Reveal
          </Button>

          {mode === 'test' && testFinished && formattedElapsed && (
            <Badge color="blue" variant="light">
              Time: {formattedElapsed}
            </Badge>
          )}

          {score != null && (
            <Badge color="grape" variant="light">
              Score: {score.toFixed(1)} / 94
            </Badge>
          )}
          {score != null && (
            <Badge color="green" variant="light">
              Correct: {rightcount} / 168
            </Badge>
          )}
        </Group>

        {mode === 'test' && (
          <Text size="xs" c="dimmed">
            In test mode, you can check answers only once.
          </Text>
        )}
      </Group>

      {attempts.length > 0 && (
        <Box mt="md">
          <Title order={4}>Test attempts</Title>
          <Table withTableBorder withColumnBorders mt="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>When</Table.Th>
                <Table.Th>Score</Table.Th>
                <Table.Th># Correct</Table.Th>
                <Table.Th>Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {attempts.map((attempt) => (
                <Table.Tr key={attempt.id}>
                  <Table.Td>{attempt.id}</Table.Td>
                  <Table.Td>{attempt.timestamp}</Table.Td>
                  <Table.Td>{attempt.score.toFixed(1)} / 94</Table.Td>
                  <Table.Td>{attempt.rightcount} / 168</Table.Td>
                  <Table.Td>
                    {Math.floor(attempt.elapsedMs / 60000)}:
                    {Math.floor((attempt.elapsedMs / 1000) % 60)
                      .toString()
                      .padStart(2, '0')}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
