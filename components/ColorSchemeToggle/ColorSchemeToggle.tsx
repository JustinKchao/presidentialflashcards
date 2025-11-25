'use client';

import { useEffect, useState } from 'react';
import { Group, SegmentedControl, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Group justify="center" mt="xl">
      <SegmentedControl
        value={colorScheme}
        onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
        data={[
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'Auto', value: 'auto' },
        ]}
        radius="md"
        size="md"
        transitionDuration={150}
      />
    </Group>
  );
}
