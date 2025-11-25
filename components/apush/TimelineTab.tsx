'use client';

import { Card, Group, Stack, Text, Timeline, Title } from '@mantine/core';
import { DEFAULT_PARTY_COLORS, PRESIDENTS } from '../../data/presidents';

export function TimelineTab() {
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Timeline</Title>
        <Text c="dimmed" size="sm">
          A very boring timeline of all presidents using the same data as the flashcards.
        </Text>
      </div>
      <Timeline active={-1} bulletSize={18} lineWidth={3}>
        {PRESIDENTS.map((p) => (
          <Timeline.Item key={p.number} bullet={p.number} color={DEFAULT_PARTY_COLORS[p.party]}>
            <Card withBorder shadow="xs" radius="md" padding="sm">
              <Group justify="space-between" align="flex-start" mb={4}>
                <div>
                  <Text fw={600}>{p.fullName}</Text>
                  <Text size="sm" c="dimmed">
                    {p.startYear}–{p.endYear}
                  </Text>
                </div>
                <Text size="sm" fw={500}>
                  {p.party}
                </Text>
              </Group>
              {p.details && (
                <Text size="sm" c="dimmed">
                  {p.details}
                </Text>
              )}
            </Card>
          </Timeline.Item>
        ))}
      </Timeline>
    </Stack>
  );
}
