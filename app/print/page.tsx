'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { AspectRatio, Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';

// Printable version loads a static HTML quiz from public/apush-presidents-quiz.html

export default function PrintPage() {
  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1}>Printable Presidents Quiz</Title>
            <Text c="dimmed" size="sm">
              This view embeds a PDF version of the APUSH Presidents quiz. Use your browser&apos;s
              print dialog or the button below to print.
            </Text>
          </div>
          <Button component={Link} href="/">
            Home
          </Button>
        </Group>

        <Box>
          <AspectRatio ratio={8.5 / 11}>
            <iframe
              src="/apush-presidents-quiz.html"
              title="APUSH Presidents printable quiz"
              style={{
                border: '1px solid var(--mantine-color-gray-4)',
                width: '100%',
                height: '100%',
              }}
            />
          </AspectRatio>
          {/* <Text size="xs" c="dimmed" mt="xs">
            This view uses a static HTML version of the quiz located at apush-presidents-quiz.html in the public
            folder.
          </Text> */}
        </Box>
      </Stack>
    </Container>
  );
}
