'use client';

import { useMemo, useState } from 'react';
import { IconStarFilled } from '@tabler/icons-react';
import {
  Box,
  Button,
  Card,
  ColorInput,
  Group,
  Image,
  MultiSelect,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  DEFAULT_PARTY_COLORS,
  PRESIDENTS,
  type PartyKey,
  type President,
} from '../../data/presidents';

type FlashcardField = 'number' | 'name' | 'years' | 'party' | 'details' | 'picture';
type Rating = 'good' | 'bad' | 'neutral';

const FIELD_OPTIONS: { value: FlashcardField; label: string }[] = [
  { value: 'number', label: 'President #' },
  { value: 'name', label: 'President name' },
  { value: 'years', label: 'Years in office' },
  { value: 'party', label: 'Political party' },
  { value: 'details', label: 'Details' },
  { value: 'picture', label: 'Picture' },
];

const FIELD_LABELS: Record<FlashcardField, string> = {
  number: 'President #',
  name: 'President name',
  years: 'Years in Office',
  party: 'Political Party',
  details: 'Details',
  picture: 'Picture',
};

function renderField(p: President, field: FlashcardField): React.ReactNode {
  switch (field) {
    case 'number':
      return <Text>#{p.number}</Text>;
    case 'name':
      return <Text fw={500}>{p.fullName}</Text>;
    case 'years':
      return (
        <Text>
          {p.startYear}–{p.endLabel ?? p.endYear}
        </Text>
      );
    case 'party':
      return <Text>Political Party: {p.party}</Text>;
    case 'details':
      return <Text size="sm">Issues: {p.details || 'Details coming soon.'}</Text>;
    case 'picture':
      return p.imageUrl ? (
        <Image src={p.imageUrl} alt={p.fullName} radius="sm" fit="contain" h={120} />
      ) : (
        <Box
          h={120}
          bg="var(--mantine-color-gray-1)"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text size="xs" c="dimmed">
            Picture placeholder
          </Text>
        </Box>
      );
    default:
      return null;
  }
}

function renderFieldGroup(p: President, fields: FlashcardField[]): React.ReactNode {
  if (fields.length === 0) {
    return null;
  }

  return (
    <Stack gap={4} mt="xs">
      {fields.map((field) => (
        <Box key={field}>{renderField(p, field)}</Box>
      ))}
    </Stack>
  );
}

function ratingWeight(rating: Rating): number {
  // bad (red star) first, then neutral, then good (green star)
  if (rating === 'bad') return 0;
  if (rating === 'neutral') return 1;
  return 2;
}

