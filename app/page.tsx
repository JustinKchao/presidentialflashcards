'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Anchor, Button, Container, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { FlashcardsTab } from '../components/apush/FlashcardsTab';
import { QuizTab } from '../components/apush/QuizTab';
import { TimelineTab } from '../components/apush/TimelineTab';
import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string | null>('home');

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>APUSH Presidents Tool</Title>
            <Text c="dimmed" size="sm">
              Because Quizlet's flashcards weren't enough.
            </Text>
          </div>
          <ColorSchemeToggle />
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab} keepMounted>
          <Tabs.List>
            <Tabs.Tab value="home">Home</Tabs.Tab>
            <Tabs.Tab value="quiz">Quiz</Tabs.Tab>
            <Tabs.Tab value="flashcards">Flashcards</Tabs.Tab>
            <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="home" pt="md">
            <Stack gap="md">
              <Title order={2}>Description</Title>
              <Text>
                A simple website to help me memorize all the presidents, their years in office, and
                their political parties. (Also I don't have premium because I'm poor :( )
              </Text>
              {/* <Text c="dimmed">
                              Disclaimer: This was partially built with AI assistance. (I can't frontend code very
                well.)
              </Text> */}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="quiz" pt="md">
            <QuizTab />
          </Tabs.Panel>

          <Tabs.Panel value="flashcards" pt="md">
            <FlashcardsTab />
          </Tabs.Panel>

          <Tabs.Panel value="timeline" pt="md">
            <TimelineTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