export function FlashcardsTab() {
  const [order, setOrder] = useState<number[]>(() => PRESIDENTS.map((_, index) => index));
  const [cursor, setCursor] = useState(0);
  const [topFields, setTopFields] = useState<FlashcardField[]>(['name']);
  const [bottomFields, setBottomFields] = useState<FlashcardField[]>(['number']);
  const [flipped, setFlipped] = useState<boolean[]>(() => PRESIDENTS.map(() => false));
  const [colorByParty, setColorByParty] = useState(false);
  const [partyColors, setPartyColors] = useState<Record<PartyKey, string>>({
    ...DEFAULT_PARTY_COLORS,
  });
  const [ratings, setRatings] = useState<Rating[]>(() => PRESIDENTS.map(() => 'neutral'));

  const currentIndex = order[cursor] ?? 0;

  const toggleCurrentFlip = () => {
    const index = currentIndex;
    setFlipped((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const currentRating = ratings[currentIndex] ?? 'neutral';

  const setCurrentRating = (rating: Rating) => {
    const index = currentIndex;
    setRatings((prev) => {
      const next = [...prev];
      next[index] = rating;
      return next;
    });
  };

  const goPrevious = () => {
    setCursor((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goNext = () => {
    setCursor((prev) => (prev < order.length - 1 ? prev + 1 : prev));
  };

  const shuffleOrder = () => {
    setOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setCursor(0);
    setFlipped(PRESIDENTS.map(() => false));
  };

  const resetOrder = () => {
    setOrder(PRESIDENTS.map((_, index) => index));
    setCursor(0);
    setFlipped(PRESIDENTS.map(() => false));
  };

  const sortedForTable = useMemo(
    () =>
      PRESIDENTS.map((p, index) => ({ p, rating: ratings[index] ?? ('neutral' as Rating) }))
        .slice()
        .sort((a, b) => {
          const wa = ratingWeight(a.rating);
          const wb = ratingWeight(b.rating);
          if (wa !== wb) return wa - wb;
          return a.p.number - b.p.number;
        }),
    [ratings]
  );

  const effectiveTopFields = (topFields.length ? topFields : ['name']) as FlashcardField[];
  const effectiveBottomFields = (
    bottomFields.length ? bottomFields : ['number']
  ) as FlashcardField[];

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Flashcards</Title>
        <Text c="dimmed" size="sm">
          Flashcards can be colored by party (or customized), as well as marked between know (green)
          or don't know (red).
        </Text>
      </div>

      {/* Single flashcard with navigation */}
      <Stack gap="xs" align="center">
        {PRESIDENTS.length > 0 && (
          <Card
            withBorder
            shadow="md"
            radius="md"
            padding="lg"
            style={{
              minWidth: 280,
              maxWidth: 480,
              width: '100%',
              position: 'relative',
              backgroundColor: colorByParty
                ? partyColors[PRESIDENTS[currentIndex].party]
                : undefined,
              cursor: 'pointer',
            }}
            onClick={toggleCurrentFlip}
          >
            {ratings[currentIndex] !== 'neutral' && (
              <Box style={{ position: 'absolute', top: 8, right: 8 }}>
                <IconStarFilled
                  size={18}
                  color={
                    ratings[currentIndex] === 'good'
                      ? 'var(--mantine-color-green-6)'
                      : 'var(--mantine-color-red-6)'
                  }
                />
              </Box>
            )}

            <Text size="xs">President #{PRESIDENTS[currentIndex].number}</Text>

            {renderFieldGroup(
              PRESIDENTS[currentIndex],
              flipped[currentIndex] ? effectiveBottomFields : effectiveTopFields
            )}

            {/* <Text size="xs" c="dimmed" mt="xs">
              {flipped[currentIndex] ? 'Bottom side' : 'Top side'} (
              {(flipped[currentIndex] ? effectiveBottomFields : effectiveTopFields)
                .map((f: FlashcardField) => FIELD_LABELS[f])
                .join(' · ')}
              )
            </Text> */}
          </Card>
        )}

        <Group gap="sm" mt="xs" justify="center">
          <Button size="xs" variant="default" onClick={goPrevious} disabled={cursor === 0}>
            ← Previous
          </Button>
          <Text size="sm" c="dimmed">
            Card {cursor + 1} of {PRESIDENTS.length}
          </Text>
          <Button
            size="xs"
            variant="default"
            onClick={goNext}
            disabled={cursor >= order.length - 1}
          >
            Next →
          </Button>
          <Button size="xs" variant="outline" onClick={shuffleOrder}>
            Shuffle
          </Button>
          <Button size="xs" variant="outline" onClick={resetOrder}>
            Reset
          </Button>
        </Group>
      </Stack>

      {/* Rating controls for current card */}
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Mark current card (President #{PRESIDENTS[currentIndex]?.number}):
        </Text>
        <Group gap="xs">
          <Button
            size="xs"
            variant={currentRating === 'bad' ? 'filled' : 'outline'}
            color="red"
            onClick={() => setCurrentRating('bad')}
          >
            Don't know
          </Button>
          <Button
            size="xs"
            variant={currentRating === 'neutral' ? 'filled' : 'outline'}
            color="gray"
            onClick={() => setCurrentRating('neutral')}
          >
            Clear
          </Button>
          <Button
            size="xs"
            variant={currentRating === 'good' ? 'filled' : 'outline'}
            color="green"
            onClick={() => setCurrentRating('good')}
          >
            Know
          </Button>
        </Group>
      </Stack>

      {/* Customization panel */}
      <Stack gap="sm">
        <Group align="flex-end" gap="md">
          <MultiSelect
            label="Top of card shows"
            data={FIELD_OPTIONS}
            value={topFields}
            onChange={(values) => setTopFields(values as FlashcardField[])}
            w={260}
          />
          <MultiSelect
            label="Bottom of card shows"
            data={FIELD_OPTIONS}
            value={bottomFields}
            onChange={(values) => setBottomFields(values as FlashcardField[])}
            w={260}
          />
        </Group>

        <Switch
          checked={colorByParty}
          onChange={(event) => setColorByParty(event.currentTarget.checked)}
          label="Color flashcards by political party (carousel)"
        />

        <Stack gap={4} mt="xs">
          <Text size="sm" fw={500}>
            Party colors
          </Text>
          {Object.keys(DEFAULT_PARTY_COLORS).map((key) => {
            const party = key as PartyKey;
            return (
              <Group key={party} gap="sm">
                <Box
                  w={18}
                  h={18}
                  style={{
                    borderRadius: 4,
                    backgroundColor: partyColors[party],
                    border: '1px solid rgba(0,0,0,0.15)',
                  }}
                />
                <Text w={140} size="sm">
                  {party}
                </Text>
                <ColorInput
                  size="xs"
                  w={160}
                  value={partyColors[party]}
                  onChange={(value) =>
                    setPartyColors((prev) => ({
                      ...prev,
                      [party]: value,
                    }))
                  }
                />
              </Group>
            );
          })}
        </Stack>
      </Stack>

      {/* Table of all flashcards */}
      <Box mt="md">
        <Title order={4}>All flashcards</Title>
        <Text size="xs" c="dimmed" mb="xs">
          Flashcards are ordered by don't know, then neutral, then know.
        </Text>
        <Table withTableBorder withColumnBorders striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>Top</Table.Th>
              <Table.Th>Bottom</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Party</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedForTable.map(({ p, rating }) => (
              <Table.Tr key={p.number}>
                <Table.Td>{p.number}</Table.Td>
                <Table.Td>{renderFieldGroup(p, effectiveTopFields)}</Table.Td>
                <Table.Td>{renderFieldGroup(p, effectiveBottomFields)}</Table.Td>
                <Table.Td>
                  {rating !== 'neutral' && (
                    <Text
                      size="md"
                      c={
                        rating === 'good'
                          ? 'var(--mantine-color-green-6)'
                          : 'var(--mantine-color-red-6)'
                      }
                    >
                      {rating === 'good' ? 'Know' : "Don't know"}
                    </Text>
                  )}
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Box
                      w={14}
                      h={14}
                      style={{ borderRadius: 4, backgroundColor: partyColors[p.party] }}
                    />
                    <Text size="sm">{p.party}</Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
